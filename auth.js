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

    // ✅ Save on server and handle response properly
    try {
      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      const result = await res.json();
      console.log("📡 Server response:", result);

      if (!res.ok) {
        alert(`❌ Server error: ${result.message || "Unknown issue."}`);
        return;
      }

      console.log("✅ Server registration success");
      alert("🎉 Registration successful! Welcome to SmartKids!");
    } catch (err) {
      console.warn("⚠️ Server not reachable:", err.message);
      alert("Registration saved locally. Server temporarily unreachable.");
    }

    // ✅ Update session
    setCurrentUser(user);
    updateAuthUI();

    // ✅ Success message
    const msg = document.getElementById("successMsg");
    if (msg) {
      msg.textContent = "✅ Registration successful!";
      msg.classList.remove("hidden");
    }

    // ✅ Close after short delay
    setTimeout(() => {
      closeModal("registrationModal");
      if (msg) msg.classList.add("hidden");
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
      alert("Invalid credentials!");
      return;
    }

    setCurrentUser(user);
    updateAuthUI();
    closeModal("loginModal");
    alert(`👋 Welcome back, ${user.name}!`);

  } catch (err) {
    console.error("Login error:", err);
    alert("Login failed.");
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
    btn.textContent = "Sign In / Register";
    btn.onclick = openLoginModal;
  }
}

// ---------- Modal Controls ----------
function openLoginModal() {
  document.getElementById("loginModal")?.classList.remove("hidden");
}

function openRegistrationModal() {
  document.getElementById("registrationModal")?.classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();

  // Registration
  const regForm = document.getElementById("registrationForm");
  if (regForm) {
    regForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(regForm).entries());
      registerUser(data);
    });
  }

  // Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const { email, password } = Object.fromEntries(new FormData(loginForm).entries());
      loginUser(email, password);
    });
  }

  // Close buttons
  document.querySelectorAll(".closeModal").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) modal.classList.add("hidden");
    })
  );

  // Switch between modals
  const switchToLogin = document.getElementById("switchToLogin");
  const switchToRegister = document.getElementById("switchToRegister");
  if (switchToLogin) switchToLogin.onclick = () => { closeModal("registrationModal"); openLoginModal(); };
  if (switchToRegister) switchToRegister.onclick = () => { closeModal("loginModal"); openRegistrationModal(); };
});
