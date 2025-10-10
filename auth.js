// auth.js — Multi-User SmartKids Registration Manager
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const modalContainer = document.getElementById("modalContainer") || (() => {
    const div = document.createElement("div");
    div.id = "modalContainer";
    document.body.appendChild(div);
    return div;
  })();

  const authBtn = document.getElementById("authBtn");

  // ---------- IndexedDB Setup ----------
  let db;
  const request = indexedDB.open("SmartKidsDB", 3); // upgraded schema

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      const store = db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
      store.createIndex("username", "username", { unique: true });
      store.createIndex("email", "email", { unique: false });
      store.createIndex("schoolName", "schoolName", { unique: false });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    updateAuthButton();
  };

  request.onerror = (event) => console.error("IndexedDB error:", event.target.errorCode);

  // ---------- Local Session ----------
  function setCurrentUser(id, name) {
    localStorage.setItem("currentUserId", id);
    localStorage.setItem("currentUserName", name);
  }

  function getCurrentUser() {
    return {
      id: localStorage.getItem("currentUserId"),
      name: localStorage.getItem("currentUserName"),
    };
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserName");
    hideUserBadge();
    updateAuthButton();
  }

  // ---------- Auth Button ----------
  function updateAuthButton() {
    const user = getCurrentUser();
    if (!authBtn) return;

    if (user.id) {
      authBtn.textContent = "Logout";
      authBtn.onclick = () => {
        clearCurrentUser();
        alert("👋 Logged out.");
      };
      showUserBadge(user.name);
    } else {
      authBtn.textContent = "Sign Up";
      authBtn.onclick = () => window.toggleAuth && window.toggleAuth();
    }
  }

  // ---------- User Badge ----------
  function showUserBadge(username) {
    if (document.getElementById("userBadge")) return;

    const badge = document.createElement("div");
    badge.id = "userBadge";
    badge.className =
      "fixed top-20 left-[-200px] bg-blue-600 text-white px-4 py-2 rounded-r-lg shadow-lg z-40 transition-all duration-700";
    badge.textContent = `👋 Welcome, ${username}!`;

    document.body.appendChild(badge);

    setTimeout(() => {
      badge.style.left = "0";
    }, 200);

    setTimeout(() => {
      badge.style.left = "-200px";
    }, 6000);
  }

  function hideUserBadge() {
    const badge = document.getElementById("userBadge");
    if (badge) badge.remove();
  }

  // ---------- Modal Loader ----------
  window.toggleAuth = async function () {
    if (!db) {
      console.error("DB not ready yet.");
      return;
    }

    if (!document.getElementById("registrationModal")) {
      try {
        const res = await fetch("registration.html");
        const html = await res.text();
        modalContainer.innerHTML = html;
        setTimeout(() => setupRegistrationModal(), 200);
      } catch (err) {
        console.error("Failed to load registration form:", err);
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // ---------- Registration Modal ----------
  function setupRegistrationModal() {
    const registrationModal = document.getElementById("registrationModal");
    const closeRegistration = document.getElementById("closeRegistration");
    const registrationForm = document.getElementById("registrationForm");
    const successMsg = document.getElementById("successMsg");

    if (!registrationModal || !registrationForm) return;

    registrationModal.classList.remove("hidden");
    closeRegistration.onclick = () => registrationModal.classList.add("hidden");

    registrationForm.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(registrationForm);
      const userData = Object.fromEntries(formData.entries());
      userData.username = userData.name.trim();
      userData.timestamp = Date.now();

      // Ensure all users share same school email domain
      const emailDomain = userData.email.split("@")[1];
      if (!emailDomain || !emailDomain.includes(".")) {
        alert("Invalid school email format.");
        return;
      }

      // Check unique username
      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");

      const idx = store.index("username");
      const checkReq = idx.get(userData.username);

      checkReq.onsuccess = () => {
        if (checkReq.result) {
          alert("⚠️ Username already exists. Please choose another.");
        } else {
          const addReq = store.add(userData);
          addReq.onsuccess = (event) => {
            const newId = event.target.result;
            setCurrentUser(newId, userData.username);
            successMsg.classList.remove("hidden");
            updateAuthButton();
            setTimeout(() => {
              registrationModal.classList.add("hidden");
              successMsg.classList.add("hidden");
              registrationForm.reset();
            }, 1500);
          };
        }
      };
    };
  }

  // ---------- Export for Admin Page ----------
  window.getAllRegisteredUsers = function (callback) {
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();

    req.onsuccess = () => callback(req.result || []);
  };

  // ---------- Future Sync Prep (Server.js) ----------
  window.syncUsersToServer = async function () {
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();

    req.onsuccess = async () => {
      const users = req.result || [];
      try {
        const res = await fetch("/api/syncUsers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(users),
        });
        if (res.ok) console.log("✅ Synced users to server successfully.");
      } catch (err) {
        console.warn("Server sync failed (offline or unavailable).");
      }
    };
  };
});
