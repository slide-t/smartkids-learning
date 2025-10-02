// ==========================
// SmartKids Learning - Auth
// ==========================
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
let db;

// --- IndexedDB Setup ---
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

// --- Add New Pupil ---
async function addPupil(pupil) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readwrite");
    tx.objectStore("accounts").add(pupil);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e);
  });
}

// --- Session Helpers ---
function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}
function logoutUser() {
  localStorage.removeItem("currentUser");
  updateSignUpButton();
}

// --- Modal Loader ---
async function loadRegistrationModal() {
  if (!document.getElementById("registrationModal")) {
    const res = await fetch("registration.html");
    const html = await res.text();
    document.body.insertAdjacentHTML("beforeend", html);
  }
  // ✅ always attach handler after ensuring modal exists
  attachFormHandler();
}

// --- Attach Form Events ---
function attachFormHandler() {
  const form = document.getElementById("registrationForm");
  const closeBtn = document.getElementById("closeRegistration");
  const modal = document.getElementById("registrationModal");

  if (!form) return; // safety

  // remove old listener to avoid duplicates
  form.onsubmit = null;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const pupil = {
      name: form.name.value.trim(),
      age: form.age.value.trim(),
      class: form.class.value.trim(),
      schoolName: form.schoolName.value.trim(),
      location: form.location.value.trim(),
      country: form.country.value.trim(),
      registeredAt: new Date().toISOString()
    };

    await addPupil(pupil);
    setCurrentUser(pupil);

    // ✅ instant button update
    updateSignUpButton();

    // ✅ close modal after save
    alert("✅ Registration successful!");
    modal.classList.add("hidden");
    form.reset();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }
}

// --- Sign Up / Logout Button ---
function updateSignUpButton() {
  const btn = document.getElementById("authBtn");
  if (!btn) return;

  const user = getCurrentUser();

  if (user) {
    btn.textContent = `Logout (${user.name})`;
    btn.onclick = () => {
      logoutUser();
      alert("👋 Logged out successfully.");
    };
  } else {
    btn.textContent = "Sign Up";
    btn.onclick = async () => {
      if (!getCurrentUser()) {
        await loadRegistrationModal();
        document.getElementById("registrationModal").classList.remove("hidden");
      }
    };
  }
}

// --- Init on Page Load ---
document.addEventListener("DOMContentLoaded", () => {
  updateSignUpButton();
});
