function renderGameArea(topic) {
  if (topic.type === "keyboard") {
    renderKeyboardPractice(topic);
  } else if (topic.type === "mouse") {
    renderMousePractice(topic);
  } else {
    gameArea.innerHTML = `<p class="text-gray-600 font-medium">${topic.description}</p>`;
  }
}

// --- Keyboard Practice ---
function renderKeyboardPractice(topic) {
  const keys = topic.title.toLowerCase().includes("home row") ? ["a","s","d","f","j","k","l",";"] : ["q","w","e","r","t","y","u","i","o","p"];
  gameArea.innerHTML = `
    <p class="mb-4 text-lg font-semibold">Type the following letters repeatedly:</p>
    <div id="key-display" class="text-2xl font-bold mb-4">${keys.join(" ")}</div>
    <input id="keyboard-input" class="border rounded p-2 w-full text-center text-xl" autofocus placeholder="Type here..." />
    <div id="feedback" class="mt-2 text-green-600 font-bold"></div>
  `;

  const input = document.getElementById("keyboard-input");
  const display = document.getElementById("key-display");
  const feedback = document.getElementById("feedback");
  let pos = 0;

  input.value = "";
  input.focus();

  input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    const currentKey = keys[pos];

    if (val.slice(-1) === currentKey) {
      pos++;
      feedback.textContent = `Good! Next key: ${keys[pos] || "Completed!"}`;
      if (pos >= keys.length) pos = 0; // Loop
    } else {
      feedback.textContent = `Oops! Try again.`;
    }
  });
}

// --- Mouse Practice ---
function renderMousePractice(topic) {
  gameArea.innerHTML = `
    <p class="mb-4 text-lg font-semibold">Click the circles as they appear!</p>
    <div id="mouse-area" class="relative w-full h-64 border rounded bg-gray-100 overflow-hidden"></div>
    <div id="score" class="mt-2 text-green-600 font-bold">Score: 0</div>
  `;

  const area = document.getElementById("mouse-area");
  const scoreEl = document.getElementById("score");
  let score = 0;

  function spawnCircle() {
    const circle = document.createElement("div");
    circle.className = "absolute bg-blue-500 rounded-full w-10 h-10 cursor-pointer";
    const maxX = area.clientWidth - 40;
    const maxY = area.clientHeight - 40;
    circle.style.left = Math.floor(Math.random() * maxX) + "px";
    circle.style.top = Math.floor(Math.random() * maxY) + "px";

    circle.addEventListener("click", () => {
      score++;
      scoreEl.textContent = `Score: ${score}`;
      area.removeChild(circle);
      spawnCircle(); // Spawn next
    });

    area.appendChild(circle);
  }

  spawnCircle();
}
