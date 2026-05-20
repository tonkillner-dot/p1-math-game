/**
 * game-common.js — ฟังก์ชันกลางของเกมเปรียบเทียบจำนวน ป.1
 * สร้างโดย ครูนภรัฐ | P.1 Math Game 2025
 */

// ─── Audio Context ───────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _ctx = null;

function getAudio() {
  if (!_ctx) _ctx = new AudioCtx();
  return _ctx;
}

function playTone(freq, type, duration, vol = 0.25, delay = 0) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) { /* ignore */ }
}

const SFX = {
  click() {
    playTone(440, 'square', 0.08, 0.15);
  },
  correct() {
    playTone(523, 'square', 0.12, 0.2);
    playTone(659, 'square', 0.12, 0.2, 0.13);
    playTone(784, 'square', 0.18, 0.2, 0.26);
  },
  wrong() {
    playTone(220, 'sawtooth', 0.15, 0.3);
    playTone(160, 'sawtooth', 0.15, 0.3, 0.16);
  },
  match() {
    playTone(600, 'square', 0.1, 0.15);
    playTone(800, 'square', 0.1, 0.15, 0.1);
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'square', 0.18, 0.2, i * 0.12));
  },
  hit() {
    playTone(180, 'sawtooth', 0.2, 0.4);
    playTone(120, 'sawtooth', 0.15, 0.35, 0.1);
  },
  select() {
    playTone(392, 'square', 0.07, 0.1);
  },
  victory() {
    const melody = [523, 523, 784, 784, 880, 880, 784, 0, 698, 698, 659, 659, 587, 587, 523];
    melody.forEach((f, i) => {
      if (f > 0) playTone(f, 'square', 0.14, 0.18, i * 0.16);
    });
  }
};

// ─── Progress / localStorage ──────────────────────────────
const STORAGE_KEY = 'p1_comparison_game';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { stages: {} };
  } catch { return { stages: {} }; }
}

function saveProgress(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function getStageData(stage) {
  const p = loadProgress();
  return p.stages[stage] || { completed: false, score: 0, stars: 0 };
}

function setStageData(stage, score, total) {
  const p = loadProgress();
  const stars = score >= total ? 3 : score >= Math.ceil(total * 0.8) ? 2 : 1;
  const existing = p.stages[stage] || { completed: false, score: 0, stars: 0 };
  p.stages[stage] = {
    completed: score >= Math.ceil(total * 0.8),
    score: Math.max(existing.score, score),
    stars: Math.max(existing.stars, stars)
  };
  saveProgress(p);
  return p.stages[stage];
}

function isStageUnlocked(stage) {
  return true;
}

// ─── Random Helpers ───────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Stars Generator ──────────────────────────────────────
function renderStars(count) {
  return '★'.repeat(count) + '☆'.repeat(3 - count);
}

// ─── Generate stars background ───────────────────────────
function generateStars(containerId = 'stars') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const count = 40;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    const size = randInt(2, 4);
    s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${randInt(0, 100)}%; top:${randInt(0, 100)}%;
      animation-delay:${(Math.random() * 2).toFixed(2)}s;
      animation-duration:${(1.5 + Math.random() * 2).toFixed(2)}s;
    `;
    el.appendChild(s);
  }
}

// ─── Feedback Popup ───────────────────────────────────────
function showFeedback(correct, correctText, wrongText, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'feedback-overlay';
  overlay.innerHTML = `
    <div class="feedback-box">
      <div class="feedback-emoji">${correct ? '🎉' : '💪'}</div>
      <div class="feedback-text">${correct ? correctText : wrongText}</div>
      <button class="btn-pixel ${correct ? 'green' : 'blue'}" id="feedbackNext">
        ${correct ? 'ต่อไป ►' : 'ลองใหม่ ►'}
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('feedbackNext').addEventListener('click', () => {
    SFX.click();
    overlay.remove();
    onDone();
  });
}

// ─── Result Screen ────────────────────────────────────────
function showResult(stage, score, total, stageFile) {
  const data = setStageData(stage, score, total);
  const passed = data.completed;

  const screen = document.querySelector('.screen');
  screen.innerHTML = `
    <div class="result-screen">
      <div class="result-trophy">${passed ? '🏆' : '🌟'}</div>
      <div class="result-title">${passed ? 'เก่งมาก!' : 'พยายามต่อไป!'}</div>
      <div class="result-score">
        ${score} / ${total} คะแนน
        <br><br>
        <span style="color:var(--accent)">${renderStars(data.stars)}</span>
      </div>
      <div class="answer-row" style="margin-top:0">
        <button class="btn-pixel blue" id="retryBtn">เล่นอีกครั้ง</button>
        <button class="btn-pixel green" id="homeBtn">หน้าหลัก</button>
      </div>
    </div>
  `;

  if (passed) SFX.victory(); else SFX.wrong();

  document.getElementById('retryBtn').onclick = () => {
    SFX.click();
    window.location.reload();
  };
  document.getElementById('homeBtn').onclick = () => {
    SFX.click();
    window.location.href = 'index.html';
  };
}

// ─── Update progress bar ───────────────────────────────────
function updateProgressBar(current, total) {
  const bar = document.getElementById('progressFill');
  if (bar) bar.style.width = ((current / total) * 100) + '%';
  const counter = document.getElementById('questionCounter');
  if (counter) counter.textContent = `ข้อ ${current} / ${total}`;
}

// ─── Objects pool ─────────────────────────────────────────
const EMOJI_SETS = [
  { items: ['🍎','🍊','🍋','🍇','🍓'], container: '🧺' },
  { items: ['⭐','🌙','☀️','🌈','❄️'], container: '🎁' },
  { items: ['🐶','🐱','🐸','🐼','🐨'], container: '🏠' },
  { items: ['🌸','🌺','🌻','🌷','🌹'], container: '🪴' },
  { items: ['🚗','✈️','🚢','🚂','🛵'], container: '🅿️' },
];

function getEmojiSet() {
  return EMOJI_SETS[randInt(0, EMOJI_SETS.length - 1)];
}
