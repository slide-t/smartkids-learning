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
let totalScore = 0;
let categoryScores = {};

const container = document.getElementById("quiz-container");
const submitBtn = document.getElementById("submitBtn");
const reportCard = document.getElementById("report-card");
const reportUser = document.getElementById("report-user");
const reportTotal = document.getElementById("report-total");
const reportBreakdown = document.getElementById("report-breakdown");

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
  const end = Math.min(start + perPage, questions.length);
  const pageQuestions = questions.slice(start, end);

  pageQuestions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "p-4 bg-white shadow rounded";
    div.innerHTML = `
      <p class="font-semibold mb-2">${start + i + 1}. [${q.category}] ${q.question}</p>
      ${q.options.map(opt => `
        <label class="block">
          <input type="radio" name="q${q.id}" value="${opt}" class="mr-2"> ${opt}
        </label>
      `).join("")}
    `;
    container.appendChild(div);
  });
}

// Submit button logic
submitBtn.addEventListener("click", () => {
  const start = currentPage * perPage;
  const end = Math.min(start + perPage, questions.length);
  const pageQuestions = questions.slice(start, end);

  let pageScore = 0;
  pageQuestions.forEach(q => {
    const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
    if (selected && selected.value === q.answer) {
      pageScore++;
      totalScore++;

      // Track per-category
      if (!categoryScores[q.category]) {
        categoryScores[q.category] = { correct: 0, total: 0 };
      }
      categoryScores[q.category].correct++;
    }
    if (!categoryScores[q.category]) {
      categoryScores[q.category] = { correct: 0, total: 0 };
    }
    categoryScores[q.category].total++;
  });

  alert(`Page Score: ${pageScore}/${pageQuestions.length}`);

  // Move to next page OR finish
  currentPage++;
  if (currentPage * perPage < questions.length) {
    renderPage();
  } else {
    showReportCard();
    saveToIndexedDB();
  }
});

// Report Card
function showReportCard() {
  reportCard.classList.remove("hidden");
  const userName = localStorage.getItem("currentUserName") || "Anonymous Kid";

  reportUser.textContent = `Kid: ${userName}`;
  reportTotal.textContent = `Total Score: ${totalScore}/${questions.length}`;

  reportBreakdown.innerHTML = Object.keys(categoryScores).map(cat =>
    `<p>${cat}: ${categoryScores[cat].correct}/${categoryScores[cat].total}</p>`
  ).join("");
}

// Save to IndexedDB
function saveToIndexedDB() {
  const tx = db.transaction("quizScores", "readwrite");
  const store = tx.objectStore("quizScores");
  const userName = localStorage.getItem("currentUserName") || "Anonymous Kid";

  store.add({
    user: userName,
    totalScore,
    totalQuestions: questions.length,
    categories: categoryScores,
    date: new Date().toISOString()
  });
}
