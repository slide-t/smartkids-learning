/* ========= AUTH.JS (Updated and Conflict-Safe) ========= */

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

// ✅ Utility for adding or updating user
function saveUser(user) {
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  store.put(user);
}

// ✅ Utility for getting a user
function getUser(username, callback) {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const req = store.get(username);
  req.onsuccess = () => callback(req.result);
}

// ✅ Registration
document.getElementById("registerBtn")?.addEventListener("click", () => {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const schoolName = document.getElementById("regSchoolName").value.trim();

  if (!username || !email || !password || !schoolName)
    return alert("Please fill all fields.");

  if (!email.includes("@") || !email.includes(".")) {
    return alert("Enter a valid school email address.");
  }

  const user = { username, email, password, schoolName, createdAt: new Date().toISOString() };
  saveUser(user);
  localStorage.setItem("activeUser", JSON.stringify(user));
  showUserBadge(username, schoolName);
  closeModal("registrationModal");

  // Placeholder for future server sync
  syncToServer(user);
});

// ✅ Login
document.getElementById("loginBtn")?.addEventListener("click", () => {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!username || !password)
    return alert("Please enter username and password.");

  getUser(username, (user) => {
    if (!user || user.password !== password)
      return alert("Invalid username or password.");

    localStorage.setItem("activeUser", JSON.stringify(user));
    showUserBadge(user.username, user.schoolName);
    closeModal("loginModal");
  });
});

// ✅ Logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("activeUser");
  hideUserBadge();
});

// ✅ Auto show badge if logged in
window.addEventListener("load", () => {
  const activeUser = JSON.parse(localStorage.getItem("activeUser"));
  if (activeUser) showUserBadge(activeUser.username, activeUser.schoolName);
});

// ✅ Slide-in badge
function showUserBadge(username, schoolName) {
  let badge = document.getElementById("userBadge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "userBadge";
    badge.className = "fixed top-20 left-0 bg-blue-600 text-white px-4 py-2 rounded-r-2xl shadow-lg transform -translate-x-full transition-transform duration-500 z-50";
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

// ✅ Helper to close modal
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

// ✅ Placeholder for syncing data to server.js (later)
function syncToServer(user) {
  // Future expansion point:
  // fetch('/api/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(user) });
  console.log("Prepared for server sync:", user);
}
