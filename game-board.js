document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const yearId = urlParams.get("year");
  const termNum = parseInt(urlParams.get("term"));
  const categoryId = urlParams.get("category");
  const topicIndex = parseInt(urlParams.get("topic"));

  const titleEl = document.getElementById("topic-title");
  const instructionEl = document.getElementById("topic-instruction");
  const promptEl = document.getElementById("prompt");
  const inputEl = document.getElementById("input");
  const feedbackEl = document.getElementById("feedback");
  const keyboardEl = document.getElementById("virtual-keyboard");

  let samples = [];
  let currentIndex = 0;
  let shiftActive = false;

  // Base keyboard layout
  const keyboardLayout = [
    ["`","1","2","3","4","5","6","7","8","9","0","-","=","Backspace"],
    ["Tab","q","w","e","r","t","y","u","i","o","p","[","]","\\"],
    ["CapsLock","a","s","d","f","g","h","j","k","l",";","'","Enter"],
    ["Shift","z","x","c","v","b","n","m",",",".","/","Shift"],
    ["Space"]
  ];

  // Shifted symbols for top row and punctuation
  const shiftedMap = {
    "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
    "6": "^", "7": "&", "8": "*", "9": "(", "0": ")",
    "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|",
    ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?"
  };

  // Load JSON
  fetch("data/classes.json")
    .then(res => res.json())
    .then(data => {
      const year = data.classes.find(c => c.id === yearId);
      if (!year) return showError("Year not found");

      const term = year.terms.find(t => t.number === termNum);
      if (!term) return showError("Term not found");

      const category = term.categories.find(cat => cat.id === categoryId);
      if (!category) return showError("Category not found");

      const topic = category.topics[topicIndex];
      if (!topic) return showError("Topic not found");

      titleEl.textContent = topic.title;
      instructionEl.textContent = topic.instruction;
      samples = topic.samples;
      loadPrompt();

      buildKeyboard();
    })
    .catch(() => showError("Error loading classes.json"));

  function showError(msg) {
    document.getElementById("game-board").innerHTML =
      `<p class="text-red-500">${msg}</p>`;
  }

  function loadPrompt() {
    if (currentIndex < samples.length) {
      promptEl.textContent = samples[currentIndex];
      inputEl.value = "";
      feedbackEl.textContent = "";
      inputEl.focus();
    } else {
      promptEl.textContent = "🎉 Well done! You finished this topic.";
      inputEl.disabled = true;
    }
  }

  function checkInput() {
    if (inputEl.value === samples[currentIndex]) {
      feedbackEl.textContent = "✅ Correct!";
      feedbackEl.className = "text-green-600 text-center";
      currentIndex++;
      setTimeout(loadPrompt, 1000);
    } else {
      feedbackEl.textContent = "❌ Try again.";
      feedbackEl.className = "text-red-600 text-center";
    }
  }

  inputEl.addEventListener("keyup", e => {
    if (e.key === "Enter") checkInput();
  });

  function buildKeyboard() {
    keyboardEl.innerHTML = ""; // clear previous
    keyboardLayout.forEach(row => {
      const rowEl = document.createElement("div");
      rowEl.classList.add("keyboard-row");

      row.forEach(key => {
        const keyEl = document.createElement("div");
        let display = getDisplayKey(key);
        keyEl.textContent = display;
        keyEl.classList.add("key");

        if (["Backspace","Enter","Shift","CapsLock","Tab"].includes(key)) {
          keyEl.classList.add("wide");
        }
        if (key === "Space") {
          keyEl.classList.add("extra-wide");
          keyEl.textContent = "␣";
        }

        keyEl.addEventListener("click", () => handleVirtualKey(key));
        rowEl.appendChild(keyEl);
      });

      keyboardEl.appendChild(rowEl);
    });

    document.addEventListener("keydown", e => toggleKeyHighlight(e.key, true));
    document.addEventListener("keyup", e => toggleKeyHighlight(e.key, false));
  }

  function getDisplayKey(key) {
    if (key === "Space") return "␣";
    if (shiftActive) {
      if (shiftedMap[key]) return shiftedMap[key];
      if (key.length === 1) return key.toUpperCase();
    }
    return key;
  }

  function handleVirtualKey(key) {
    if (key === "Backspace") {
      inputEl.value = inputEl.value.slice(0, -1);
    } else if (key === "Space") {
      inputEl.value += " ";
    } else if (key === "Enter") {
      checkInput();
    } else if (key === "Shift") {
      shiftActive = !shiftActive;
      buildKeyboard(); // rebuild with shift applied
    } else if (!["CapsLock","Tab"].includes(key)) {
      let char = shiftActive ? getDisplayKey(key) : key;
      if (char.length === 1) inputEl.value += char;
    }
    inputEl.focus();
  }

  function toggleKeyHighlight(key, active) {
    const normalized = key === " " ? "␣" : key;
    const match = [...keyboardEl.querySelectorAll(".key")]
      .find(k => k.textContent.toLowerCase() === normalized.toLowerCase());
    if (match) {
      if (active) match.classList.add("active");
      else match.classList.remove("active");
    }
  }

  document.getElementById("back-btn").addEventListener("click", () => window.history.back());
  document.getElementById("home-btn").addEventListener("click", () => window.location.href = "index.html");
});
