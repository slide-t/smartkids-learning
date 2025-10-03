// quiz.js
// Quiz logic: paging (5 per page), per-page scoring, final report card, save to IndexedDB

(() => {
  // CONFIG
  const QUIZ_JSON = "data/quiz.json";
  const PER_PAGE = 5;
  const DB_NAME = "SmartKidsDB";
  const DB_VERSION = 1;
  const STORE_NAME = "quizScores";

  // STATE
  let questions = [];              // full list loaded from JSON
  let currentPage = 0;             // 0-based page index
  let answers = {};                // { questionId: selectedOption }
  let pageResults = [];            // per-page results: [{ pageIndex, correct, total }]
  let categoryTotals = {};         // { category: { correct, total } }
  let db;

  // UI elements (assume these exist in quiz.html)
  const formEl = document.getElementById("quizForm") || document.getElementById("quizForm") /* fallback */;
  const container = formEl || document.getElementById("quiz-container") || document.getElementById("quizForm");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const resultEl = document.getElementById("result");
  const reportCardEl = document.getElementById("reportCard");

  // helper: create toast message (small ephemeral notification)
  function showToast(message, opts = {}) {
    const toast = document.createElement("div");
    toast.className = "fixed left-1/2 transform -translate-x-1/2 bottom-10 bg-black text-white px-4 py-2 rounded shadow-lg z-50";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 200ms";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = "1"; });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, opts.duration || 1400);
  }

  // IndexedDB setup
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains(STORE_NAME)) {
          idb.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function saveToDB(record) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error("DB not open"));
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const r = store.add(record);
      r.onsuccess = () => resolve(r.result);
      r.onerror = (e) => reject(e.target.error);
    });
  }

  // Load quiz JSON
  async function loadQuiz() {
    try {
      const res = await fetch(QUIZ_JSON);
      if (!res.ok) throw new Error("Failed to fetch quiz.json");
      const data = await res.json();

      // Accept both array root or object with quiz prop
      if (Array.isArray(data)) {
        questions = data;
      } else if (Array.isArray(data.quiz)) {
        questions = data.quiz;
      } else {
        console.error("Unexpected quiz.json format. Expected array or {quiz:[]}");
        questions = [];
      }

      // Basic sanitization: ensure required fields exist, filter out bad items
      questions = questions
        .map((q, idx) => {
          // Normalize
          const id = q.id ?? idx + 1;
          const category = q.category ?? "General";
          const question = q.question ?? "QUESTION MISSING";
          const options = Array.isArray(q.options) && q.options.length ? q.options : ["Option A", "Option B", "Option C", "Option D"];
          const answer = q.answer ?? options[0];
          return { id, category, question, options, answer };
        })
        .filter(Boolean);

      // Render first page
      renderPage();
    } catch (err) {
      console.error("loadQuiz error:", err);
      container.innerHTML = `<p class="text-red-600">Unable to load quiz. Try again later.</p>`;
    }
  }

  // Render page of questions
  function renderPage() {
    // container may be form (quizForm) or div (quiz-container)
    if (!container) {
      console.error("No container element found for quiz rendering.");
      return;
    }

    container.innerHTML = "";

    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, questions.length);
    const pageItems = questions.slice(start, end);

    // grid layout classes: mobile stacked, desktop 2 columns handled via tailwind classes in markup
    pageItems.forEach((q, i) => {
      const wrapper = document.createElement("div");
      wrapper.className = "border rounded p-4 bg-white shadow-sm";

      // question header
      const qNum = start + i + 1;
      const safeText = escapeHtml(q.question);
      wrapper.innerHTML = `<div class="mb-2 font-semibold">Q${qNum} <span class="text-sm text-slate-500">[${escapeHtml(q.category)}]</span>: ${safeText}</div>`;

      // options form
      const optionsDiv = document.createElement("div");
      optionsDiv.className = "space-y-2";
      q.options.forEach(opt => {
        const optId = `q${q.id}__${sanitizeId(opt)}`;
        const label = document.createElement("label");
        label.className = "flex items-center gap-2 cursor-pointer";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `q${q.id}`;
        radio.value = opt;
        radio.checked = (answers[q.id] === opt);

        // preserve selection when clicked
        radio.addEventListener("change", () => {
          answers[q.id] = opt;
        });

        const span = document.createElement("span");
        span.textContent = opt;

        label.appendChild(radio);
        label.appendChild(span);
        optionsDiv.appendChild(label);
      });

      wrapper.appendChild(optionsDiv);
      container.appendChild(wrapper);
    });

    // update nav buttons visibility
    updateNavButtons();
  }

  function updateNavButtons() {
    const totalPages = Math.ceil(questions.length / PER_PAGE);
    if (prevBtn) prevBtn.style.display = currentPage === 0 ? "none" : "";
    if (nextBtn) nextBtn.style.display = (currentPage < totalPages - 1) ? "" : "none";
    if (submitBtn) submitBtn.style.display = (currentPage === totalPages - 1) ? "" : "";
  }

  // sanitize strings for id attr
  function sanitizeId(s) {
    return String(s).replace(/[^a-z0-9-_]/gi, "_");
  }

  // basic escaping for HTML content
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Handle previous / next
  function goPrevious() {
    if (currentPage === 0) return;
    currentPage--;
    renderPage();
  }
  function goNext() {
    const totalPages = Math.ceil(questions.length / PER_PAGE);
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderPage();
    }
  }

  // Evaluate current page, return { correct, total, perCategory: {cat:{correct,total}} }
  function evaluateCurrentPage() {
    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, questions.length);
    const pageItems = questions.slice(start, end);

    let correct = 0;
    const perCategory = {};

    pageItems.forEach(q => {
      const selected = answers[q.id];
      const isCorrect = selected === q.answer;
      if (isCorrect) correct++;

      // aggregate per-category
      if (!perCategory[q.category]) perCategory[q.category] = { correct: 0, total: 0 };
      if (!categoryTotals[q.category]) categoryTotals[q.category] = { correct: 0, total: 0 };

      perCategory[q.category].total++;
      categoryTotals[q.category].total++;

      if (isCorrect) {
        perCategory[q.category].correct++;
        categoryTotals[q.category].correct++;
      }
    });

    return { correct, total: pageItems.length, perCategory };
  }

  // On page submit: evaluate, save page result, show toast, auto-advance or finish
  async function handleSubmitPage() {
    // ensure at least one option selected on page
    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, questions.length);
    const pageItems = questions.slice(start, end);
    const anySelected = pageItems.some(q => answers[q.id] !== undefined);

    if (!anySelected) {
      showToast("Please answer at least one question on this page.");
      return;
    }

    const result = evaluateCurrentPage();
    pageResults.push({
      pageIndex: currentPage,
      correct: result.correct,
      total: result.total,
      perCategory: result.perCategory,
      timestamp: Date.now()
    });

    showToast(`Page ${currentPage + 1} score: ${result.correct}/${result.total}`, { duration: 1500 });

    // Save page result to DB (optional) - we save page-level as well
    try {
      const userName = localStorage.getItem("currentUserName") || "Anonymous Kid";
      await saveToDB({
        type: "pageResult",
        user: userName,
        pageIndex: currentPage,
        correct: result.correct,
        total: result.total,
        perCategory: result.perCategory,
        date: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Failed saving page result:", err);
    }

    // Move next or finish
    const totalPages = Math.ceil(questions.length / PER_PAGE);
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderPage();
      // scroll to top so next questions visible
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Finished all pages
      showFinalReport();
    }
  }

  // Build and show final report card, save final summary to DB
  async function showFinalReport() {
    // compute totals
    const totalQuestions = questions.length;
    const totalCorrect = Object.keys(answers).reduce((acc, qid) => {
      const q = questions.find(x => String(x.id) === String(qid));
      if (!q) return acc;
      return acc + (answers[qid] === q.answer ? 1 : 0);
    }, 0);

    // ensure categories present in categoryTotals even if zero
    questions.forEach(q => {
      if (!categoryTotals[q.category]) categoryTotals[q.category] = { correct: 0, total: 0 };
    });

    // render
    const userName = localStorage.getItem("currentUserName") || "Anonymous Kid";
    reportCardEl.innerHTML = `
      <h3 class="text-lg font-semibold mb-2">Mini Report Card</h3>
      <p><strong>Kid:</strong> ${escapeHtml(userName)}</p>
      <p class="mt-2"><strong>Total Score:</strong> ${totalCorrect} / ${totalQuestions}</p>
      <div class="mt-3">
        <h4 class="font-medium">Category breakdown:</h4>
        <ul class="list-disc ml-5 mt-2">
          ${Object.keys(categoryTotals).map(cat => {
            const c = categoryTotals[cat];
            return `<li>${escapeHtml(cat)}: ${c.correct} / ${c.total}</li>`;
          }).join("")}
        </ul>
      </div>
      <div class="mt-4 text-sm text-slate-600">Saved to history.</div>
    `;
    reportCardEl.classList.remove("hidden");
    resultEl && (resultEl.textContent = `You scored ${totalCorrect}/${totalQuestions}`);

    // Save final summary to DB
    try {
      await saveToDB({
        type: "finalResult",
        user: userName,
        totalCorrect,
        totalQuestions,
        categoryTotals,
        pages: pageResults,
        date: new Date().toISOString()
      });
      showToast("Results saved.");
    } catch (err) {
      console.warn("Failed to save final result:", err);
    }
  }

  // Prev button handler (optional: allow going back to re-answer; note page results already saved)
  function handlePrev() {
    if (currentPage === 0) return;
    currentPage--;
    renderPage();
  }

  // attach events
  if (prevBtn) prevBtn.addEventListener("click", handlePrev);
  if (nextBtn) nextBtn.addEventListener("click", () => goNext());
  if (submitBtn) submitBtn.addEventListener("click", () => handleSubmitPage());

  // initialize DB & load quiz
  (async function init() {
    try {
      await openDB();
    } catch (err) {
      console.warn("IndexedDB unavailable:", err);
    }
    await loadQuiz();
    // restore any saved in-memory answers if desired (we're not persisting answers across refresh)
  })();

})();
