// ================================
// SmartKids Auth Manager (v3.0)
// ================================

document.addEventListener("DOMContentLoaded", () => {
  const authBtn = document.getElementById("authBtn");
  const modalContainer = document.getElementById("modalContainer") || (() => {
    const div = document.createElement("div");
    div.id = "modalContainer";
    document.body.appendChild(div);
    return div;
  })();

  // Floating username banner below navbar
  const userBanner = document.createElement("div");
  userBanner.id = "userBanner";
  userBanner.className =
    "fixed top-[70px] left-[-200px] bg-blue-600 text-white px-4 py-2 rounded-r-lg shadow-md transition-all duration-700 z-40";
  document.body.appendChild(userBanner);

  // ======= IndexedDB Setup =======
  let db;
  const request = indexedDB.open("SmartKidsDB", 3);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      const store = db.createObjectStore("users", { keyPath: "username" });
      store.createIndex("email", "email", { unique: false });
      store.createIndex("schoolName", "schoolName", { unique: false });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    updateAuthState();
  };

  request.onerror = (event) => console.error("IndexedDB Error:", event.target.error);

  // ======= Helpers =======
  function setCurrentUser(username, fullName) {
    localStorage.setItem("currentUser", username);
    localStorage.setItem("currentFullName", fullName);
    showUserBanner(fullName);
    updateAuthButton();
  }

  function getCurrentUser() {
    return localStorage.getItem("currentUser");
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentFullName");
    hideUserBanner();
    updateAuthButton();
  }

  function showUserBanner(name) {
    userBanner.textContent = `👋 Hi, ${name}!`;
    userBanner.style.left = "0px";
    setTimeout(() => {
      userBanner.style.left = "-200px";
    }, 6000);
  }

  function hideUserBanner() {
    userBanner.style.left = "-200px";
  }

  // ======= Auth Button Update =======
  function updateAuthButton() {
    if (!authBtn) return;
    const user = getCurrentUser();

    if (user) {
      authBtn.textContent = "Logout";
      authBtn.onclick = () => {
        clearCurrentUser();
        alert("Logged out successfully!");
      };
    } else {
      authBtn.textContent = "Sign Up";
      authBtn.onclick = toggleAuthModal;
    }
  }

  function updateAuthState() {
    const name = localStorage.getItem("currentFullName");
    if (name) showUserBanner(name);
    updateAuthButton();
  }

  // ======= Modal Toggle =======
  async function toggleAuthModal() {
    if (!document.getElementById("registrationModal")) {
      const res = await fetch("registration.html");
      const html = await res.text();
      modalContainer.innerHTML = html;
      setupRegistrationForm();
    } else {
      document.getElementById("registrationModal").classList.remove("hidden");
    }
  }

  // ======= Registration Form Logic =======
  function setupRegistrationForm() {
    const registrationModal = document.getElementById("registrationModal");
    const registrationForm = document.getElementById("registrationForm");
    const closeBtn = document.getElementById("closeRegistration");
    const successMsg = document.getElementById("successMsg");

    closeBtn.onclick = () => registrationModal.classList.add("hidden");

    registrationForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(registrationForm);
      const user = Object.fromEntries(formData.entries());
      user.username = user.email.split("@")[0].toLowerCase(); // simple unique base
      user.timestamp = Date.now();

      if (!user.email.includes("school") && !user.email.endsWith(".edu")) {
        alert("Email must be a valid school email address.");
        return;
      }

      // Add to IndexedDB
      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");
      const req = store.add(user);

      req.onsuccess = async () => {
        // Save to local storage session
        setCurrentUser(user.username, user.name);

        // Also send to backend server (Express.js)
        try {
          await fetch("http://localhost:5000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user),
          });
        } catch (err) {
          console.warn("Server not reachable — using local data only.");
        }

        successMsg.classList.remove("hidden");
        setTimeout(() => {
          registrationModal.classList.add("hidden");
          successMsg.classList.add("hidden");
          registrationForm.reset();
        }, 1500);
      };

      req.onerror = (err) => {
        console.error("IndexedDB add error:", err);
        alert("Username already exists or storage issue.");
      };
    };
  }

  // Expose toggleAuth globally
  window.toggleAuth = toggleAuthModal;
});
