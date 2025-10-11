// ===================== IndexedDB Setup =====================
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
const STORE_NAME = "users";
let db;

// Initialize database
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

// Add or update a user
async function addUser(user) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(user);
  return tx.complete;
}

// Get user by email
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

// ===================== Auth Functions =====================
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem("currentUser");
}

async function registerUser(name, email, password) {
  const existingUser = await getUserByEmail(email);
  if (existingUser) throw new Error("Email already registered!");
  const user = { name, email, password };
  await addUser(user);
  setCurrentUser(user);
  updateAuthUI();
  return user;
}

async function loginUser(email, password) {
  const user = await getUserByEmail(email);
  if (!user || user.password !== password) throw new Error("Invalid login!");
  setCurrentUser(user);
  updateAuthUI();
  return user;
}

function logoutUser() {
  clearCurrentUser();
  updateAuthUI();
}

// ===================== UI Functions =====================
function updateAuthUI() {
  const btn = document.getElementById("authBtn");
  const user = getCurrentUser();

  if (user) {
    btn.textContent = `Logout (${user.name})`;
    btn.onclick = logoutUser;
  } else {
    btn.textContent = "Sign Up";
    btn.onclick = toggleAuth;
  }
}

// ===================== Modal Toggle =====================
function toggleAuth() {
  const modal = document.getElementById("registrationModal");
  if (!modal) return;
  modal.style.display = "block";
}

// ===================== Init =====================
window.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
});
