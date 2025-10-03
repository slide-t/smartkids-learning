// ==========================
// SmartKids Learning - Auth
// ==========================

const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
let db;

// --- Open DB ---
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("accounts")) {
        db.createObjectStore("accounts", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = e => reject("DB error: " + e.target.errorCode);
  });
}

// --- Add New User ---
async function addUser(user) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readwrite");
    tx.objectStore("accounts").add(user);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e);
  });
}

// --- Fetch All Users ---
async function getAllUsers() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readonly");
    const store = tx.objectStore("accounts");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e);
  });
}

// --- Cleanup Old Records (older than 5 days) ---
async function cleanupExpiredUsers() {
  const db = await openDB();
  const cutoff = Date.now() - (5 * 24 * 60 * 60 * 1000); // 5 days in ms

  const tx = db.transaction("accounts", "readwrite");
  const store = tx.objectStore("accounts");
  const cursorReq = store.openCursor();

  cursorReq.onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const user = cursor.value;
      if (new Date(user.registeredAt).getTime() < cutoff) {
        cursor.delete();
      }
      cursor.continue();
    }
  };
}

// --- Session Helpers ---
function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}
function logoutUser() {
  localStorage.removeItem("currentUser");
  updateAuthButton(null);
  alert("👋 Logged out successfully.");
}

// --- Update Auth Button ---
function updateAuthButton(user) {
  const authBtn = document.getElementById("authBtn");
  if (!authBtn) return;

  if (user) {
    // Extract first name
    const firstName = user.firstName || (user.name ? user.name.split(" ")[0] : "User");
    authBtn.textContent = `Logout (${firstName})`;
    authBtn.onclick = () => logoutUser();
  } else {
    authBtn.textContent = "Sign Up";
    authBtn.onclick = () => toggleAuth();
  }
}

// --- Toggle Auth Flow ---
async function toggleAuth() {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  if (authBtn.textContent.startsWith("Logout")) {
    logoutUser();
    return;
  }

  // Load modal dynamically
  if (!document.getElementById("registrationModal")) {
    try {
      const res = await fetch("registration.html");
      const html = await res.text();
      modalContainer.innerHTML = html;

      const registrationModal = document.getElementById("registrationModal");
      const closeRegistration = document.getElementById("closeRegistration");
      const registrationForm = document.getElementById("registrationForm");
      const successMsg = document.getElementById("successMsg");

      // Show modal
      registrationModal.classList.remove("hidden");

      // Close modal
      closeRegistration.addEventListener("click", () => {
        registrationModal.classList.add("hidden");
      });

      // Handle form submit
      registrationForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(registrationForm);
        const userData = Object.fromEntries(formData.entries());
        userData.registeredAt = new Date().toISOString();

        // Save to IndexedDB
        await addUser(userData);
        setCurrentUser(userData);

        const firstName = userData.firstName || (userData.name ? userData.name.split(" ")[0] : "User");

        // Success message
        successMsg.textContent = `✅ Registration successful! Welcome, ${firstName}!`;
        successMsg.classList.remove("hidden");

        // Update button
        updateAuthButton(userData);

        // Hide modal after delay
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
    // If modal already exists
    document.getElementById("registrationModal").classList.remove("hidden");
  }
}

// --- Init ---
document.addEventListener("DOMContentLoaded", async () => {
  await cleanupExpiredUsers(); // auto cleanup

  const currentUser = getCurrentUser();
  updateAuthButton(currentUser);
});
