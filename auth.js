// ===================== IndexedDB Setup =====================
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
const STORE_NAME = "users";
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error("IndexedDB Error:", e.target.error);
      reject(e.target.error);
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "username" });
      }
    };
  });
}

// Add user
function addUser(user) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(user);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Get user
function getUser(username) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(username);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ===================== UI Handling =====================
document.addEventListener("DOMContentLoaded", async () => {
  await initDB();

  const form = document.getElementById("registrationForm");
  const successMsg = document.getElementById("successMsg");
  const modal = document.getElementById("registrationModal");
  const authBtn = document.getElementById("authBtn");

  // Create username display below navbar
  const nameDisplay = document.createElement("div");
  nameDisplay.id = "usernameDisplay";
  nameDisplay.className =
    "text-center bg-blue-50 py-1 text-sm text-blue-800 font-semibold";
  document.body.insertBefore(nameDisplay, document.body.children[1]);

  // Load login state
  const currentUser = localStorage.getItem("loggedInUser");
  if (currentUser) {
    updateAuthUI(currentUser);
  }

  // Registration
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const user = Object.fromEntries(formData.entries());

    const existing = await getUser(user.username);
    if (existing) {
      alert("⚠️ Username already exists. Please log in instead.");
      return;
    }

    await addUser(user);
    successMsg.classList.remove("hidden");
    setTimeout(() => (successMsg.classList.add("hidden")), 2000);
    form.reset();

    localStorage.setItem("loggedInUser", user.username);
    updateAuthUI(user.username);
    modal.classList.add("hidden");
  });

  // Toggle Sign Up / Log Out
  authBtn.addEventListener("click", async () => {
    const loggedIn = localStorage.getItem("loggedInUser");

    if (loggedIn) {
      // Logout flow
      localStorage.removeItem("loggedInUser");
      updateAuthUI(null);
      alert("✅ Logged out successfully!");
    } else {
      // Show sign-up modal
      modal.classList.remove("hidden");
    }
  });
});

// ===================== Helper Functions =====================
function updateAuthUI(username) {
  const authBtn = document.getElementById("authBtn");
  const nameDisplay = document.getElementById("usernameDisplay");

  if (username) {
    authBtn.textContent = "Logout";
    nameDisplay.textContent = `👋 Welcome, ${username}`;
  } else {
    authBtn.textContent = "Sign Up";
    nameDisplay.textContent = "";
  }
}
