// auth.js — SmartKids Enhanced Login/Registration Display
//---------------------------------------------------------
const modalContainer = document.getElementById("modalContainer") || (() => {
  const div = document.createElement("div");
  div.id = "modalContainer";
  document.body.appendChild(div);
  return div;
})();

document.addEventListener("DOMContentLoaded", () => {
  let db;
  const authBtn = document.getElementById("authBtn");

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
    cleanupExpiredUsers();
    updateAuthButton();
    displayUserCount();
  };

  // ---------- Session Helpers ----------
  function getCurrentUser() {
    return {
      id: localStorage.getItem("currentUserId"),
      name: localStorage.getItem("currentUserName")
    };
  }

  function setCurrentUser(id, name) {
    localStorage.setItem("currentUserId", id);
    localStorage.setItem("currentUserName", name || "");
    updateAuthButton(); // ✅ immediately update UI
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserName");
    updateAuthButton();
  }

  // ---------- Update Auth Button ----------
  function updateAuthButton() {
    if (!authBtn) return;
    const { id, name } = getCurrentUser();

    if (id) {
      authBtn.innerHTML = `<span style="color:lime;font-weight:600;">${name}</span> • Logout`;
      authBtn.onclick = () => {
        clearCurrentUser();
        alert("👋 Logged out successfully!");
      };
    } else {
      authBtn.textContent = "Sign Up";
      authBtn.onclick = () => window.toggleAuth && window.toggleAuth();
    }
  }

  // ---------- Clean Expired ----------
  function cleanupExpiredUsers() {
    if (!db) return;
    const tx = db.transaction("users", "readwrite");
    const store = tx.objectStore("users");
    const now = Date.now();
    const fiveDays = 5 * 24 * 60 * 60 * 1000;

    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (now - cursor.value.timestamp > fiveDays) {
          store.delete(cursor.primaryKey);
        }
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

    req.onsuccess = (e) => {
      const users = e.target.result || [];
      const unique = [...new Map(users.map(u => [u.fullName.toLowerCase(), u])).values()];
      el.textContent = unique.length;
    };
  }

  // ---------- Expose Admin Fetch ----------
  window.getAllRegisteredUsers = (callback) => {
    if (!db) return;
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();
    req.onsuccess = (e) => {
      const users = e.target.result || [];
      const unique = [...new Map(users.map(u => [u.fullName.toLowerCase(), u])).values()];
      callback(unique);
    };
  };

  // ---------- Toggle Registration Modal ----------
  window.toggleAuth = async function () {
    if (!db) return console.error("DB not ready");

    if (!document.getElementById("registrationModal")) {
      const res = await fetch("registration.html");
      modalContainer.innerHTML = await res.text();
      setTimeout(setupRegistrationModal, 150);
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // ---------- Modal Registration Setup ----------
  function setupRegistrationModal() {
    const modal = document.getElementById("registrationModal");
    const closeBtn = document.getElementById("closeRegistration");
    const form = document.getElementById("registrationForm");
    const successMsg = document.getElementById("successMsg");

    modal.classList.remove("hidden");
    if (closeBtn) closeBtn.onclick = () => modal.classList.add("hidden");

    form.onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.timestamp = Date.now();

      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");
      const addReq = store.add(data);

      addReq.onsuccess = (ev) => {
        setCurrentUser(ev.target.result, data.fullName);
        successMsg.classList.remove("hidden");
        displayUserCount();
        setTimeout(() => {
          modal.classList.add("hidden");
          successMsg.classList.add("hidden");
          form.reset();
        }, 1500);
      };
    };
  }
});
