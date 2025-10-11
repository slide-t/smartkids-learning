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
  const closeModal = document.getElementById("closeRegistration");

  // Inject username display BELOW navbar
  let nameDisplay = document.getElementById("usernameDisplay");
  if (!nameDisplay) {
    nameDisplay = document.createElement("div");
    nameDisplay.id = "usernameDisplay";
    nameDisplay.className =
      "fixed top-[70px] left-[-200px] bg-blue-600 text-white px-4 py-2 rounded-r-lg shadow-lg transition-all duration-500 z-40";
    document.body.appendChild(nameDisplay);
  }

  // Add toggle link (Sign Up / Login)
  const toggleLink = document.createElement("p");
  toggleLink.className =
    "text-sm text-center mt-3 text-blue-600 cursor-pointer hover:underline";
  toggleLink.textContent = "Already have an account? Login";
  form.appendChild(toggleLink);

  let isLoginMode = false;

  // Check for existing session
  const currentUser = localStorage.getItem("loggedInUser");
  if (currentUser) updateAuthUI(currentUser);

  // Handle Sign Up / Login submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const user = Object.fromEntries(formData.entries());
    const username = user.username?.trim();

    if (!username) {
      alert("Please enter your username.");
      return;
    }

    if (isLoginMode) {
      // LOGIN
      const existing = await getUser(username);
      if (!existing) {
        alert("⚠️ No such user found. Please sign up.");
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
      // SIGN UP
      const existing = await getUser(username);
      if (existing) {
        alert("⚠️ Username already exists. Try login instead.");
        return;
      }

      if (!user.email.endsWith("@school.edu.ng")) {
        alert("❌ Use your school email address only.");
        return;
      }

      await addUser(user);
      successMsg.classList.remove("hidden");
      setTimeout(() => successMsg.classList.add("hidden"), 2000);

      localStorage.setItem("loggedInUser", user.username);
      updateAuthUI(user.username);
      modal.classList.add("hidden");
    }
  });

  // Toggle between Sign Up and Login
  toggleLink.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    const title = modal.querySelector("h2");
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

  // Sign Up / Logout button click
  authBtn.addEventListener("click", () => {
    const loggedIn = localStorage.getItem("loggedInUser");
    if (loggedIn) {
      localStorage.removeItem("loggedInUser");
      updateAuthUI(null);
      alert("✅ You’ve logged out successfully.");
    } else {
      modal.classList.remove("hidden");
    }
  });

  // Close modal button
  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
});

// ===================== Helper Function =====================
function updateAuthUI(username) {
  const authBtn = document.getElementById("authBtn");
  const nameDisplay = document.getElementById("usernameDisplay");

  if (username) {
    authBtn.textContent = "Logout";
    nameDisplay.textContent = `👋 Welcome, ${username}`;
    nameDisplay.style.left = "0px"; // Slide in from left
  } else {
    authBtn.textContent = "Sign Up";
    nameDisplay.style.left = "-200px"; // Slide out
  }
}
