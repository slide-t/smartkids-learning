// auth.js — SmartKids Registration + Persistent User Display (Fixed Version)
// -------------------------------------------------------------------------
const modalContainer = document.getElementById("modalContainer") || (() => {
  const div = document.createElement("div");
  div.id = "modalContainer";
  document.body.appendChild(div);
  return div;
})();

document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");
  let blinkInterval;

  // ---------- IndexedDB Setup ----------
  let db;
  const request = indexedDB.open("SmartKidsDB", 2);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      const store = db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
      store.createIndex("fullName", "fullName", { unique: false });
      store.createIndex("email", "email", { unique: false });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    cleanupExpiredUsers();
    updateAuthButton();
    displayUserCount();
  };

  request.onerror = (event) => console.error("IndexedDB error:", event.target.errorCode);

  // ---------- Session Helpers ----------
  function getCurrentUserId() {
    return localStorage.getItem("currentUserId");
  }

  function getCurrentUserName() {
    return localStorage.getItem("currentUserName");
  }

  function setCurrentUser(id, name) {
    if (!name) name = "User";
    localStorage.setItem("currentUserId", id);
    localStorage.setItem("currentUserName", name);
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserName");
    clearInterval(blinkInterval);
    updateAuthButton();
  }

  // ---------- Update Auth Button ----------
  function updateAuthButton() {
    if (!authBtn) return;
    const id = getCurrentUserId();
    const name = getCurrentUserName();

    clearInterval(blinkInterval);

    if (id && name) {
      // Display with icon + name
      authBtn.innerHTML = `<span id="userLabel" class="font-semibold text-blue-600">👤 ${name}</span> <span class="ml-2 text-red-500 font-medium">(Logout)</span>`;

      authBtn.onclick = () => {
        clearCurrentUser();
        alert("👋 You’ve logged out successfully!");
      };

      // 🌟 Blinking effect every 5 seconds
      const userLabel = document.getElementById("userLabel");
      blinkInterval = setInterval(() => {
        if (userLabel) {
          userLabel.classList.add("animate-pulse", "text-lime-500");
          setTimeout(() => userLabel.classList.remove("animate-pulse", "text-lime-500"), 1500);
        }
      }, 5000);

    } else {
      authBtn.textContent = "Sign Up";
      authBtn.onclick = () => window.toggleAuth && window.toggleAuth();
    }
  }

  // ---------- Clean Up Old Entries ----------
  function cleanupExpiredUsers() {
    if (!db) return;
    const tx = db.transaction("users", "readwrite");
    const store = tx.objectStore("users");
    const now = Date.now();
    const fiveDays = 5 * 24 * 60 * 60 * 1000;

    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const user = cursor.value;
        if (now - user.timestamp > fiveDays) {
          store.delete(cursor.primaryKey);
        }
        cursor.continue();
      }
    };
  }

  // ---------- Display User Count ----------
function updateAuthButton() {
  if (!authBtn) return;
  const id = getCurrentUserId();
  const name = getCurrentUserName();

  clearInterval(blinkInterval);

  if (id && name) {
    // Stylish glowing username
    authBtn.innerHTML = `
      <span id="userLabel"
        class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-green-400 to-lime-500 drop-shadow-[0_0_4px_rgba(132,204,22,0.8)]">
        👤 ${name}
      </span>
      <span class="ml-2 text-red-500 font-semibold">(Logout)</span>
    `;

    authBtn.onclick = () => {
      clearCurrentUser();
      alert("👋 You’ve logged out successfully!");
    };

    // 🌟 Subtle pulsing lime glow every 5s
    const userLabel = document.getElementById("userLabel");
    blinkInterval = setInterval(() => {
      if (userLabel) {
        userLabel.classList.add("animate-pulse");
        userLabel.style.textShadow = "0 0 10px #a3e635, 0 0 20px #bef264";
        setTimeout(() => {
          userLabel.classList.remove("animate-pulse");
          userLabel.style.textShadow = "";
        }, 1500);
      }
    }, 5000);

  } else {
    authBtn.textContent = "Sign Up";
    authBtn.onclick = () => window.toggleAuth && window.toggleAuth();
  }
}
  
  /*function displayUserCount() {
    if (!db) return;
    const countDisplay = document.getElementById("userCount");
    if (!countDisplay) return;
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();

    req.onsuccess = (event) => {
      const allUsers = event.target.result || [];
      const uniqueUsers = [...new Map(allUsers.map(u => [u.fullName.toLowerCase(), u])).values()];
      countDisplay.textContent = uniqueUsers.length;
    };
  }*/

  // ---------- Expose For Admin Page ----------
  window.getAllRegisteredUsers = function (callback) {
    if (!db) return;
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();

    req.onsuccess = (event) => {
      const users = event.target.result || [];
      const uniqueUsers = [...new Map(users.map(u => [u.fullName.toLowerCase(), u])).values()];
      callback(uniqueUsers);
    };
  };

  // ---------- Toggle Modal ----------
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

        setTimeout(() => setupRegistrationModal(), 150);
      } catch (err) {
        console.error("Failed to load registration form:", err);
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // ---------- Setup Registration Modal ----------
  function setupRegistrationModal() {
    const registrationModal = document.getElementById("registrationModal");
    const closeRegistration = document.getElementById("closeRegistration");
    const registrationForm = document.getElementById("registrationForm");
    const successMsg = document.getElementById("successMsg");

    if (!registrationModal) return;

    registrationModal.classList.remove("hidden");
    if (closeRegistration) closeRegistration.onclick = () => registrationModal.classList.add("hidden");

    registrationForm.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(registrationForm);
      const userData = Object.fromEntries(formData.entries());
      userData.timestamp = Date.now();

      // Save user in DB
      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");

      const addReq = store.add(userData);
      addReq.onsuccess = (event) => {
        const newId = event.target.result;
        const fullName = userData.fullName || "User";
        setCurrentUser(newId, fullName);
        successMsg.classList.remove("hidden");
        updateAuthButton();
        displayUserCount();

        setTimeout(() => {
          registrationModal.classList.add("hidden");
          successMsg.classList.add("hidden");
          registrationForm.reset();
        }, 1500);
      };

      addReq.onerror = (err) => console.error("Error saving user:", err);
    };
  }
});
