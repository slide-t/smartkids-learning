// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  let db; // IndexedDB reference

  // --- Open IndexedDB ---
  const request = indexedDB.open("SmartKidsDB", 1);

  request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.errorCode);
  };

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      const store = db.createObjectStore("users", { keyPath: "email" }); // email as unique key
      store.createIndex("email", "email", { unique: true });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;

    // If user already logged in before, keep button as Logout
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.getAll();
    req.onsuccess = () => {
      if (req.result.length > 0) {
        authBtn.textContent = "Logout";
      }
    };
  };

  // --- Toggle Auth ---
  window.toggleAuth = async function () {
    if (authBtn.textContent === "Logout") {
      // Logout
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

        // --- Handle Form Submit ---
        registrationForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const formData = new FormData(registrationForm);
          const userData = Object.fromEntries(formData.entries());

          const tx = db.transaction("users", "readwrite");
          const store = tx.objectStore("users");

          // Check if email already exists
          const checkReq = store.get(userData.email);

          checkReq.onsuccess = () => {
            if (checkReq.result) {
              alert("This email is already registered. Please use another one.");
            } else {
              // Add new user
              const addReq = store.add(userData);

              addReq.onsuccess = () => {
                successMsg.classList.remove("hidden");
                authBtn.textContent = "Logout";

                setTimeout(() => {
                  registrationModal.classList.add("hidden");
                  successMsg.classList.add("hidden");
                  registrationForm.reset();
                }, 1500);
              };

              addReq.onerror = () => {
                console.error("Error saving user:", addReq.error);
              };
            }
          };
        });
      } catch (err) {
        console.error("Failed to load registration form:", err);
      }
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };
});
