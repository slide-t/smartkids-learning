// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  // Open IndexedDB
  let db;
  const request = indexedDB.open("SmartKidsDB", 1);

  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("users")) {
      db.createObjectStore("users", { keyPath: "email" }); // enforce unique email
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
  };

  request.onerror = (e) => {
    console.error("IndexedDB error:", e);
  };

  // Toggle Sign Up / Logout
  window.toggleAuth = async function () {
    if (authBtn.textContent === "Logout") {
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

        // Show modal
        registrationModal.classList.remove("hidden");

        // Close modal
        closeRegistration.addEventListener("click", () => {
          registrationModal.classList.add("hidden");
        });

        // Handle form submit
        registrationForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const formData = new FormData(registrationForm);
          const userData = Object.fromEntries(formData.entries());

          // Duplicate check first
          const tx = db.transaction("users", "readonly");
          const store = tx.objectStore("users");
          const getReq = store.get(userData.email);

          getReq.onsuccess = () => {
            if (getReq.result) {
              alert("⚠️ This email is already registered. Please use another one.");
              return;
            }

            // If not found → save new user
            const txAdd = db.transaction("users", "readwrite");
            const storeAdd = txAdd.objectStore("users");
            const addReq = storeAdd.add(userData);

            addReq.onsuccess = () => {
              localStorage.setItem("currentUser", userData.email);
              successMsg.classList.remove("hidden");
              authBtn.textContent = "Logout";

              setTimeout(() => {
                registrationModal.classList.add("hidden");
                successMsg.classList.add("hidden");
                registrationForm.reset();
              }, 1500);
            };

            addReq.onerror = () => {
              alert("⚠️ Error saving user. This email might already exist.");
            };
          };

          getReq.onerror = () => {
            console.error("Error checking duplicate email.");
          };
        });
      } catch (err) {
        console.error("Failed to load registration form:", err);
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // Keep user logged in if already registered
  const storedUser = localStorage.getItem("currentUser");
  if (storedUser) {
    authBtn.textContent = "Logout";
  }
});
