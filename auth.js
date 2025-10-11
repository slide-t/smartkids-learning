// ===================== SmartKids Auth.js =====================

// IndexedDB Setup
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
const STORE_NAME = "users";
let db;

// ---------- Initialize IndexedDB ----------
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "email" });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

// ---------- IndexedDB CRUD ----------
async function addUser(user) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(user);
  return tx.complete;
}

async function getUserByEmail(email) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(email);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------- Local Session Helpers ----------
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem("currentUser");
}

// ---------- Registration ----------
async function registerUser(formData) {
  const { name, email, password, ...rest } = formData;

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      alert("Email already registered!");
      return;
    }

    const user = { name, email, password, ...rest, registeredAt: new Date().toISOString() };

    // ✅ Save locally
    await addUser(user);
    // ✅ Save on server
    await fetch("http://localhost:3000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    }).catch((err) => console.warn("⚠️ Server not reachable:", err.message));

    // ✅ Update session
    setCurrentUser(user);
    updateAuthUI();

    // ✅ Show success message
    const successMsg = document.getElementById("successMsg");
    if (successMsg) {
      successMsg.classList.remove("hidden");
      successMsg.textContent = "✅ Registration successful!";
    }

    // ✅ Close modal after 2s
    setTimeout(() => {
      closeModal();
      if (successMsg) successMsg.classList.add("hidden");
    }, 2000);

  } catch (err) {
    console.error("Registration error:", err);
    alert("Registration failed. Please try again.");
  }
}

// ---------- Login ----------
async function loginUser(email, password) {
  try {
    const user = await getUserByEmail(email);
    if (!user || user.password !== password) {
      alert("Invalid login!");
      return;
    }
    setCurrentUser(user);
    updateAuthUI();
  } catch (err) {
    console.error("Login error:", err);
  }
}

// ---------- Logout ----------
function logoutUser() {
  clearCurrentUser();
  updateAuthUI();
  alert("👋 Logged out successfully!");
}

// ---------- UI Updates ----------
function updateAuthUI() {
  const btn = document.getElementById("authBtn");
  const user = getCurrentUser();

  if (!btn) return;

  if (user) {
    btn.textContent = `Logout (${user.name})`;
    btn.onclick = logoutUser;
  } else {
    btn.textContent = "Sign Up";
    btn.onclick = toggleAuth;
  }
}

// ---------- Modal Control ----------
function toggleAuth() {
  const modal = document.getElementById("registrationModal");
  if (modal) modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("registrationModal");
  if (modal) modal.classList.add("hidden");
}

// ---------- Event Listener ----------
window.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();

  const form = document.getElementById("registrationForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(form).entries());
      registerUser(formData);
    });
  }

  const closeBtn = document.getElementById("closeRegistration");
  if (closeBtn) closeBtn.onclick = closeModal;
});
