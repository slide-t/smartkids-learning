// auth.js — SmartKids Enhanced Auth with Multi-User Support + Welcome Banner
// -------------------------------------------------------------------------
const modalContainer = document.getElementById("modalContainer") || (() => {
  const div = document.createElement("div");
  div.id = "modalContainer";
  document.body.appendChild(div);
  return div;
})();

document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  let db;

  // ---------- IndexedDB Setup ----------
  const request = indexedDB.open("SmartKidsDB", 3);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      const store = db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
      store.createIndex("fullName", "fullName", { unique: false });
      store.createIndex("schoolName", "schoolName", { unique: false });
      store.createIndex("email", "email", { unique: false });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    cleanupExpiredUsers();
    updateAuthButton();
    displayUserCount();

    // Auto-show welcome banner if returning user
    const currentName = localStorage.getItem("currentUserName");
    const school = localStorage.getItem("currentUserSchool");
    if (currentName && school) showWelcomeBanner(currentName, school);
  };

  request.onerror = (event) => console.error("IndexedDB error:", event.target.errorCode);

  // ---------- Session Helpers ----------
  function getCurrentUserId() {
    return localStorage.getItem("currentUserId");
  }

  function setCurrentUser(id, name, school) {
    localStorage.setItem("currentUserId", id);
    localStorage.setItem("currentUserName", name || "");
    localStorage.setItem("currentUserSchool", school || "");
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserName");
    localStorage.removeItem("currentUserSchool");
    updateAuthButton();
  }

  // ---------- Welcome Banner ----------
  function showWelcomeBanner(name, school) {
    const oldBanner = document.getElementById("welcomeBanner");
    if (oldBanner) oldBanner.remove();

    const banner = document.createElement("div");
    banner.id = "welcomeBanner";
    banner.className =
      "fixed top-20 left-[-400px] bg-blue-600 text-white px-6 py-3 rounded-r-lg shadow-lg z-50 transition-all duration-700 ease-in-out";
    banner.textContent = `👋 Welcome, ${name} from ${school}!`;

    document.body.appendChild(banner);

    // Slide in
    setTimeout(() => (banner.style.left = "10px"), 100);

    // Slide out after 5s
    setTimeout(() => {
      banner.style.left = "-400px";
      setTimeout(() => banner.remove(), 700);
    }, 5000);
  }

  // ---------- Update Auth Button ----------
  function updateAuthButton() {
    if (!authBtn) return;
    const id = getCurrentUserId();

    if (id) {
      authBtn.textContent = "Logout";
      authBtn.onclick = () => {
        clearCurrentUser();
        alert("👋 Logged out.");
      };
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
  function displayUserCount() {
    if (!db) return;
    const countDisplay = document.getElementById("userCount");
    if (!countDisplay) return;

    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();

    req.onsuccess = (event) => {
      const users = event.target.result || [];
      const unique = [...new Map(users.map(u => [`${u.fullName.toLowerCase()}-${u.schoolName.toLowerCase()}`, u])).values()];
      countDisplay.textContent = unique.length;
    };
  }

  // ---------- Admin Access ----------
  window.getAllRegisteredUsers = function (callback) {
    if (!db) return;
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();

    req.onsuccess = (event) => {
      const users = event.target.result || [];
      const unique = [...new Map(users.map(u => [`${u.fullName.toLowerCase()}-${u.schoolName.toLowerCase()}`, u])).values()];
      callback(unique);
    };
  };

  // ---------- Toggle Modal ----------
  window.toggleAuth = async function () {
    if (!db) return;

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

      const tx = db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const req = store.getAll();

      req.onsuccess = () => {
        const users = req.result || [];
        const duplicate = users.find(
          (u) =>
            u.fullName.toLowerCase() === userData.name.toLowerCase() &&
            u.schoolName.toLowerCase() === userData.schoolName.toLowerCase()
        );

        if (duplicate) {
          alert("⚠️ This pupil already exists for this school!");
          return;
        }

        // Enforce same school email rule
        const sameSchool = users.find(
          (u) => u.schoolName.toLowerCase() === userData.schoolName.toLowerCase()
        );
        if (sameSchool && sameSchool.email.toLowerCase() !== userData.email.toLowerCase()) {
          alert("⚠️ Use your school's registered email address.");
          return;
        }

        // Save new pupil
        const tx2 = db.transaction("users", "readwrite");
        const store2 = tx2.objectStore("users");
        const addReq = store2.add(userData);

        addReq.onsuccess = (event) => {
          const newId = event.target.result;
          setCurrentUser(newId, userData.name, userData.schoolName);
          successMsg.classList.remove("hidden");
          updateAuthButton();
          displayUserCount();
          showWelcomeBanner(userData.name, userData.schoolName);

          syncWithServer(userData); // prepare for express.js

          setTimeout(() => {
            registrationModal.classList.add("hidden");
            successMsg.classList.add("hidden");
            registrationForm.reset();
          }, 1500);
        };

        addReq.onerror = (err) => console.error("Error saving user:", err);
      };
    };
  }

  // ---------- Server Sync Placeholder ----------
  async function syncWithServer(userData) {
    try {
      await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
    } catch (err) {
      console.warn("Server sync skipped (no connection).");
    }
  }
});
