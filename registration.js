// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SmartKidsDB", 1);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("accounts")) {
        db.createObjectStore("accounts", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function addPupil(pupil) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readwrite");
    tx.objectStore("accounts").add(pupil);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("registrationModal");
  const logoutBtn = document.getElementById("logoutBtn");

  // Check session for current user
  if (!sessionStorage.getItem("currentUser")) {
    modal.classList.remove("hidden"); // force registration
  } else {
    logoutBtn.classList.remove("hidden"); // user already logged in
  }

  // Handle registration
  document.getElementById("registrationForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const pupil = {
      fullName: document.getElementById("fullName").value,
      schoolName: document.getElementById("schoolName").value,
      state: document.getElementById("state").value,
      country: document.getElementById("country").value,
      password: document.getElementById("password").value,
      createdAt: new Date()
    };

    await addPupil(pupil);

    // Set active session
    sessionStorage.setItem("currentUser", JSON.stringify(pupil));

    modal.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    logoutBtn.classList.add("hidden");
    modal.classList.remove("hidden");
  });
});
