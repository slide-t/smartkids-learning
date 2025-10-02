// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const signupBtn = document.getElementById("signupBtn");
  const registrationModal = document.getElementById("registrationModal");
  const closeRegistration = document.getElementById("closeRegistration");
  const registrationForm = document.getElementById("registrationForm");
  const successMsg = document.getElementById("successMsg");

  // ✅ Open Modal
  signupBtn.addEventListener("click", () => {
    if (signupBtn.textContent === "Logout") {
      // Handle logout
      localStorage.removeItem("userData");
      signupBtn.textContent = "Sign Up";
      alert("You have logged out.");
      return;
    }
    registrationModal.classList.remove("hidden");
  });

  // ✅ Close Modal
  closeRegistration.addEventListener("click", () => {
    registrationModal.classList.add("hidden");
  });

  // ✅ Handle Form Submit
  registrationForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Collect data
    const formData = new FormData(registrationForm);
    const userData = Object.fromEntries(formData.entries());

    // Save to localStorage
    localStorage.setItem("userData", JSON.stringify(userData));

    // Show success message
    successMsg.classList.remove("hidden");

    // Change button to logout
    signupBtn.textContent = "Logout";

    // Hide modal after short delay
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      successMsg.classList.add("hidden");
      registrationForm.reset();
    }, 1500);
  });

  // ✅ Keep user logged in if already registered
  const storedUser = localStorage.getItem("userData");
  if (storedUser) {
    signupBtn.textContent = "Logout";
  }
});
