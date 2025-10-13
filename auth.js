
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const authModal = document.getElementById("authModal");
  const closeModal = document.getElementById("closeAuthModal");
  const loginForm = document.getElementById("loginForm");
  const regForm = document.getElementById("registrationForm");
  const showLogin = document.getElementById("showLogin");
  const showRegister = document.getElementById("showRegister");
  const successMsg = document.getElementById("successMsg");

  // ✅ Session Helpers
  function getCurrentUser() {
    const user = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("currentUser");
  }

  // ✅ Fade In / Fade Out Modal
  function showModal() {
    authModal.classList.remove("hidden");
    setTimeout(() => authModal.classList.add("opacity-100"), 10);
  }

  function hideModal() {
    authModal.classList.remove("opacity-100");
    setTimeout(() => authModal.classList.add("hidden"), 200);
  }

  // ✅ Restore logged-in state
  const currentUser = getCurrentUser();
  if (currentUser) {
    authBtn.innerHTML = `Logout <span class="ml-2 font-semibold text-gray-700">(${currentUser.username})</span>`;
  }

  // ✅ Open Modal or Logout
  authBtn.addEventListener("click", () => {
    const user = getCurrentUser();
    if (user) {
      clearCurrentUser();
      authBtn.textContent = "Sign In / Register";
      alert("👋 Logged out successfully!");
    } else {
      showModal();
    }
  });

  // ✅ Close Modal
  closeModal.addEventListener("click", hideModal);
  window.addEventListener("click", (e) => {
    if (e.target === authModal) hideModal();
  });

  // ✅ Switch Tabs
  showLogin.addEventListener("click", () => {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    showLogin.classList.add("text-blue-600", "border-b-2", "border-blue-600");
    showRegister.classList.remove("text-blue-600", "border-b-2", "border-blue-600");
  });

  showRegister.addEventListener("click", () => {
    regForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    showRegister.classList.add("text-blue-600", "border-b-2", "border-blue-600");
    showLogin.classList.remove("text-blue-600", "border-b-2", "border-blue-600");
  });

  // ✅ Registration
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm).entries());

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        localStorage.setItem("currentUser", JSON.stringify(result.user));
        successMsg.classList.remove("hidden");
        authBtn.innerHTML = `Logout <span class="ml-2 font-semibold text-gray-700">(${result.user.username})</span>`;

        setTimeout(() => {
          successMsg.classList.add("hidden");
          hideModal();
          regForm.reset();
        }, 1200);
      } else {
        alert(result.message || "Registration failed!");
      }
    } catch (err) {
      alert("❌ Unable to connect to server. Please ensure server.js is running.");
      console.error(err);
    }
  });

  // ✅ Login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const email = formData.get("email");
    const password = formData.get("password");
    const rememberMe = formData.get("rememberMe") === "on";

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Invalid login details!");
        return;
      }

      const user = result.user;
      if (rememberMe) {
        localStorage.setItem("currentUser", JSON.stringify(user));
      } else {
        sessionStorage.setItem("currentUser", JSON.stringify(user));
      }

      authBtn.innerHTML = `Logout <span class="ml-2 font-semibold text-gray-700">(${user.username})</span>`;
      hideModal();
      alert(`👋 Welcome back, ${user.username}!`);
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed. Please try again.");
    }
  });
});




<script>
  /*
document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const authModal = document.getElementById("authModal");
  const closeModal = document.getElementById("closeAuthModal");
  const loginForm = document.getElementById("loginForm");
  const regForm = document.getElementById("registrationForm");
  const showLogin = document.getElementById("showLogin");
  const showRegister = document.getElementById("showRegister");
  const successMsg = document.getElementById("successMsg");

  // =============================
  // ✅ SESSION HELPERS
  // =============================
  function getCurrentUser() {
    const user = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("currentUser");
  }

  // =============================
  // ✅ RESTORE SESSION ON LOAD
  // =============================
  const currentUser = getCurrentUser();
  if (currentUser) {
    authBtn.innerHTML = `Logout <span class="ml-2 font-semibold text-gray-700">(${currentUser.username})</span>`;
  }

  // =============================
  // ✅ AUTH BUTTON CLICK (Login / Logout)
  // =============================
  authBtn.addEventListener("click", () => {
    const user = getCurrentUser();
    if (user) {
      clearCurrentUser();
      authBtn.textContent = "Sign In / Register";
      alert("👋 Logged out successfully!");
    } else {
      authModal.classList.remove("hidden");
      authModal.classList.add("opacity-100");
    }
  });

  // =============================
  // ✅ MODAL CONTROL
  // =============================
  closeModal.addEventListener("click", () => hideModal());
  window.addEventListener("click", (e) => {
    if (e.target === authModal) hideModal();
  });

  function hideModal() {
    authModal.classList.add("opacity-0");
    setTimeout(() => authModal.classList.add("hidden"), 200);
  }

  // =============================
  // ✅ SWITCH TABS
  // =============================
  showLogin.addEventListener("click", () => {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    showLogin.classList.add("text-blue-600", "border-b-2", "border-blue-600");
    showRegister.classList.remove("text-blue-600", "border-b-2", "border-blue-600");
  });

  showRegister.addEventListener("click", () => {
    regForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    showRegister.classList.add("text-blue-600", "border-b-2", "border-blue-600");
    showLogin.classList.remove("text-blue-600", "border-b-2", "border-blue-600");
  });

  // =============================
  // ✅ REGISTRATION HANDLER
  // =============================
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm).entries());

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (res.ok) {
        localStorage.setItem("currentUser", JSON.stringify(result.user));
        successMsg.classList.remove("hidden");
        authBtn.innerHTML = `Logout <span class="ml-2 font-semibold text-gray-700">(${result.user.username})</span>`;
        setTimeout(() => {
          successMsg.classList.add("hidden");
          hideModal();
          regForm.reset();
        }, 1200);
      } else {
        alert(result.message || "Registration failed!");
      }
    } catch (err) {
      alert("❌ Unable to connect to server. Check if server.js is running.");
      console.error(err);
    }
  });

  // =============================
  // ✅ LOGIN HANDLER
  // =============================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(loginForm).entries());
    const rememberMe = document.getElementById("rememberMe")?.checked || false;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Login failed!");
        return;
      }

      const user = result.user;

      if (rememberMe) {
        localStorage.setItem("currentUser", JSON.stringify(user));
      } else {
        sessionStorage.setItem("currentUser", JSON.stringify(user));
      }

      authBtn.innerHTML = `Logout <span class="ml-2 font-semibold text-gray-700">(${user.username})</span>`;
      hideModal();
      alert(`👋 Welcome back, ${user.username}!`);
    } catch (err) {
      console.error("Login error:", err);
      alert("❌ Login failed. Please try again.");
    }
  });
});
</script>
