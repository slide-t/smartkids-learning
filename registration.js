<script>
const DB_NAME = "SmartKidsDB";
const DB_VERSION = 1;
let db;

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("accounts")) {
        db.createObjectStore("accounts", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = e => reject("DB error: " + e.target.errorCode);
  });
}

// Add pupil to DB
async function addPupil(pupil) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readwrite");
    const store = tx.objectStore("accounts");
    const req = store.add(pupil);

    req.onsuccess = () => resolve();
    req.onerror = e => reject(e);
  });
}

// Event listener for form submit
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("registrationForm");
  const modal = document.getElementById("registrationModal");

  // Show modal if no one is registered yet
  if (!localStorage.getItem("currentUser")) {
    modal.classList.remove("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pupil = {
      fullName: document.getElementById("fullName").value,
      className: document.getElementById("className").value,
      subject: document.getElementById("subject").value,
      session: document.getElementById("session").value,
      term: document.getElementById("term").value,
      schoolName: document.getElementById("schoolName").value,
      state: document.getElementById("state").value,
      country: document.getElementById("country").value,
      createdAt: new Date().toISOString()
    };

    try {
      await addPupil(pupil);
      localStorage.setItem("currentUser", JSON.stringify(pupil));
      alert("✅ Registration successful!");
      modal.classList.add("hidden");
      form.reset();
    } catch (err) {
      alert("❌ Registration failed: " + err);
    }
  });
});
</script>
