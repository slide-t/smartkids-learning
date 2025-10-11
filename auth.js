// auth.js — Fixed & Improved SmartKids Registration Manager
// ---------------------------------------------------------
(function () {
  // Ensure modal container exists immediately (before DOMContentLoaded)
  let modalContainer = document.getElementById("modalContainer");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "modalContainer";
    document.body.appendChild(modalContainer);
  }

  // ✅ Make toggleAuth globally available right away
  window.toggleAuth = async function () {
    if (!window._smartKidsDBReady) {
      console.warn("Database not ready yet.");
      return;
    }

    if (!document.getElementById("registrationModal")) {
      try {
        const res = await fetch("registration.html");
        const html = await res.text();
        modalContainer.innerHTML = html;

        // Wait for DOM elements to attach before setup
        setTimeout(() => setupRegistrationModal(), 100);
      } catch (err) {
        console.error("Failed to load registration form:", err);
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // Wait for DOM
  document.addEventListener("DOMContentLoaded", () => {
    const authBtn = document.getElementById("authBtn");
    let db;

    // ---------- IndexedDB Setup ----------
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
      window._smartKidsDBReady = true; // mark as ready globally

      cleanupExpiredUsers();
      updateAuthButton();
      displayUserCount();
    };

    request.onerror = (e) => console.error("IndexedDB error:", e.target.errorCode);

    // ---------- Session Helpers ----------
    const getCurrentUserId = () => localStorage.getItem("currentUserId");
    const setCurrentUser = (id, name) => {
      localStorage.setItem("currentUserId", id);
      localStorage.setItem("currentUserName", name || "");
    };
    const clearCurrentUser = () => {
      localStorage.removeItem("currentUserId");
      localStorage.removeItem("currentUserName");
      updateAuthButton();
    };

    // ---------- Update Auth Button ----------
    function updateAuthButton() {
      if (!authBtn) return;
      const id = getCurrentUserId();
      const name = localStorage.getItem("currentUserName");

      if (id) {
        authBtn.textContent = `Logout${name ? ` (${name})` : ""}`;
        authBtn.onclick = () => {
          clearCurrentUser();
          alert("👋 Logged out.");
        };
      } else {
        authBtn.textContent = "Sign Up";
        authBtn.onclick = window.toggleAuth;
      }
    }

    // ---------- Cleanup Old Users ----------
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
          if (now - user.timestamp > fiveDays) store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    }

    // ---------- Display User Count ----------
    function displayUserCount() {
      if (!db) return;
      const el = document.getElementById("userCount");
      if (!el) return;
      const tx = db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const req = store.getAll();

      req.onsuccess = (event) => {
        const users = event.target.result || [];
        const uniqueUsers = [...new Map(users.map(u => [u.fullName.toLowerCase(), u])).values()];
        el.textContent = uniqueUsers.length;
      };
    }

    // ---------- Registration Modal Setup ----------
    function setupRegistrationModal() {
      const modal = document.getElementById("registrationModal");
      const closeBtn = document.getElementById("closeRegistration");
      const form = document.getElementById("registrationForm");
      const successMsg = document.getElementById("successMsg");

      if (!modal || !form) return;

      modal.classList.remove("hidden");
      if (closeBtn) closeBtn.onclick = () => modal.classList.add("hidden");

      form.onsubmit = (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        data.timestamp = Date.now();

        const tx = db.transaction("users", "readwrite");
        const store = tx.objectStore("users");

        const req = store.add(data);
        req.onsuccess = (event) => {
          const id = event.target.result;
          setCurrentUser(id, data.fullName);
          successMsg.classList.remove("hidden");
          updateAuthButton();
          displayUserCount();

          setTimeout(() => {
            modal.classList.add("hidden");
            successMsg.classList.add("hidden");
            form.reset();
          }, 1500);
        };
        req.onerror = (err) => console.error("Error saving user:", err);
      };
    }
  });
})();
