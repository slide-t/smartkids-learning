// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const signupBtn = document.getElementById("signupBtn");
  const registrationModal = document.getElementById("registrationModal");
  const closeRegistration = document.getElementById("closeRegistration");
  const registrationForm = document.getElementById("registrationForm");
  const successMsg = document.getElementById("successMsg");

  let db;

  // ✅ Open IndexedDB
  const request = indexedDB.open("SmartKidsDB", 1);

  request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.error);
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    console.log("IndexedDB ready ✅");

    // Check if user exists (keep logged in)
    checkUserLoggedIn();
  };

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      db.createObjectStore("users", { keyPath: "email" }); // email as unique key
    }
  };

  // ✅ Open Modal
  signupBtn.addEventListener("click", () => {
    if (signupBtn.textContent === "Logout") {
      logoutUser();
      return;
    }
    registrationModal.classList.remove("hidden");
  });

  // ✅ Close Modal
  closeRegistration.addEventListener("click", () => {
    registrationModal.classList.add("hidden");
  });

  // ✅ Handle Registration
  registrationForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(registrationForm);
    const userData = Object.fromEntries(formData.entries());

    // Save to IndexedDB
    const transaction = db.transaction(["users"], "readwrite");
    const store = transaction.objectStore("users");
    const requestAdd = store.put(userData);

    requestAdd.onsuccess = () => {
      console.log("User saved ✅", userData);

      successMsg.classList.remove("hidden");
      signupBtn.textContent = "Logout";

      setTimeout(() => {
        registrationModal.classList.add("hidden");
        successMsg.classList.add("hidden");
        registrationForm.reset();
      }, 1500);
    };

    requestAdd.onerror = (event) => {
      console.error("Error saving user:", event.target.error);
    };
  });

  // ✅ Logout Function
  function logoutUser() {
    // Clear all users (optional: only clear current one if multi-user setup)
    const transaction = db.transaction(["users"], "readwrite");
    const store = transaction.objectStore("users");
    store.clear();

    signupBtn.textContent = "Sign Up";
    alert("You have logged out.");
  }

  // ✅ Check if user exists
  function checkUserLoggedIn() {
    const transaction = db.transaction(["users"], "readonly");
    const store = transaction.objectStore("users");
    const requestGet = store.getAll();

    requestGet.onsuccess = () => {
      if (requestGet.result && requestGet.result.length > 0) {
        signupBtn.textContent = "Logout";
      }
    };
  }
});
