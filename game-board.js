
const practiceArea = document.getElementById('practiceArea');
const scoreDisplay = document.getElementById('scoreDisplay');
const virtualKeyboard = document.getElementById('virtualKeyboard');

let score = 0;
let currentIndex = 0;
let currentLetterIndex = 0;
let currentSequence = [];
let topicType = "";

// Keyboard layouts
const keyboardRowsBase = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l',';'],
  ['z','x','c','v','b','n','m',',','.','/']
];

// Build virtual keyboard (lowercase by default)
function buildKeyboard(shifted = false) {
  virtualKeyboard.innerHTML = '';
  keyboardRowsBase.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('keyboard-row');
    row.forEach(key => {
      const keyDiv = document.createElement('div');
      keyDiv.classList.add('vk-key');
      keyDiv.textContent = shifted ? getShiftedChar(key) : key;
      rowDiv.appendChild(keyDiv);
    });
    virtualKeyboard.appendChild(rowDiv);
  });
}

// Map for shifted characters
function getShiftedChar(ch) {
  const shiftMap = {
    ';': ':',
    ',': '<',
    '.': '>',
    '/': '?'
  };
  if (/[a-z]/.test(ch)) return ch.toUpperCase();
  return shiftMap[ch] || ch;
}
buildKeyboard();

// Highlight keys
function highlightVK(char) {
  const vkKeys = document.querySelectorAll('.vk-key');
  vkKeys.forEach(vk => {
    vk.classList.remove('highlight','correct','wrong');
    vk.style.backgroundColor = '#ccc';
  });

  const key = Array.from(vkKeys).find(k => k.textContent === char);
  if (key) {
    key.classList.add('highlight');
    key.style.backgroundColor = '#ffeb3b';
  }
}

// Enable clickable keys for current sequence
function enableKeysForSequence() {
  const vkKeys = document.querySelectorAll('.vk-key');
  vkKeys.forEach(vk => {
    vk.onclick = null;
    if (currentSequence.length > 0 && currentSequence[currentIndex]) {
      const needed = currentSequence[currentIndex][currentLetterIndex];
      if (vk.textContent === needed) {
        vk.onclick = () => handleInput(vk.textContent);
      }
    }
  });
}

// Show current practice letter
function showCurrentLetter() {
  if (currentIndex >= currentSequence.length) {
    practiceArea.innerHTML = '<p>✅ Well done! You finished this topic.</p>';
    return;
  }

  const currentWord = currentSequence[currentIndex];
  const currentChar = currentWord[currentLetterIndex];

  // Decide if keyboard should be shifted
  const needsShift = /[A-Z:<>?]/.test(currentChar);
  buildKeyboard(needsShift);

  practiceArea.innerHTML = '';
  const keyDiv = document.createElement('div');
  keyDiv.classList.add('key');
  keyDiv.textContent = currentChar;
  practiceArea.appendChild(keyDiv);

  enableKeysForSequence();
  highlightVK(currentChar);
}

// Handle input
function handleInput(input) {
  if (currentIndex >= currentSequence.length) return;
  const currentWord = currentSequence[currentIndex];
  const expectedLetter = currentWord[currentLetterIndex];
  const keyDiv = document.querySelector('.key');

  if (input === expectedLetter) {
    keyDiv.classList.add('correct');
    score++;
    currentLetterIndex++;
    if (currentLetterIndex >= currentWord.length) {
      currentLetterIndex = 0;
      currentIndex++;
    }
    setTimeout(showCurrentLetter, 300);
  } else {
    keyDiv.classList.add('wrong');
    setTimeout(showCurrentLetter, 300);
  }
  scoreDisplay.textContent = `Score: ${score}`;
}

// Listen to real keyboard
document.addEventListener('keydown', e => {
  const key = e.key.length === 1 ? e.key : '';
  handleInput(key);
});

// --- Fetch JSON and load topic ---
async function loadTopic() {
  const urlParams = new URLSearchParams(window.location.search);
  const yearId = urlParams.get('year');
  const termNum = parseInt(urlParams.get('term'));
  const categoryId = urlParams.get('category');
  const topicParam = urlParams.get('topic');

  if (!yearId) {
    practiceArea.innerHTML = "<p>⚠️ Error: No year specified in URL.</p>";
    return;
  }

  try {
    const res = await fetch('data/classes.json');
    const data = await res.json();

    const yearKey = yearId.startsWith('year') ? yearId : `year${yearId}`;
    const year = data.find(y => y.id === yearKey);
    if (!year) {
      practiceArea.innerHTML = `<p>❌ Year ${yearId} not found in JSON.</p>`;
      return;
    }

    const term = year.terms.find(t => t.number === termNum);
    if (!term) return practiceArea.innerHTML = `<p>❌ Term ${termNum} not found.</p>`;

    const category = term.categories.find(c => c.id === categoryId);
    if (!category) return practiceArea.innerHTML = `<p>❌ Category "${categoryId}" not found.</p>`;

    const topic = category.topics.find(t => t.title === topicParam);
    if (!topic) return practiceArea.innerHTML = `<p>❌ Topic "${topicParam}" not found.</p>`;

    topicType = topic.type;
    currentSequence = topic.items;
    showCurrentLetter();

  } catch (err) {
    practiceArea.innerHTML = `<p>⚠️ Error: ${err.message}</p>`;
  }
}

window.focus();
loadTopic();

