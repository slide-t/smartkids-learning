// ===================== IndexedDB Setup =====================
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
const STORE_NAME = "users";
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => reject(e.target.error);
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

function addUser(user) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(user);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

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

  // Add Login toggle button
  const toggleLink = document.createElement("p");
  toggleLink.className = "text-sm text-center mt-3 text-blue-600 cursor-pointer hover:underline";
  toggleLink.textContent = "Already have an account? Login";
  form.appendChild(toggleLink);

  // Create username display below navbar
  const nameDisplay = document.createElement("div");
  nameDisplay.id = "usernameDisplay";
  nameDisplay.className =
    "text-center bg-blue-50 py-1 text-sm text-blue-800 font-semibold transition-all duration-300";
  document.body.insertBefore(nameDisplay, document.body.children[1]);

  let isLoginMode = false; // Track form mode (signup/login)

  // Load login state
  const currentUser = localStorage.getItem("loggedInUser");
  if (currentUser) updateAuthUI(currentUser);

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const user = Object.fromEntries(formData.entries());

    if (isLoginMode) {
      // LOGIN FLOW
      const existing = await getUser(user.username);
      if (!existing) {
        alert("⚠️ No such user. Please sign up first.");
        return;
      }

      if (existing.password !== user.password) {
        alert("❌ Incorrect password.");
        return;
      }

      localStorage.setItem("loggedInUser", existing.username);
      updateAuthUI(existing.username);
      modal.classList.add("hidden");
      alert(`✅ Welcome back, ${existing.username}!`);
    } else {
      // SIGNUP FLOW
      const existing = await getUser(user.username);
      if (existing) {
        alert("⚠️ Username already exists. Please log in.");
        return;
      }

      // Ensure email belongs to the school
      if (!user.email.endsWith("@school.edu.ng")) {
        alert("❌ Please use your school email address.");
        return;
      }

      await addUser(user);
      successMsg.classList.remove("hidden");
      setTimeout(() => successMsg.classList.add("hidden"), 2000);
      form.reset();

      localStorage.setItem("loggedInUser", user.username);
      updateAuthUI(user.username);
      modal.classList.add("hidden");
    }
  });

  // Toggle modal modes
  toggleLink.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    const title = document.querySelector("#registrationModal h2");
    const submitBtn = form.querySelector('button[type="submit"]');

    if (isLoginMode) {
      title.textContent = "Login";
      submitBtn.textContent = "Login";
      toggleLink.textContent = "Don’t have an account? Sign Up";
    } else {
      title.textContent = "Sign Up";
      submitBtn.textContent = "Register";
      toggleLink.textContent = "Already have an account? Login";
    }
  });

  // Auth button click (Sign Up / Logout)
  authBtn.addEventListener("click", () => {
    const loggedIn = localStorage.getItem("loggedInUser");

    if (loggedIn) {
      // Logout
      localStorage.removeItem("loggedInUser");
      updateAuthUI(null);
      alert("✅ You’ve logged out successfully.");
    } else {
      // Show modal
      modal.classList.remove("hidden");
    }
  });
});

// ===================== Helper Function =====================
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
