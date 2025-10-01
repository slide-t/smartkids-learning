// registration.js

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("registrationModal");
  const form = document.getElementById("registrationForm");
  const registerBtn = document.getElementById("registerBtn");
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

    tx.oncomplete = () => {
      console.log("Kid registered:", data);
    };

    tx.onerror = (event) => {
      console.error("Save failed:", event.target.error);
    };
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

    // Save to IndexedDB
    saveKid(kid);

    // Set active user in localStorage
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(kid));

    // Hide modal and show logout
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
