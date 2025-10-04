// quiz.js
document.addEventListener("DOMContentLoaded", () => {
  const quizForm = document.getElementById("quizForm");
  const submitBtn = document.getElementById("submitBtn");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const resultDiv = document.getElementById("result");
  const reportCard = document.getElementById("reportCard");

  let db;
  const DB_NAME = "SmartKidsDB";
  const STORE_NAME = "quizScores";

  let questions = [];
  let currentPage = 0;
  const pageSize = 5;
  let totalScore = 0;

  // Open IndexedDB for storing quiz scores
  function openDB() {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
    };
    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.errorCode);
    };
  }
  openDB();

  // Save score to DB
  function saveScore(category, score, total) {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const userId = localStorage.getItem("currentUserId") || "guest";
    const userName = localStorage.getItem("currentUserName") || "Guest";

    const record = {
      userId,
      userName,
      category,
      score,
      total,
      timestamp: new Date().toISOString()
    };

    store.add(record);
  }

  // Load quiz.json
  fetch("data/quiz.json")
    .then((res) => res.json())
    .then((data) => {
      questions = data;
      showPage();
    })
    .catch((err) => console.error("Error loading quiz.json", err));

  // Show 5 questions per page
  function showPage() {
    quizForm.innerHTML = "";
    resultDiv.textContent = "";

    const start = currentPage * pageSize;
    const end = start + pageSize;
    const pageQuestions = questions.slice(start, end);

    pageQuestions.forEach((q, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "bg-white p-4 rounded shadow";

      const label = document.createElement("label");
      label.className = "block font-semibold mb-2";
      label.textContent = `${start + index + 1}. ${q.question}`;

      const select = document.createElement("select");
      select.name = q.id;
      select.className = "w-full border rounded p-2";
      select.innerHTML = `<option value="">-- Select an answer --</option>`;
      q.options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(select);
      quizForm.appendChild(wrapper);
    });

    prevBtn.classList.toggle("hidden", currentPage === 0);
    nextBtn.classList.add("hidden");
    submitBtn.classList.remove("hidden");
  }

  // Submit answers
  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const start = currentPage * pageSize;
    const end = start + pageSize;
    const pageQuestions = questions.slice(start, end);

    let score = 0;
    pageQuestions.forEach((q) => {
      const selected = quizForm.querySelector(`select[name="${q.id}"]`).value;
      if (selected === q.answer) score++;
    });

    totalScore += score;
    resultDiv.textContent = `You scored ${score} out of ${pageQuestions.length} on this page.`;

    if (end >= questions.length) {
      // All questions done
      submitBtn.classList.add("hidden");
      showReport();
    } else {
      submitBtn.classList.add("hidden");
      nextBtn.classList.remove("hidden");
    }
  });

  // Next page
  nextBtn.addEventListener("click", () => {
    currentPage++;
    showPage();
  });

  // Previous page
  prevBtn.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      showPage();
    }
  });

  // Show mini report card
  function showReport() {
    reportCard.classList.remove("hidden");

    const totalQuestions = questions.length;
    const percent = Math.round((totalScore / totalQuestions) * 100);
    const userName = localStorage.getItem("currentUserName") || "Guest";

    reportCard.innerHTML = `
      <h3 class="text-xl font-bold mb-2">Report Card</h3>
      <p><strong>Name:</strong> ${userName}</p>
      <p><strong>Total Score:</strong> ${totalScore} / ${totalQuestions} (${percent}%)</p>
    `;

    saveScore("General Quiz", totalScore, totalQuestions);
  }
});
