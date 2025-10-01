// registration.js

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("registrationModal");
  const form = document.getElementById("registrationForm");
  const logoutBtn = document.getElementById("logoutBtn");

  let db;
  const DB_NAME = "SmartKidsDB";
  const STORE_NAME = "kids";
  const ACTIVE_USER_KEY = "activeUser";

  // Open IndexedDB
  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    checkActiveUser();
  };

  request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.errorCode);
  };

  // Check if there is an active user
  function checkActiveUser() {
    const activeUser = localStorage.getItem(ACTIVE_USER_KEY);
    if (activeUser) {
      modal.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      modal.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  // Save new kid into IndexedDB
  function saveKid(data) {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.add(data);
  }

  // Handle form submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const kid = {
      fullName: document.getElementById("fullName").value.trim(),
      schoolName: document.getElementById("schoolName").value.trim(),
      location: document.getElementById("location").value.trim(),
      country: document.getElementById("country").value.trim(),
      registeredAt: new Date().toISOString()
    };

    if (!kid.fullName || !kid.schoolName || !kid.location || !kid.country) {
      alert("All fields are required!");
      return;
    }

    saveKid(kid);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(kid));

    modal.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    form.reset();
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    modal.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  });
});
