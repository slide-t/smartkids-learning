<script>
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
let db;

// Open IndexedDB
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

// Add pupil to DB
async function addPupil(pupil) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readwrite");
    tx.objectStore("accounts").add(pupil);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e);
  });
}

// Get all pupils
async function getAllPupils() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readonly");
    const store = tx.objectStore("accounts");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e);
  });
}

// Save current login session in localStorage
function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

// Get current login session
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

// Clear current user
function logoutUser() {
  localStorage.removeItem("currentUser");
}
</script>
