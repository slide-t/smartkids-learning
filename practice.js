<script>
const practiceArea = document.getElementById('practiceArea');
const scoreDisplay = document.getElementById('scoreDisplay');
const virtualKeyboard = document.getElementById('virtualKeyboard');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const tooltip = document.getElementById('tooltip');
const timerDisplay = document.getElementById('timerDisplay');

let score = 0, currentIndex = 0, currentLetterIndex = 0, currentSequence = [], activeKeys = [];
let timer = null, timerSeconds = 0;

const params = new URLSearchParams(window.location.search);
const classId = params.get('classId');
const termNumber = parseInt(params.get('term')) || 1;
const catId = params.get('catId');
let topicIndex = parseInt(params.get('topic')) || 0;

let classesData = [];

// Keyboard layout
const keyboardRows = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L',';'],
  ['Z','X','C','V','B','N','M',' ',',','.']
];

// Highlight virtual keyboard
function highlightVK(keyChar,type='reset'){
  document.querySelectorAll('.vk-key').forEach(vk=>{
    vk.classList.remove('vk-active','correct','wrong');
    vk.style.backgroundColor='#ccc';
  });
  const vk = Array.from(document.querySelectorAll('.vk-key')).find(k=>k.textContent.toLowerCase() === keyChar.toLowerCase());
  if(vk){
    vk.classList.add('vk-active');
    if(type==='correct') vk.style.backgroundColor='#4CAF50';
    if(type==='wrong') vk.style.backgroundColor='#f44336';
  }
}

// Build virtual keyboard
function buildVirtualKeyboard(){
  virtualKeyboard.innerHTML = '';
  keyboardRows.forEach(row=>{
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('vk-row');
    row.forEach(k=>{
      const keyDiv = document.createElement('div');
      keyDiv.classList.add('vk-key');
      keyDiv.textContent = k;
      keyDiv.addEventListener('click', ()=> handleInput(k));
      rowDiv.appendChild(keyDiv);
    });
    virtualKeyboard.appendChild(rowDiv);
  });
}

// Show sample
function showCurrentSample(){
  if(currentIndex >= currentSequence.length){
    practiceArea.innerHTML = '<p>🎉 Well done! You finished this topic.</p>';
    highlightVK('');
    restartBtn.style.display = "inline-block";
    clearInterval(timer);
    return;
  }

  restartBtn.style.display = "none";
  const sample = currentSequence[currentIndex];
  practiceArea.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';

  sample.split('').forEach((char,idx)=>{
    const span = document.createElement('span');
    span.textContent = char;
    span.style.padding = "0 2px";
    if(idx === currentLetterIndex) span.style.background="#ffeb3b";
    if(idx < currentLetterIndex) span.style.color="green";
    wrapper.appendChild(span);
  });

  practiceArea.appendChild(wrapper);
  highlightVK(sample[currentLetterIndex] || '','reset');
}

// Handle input
function handleInput(input){
  if(currentIndex >= currentSequence.length) return;
  const currentSample = currentSequence[currentIndex];
  const expectedChar = currentSample[currentLetterIndex] || '';
  
  if(input === expectedChar){
    score++;
    currentLetterIndex++;
    if(currentLetterIndex >= currentSample.length){
      currentLetterIndex = 0;
      currentIndex++;
    }
  } else {
    highlightVK(input,'wrong');
  }

  showCurrentSample();
  scoreDisplay.textContent = `Score: ${score}`;
}

// Timer
function startTimer(){
  clearInterval(timer);
  timerSeconds = 0;
  timerDisplay.textContent = `Time: 0s`;
  timer = setInterval(()=>{
    timerSeconds++;
    timerDisplay.textContent = `Time: ${timerSeconds}s`;
  },1000);
}

// Tooltip
function showTooltip(message){
  tooltip.textContent = message;
  tooltip.classList.add('show');
  setTimeout(()=> tooltip.classList.remove('show'), 4000);
}

// Load topic
function loadTopic(){
  const cls = classesData.find(c=>c.id===classId);
  if(!cls){ practiceArea.innerHTML='<p style="color:red;">Class not found</p>'; return; }
  const term = cls.terms.find(t=>t.number===termNumber);
  if(!term){ practiceArea.innerHTML='<p style="color:red;">Term not found</p>'; return; }
  const category = term.categories.find(c=>c.id===catId);
  if(!category){ practiceArea.innerHTML='<p style="color:red;">Category not found</p>'; return; }
  const topic = category.topics[topicIndex];
  if(!topic){ practiceArea.innerHTML='<p style="color:red;">Topic not found</p>'; return; }

  currentSequence = topic.items || [];
  activeKeys = [...new Set(currentSequence.join('').toLowerCase().split(''))];

  buildVirtualKeyboard();
  currentIndex = 0; currentLetterIndex = 0; score = 0;
  scoreDisplay.textContent = `Score: ${score}`;
  showCurrentSample();
  showTooltip(topic.description || `Practice: ${topic.title}`);
  startTimer();
}

// Navigation
prevBtn.addEventListener('click', ()=>{
  if(topicIndex > 0){ topicIndex--; loadTopic(); }
});
nextBtn.addEventListener('click', ()=>{
  const cls = classesData.find(c=>c.id===classId);
  const term = cls.terms.find(t=>t.number===termNumber);
  const category = term.categories.find(c=>c.id===catId);
  if(topicIndex < category.topics.length -1){ topicIndex++; loadTopic(); }
});

// Restart
restartBtn.addEventListener('click', ()=> loadTopic());

// Real keyboard
document.addEventListener('keydown', e=>{
  if(e.key.length === 1 || e.key === ' '){
    handleInput(e.key);
  }
});

// Fetch JSON
fetch('./data/classes.json')
  .then(res=>res.json())
  .then(data=>{
    classesData = Array.isArray(data) ? data : data.classes;
    loadTopic();
  })
  .catch(err=>{
    practiceArea.innerHTML = `<p style="color:red;">Failed to load classes.json</p>`;
    console.error(err);
  });
</script>
