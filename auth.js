// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  // ---------- IndexedDB Setup ----------
  let db;
  const request = indexedDB.open("SmartKidsDB", 1);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      const store = db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
      store.createIndex("email", "email", { unique: false });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    updateAuthButton();
    checkForceRegistration();
  };

  request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.errorCode);
  };

  // ---------- Session Helpers ----------
  function getCurrentUserId() {
    return localStorage.getItem("currentUserId");
  }

  function setCurrentUser(id, name) {
    localStorage.setItem("currentUserId", id);
    localStorage.setItem("currentUserName", name || "");
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserName");
    updateAuthButton();
  }

  // ---------- Update Auth Button ----------
  function updateAuthButton() {
    if (!authBtn) return;
    const id = getCurrentUserId();
    const name = localStorage.getItem("currentUserName");

    if (id && id !== "null" && id !== "undefined") {
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

  // ---------- Force Registration ----------
  function checkForceRegistration() {
    const page = window.location.pathname;
    const currentUser = getCurrentUserId();

    if (!currentUser && (page.includes("lessons.html") || page.includes("mouse.html"))) {
      setTimeout(() => {
        if (!getCurrentUserId()) {
          window.toggleAuth();
          const closeBtn = document.getElementById("closeRegistration");
          if (closeBtn) closeBtn.style.display = "none";
        }
      }, 2 * 60 * 1000);
    }
  }

  // ---------- Toggle Modal ----------
  window.toggleAuth = async function () {
    if (!db) {
      console.error("DB not ready yet.");
      return;
    }

    if (!document.getElementById("registrationModal")) {
      try {
        // ✅ Correct root path
        const res = await fetch("./registration.html");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        modalContainer.innerHTML = html;

        // Modal elements
        const registrationModal = document.getElementById("registrationModal");
        const closeRegistration = document.getElementById("closeRegistration");
        const registrationForm = document.getElementById("registrationForm");
        const successMsg = document.getElementById("successMsg");

        registrationModal.classList.remove("hidden");

        // Close modal
        if (closeRegistration) {
          closeRegistration.addEventListener("click", () => {
            registrationModal.classList.add("hidden");
          });
        }

        // Handle registration
        registrationForm.addEventListener("submit", (e) => {
          e.preventDefault();

          const formData = new FormData(registrationForm);
          const userData = Object.fromEntries(formData.entries());
          userData.timestamp = Date.now();

          const tx = db.transaction("users", "readwrite");
          const store = tx.objectStore("users");
          const addReq = store.add(userData);

          addReq.onsuccess = (event) => {
            const newId = event.target.result;
            setCurrentUser(newId, userData.name);
            successMsg.classList.remove("hidden");
            updateAuthButton();

            setTimeout(() => {
              registrationModal.classList.add("hidden");
              successMsg.classList.add("hidden");
              registrationForm.reset();
            }, 1500);
          };

          addReq.onerror = (err) => {
            console.error("Error saving user:", err);
          };
        });
      } catch (err) {
        console.error("❌ Failed to load registration.html:", err);
        alert("Unable to load registration form. Please check registration.html is in root folder.");
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };
});
