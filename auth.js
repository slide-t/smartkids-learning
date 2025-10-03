// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  // ✅ IndexedDB Setup
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("SmartKidsDB", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "email" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveUser(userData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");
      store.put(userData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getUser(email) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const request = store.get(email);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function clearUser(email) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");
      store.delete(email);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ✅ Toggle Sign Up / Logout
  window.toggleAuth = async function () {
    if (authBtn.textContent === "Logout") {
      // Handle logout
      const user = JSON.parse(localStorage.getItem("currentUser"));
      if (user?.email) await clearUser(user.email);

      localStorage.removeItem("currentUser");
      authBtn.textContent = "Sign Up";
      alert("You have logged out.");
      return;
    }

    // Load modal HTML dynamically
    if (!document.getElementById("registrationModal")) {
      try {
        const res = await fetch("registration.html");
        const html = await res.text();
        modalContainer.innerHTML = html;

        const registrationModal = document.getElementById("registrationModal");
        const closeRegistration = document.getElementById("closeRegistration");
        const registrationForm = document.getElementById("registrationForm");
        const successMsg = document.getElementById("successMsg");

        registrationModal.classList.remove("hidden");

        closeRegistration.addEventListener("click", () => {
          registrationModal.classList.add("hidden");
        });

        registrationForm.addEventListener("submit", async (e) => {
          e.preventDefault();

          const formData = new FormData(registrationForm);
          const userData = Object.fromEntries(formData.entries());

          if (!userData.email) {
            alert("Email is required!");
            return;
          }

          await saveUser(userData);

          // Save current session reference
          localStorage.setItem("currentUser", JSON.stringify(userData));

          successMsg.classList.remove("hidden");
          authBtn.textContent = "Logout";

          setTimeout(() => {
            registrationModal.classList.add("hidden");
            successMsg.classList.add("hidden");
            registrationForm.reset();
          }, 1500);
        });
      } catch (err) {
        console.error("Failed to load registration form:", err);
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // ✅ Restore session if user exists
  const storedUser = localStorage.getItem("currentUser");
  if (storedUser) {
    authBtn.textContent = "Logout";
  }
});
