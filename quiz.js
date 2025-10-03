// IndexedDB setup
let db;
const request = indexedDB.open("SmartKidsDB", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("quizScores")) {
    db.createObjectStore("quizScores", { keyPath: "id", autoIncrement: true });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
};

let questions = [];
let currentPage = 0;
const perPage = 5;
const container = document.getElementById("quiz-container");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

// Load quiz data
fetch("data/quiz.json")
  .then(res => res.json())
  .then(data => {
    questions = data;
    renderPage();
  });

// Render current page of questions
function renderPage() {
  container.innerHTML = "";
  const start = currentPage * perPage;
  const end = start + perPage;
  const pageQuestions = questions.slice(start, end);

  pageQuestions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "p-4 bg-white shadow rounded";
    div.innerHTML = `
      <p class="font-semibold mb-2">${start + i + 1}. ${q.question}</p>
      ${q.options.map(opt => `
        <label class="block">
          <input type="radio" name="q${q.id}" value="${opt}" class="mr-2"> ${opt}
        </label>
      `).join("")}
    `;
    container.appendChild(div);
  });

  prevBtn.disabled = currentPage === 0;
  nextBtn.classList.toggle("hidden", end >= questions.length);
  submitBtn.classList.toggle("hidden", end < questions.length);
}

// Navigation
prevBtn.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
});

nextBtn.addEventListener("click", () => {
  if ((currentPage + 1) * perPage < questions.length) {
    currentPage++;
    renderPage();
  }
});

// Submit Quiz
submitBtn.addEventListener("click", () => {
  let score = 0;
  questions.forEach(q => {
    const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
    if (selected && selected.value === q.answer) {
      score++;
    }
  });

  alert(`You scored ${score} out of ${questions.length}!`);

  // Save score to IndexedDB
  const tx = db.transaction("quizScores", "readwrite");
  const store = tx.objectStore("quizScores");
  const userName = localStorage.getItem("currentUserName") || "Anonymous Kid";

  store.add({
    user: userName,
    score: score,
    total: questions.length,
    date: new Date().toISOString()
  });
});
