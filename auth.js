// auth.js — Enhanced SmartKids Registration Manager with Dynamic Name Display
// -------------------------------------------------------------------
const modalContainer = document.getElementById("modalContainer") || (() => {
  const div = document.createElement("div");
  div.id = "modalContainer";
  document.body.appendChild(div);
  return div;
})();

document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

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

  function setCurrentUser(id, name) {
    localStorage.setItem("currentUserId", id);
    localStorage.setItem("currentUserName", name || "");
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserName");
    updateAuthButton();
  }

  // ---------- Update Auth Button + Name Display ----------
  function updateAuthButton() {
    if (!authBtn) return;
    const id = getCurrentUserId();
    const name = localStorage.getItem("currentUserName");

    // create or reuse dynamic display element
    let nameDisplay = document.getElementById("userNameDisplay");
    if (!nameDisplay) {
      nameDisplay = document.createElement("span");
      nameDisplay.id = "userNameDisplay";
      nameDisplay.className =
        "ml-3 text-lime-500 font-semibold transition-all duration-700 ease-in-out";
      authBtn.parentNode.insertBefore(nameDisplay, authBtn.nextSibling);
    }

    if (id && name) {
      authBtn.textContent = "Logout";
      authBtn.onclick = () => {
        clearCurrentUser();
        alert("👋 Logged out.");
      };

      // glowing user name effect
      nameDisplay.textContent = `👋 ${name}`;
      nameDisplay.style.opacity = "0";
      nameDisplay.style.transform = "scale(0.9)";
      setTimeout(() => {
        nameDisplay.style.opacity = "1";
        nameDisplay.style.transform = "scale(1)";
        nameDisplay.style.textShadow = "0 0 10px lime";
      }, 150);
    } else {
      authBtn.textContent = "Sign Up";
      authBtn.onclick = () => window.toggleAuth && window.toggleAuth();
      nameDisplay.textContent = "";
      nameDisplay.style.textShadow = "";
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
  function displayUserCount() {
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
  }

  // ---------- Expose Admin Helper ----------
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

      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");

      const addReq = store.add(userData);
      addReq.onsuccess = (event) => {
        const newId = event.target.result;
        setCurrentUser(newId, userData.fullName);
        successMsg.classList.remove("hidden");
        updateAuthButton();
        displayUserCount();

        setTimeout(() => {
          registrationModal.classList.add("hidden");
          successMsg.classList.add("hidden");
          registrationForm.reset();
        }, 1500);
      };

      addReq.onerror = (err) => {
        console.error("Error saving user:", err);
      };
    };
  }
});
