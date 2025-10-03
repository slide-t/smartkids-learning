// quiz.js
// Full-featured quiz engine: category selector, paging (5 per page), per-page grading,
// auto-advance, prev/next, mini report card, save to IndexedDB (quizResults).

(() => {
  // CONFIG
  const QUIZ_JSON = "data/quiz.json";
  const PER_PAGE = 5;
  const DB_NAME = "SmartKidsDB";
  const DB_VERSION = 1;
  const STORE_NAME = "quizResults";

  // STATE
  let allQuestions = [];        // normalized array of {id, category, question, options, answer}
  let filteredQuestions = [];   // questions for selected category
  let currentCategory = "";     // "mouse" | "keyboard" | "ict" ...
  let currentPage = 0;
  let answers = {};             // { questionId: selectedOption }
  let pageResults = [];         // saved page results
  let categoryTotals = {};      // { category: { correct, total } }
  let db;

  // ELEMENTS (from quiz.html)
  const quizForm = document.getElementById("quizForm");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const resultEl = document.getElementById("result");
  const reportCardEl = document.getElementById("reportCard");
  const containerWrapper = document.querySelector(".container") || document.body;

  // Insert category selector above the quiz form
  function injectCategorySelector(categories) {
    // if selector already exists, reuse
    if (document.getElementById("categorySelectorWrap")) return;
    const wrap = document.createElement("div");
    wrap.id = "categorySelectorWrap";
    wrap.className = "mb-4";

    const label = document.createElement("label");
    label.className = "block mb-2 font-semibold";
    label.textContent = "Choose category:";

    const select = document.createElement("select");
    select.id = "categorySelect";
    select.className = "border p-2 rounded w-full sm:w-1/2";

    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-- choose --";
    select.appendChild(emptyOpt);

    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = capitalize(cat);
      select.appendChild(opt);
    });

    wrap.appendChild(label);
    wrap.appendChild(select);

    // insert before quizForm
    quizForm.parentNode.insertBefore(wrap, quizForm);

    select.addEventListener("change", async (e) => {
      const cat = e.target.value;
      if (!cat) return;
      await selectCategory(cat);
    });
  }

  // Helper: capitalize
  function capitalize(s) {
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
  }

  // Toast
  function showToast(msg, duration = 1400) {
    const t = document.createElement("div");
    t.className = "fixed left-1/2 -translate-x-1/2 bottom-10 bg-black text-white px-4 py-2 rounded z-50";
    t.style.opacity = "0";
    t.style.transition = "opacity .15s";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => (t.style.opacity = "1"));
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 200);
    }, duration);
  }

  // IndexedDB helpers
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

  function saveRecord(record) {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error("DB not open"));
      }
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const r = store.add(record);
      r.onsuccess = () => resolve(r.result);
      r.onerror = (e) => reject(e.target.error);
    });
  }

  // Load JSON and normalize into flat array
  async function loadQuizData() {
    try {
      const res = await fetch(QUIZ_JSON, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch quiz data");
      const data = await res.json();

      // If format is { categories: { mouse: [...], keyboard: [...], ict: [...] } }
      if (data && data.categories && typeof data.categories === "object") {
        const cats = Object.keys(data.categories);
        let arr = [];
        cats.forEach(cat => {
          const items = Array.isArray(data.categories[cat]) ? data.categories[cat] : [];
          items.forEach((q, idx) => {
            const id = q.id ?? `${cat}-${idx + 1}`;
            arr.push(normalizeQuestion({ ...q, category: cat, id }));
          });
        });
        allQuestions = arr;
        return { categories: cats, questions: allQuestions };
      }

      // If format is { quiz: [...] }
      if (data && Array.isArray(data.quiz)) {
        allQuestions = data.quiz.map((q, idx) => normalizeQuestion(q, idx));
        const cats = [...new Set(allQuestions.map(q => q.category || "General"))];
        return { categories: cats, questions: allQuestions };
      }

      // If format is flat array
      if (Array.isArray(data)) {
        allQuestions = data.map((q, idx) => normalizeQuestion(q, idx));
        const cats = [...new Set(allQuestions.map(q => q.category || "General"))];
        return { categories: cats, questions: allQuestions };
      }

      throw new Error("Unrecognized quiz.json structure");
    } catch (err) {
      console.error("loadQuizData error:", err);
      quizForm.innerHTML = `<p class="text-red-600">Unable to load quiz data</p>`;
      return { categories: [], questions: [] };
    }
  }

  // Ensure question object has required fields
  function normalizeQuestion(q, fallbackIndex) {
    // q may be object or missing keys
    const id = q.id ?? (fallbackIndex !== undefined ? fallbackIndex + 1 : Math.random().toString(36).slice(2, 9));
    const category = (q.category ?? "General").toString();
    const question = (q.question ?? q.q ?? "QUESTION MISSING").toString();
    const options = Array.isArray(q.options) && q.options.length ? q.options.map(String) : ["Option A", "Option B", "Option C", "Option D"];
    const answer = q.answer ?? options[0];
    return { id, category, question, options, answer };
  }

  // Filter questions by category
  function getQuestionsByCategory(cat) {
    return allQuestions.filter(q => (q.category || "").toLowerCase() === String(cat).toLowerCase());
  }

  // Render current page of filteredQuestions
  function renderPage() {
    // Clear result and report area
    resultEl.textContent = "";
    reportCardEl.classList.add("hidden");

    // Ensure filteredQuestions exists
    if (!Array.isArray(filteredQuestions) || filteredQuestions.length === 0) {
      quizForm.innerHTML = `<p class="text-slate-600">No questions available for this category.</p>`;
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      submitBtn.style.display = "none";
      return;
    }

    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, filteredQuestions.length);
    const pageItems = filteredQuestions.slice(start, end);

    // Build grid of question cards
    quizForm.innerHTML = "";
    pageItems.forEach((q, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "p-4 bg-white rounded shadow-sm";

      const qNum = start + idx + 1;
      const qHtml = `<div class="mb-3 font-semibold">Q${qNum}. <span class="text-sm text-slate-500">[${capitalize(q.category)}]</span> ${escapeHtml(q.question)}</div>`;
      wrapper.innerHTML = qHtml;

      const optsDiv = document.createElement("div");
      optsDiv.className = "space-y-2";

      q.options.forEach(opt => {
        const label = document.createElement("label");
        label.className = "block cursor-pointer";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `q_${q.id}`;
        radio.value = opt;
        radio.className = "mr-2";

        // preselect if answer already stored
        if (answers[q.id] && answers[q.id] === opt) radio.checked = true;

        radio.addEventListener("change", () => {
          answers[q.id] = opt;
        });

        label.appendChild(radio);
        const span = document.createTextNode(opt);
        label.appendChild(span);
        optsDiv.appendChild(label);
      });

      wrapper.appendChild(optsDiv);
      quizForm.appendChild(wrapper);
    });

    // Nav buttons logic
    prevBtn.style.display = currentPage === 0 ? "none" : "";
    const totalPages = Math.ceil(filteredQuestions.length / PER_PAGE);
    nextBtn.style.display = currentPage < totalPages - 1 ? "none" : "none"; // we hide Next while Submit is shown; Next is used to continue after Submit
    submitBtn.style.display = ""; // always show submit for page
  }

  // Evaluate current page
  function evaluateCurrentPage() {
    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, filteredQuestions.length);
    const pageItems = filteredQuestions.slice(start, end);

    let correct = 0;
    const perCategory = {};

    pageItems.forEach(q => {
      const selected = answers[q.id];
      const isCorrect = selected === q.answer;

      if (isCorrect) correct++;

      // update perCategory and global categoryTotals
      const cat = q.category || currentCategory || "General";
      if (!perCategory[cat]) perCategory[cat] = { correct: 0, total: 0 };
      if (!categoryTotals[cat]) categoryTotals[cat] = { correct: 0, total: 0 };

      perCategory[cat].total++;
      categoryTotals[cat].total++;

      if (isCorrect) {
        perCategory[cat].correct++;
        categoryTotals[cat].correct++;
      }
    });

    return { correct, total: pageItems.length, perCategory };
  }

  // On Submit: grade page, save page result, toast, auto-advance or finish
  async function handleSubmit(e) {
    e && e.preventDefault && e.preventDefault();

    // Ensure at least one question on page answered
    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, filteredQuestions.length);
    const pageItems = filteredQuestions.slice(start, end);
    const answeredCount = pageItems.filter(q => answers[q.id] !== undefined).length;
    if (answeredCount === 0) {
      showToast("Please answer at least one question on this page.");
      return;
    }

    const res = evaluateCurrentPage();
    pageResults.push({
      pageIndex: currentPage,
      correct: res.correct,
      total: res.total,
      perCategory: res.perCategory,
      timestamp: Date.now()
    });

    // Save page record
    try {
      const userName = localStorage.getItem("currentUserName") || "Anonymous Kid";
      await saveRecord({
        type: "page",
        user: userName,
        category: currentCategory,
        pageIndex: currentPage,
        correct: res.correct,
        total: res.total,
        perCategory: res.perCategory,
        date: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Failed saving page record:", err);
    }

    showToast(`Page score: ${res.correct}/${res.total}`, 1300);

    // auto-advance after short pause
    const totalPages = Math.ceil(filteredQuestions.length / PER_PAGE);
    if (currentPage < totalPages - 1) {
      // move to next page after a slight delay so toast visible
      setTimeout(() => {
        currentPage++;
        renderPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 600);
    } else {
      // finished all pages -> show final report
      setTimeout(() => showFinalReport(), 700);
    }
  }

  // Show final report and save summary
  async function showFinalReport() {
    // Total questions & correct across answers
    const totalQuestions = filteredQuestions.length;
    let totalCorrect = 0;
    filteredQuestions.forEach(q => {
      if (answers[q.id] === q.answer) totalCorrect++;
    });

    // Ensure categories presence
    filteredQuestions.forEach(q => {
      if (!categoryTotals[q.category]) categoryTotals[q.category] = { correct: 0, total: 0 };
    });

    // Render mini report card
    reportCardEl.innerHTML = `
