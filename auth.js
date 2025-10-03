// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  const DB_NAME = "SchoolAppDB";
  const DB_VERSION = 1;
  const STORE_NAME = "users";
  const EXPIRY_DAYS = 5;

  // Open IndexedDB
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Add user
  async function addUser(userData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      userData.createdAt = Date.now();
      store.add(userData);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // Get all valid users (within 5 days)
  async function getValidUsers() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const now = Date.now();
        const valid = req.result.filter(
          (u) => now - u.createdAt <= EXPIRY_DAYS * 24 * 60 * 60 * 1000
        );
        resolve(valid);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Cleanup old users
  async function cleanupUsers() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const now = Date.now();
          if (now - cursor.value.createdAt > EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // Admin fetch: every 30s get valid users
  async function fetchForAdmin() {
    const users = await getValidUsers();
    // Example: sort by date
    users.sort((a, b) => b.createdAt - a.createdAt);

    // Save in localStorage for export use
    localStorage.setItem("adminUsers", JSON.stringify(users));
    console.log("Admin fetched users:", users);
  }

  // Toggle Sign Up / Logout
  window.toggleAuth = async function () {
    if (authBtn.textContent === "Logout") {
      // Logout logic
      localStorage.removeItem("currentUser");
      authBtn.textContent = "Sign Up";
      alert("You have logged out.");
      return;
    }

    // Load registration form dynamically
    if (!document.getElementById("registrationModal")) {
      try {
        const res = await fetch("registration.html");
        const html = await res.text();
        modalContainer.innerHTML = html;

        const registrationModal = document.getElementById("registrationModal");
        const closeRegistration = document.getElementById("closeRegistration");
        const registrationForm = document.getElementById("registrationForm");
        const successMsg = document.getElementById("successMsg");

        registrationModal.classList.remove("hidden");

        closeRegistration.addEventListener("click", () => {
          registrationModal.classList.add("hidden");
        });

        registrationForm.addEventListener("submit", async (e) => {
          e.preventDefault();

          const formData = new FormData(registrationForm);
          const userData = Object.fromEntries(formData.entries());

          // Save to IndexedDB
          await addUser(userData);

          // Save session user
          localStorage.setItem("currentUser", JSON.stringify(userData));

          successMsg.classList.remove("hidden");
          authBtn.textContent = "Logout";

          setTimeout(() => {
            registrationModal.classList.add("hidden");
            successMsg.classList.add("hidden");
            registrationForm.reset();
          }, 1500);
        });
      } catch (err) {
        console.error("Failed to load registration form:", err);
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // Check session on load
  if (localStorage.getItem("currentUser")) {
    authBtn.textContent = "Logout";
  }

  // Cleanup users on page load
  cleanupUsers();

  // Admin dashboard refresh every 30s
  setInterval(fetchForAdmin, 30000);
});
