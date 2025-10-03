// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  const DB_NAME = "SchoolAppDB";
  const DB_VERSION = 1;
  const STORE_NAME = "users";
  const EXPIRY_DAYS = 5;

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

  async function getValidUsers() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const now = Date.now();
        resolve(
          req.result.filter((u) => now - u.createdAt <= EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        );
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

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

  async function fetchForAdmin() {
    const users = await getValidUsers();
    users.sort((a, b) => b.createdAt - a.createdAt);
    localStorage.setItem("adminUsers", JSON.stringify(users));
    console.log("Admin fetched users:", users);
  }

  function updateAuthButton(user) {
    if (user) {
      const firstName = user.firstName || "User";
      authBtn.textContent = `Logout (${firstName})`;
    } else {
      authBtn.textContent = "Sign Up";
    }
  }

  window.toggleAuth = async function () {
    if (authBtn.textContent.startsWith("Logout")) {
      localStorage.removeItem("currentUser");
      updateAuthButton(null);
      alert("You have logged out.");
      return;
    }

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

          await addUser(userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));

          successMsg.classList.remove("hidden");
          updateAuthButton(userData);

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

  const storedUser = localStorage.getItem("currentUser");
  if (storedUser) {
    updateAuthButton(JSON.parse(storedUser));
  } else {
    updateAuthButton(null);
  }

  cleanupUsers();
  setInterval(fetchForAdmin, 30000);
});
