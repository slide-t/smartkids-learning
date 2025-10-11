// ===================== IndexedDB Setup =====================
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
const STORE_NAME = "users";
let db;

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

// ===================== Auth Helpers =====================
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem("currentUser");
}

// ===================== Registration =====================
async function registerUser(name, email, password) {
  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      alert("Email already registered!");
      return;
    }

    const user = { name, email, password };
    await addUser(user);
    setCurrentUser(user);
    updateAuthUI();

    alert("Registration successful!");
    closeModal();
  } catch (err) {
    console.error("Registration error:", err);
    alert("Registration failed. Try again.");
  }
}

// ===================== Login =====================
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

function logoutUser() {
  clearCurrentUser();
  updateAuthUI();
}

// ===================== UI Updates =====================
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

// ===================== Modal =====================
function toggleAuth() {
  const modal = document.getElementById("registrationModal");
  if (modal) modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("registrationModal");
  if (modal) modal.style.display = "none";
}

// ===================== Init =====================
window.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
});
