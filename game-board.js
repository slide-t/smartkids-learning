document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const year = parseInt(urlParams.get("year")) || 1;
  const termNumber = parseInt(urlParams.get("term")) || 1;
  const categoryId = urlParams.get("category") || "keyboard";
  let topicIndex = parseInt(urlParams.get("topicIndex")) || 0;

  const topicTitleEl = document.getElementById("topic-title");
  const topicDescEl = document.getElementById("topic-description");
  const gameArea = document.getElementById("game-area");
  const timerEl = document.getElementById("timer");

  const prevBtn = document.getElementById("prev-btn");
  const restartBtn = document.getElementById("restart-btn");
  const nextBtn = document.getElementById("next-btn");

  let classesData, currentTopic, timerInterval;

  try {
    const res = await fetch("data/classes.json");
    const data = await res.json();
    classesData = Array.isArray(data) ? data : data.classes;

    loadTopic();

  } catch (err) {
    console.error("Failed to load JSON:", err);
    topicTitleEl.textContent = "Error loading topic.";
  }

  function loadTopic() {
    clearInterval(timerInterval);

    const cls = classesData.find(c => c.id === `year${year}` || c.name.toLowerCase().includes(`year ${year}`));
    if (!cls) return showError();

    const term = (cls.terms || []).find(t => t.number === termNumber);
    if (!term) return showError();

    const category = (term.categories || []).find(cat => cat.id === categoryId);
    if (!category) return showError();

    if (topicIndex < 0) topicIndex = 0;
    if (topicIndex >= (category.topics || []).length) topicIndex = category.topics.length -1;

    currentTopic = category.topics[topicIndex];

    topicTitleEl.textContent = currentTopic.title;
    topicDescEl.textContent = currentTopic.description || "Practice this topic";

    gameArea.innerHTML = `<p class="text-gray-600 font-medium">Start practicing: ${currentTopic.title}</p>`;

    startTimer(currentTopic.time || 180); // default 3 min

    updateButtons(category.topics.length);
  }

  function startTimer(seconds) {
    let remaining = seconds;
    timerEl.textContent = formatTime(remaining);

    timerInterval = setInterval(() => {
      remaining--;
      timerEl.textContent = formatTime(remaining);

      if (remaining <= 0) {
        clearInterval(timerInterval);
        alert("Time's up! Restart or go to next practice.");
      }
    }, 1000);
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function updateButtons(topicCount) {
    prevBtn.disabled = topicIndex === 0;
    nextBtn.disabled = topicIndex === topicCount - 1;
  }

  prevBtn.addEventListener("click", () => {
    topicIndex--;
    loadTopic();
    updateUrl();
  });

  nextBtn.addEventListener("click", () => {
    topicIndex++;
    loadTopic();
    updateUrl();
  });

  restartBtn.addEventListener("click", () => {
    loadTopic();
  });

  function updateUrl() {
    const newUrl = `game-board.html?year=${year}&term=${termNumber}&category=${categoryId}&topicIndex=${topicIndex}`;
    window.history.replaceState({}, "", newUrl);
  }

  function showError() {
    topicTitleEl.textContent = "Topic not found";
    gameArea.innerHTML = "";
    timerEl.textContent = "00:00";
  }

});
