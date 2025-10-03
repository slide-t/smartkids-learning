// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer");

  // Toggle Sign Up / Logout
  window.toggleAuth = async function () {
    if (authBtn.textContent === "Logout") {
      // Handle logout
      localStorage.removeItem("userData");
      authBtn.textContent = "Sign Up";
      alert("You have logged out.");
      return;
    }

    // Load modal HTML dynamically from registration.html
    if (!document.getElementById("registrationModal")) {
      try {
        const res = await fetch("registration.html");
        const html = await res.text();
        modalContainer.innerHTML = html;

        // Now query elements inside modal
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

          // Save to localStorage (later can be replaced with IndexedDB)
          localStorage.setItem("userData", JSON.stringify(userData));

          // Show success
          successMsg.classList.remove("hidden");

          // Change button to logout
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
      // If modal already exists, just show it
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  };

  // Keep user logged in if already registered
  const storedUser = localStorage.getItem("userData");
  if (storedUser) {
    authBtn.textContent = "Logout";
  }
});
