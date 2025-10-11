// auth.js — Enhanced SmartKids Auth with Multi-User + Server Sync
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const DB_NAME = "SmartKidsDB";
  const DB_VERSION = 2;
  const STORE_NAME = "users";

  const authBtn = document.getElementById("authBtn");
  const modal = document.getElementById("registrationModal");
  const closeModalBtn = document.getElementById("closeRegistration");
  const form = document.getElementById("registrationForm");
  const successMsg = document.getElementById("successMsg");

  let db;

  // ---------- IndexedDB Setup ----------
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
      store.createIndex("email", "email", { unique: false });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    updateAuthButton();
    syncUsersToServer(); // 🔄 try to sync any local users
  };

  request.onerror = (e) => console.error("IndexedDB Error:", e.target.errorCode);

  // ---------- Modal Toggle ----------
  window.toggleAuth = () => {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  };
  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };
  closeModalBtn.onclick = closeModal;
  window.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  // ---------- Form Submission ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());
    userData.timestamp = Date.now();

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(userData);

    req.onsuccess = (event) => {
      const id = event.target.result;
      localStorage.setItem("currentUserId", id);
      localStorage.setItem("currentUserName", userData.name);
      successMsg.classList.remove("hidden");
      updateAuthButton();
      form.reset();
      syncUsersToServer();

      setTimeout(() => {
        successMsg.classList.add("hidden");
        closeModal();
      }, 1500);
    };

    req.onerror = (err) => console.error("Save error:", err);
  });

  // ---------- Update Auth Button ----------
  function updateAuthButton() {
    const userId = localStorage.getItem("currentUserId");
    const userName = localStorage.getItem("currentUserName");

    if (userId) {
      authBtn.innerHTML = `Logout <span class="ml-2 font-semibold text-gray-700">(${userName})</span>`;
      authBtn.onclick = () => {
        localStorage.removeItem("currentUserId");
        localStorage.removeItem("currentUserName");
        updateAuthButton();
      };
    } else {
      authBtn.textContent = "Sign Up";
      authBtn.onclick = () => toggleAuth();
    }
  }

  // ---------- Sync with Server ----------
  async function syncUsersToServer() {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = async (e) => {
      const users = e.target.result;
      if (users.length === 0) return;

      try {
        const res = await fetch("/api/register-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(users),
        });

        if (res.ok) console.log("✅ Synced users to server");
        else console.warn("⚠️ Server rejected sync:", await res.text());
      } catch (err) {
        console.error("❌ Sync failed:", err);
      }
    };
  }
});
