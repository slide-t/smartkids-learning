/* ========= AUTH.JS (Final Integrated Version) ========= */

// IndexedDB setup for multiple users
let db;
const dbName = "SmartKidsDB";
const storeName = "users";

const openDB = indexedDB.open(dbName, 1);
openDB.onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains(storeName)) {
    const store = db.createObjectStore(storeName, { keyPath: "username" });
    store.createIndex("email", "email", { unique: true });
    store.createIndex("schoolName", "schoolName", { unique: false });
  }
};
openDB.onsuccess = (event) => (db = event.target.result);
openDB.onerror = (event) => console.error("IndexedDB error:", event.target.errorCode);

/* ========= SIGN UP / LOGIN HANDLING ========= */

// ✅ Open registration modal when “Sign Up” button beside logo is clicked
function toggleAuth() {
  const modal = document.getElementById("registrationModal");
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
}

// ✅ Close modal via “×” button
document.getElementById("closeRegistration")?.addEventListener("click", () => {
  document.getElementById("registrationModal").classList.add("hidden");
});

// ✅ Handle registration form submission
const registrationForm = document.getElementById("registrationForm");
if (registrationForm) {
  registrationForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = registrationForm.name.value.trim();
    const email = registrationForm.email.value.trim();
    const age = registrationForm.age.value.trim();
    const className = registrationForm.class.value.trim();
    const schoolName = registrationForm.schoolName.value.trim();
    const location = registrationForm.location.value.trim();
    const country = registrationForm.country.value.trim();

    // Basic validation
    if (!name || !email || !age || !className || !schoolName || !location || !country) {
      alert("Please fill in all fields.");
      return;
    }

    // Email validation — must be a school email (simple rule)
    if (!email.endsWith(".edu.ng") && !email.endsWith(".school.ng")) {
      alert("Please use your official school email address.");
      return;
    }

    // User object
    const user = {
      username: name,
      email,
      age,
      className,
      schoolName,
      location,
      country,
      createdAt: new Date().toISOString(),
    };

    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put(user);

    localStorage.setItem("activeUser", JSON.stringify(user));

    document.getElementById("successMsg").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("registrationModal").classList.add("hidden");
      document.getElementById("successMsg").classList.add("hidden");
      showUserBadge(name, schoolName);
    }, 1200);

    syncToServer(user);
  });
}

// ✅ Auto-show username badge if logged in
window.addEventListener("load", () => {
  const activeUser = JSON.parse(localStorage.getItem("activeUser"));
  if (activeUser) showUserBadge(activeUser.username, activeUser.schoolName);
});

// ✅ Logout handler
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("activeUser");
  hideUserBadge();
});

/* ========= SLIDE-IN USER BADGE ========= */

function showUserBadge(username, schoolName) {
  let badge = document.getElementById("userBadge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "userBadge";
    badge.className =
      "fixed top-20 left-0 bg-blue-600 text-white px-4 py-2 rounded-r-2xl shadow-lg transform -translate-x-full transition-transform duration-500 z-50";
    document.body.appendChild(badge);
  }

  badge.innerHTML = `<strong>${username}</strong><br><small>${schoolName}</small>`;
  setTimeout(() => badge.classList.remove("-translate-x-full"), 100);
  setTimeout(() => hideUserBadge(), 6000);
}

function hideUserBadge() {
  const badge = document.getElementById("userBadge");
  if (badge) badge.classList.add("-translate-x-full");
}

/* ========= FUTURE SERVER INTEGRATION ========= */
function syncToServer(user) {
  // Placeholder for connection with server.js later
  console.log("Prepared to sync with server:", user);
}
