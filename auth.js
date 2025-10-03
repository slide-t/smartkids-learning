// auth.js
// SmartKids Learning — registration/auth helper (IndexedDB, multi-user, 5-day retention)

document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");       // sign up / logout button in header
  const modalContainer = document.getElementById("modalContainer"); // placeholder for registration.html

  // ---------- IndexedDB setup ----------
  const DB_NAME = "SmartKidsDB";
  const DB_VERSION = 1;
  const STORE = "registrations";
  let db;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Purge records older than N days (5 days)
  async function purgeOldRecords(days = 5) {
    if (!db) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const cursorReq = store.openCursor();

    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) return;
      const rec = cursor.value;
      const created = new Date(rec.registeredAt).getTime();
      if (created < cutoff) {
        cursor.delete();
      }
      cursor.continue();
    };
    // no need to await completion here, but return a promise if caller wants to await
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  // Save a registration; returns the new record id
  async function saveRegistration(data) {
    await openDB();
    await purgeOldRecords(5); // keep DB tidy before save
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const addReq = store.add(data);
      addReq.onsuccess = (e) => resolve(e.target.result); // new id
      addReq.onerror = (e) => reject(e.target.error);
    });
  }

  // Get all pupils (for admin use)
  async function getAllPupils() {
    await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // ---------- Session helpers ----------
  function setCurrentUserId(id, displayName) {
    localStorage.setItem("currentUserId", String(id));
    localStorage.setItem("currentUserName", displayName || "");
    updateAuthButton();
  }
  function getCurrentUserId() {
    return localStorage.getItem("currentUserId");
  }
  function clearCurrentUser() {
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserName");
    updateAuthButton();
  }

  // ---------- UI helpers ----------
  function updateAuthButton() {
    if (!authBtn) return;
    const id = getCurrentUserId();
    const name = localStorage.getItem("currentUserName");
    if (id) {
      authBtn.textContent = `Logout${name ? ` (${name})` : ""}`;
      authBtn.onclick = () => {
        clearCurrentUser();
        alert("👋 Logged out.");
      };
    } else {
      authBtn.textContent = "Sign Up";
      authBtn.onclick = () => window.toggleAuth && window.toggleAuth();
    }
  }

  // ---------- Modal loading & handlers ----------
  // toggleAuth globally (so inline onclick="toggleAuth()" works)
  window.toggleAuth = async function () {
    // If someone is active, act as logout
    const activeId = getCurrentUserId();
    if (activeId) {
      clearCurrentUser();
      return;
    }

    // Load modal if not already in DOM
    if (!document.getElementById("registrationModal")) {
      try {
        const res = await fetch("registration.html");
        if (!res.ok) throw new Error("Failed to fetch registration form");
        const html = await res.text();
        modalContainer.innerHTML = html;
      } catch (err) {
        console.error("Could not load registration form:", err);
        alert("Unable to load registration form. Try again later.");
        return;
      }
    }

    // Now modal exists — wire handlers (idempotent)
    const registrationModal = document.getElementById("registrationModal");
    const registrationForm  = document.getElementById("registrationForm");
    const closeBtn          = document.getElementById("closeRegistration");
    const successMsg        = document.getElementById("successMsg");
    const errorMsg          = (function () {
      let el = document.getElementById("errorMsg");
      if (!el) {
        el = document.createElement("p");
        el.id = "errorMsg";
        el.className = "hidden text-red-600 mt-3 text-center font-medium";
        if (successMsg) successMsg.parentNode.insertBefore(el, successMsg);
        else registrationForm.parentNode.appendChild(el);
      }
      return el;
    })();

    // show modal
    registrationModal.classList.remove("hidden");

    // close handler
    closeBtn?.addEventListener("click", () => {
      registrationModal.classList.add("hidden");
      errorMsg.classList.add("hidden");
      successMsg?.classList.add("hidden");
    });

    // avoid multiple submit handlers — remove existing then add
    if (registrationForm) {
      registrationForm.removeEventListener("submit", handleSubmit);
      registrationForm.addEventListener("submit", handleSubmit);
    }

    // submit handler
    async function handleSubmit(e) {
      e.preventDefault();
      errorMsg.classList.add("hidden");
      successMsg?.classList.add("hidden");

      // serialize form to object
      const fd = new FormData(registrationForm);
      const data = Object.fromEntries(fd.entries());

      // add timestamp
      data.registeredAt = new Date().toISOString();

      // validate minimal fields
      if (!data.name || !data.schoolName) {
        errorMsg.textContent = "Please enter full name and school name.";
        errorMsg.classList.remove("hidden");
        return;
      }

      try {
        // Save (multiple registrations allowed)
        const newId = await saveRegistration(data);

        // set session to this new registration
        setCurrentUserId(newId, data.name);

        // show success
        if (successMsg) successMsg.classList.remove("hidden");

        // purge old records asynchronously (keep DB tidy)
        purgeOldRecords(5).catch(console.error);

        // close after short delay
        setTimeout(() => {
          registrationModal.classList.add("hidden");
          if (successMsg) successMsg.classList.add("hidden");
          registrationForm.reset();
        }, 1200);
      } catch (err) {
        console.error("Failed to save registration:", err);
        errorMsg.textContent = "Error saving registration — try again.";
        errorMsg.classList.remove("hidden");
      }
    }
  }; // end toggleAuth

  // ---------- initialisation ----------
  (async function init() {
    await openDB().catch(err => {
      console.error("DB open failed", err);
    });
    // purge old on startup as well
    purgeOldRecords(5).catch(console.error);

    // If a session exists (currentUserId), update button label
    updateAuthButton();
  })();

  // ---------- Export helpers for admin (callable) ----------
  // admin.js can call getAllPupils() to read current data every 30s
  window.getAllPupils = async function () {
    return await getAllPupils();
  };
  // expose purge in case admin wants to trigger
  window.purgeOld = (days = 5) => purgeOldRecords(days);

}); // DOMContentLoaded
