const globalDrop    = document.getElementById('globalDrop');
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const fileName      = document.getElementById('fileName');
const sizeRow       = document.getElementById('sizeRow');
const dotSizeSelect = document.getElementById('dotSizeSelect');
const canvasArea    = document.getElementById('canvasArea');
const baseCanvas    = document.getElementById('baseCanvas');
const revealCanvas  = document.getElementById('revealCanvas');
const gridCanvas    = document.getElementById('gridCanvas');
const ghostCanvas   = document.getElementById('ghostCanvas');
const animCanvas    = document.getElementById('animCanvas');
const counter       = document.getElementById('counter');
const btnRow        = document.getElementById('btnRow');
const demoBtn       = document.getElementById('demoBtn');
const previewBtn    = document.getElementById('previewBtn');
const midResetBtn   = document.getElementById('midResetBtn');
const completeModal = document.getElementById('completeModal');
const completeCanvas= document.getElementById('completeCanvas');
const modeRow       = document.getElementById('modeRow');
const modeTask      = document.getElementById('modeTask');
const modeTime      = document.getElementById('modeTime');
const timePanel     = document.getElementById('timePanel');
const timerDisplay  = document.getElementById('timerDisplay');
const timerText     = document.getElementById('timerText');
const timerPanel    = document.getElementById('timerPanel');
const timerCountdown= document.getElementById('timerCountdown');
const timerMinInput = document.getElementById('timerMinInput');
const timerSecInput = document.getElementById('timerSecInput');
const timerDotsInput= null; // removed, using timerDots variable
const paintModeRow  = document.getElementById('paintModeRow');
const modeSeq       = document.getElementById('modeSeq');
const modeRnd       = document.getElementById('modeRnd');
const timeSubRow    = document.getElementById('timeSubRow');
const modeStopwatch = document.getElementById('modeStopwatch');
const modeCountdown = document.getElementById('modeCountdown');
const modeTimer     = modeCountdown;
// alias for existing code
const dotsPerSecRange = document.getElementById('dotsPerSecRange');
const dotsPerSecVal   = document.getElementById('dotsPerSecVal');
let uploadedImage = null;
let pixelData = [];
let dotCols = 0, dotRows = 0, dotPx = 8;
let totalPixels = 0;
let revealed = 0;
let isComplete = false;
const animMargin = 120;

// ── 永続化用 ──
let currentImageDataURL = null;        // 読み込んだ画像のdataURL（保存用）
let paintSeed = 0;                      // ランダム塗り順を再現するためのシード
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// レア演出（斜め射出＋星パーティクル）。v1ではOFF。v2でtrueにするだけで復活する。コードは消さず保持。
const ENABLE_RARE_DIAG = false;        // ← v2でtrueにすれば復活
const RARE_DIAG_PROB   = 1/1000000;    // 本番確率（100万分の1）。ONのとき適用

// アニメーション設定
let animEnabled = true;
let animFreq = 1;
let animDirs = new Set(['up','down','left','right']);
let animDuration = 350;
let previewOn = false;
let randomMode = false;
let paintOrder = [];
// ── 時間モード ──
let isTimeMode = false;
let isTimerMode = false;
let dotsPerSec = 1;
let timerRunning = false;
let timerInterval = null;
let sessionStartMs = null;
let accumulatedSec = 0;
let dotFraction = 0;
// ── カウントダウンタイマー ──
let countdownTotal = 0;
// 設定秒数
let countdownLeft = 0;
// 残り秒数
let countdownInterval = null;
function formatCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function setCountdownDisplay(sec, color) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  document.getElementById('cdHour').textContent = String(h).padStart(2,'0');
  document.getElementById('cdMin').textContent  = String(m).padStart(2,'0');
  document.getElementById('cdSec').textContent  = String(s).padStart(2,'0');
  if (color) timerCountdown.style.color = color;
}
function startCountdown() {
  if (countdownTotal <= 0) { flashTimerError(); return; }
  const mins = parseInt(timerMinInput.value) || 0;
  const secs = parseInt(timerSecInput.value) || 0;
  countdownLeft = countdownTotal;
  setCountdownDisplay(countdownLeft, '#e8c84a');
  demoBtn.textContent = '⏸ 停止';
  countdownInterval = setInterval(() => {
    countdownLeft--;
    setCountdownDisplay(countdownLeft, countdownLeft <= 10 ? '#e05050' : null);
    if (countdownLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      const dots = Math.max(1, timerDots || 1);
      paintDots(dots);
      saveProgress();
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
      catch(e) {
      }
      timerCountdown.style.color = '#4ec94e';
      document.getElementById('cdHour').textContent = '✓';
      document.getElementById('cdMin').textContent  = '';
      document.getElementById('cdSec').textContent  = '完了';
      demoBtn.textContent = '▶ スタート';
    }
  }
  , 1000);
}
function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdownLeft = 0;
  const m = parseInt(timerMinInput.value)||0;
  const s = parseInt(timerSecInput.value)||0;
  setCountdownDisplay(m*60+s, '#e8c84a');
  demoBtn.textContent = '▶ スタート';
}
// タイマー入力変更で表示を更新
[timerMinInput, timerSecInput].forEach(el => {
  el.addEventListener('input', () => {
    if (!countdownInterval) {
      const m = parseInt(timerMinInput.value)||0;
      const s = parseInt(timerSecInput.value)||0;
      setCountdownDisplay(m*60+s, '#e8c84a');
    }
  }
);
}
);
// クイック追加ボタン
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const add = parseInt(btn.dataset.min);
    const cur = parseInt(timerMinInput.value)||0;
    timerMinInput.value = cur + add;
    if (!countdownInterval) {
      const m = parseInt(timerMinInput.value)||0;
      const s = parseInt(timerSecInput.value)||0;
      countdownTotal = m * 60 + s;
      countdownLeft = countdownTotal;
      setCountdownDisplay(countdownTotal, '#e8c84a');
    }
  }
);
}
);
// ── 永続化（画像と進捗を別キーで保存）──
const IMG_KEY  = 'pixdo_image';
const PROG_KEY = 'pixdo_progress';
function saveImage() {
  try {
    localStorage.setItem(IMG_KEY, JSON.stringify({ dataURL: currentImageDataURL, fileName: fileName.textContent }));
  }
  catch(e) { /* 画像が大きすぎてquota超過した場合は保存しない */ }
}
function saveProgress() {
  if (!uploadedImage) return;
  const prog = {
    dotSizeValue: dotSizeSelect.value,
    randomMode,
    paintSeed,
    inputMode: isTimeMode ? 'stopwatch' : (isTimerMode ? 'countdown' : 'task'),
    revealed,
    accumulatedSec: accumulatedSec + (timerRunning ? Math.floor((Date.now() - sessionStartMs) / 1000) : 0),
    dotsPerSec,
    timerDots,
    countdownTotal
  };
  try {
    localStorage.setItem(PROG_KEY, JSON.stringify(prog));
  }
  catch(e) {
  }
}
function clearProgress() {
  try {
    localStorage.removeItem(PROG_KEY);
  }
  catch(e) {
  }
}
// 旧名エイリアス（既存の呼び出しをそのまま動かす）
const saveTimerState  = saveProgress;
const clearTimerState = clearProgress;
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h,m,s].map(v => String(v).padStart(2,'0')).join(':');
}
function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  sessionStartMs = Date.now();
  demoBtn.textContent = '⏸ 一時停止';
  demoBtn.classList.remove('holding');
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartMs) / 1000);
    const totalSec = accumulatedSec + elapsed;
    timerText.textContent = formatTime(totalSec);
    // ドット塗り
    dotFraction += dotsPerSec;
    const toPaint = Math.floor(dotFraction);
    dotFraction -= toPaint;
    if (toPaint > 0) paintDots(toPaint);
    saveTimerState();
  }
  , 1000);
}
function pauseTimer() {
  if (!timerRunning) return;
  timerRunning = false;
  accumulatedSec += Math.floor((Date.now() - sessionStartMs) / 1000);
  sessionStartMs = null;
  clearInterval(timerInterval);
  timerInterval = null;
  demoBtn.textContent = '▶ 再開';
  saveTimerState();
}
function setInputMode(mode) {
  isTimeMode  = mode === 'stopwatch';
  isTimerMode = mode === 'countdown';
  const isTimeBranch = isTimeMode || isTimerMode;
  modeTask.classList.toggle('active', mode === 'task');
  modeTime.classList.toggle('active', isTimeBranch);
  timeSubRow.style.display   = isTimeBranch ? 'flex' : 'none'; // flex = column in CSS
  modeStopwatch.classList.toggle('active', isTimeMode);
  modeCountdown.classList.toggle('active', isTimerMode);
  timePanel.style.display    = isTimeMode  ? 'flex'  : 'none';
  timerDisplay.style.display = isTimeMode  ? 'block' : 'none';
  timerPanel.style.display   = isTimerMode ? 'flex'  : 'none';
  paintModeRow.style.display = 'flex';
  stopCountdown();
  if (isTimeMode) {
    demoBtn.textContent = '▶ 開始';
    stopHold();
  }
  else if (isTimerMode) {
    demoBtn.textContent = '▶ スタート';
    pauseTimer();
    stopHold();
  }
  else {
    pauseTimer();
    demoBtn.textContent = '▶ タスクを完了する';
  }
}
function sliderToVal(v) {
  return Math.max(1, Math.round(Math.pow(10, (v - 1) / 99 * 5)));
}
function valToSlider(d) {
  return Math.round(1 + (Math.log10(Math.max(1, d)) / 5) * 99);
}
function updateDotsPerSec(val) {
  dotsPerSec = Math.max(1, Math.min(100000, val));
  dotsPerSecVal.textContent = dotsPerSec.toLocaleString();
  dotsPerSecRange.value = valToSlider(dotsPerSec);
}
dotsPerSecVal.addEventListener('focus', () => {
  dotsPerSecVal.textContent = dotsPerSec;
  const range = document.createRange();
  range.selectNodeContents(dotsPerSecVal);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
});
function toHalfWidth(str) {
  return str.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
}
dotsPerSecVal.addEventListener('blur', () => {
  const raw = toHalfWidth(dotsPerSecVal.textContent).replace(/[^0-9]/g, '');
  const v = parseInt(raw);
  updateDotsPerSec(!isNaN(v) && v > 0 ? v : dotsPerSec);
});
dotsPerSecVal.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); dotsPerSecVal.blur(); }
  if (e.key === 'Escape') { dotsPerSecVal.textContent = dotsPerSec.toLocaleString(); dotsPerSecVal.blur(); }
});
dotsPerSecRange.addEventListener('input', () => {
  updateDotsPerSec(sliderToVal(parseInt(dotsPerSecRange.value)));
});
// ── タイマー 時・分・秒クリック／ホイールで増減 ──
const timerCountdownEdit = document.getElementById('timerCountdownEdit'); // not used
let skipCloseEdit = false;
function adjustTimer(hourDelta, minDelta, secDelta) {
  if (countdownInterval) return;
  let total = countdownTotal + hourDelta * 3600 + minDelta * 60 + secDelta;
  if (total < 0) total = 0;
  if (total > 99 * 3600 + 59 * 60 + 59) total = 99 * 3600 + 59 * 60 + 59;
  countdownTotal = total;
  countdownLeft = total;
  timerMinInput.value = Math.floor(total / 60);
  timerSecInput.value = total % 60;
  setCountdownDisplay(total, '#e8c84a');
}
function flashTimerError() {
  timerCountdown.classList.remove('flash-error');
  void timerCountdown.offsetWidth; // reflow
  timerCountdown.classList.add('flash-error');
  timerCountdown.addEventListener('animationend', () => {
    timerCountdown.classList.remove('flash-error');
  }, { once: true });
}
const cdHourEl = document.getElementById('cdHour');
const cdMinEl  = document.getElementById('cdMin');
const cdSecEl  = document.getElementById('cdSec');
cdHourEl.style.cursor = cdMinEl.style.cursor = cdSecEl.style.cursor = 'pointer';
let holdTimer = null, holdInterval = null;
function startHoldAdjust(hD, mD, sD) {
  adjustTimer(hD, mD, sD);
  holdTimer = setTimeout(() => {
    holdInterval = setInterval(() => adjustTimer(hD, mD, sD), 80);
  }, 400);
}
function stopHoldAdjust() {
  clearTimeout(holdTimer); clearInterval(holdInterval);
  holdTimer = null; holdInterval = null;
}
cdHourEl.addEventListener('pointerdown', (e) => { e.preventDefault(); startHoldAdjust(1, 0, 0); });
cdHourEl.addEventListener('pointerup',    stopHoldAdjust);
cdHourEl.addEventListener('pointerleave', stopHoldAdjust);
cdMinEl.addEventListener( 'pointerdown', (e) => { e.preventDefault(); startHoldAdjust(0, 1, 0); });
cdMinEl.addEventListener( 'pointerup',    stopHoldAdjust);
cdMinEl.addEventListener( 'pointerleave', stopHoldAdjust);
cdSecEl.addEventListener( 'pointerdown', (e) => { e.preventDefault(); startHoldAdjust(0, 0, 1); });
cdSecEl.addEventListener( 'pointerup',    stopHoldAdjust);
cdSecEl.addEventListener( 'pointerleave', stopHoldAdjust);
cdHourEl.addEventListener('wheel', (e) => { e.preventDefault(); adjustTimer(e.deltaY < 0 ? 1 : -1, 0, 0); }, { passive: false });
cdMinEl.addEventListener( 'wheel', (e) => { e.preventDefault(); adjustTimer(0, e.deltaY < 0 ? 1 : -1, 0); }, { passive: false });
cdSecEl.addEventListener( 'wheel', (e) => { e.preventDefault(); adjustTimer(0, 0, e.deltaY < 0 ? 1 : -1); }, { passive: false });

// ── カウントダウン終了時ドット数スライダー ──
const timerDotsRange = document.getElementById('timerDotsRange');
const timerDotsVal   = document.getElementById('timerDotsVal');
let timerDots = 1;
function updateTimerDots(val) {
  timerDots = Math.max(1, Math.min(100000, val));
  timerDotsVal.textContent = timerDots.toLocaleString();
  timerDotsRange.value = valToSlider(timerDots);
}
timerDotsVal.addEventListener('focus', () => {
  timerDotsVal.textContent = timerDots;
  const range = document.createRange();
  range.selectNodeContents(timerDotsVal);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
});
timerDotsVal.addEventListener('blur', () => {
  const raw = toHalfWidth(timerDotsVal.textContent).replace(/[^0-9]/g, '');
  const v = parseInt(raw);
  updateTimerDots(!isNaN(v) && v > 0 ? v : timerDots);
});
timerDotsVal.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); timerDotsVal.blur(); }
  if (e.key === 'Escape') { timerDotsVal.textContent = timerDots.toLocaleString(); timerDotsVal.blur(); }
});
timerDotsRange.addEventListener('input', () => {
  updateTimerDots(sliderToVal(parseInt(timerDotsRange.value)));
});
// ── タイマーリセットボタン ──
document.getElementById('timerResetBtn').addEventListener('click', () => {
  stopHoldAdjust();
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdownTotal = 0;
  countdownLeft = 0;
  timerMinInput.value = 0;
  timerSecInput.value = 0;
  document.getElementById('cdHour').textContent = '00';
  document.getElementById('cdMin').textContent  = '00';
  document.getElementById('cdSec').textContent  = '00';
  timerCountdown.style.color = '#e8c84a';
  demoBtn.textContent = '▶ スタート';
  demoBtn.disabled = false;
}
);
// ── ページ全体をドロップ対象に ──
let dragCounter = 0;
document.addEventListener('dragenter', e => {
  e.preventDefault();
  dragCounter++;
  globalDrop.classList.add('show');
}
);
document.addEventListener('dragleave', e => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    globalDrop.classList.remove('show');
  }
}
);
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  globalDrop.classList.remove('show');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadFile(f);
}
);
// dropZoneクリックでファイル選択、ドロップも両対応
dropZone.addEventListener('click', () => fileInput.click());
document.getElementById('uploadPrompt').addEventListener('click', () => fileInput.click());
document.getElementById('dropZoneSmall').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
}
);
function loadFile(f) {
  fileInput.value = '';
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      currentImageDataURL = ev.target.result;
      fileName.textContent = '📎 ' + f.name;
      document.getElementById('uploadArea').classList.add('hidden');
      document.getElementById('mainTitle').style.display = 'block';
      document.getElementById('mainLayout').classList.add('visible');
      convert();
      saveImage();
      document.getElementById('fab').classList.add('show');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(f);
}
// 塗り順モード切替（手動モード時のみ有効）
modeSeq.addEventListener('click', () => {
  if (revealed > 0) return;
  randomMode = false;
  modeSeq.classList.add('active');
  modeRnd.classList.remove('active');
  if (uploadedImage) convert();
}
);
modeRnd.addEventListener('click', () => {
  if (revealed > 0) return;
  randomMode = true;
  modeRnd.classList.add('active');
  modeSeq.classList.remove('active');
  if (uploadedImage) convert();
}
);
// 入力モード切替
modeTask.addEventListener('click',      () => {
  if (!timerRunning && !countdownInterval) setInputMode('task');
}
);
modeTime.addEventListener('click',      () => setInputMode(isTimeMode || isTimerMode ? 'task' : 'stopwatch'));
modeStopwatch.addEventListener('click', () => setInputMode('stopwatch'));
modeCountdown.addEventListener('click', () => setInputMode('countdown'));
dotSizeSelect.addEventListener('change', () => {
  if (uploadedImage) convert();
}
);
// ── 変換 ──
function convert(isRestore = false) {
  const rawDotPx = parseInt(dotSizeSelect.value);
  dotPx = rawDotPx;
  const mainLayout = document.getElementById('mainLayout');
  const imgW = uploadedImage.naturalWidth;
  const imgH = uploadedImage.naturalHeight;
  let cols, rows;
  if (dotPx === 0) {
    mainLayout.classList.add('genzon');
    cols = imgW;
    rows = imgH;
    dotPx = 1;
  }
  else {
    mainLayout.classList.remove('genzon');
    const ratio = imgH / imgW;
    if (window.innerWidth <= 700) {
      // スマホ：画面に画像全体を収める（contain）
      const availW = window.innerWidth - 12;
      const availH = window.innerHeight - 110;
      let c = Math.max(1, Math.floor(availW / dotPx));
      let r = Math.max(1, Math.round(c * ratio));
      const maxR = Math.max(1, Math.floor(availH / dotPx));
      if (r > maxR) { r = maxR; c = Math.max(1, Math.round(r / ratio)); }
      cols = c; rows = r;
    } else {
      const MAX_DISP = Math.min(window.innerWidth - 48, 720);
      const longer = Math.max(imgW, imgH);
      let dotsLong = Math.max(1, Math.round(longer / dotPx));
      if (dotsLong * dotPx > MAX_DISP) dotsLong = Math.floor(MAX_DISP / dotPx);
      if (imgW >= imgH) {
        cols = dotsLong;
        rows = Math.max(1, Math.round(cols * ratio));
      }
      else {
        rows = dotsLong;
        cols = Math.max(1, Math.round(rows / ratio));
      }
    }
  }
  dotCols = cols;
  dotRows = rows;
  revealed = 0;
  isComplete = false;
  previewOn = false;
  // 塗り順を構築
  if (!isRestore) paintSeed = (Math.random() * 4294967296) >>> 0;
  const rng = mulberry32(paintSeed);
  paintOrder = Array.from({
    length: cols * rows
  }
  , (_, i) => i);
  if (randomMode) {
    // まず全体をシャッフル（シード付き乱数で再現可能に）
    const arr = paintOrder.slice();
    for (let i = arr.length - 1;
    i > 0;
    i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // stride飛ばしで並べ直す → 画面全体が均等に同時進行する
    // stride = sqrt(total) 程度にすると「まばらに全体→だんだん埋まる」になる
    const stride = Math.max(2, Math.round(Math.sqrt(arr.length)));
    const order = [];
    for (let start = 0;
    start < stride;
    start++) {
      for (let k = start;
      k < arr.length;
      k += stride) {
        order.push(arr[k]);
      }
    }
    paintOrder = order;
  }
  previewBtn.classList.remove('active');
  previewBtn.textContent = '👁 完成形を見る';
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
  const offCtx = off.getContext('2d');
  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = 'high';
  offCtx.drawImage(uploadedImage, 0, 0, cols, rows);
  const raw = offCtx.getImageData(0, 0, cols, rows);
  pixelData = [];
  for (let i = 0;
  i < cols * rows;
  i++) {
    pixelData.push({
      r: raw.data[i*4], g: raw.data[i*4+1], b: raw.data[i*4+2], a: raw.data[i*4+3]
    }
  );
}
totalPixels = pixelData.length;
const dispW = cols * dotPx;
const dispH = rows * dotPx;
// 全キャンバスを統一
// baseCanvas, revealCanvas, ghostCanvas: ドット解像度でpixelated拡大
[baseCanvas, revealCanvas, ghostCanvas].forEach(c => {
  c.width = cols;
  c.height = rows;
  c.style.width = dispW + 'px';
  c.style.height = dispH + 'px';
}
);
// animCanvas: viewport固定（全画面アニメーション用）
animCanvas.width = window.innerWidth;
animCanvas.height = window.innerHeight;
animCanvas.style.left = '0';
animCanvas.style.top = '0';
// gridCanvas: 実ピクセル解像度で格子を描く
gridCanvas.width = dispW;
gridCanvas.height = dispH;
gridCanvas.style.width = dispW + 'px';
gridCanvas.style.height = dispH + 'px';
// ベース: 暗いマス目（フラット）
const bCtx = baseCanvas.getContext('2d');
const bImg = bCtx.createImageData(cols, rows);
for (let i = 0;
i < cols * rows;
i++) {
  bImg.data[i*4]=30;
  bImg.data[i*4+1]=30;
  bImg.data[i*4+2]=38;
  bImg.data[i*4+3]=255;
}
bCtx.putImageData(bImg, 0, 0);
revealCanvas.getContext('2d').clearRect(0, 0, cols, rows);
// ghost: ドット解像度で完成形
const gCtx = ghostCanvas.getContext('2d');
const gImg = gCtx.createImageData(cols, rows);
for (let i = 0;
i < pixelData.length;
i++) {
  const p = pixelData[i];
  gImg.data[i*4]=p.r;
  gImg.data[i*4+1]=p.g;
  gImg.data[i*4+2]=p.b;
  gImg.data[i*4+3]=p.a;
}
gCtx.putImageData(gImg, 0, 0);
ghostCanvas.classList.remove('visible');
drawFullGrid();
// タイマーリセット
pauseTimer();
accumulatedSec = 0;
dotFraction = 0;
timerText.textContent = '00:00:00';
if (!isRestore) saveProgress();
canvasArea.style.display = 'inline-block';
counter.style.display = 'block';
modeRow.style.display = 'flex';
// 塗り順ボタンを有効化
modeSeq.disabled = false;
modeRnd.disabled = false;
modeSeq.title = '左上から順番に塗る';
modeRnd.title = 'ランダムな位置に塗る';
// 時間パネル/手動ボタンの表示を現在のモードに合わせる
const isTimeBranch = isTimeMode || isTimerMode;
timeSubRow.style.display   = isTimeBranch ? 'flex' : 'none'; // flex = column in CSS
timePanel.style.display    = isTimeMode  ? 'flex'  : 'none';
timerDisplay.style.display = isTimeMode  ? 'block' : 'none';
timerPanel.style.display   = isTimerMode ? 'flex'  : 'none';
paintModeRow.style.display = 'flex';
demoBtn.textContent = isTimeMode ? '▶ 開始' : isTimerMode ? '▶ スタート' : '▶ タスクを完了する';
btnRow.style.display = 'flex';
demoBtn.disabled = false;
updateCounter();
}
function drawFullGrid() {
  if (dotPx === 1) {
    gridCanvas.style.display = 'none';
    return;
  }
  gridCanvas.style.display = 'block';
  const ctx = gridCanvas.getContext('2d');
  ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 0.5;
  for (let c = 0;
  c <= dotCols;
  c++) {
    ctx.beginPath();
    ctx.moveTo(c * dotPx, 0);
    ctx.lineTo(c * dotPx, dotRows * dotPx);
    ctx.stroke();
  }
  for (let r = 0;
  r <= dotRows;
  r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * dotPx);
    ctx.lineTo(dotCols * dotPx, r * dotPx);
    ctx.stroke();
  }
}
function eraseGridCell(col, row) {
  if (dotPx === 1) return;
  gridCanvas.getContext('2d').clearRect(col * dotPx, row * dotPx, dotPx, dotPx);
}
function updateCounter() {
  const remaining = totalPixels - revealed;
  counter.textContent = revealed + ' / ' + totalPixels + '　残り ' + remaining.toLocaleString();
}
// ── 長押し加速 ──
let demoBtnTimer = null;
let holdTick = 0;
function getDotsPerTick(tick) {
  return Math.max(1, Math.floor(Math.pow(1.15, Math.max(0, tick - 30))));
}
function paintDots(count) {
  const ctx = revealCanvas.getContext('2d');
  if (revealed === 0 && count > 0) {
    modeSeq.disabled = true;
    modeRnd.disabled = true;
    modeSeq.title = modeRnd.title = '開始後は変更できません';
  }
  for (let n = 0;
  n < count;
  n++) {
    if (revealed >= totalPixels) {
      if (!isComplete) {
        isComplete = true;
        revealed = totalPixels;
        updateCounter();
        stopHold();
        demoBtn.disabled = true;
        setTimeout(showComplete, 400);
      }
      return;
    }
    const i = paintOrder[revealed];
    const p = pixelData[i];
    const col = i % dotCols;
    const row = Math.floor(i / dotCols);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a/255})`;
    ctx.fillRect(col, row, 1, 1);
    eraseGridCell(col, row);
    spawnAnim(col, row, `rgba(${p.r},${p.g},${p.b},${p.a/255})`);
    revealed++;
  }
  updateCounter();
}
function scheduleNext() {
  demoBtnTimer = setTimeout(() => {
    paintDots(getDotsPerTick(holdTick));
    holdTick++;
    if (demoBtnTimer !== null) scheduleNext();
  }
  , 16);
}
function stopHold() {
  if (demoBtnTimer !== null) {
    clearTimeout(demoBtnTimer);
    demoBtnTimer = null;
  }
  holdTick = 0;
  demoBtn.classList.remove('holding');
}
demoBtn.addEventListener('click', () => {
  if (isTimeMode) {
    if (timerRunning) pauseTimer();
    else startTimer();
    return;
  }
  if (isTimerMode) {
    if (countdownInterval) stopCountdown();
    else startCountdown();
    return;
  }
  if (holdTick > 0) return;
  paintDots(1);
  saveProgress();
}
);
demoBtn.addEventListener('pointerdown', (e) => {
  if (demoBtn.disabled || isTimeMode || isTimerMode) return;
  demoBtn.setPointerCapture(e.pointerId);
  holdTick = 0;
  demoBtnTimer = setTimeout(() => {
    demoBtn.classList.add('holding');
    scheduleNext();
  }
  , 350);
}
);
demoBtn.addEventListener('pointerup',    () => {
  if (!isTimeMode && !isTimerMode) { stopHold(); saveProgress(); }
}
);
demoBtn.addEventListener('pointerleave', () => {
  if (!isTimeMode && !isTimerMode) stopHold();
}
);
demoBtn.addEventListener('pointercancel',() => {
  if (!isTimeMode && !isTimerMode) stopHold();
}
);
// スマホ：長押し時のコンテキストメニュー（テキスト選択メニュー）を抑止
[demoBtn, revealCanvas, completeCanvas].forEach(el => {
  if (el) el.addEventListener('contextmenu', e => e.preventDefault());
}
);
// ── プレビュー ──
previewBtn.addEventListener('click', () => {
  previewOn = !previewOn;
  ghostCanvas.classList.toggle('visible', previewOn);
  previewBtn.classList.toggle('active', previewOn);
  previewBtn.textContent = previewOn ? '👁 プレビューを隠す' : '👁 完成形を見る';
}
);
// ── 完成モーダル ──
function showComplete(fromCanvas = false) {
  completeFromCanvas = fromCanvas;
  const h2 = completeModal.querySelector('h2');
  h2.style.display = fromCanvas ? 'none' : '';
  completeCanvas.style.border = fromCanvas ? 'none' : '3px solid #e8c84a';
  completeCanvas.style.cursor = fromCanvas ? 'zoom-in' : 'default';
  // 位置をリセット
  canvasX = 0;
  canvasY = 0;
  completeScale = 1;
  gridCanvas.style.display = 'none';
  completeCanvas.width  = dotCols;
  completeCanvas.height = dotRows;
  const ctx = completeCanvas.getContext('2d');
  const img = ctx.createImageData(dotCols, dotRows);
  for (let i = 0;
  i < pixelData.length;
  i++) {
    const p = pixelData[i];
    img.data[i*4]=p.r;
    img.data[i*4+1]=p.g;
    img.data[i*4+2]=p.b;
    img.data[i*4+3]=p.a;
  }
  ctx.putImageData(img, 0, 0);
  const maxW = window.innerWidth  * 0.88;
  const maxH = window.innerHeight * 0.72;
  const scale = Math.min(maxW / dotCols, maxH / dotRows);
  completeCanvas.style.width  = Math.round(dotCols * scale) + 'px';
  completeCanvas.style.height = Math.round(dotRows * scale) + 'px';
  applyCompleteTransform();
  completeModal.classList.add('show');
}
// ── 途中リセット ──
midResetBtn.addEventListener('click', () => {
  stopHold();
  pauseTimer();
  stopCountdown();
  accumulatedSec = 0;
  dotFraction = 0;
  timerText.textContent = '00:00:00';
  clearTimerState();
  revealed = 0;
  isComplete = false;
  previewOn = false;
  previewBtn.classList.remove('active');
  previewBtn.textContent = '👁 完成形を見る';
  ghostCanvas.classList.remove('visible');
  revealCanvas.getContext('2d').clearRect(0, 0, dotCols, dotRows);
  gridCanvas.style.display = 'block';
  drawFullGrid();
  modeSeq.disabled = false;
  modeRnd.disabled = false;
  modeSeq.title = '左上から順番に塗る';
  modeRnd.title = 'ランダムな位置に塗る';
  demoBtn.disabled = false;
  demoBtn.classList.remove('holding');
  demoBtn.textContent = isTimeMode ? '▶ 開始' : isTimerMode ? '▶ スタート' : '▶ タスクを完了する';
  updateCounter();
  saveProgress();
}
);
// completeModal全体クリックで閉じる
completeModal.addEventListener('click', (e) => {
  if (e.target === completeModal) completeModal.classList.remove('show');
}
);

// completeCanvas ホイールで拡縮 + ドラッグで自由移動（鑑賞モードのみ）
let completeScale = 1;
let canvasX = 0, canvasY = 0;
let completeFromCanvas = false;
function applyCompleteTransform() {
  completeCanvas.style.transform = `translate(calc(-50% + ${canvasX}px), calc(-50% + ${canvasY}px)) scale(${completeScale})`;
}
let wheelCursorTimer = null;
completeCanvas.addEventListener('wheel', (e) => {
  if (!completeFromCanvas) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  completeScale = Math.min(8, Math.max(0.1, completeScale * delta));
  applyCompleteTransform();
  completeCanvas.style.cursor = e.deltaY < 0 ? 'zoom-in' : 'zoom-out';
  clearTimeout(wheelCursorTimer);
  wheelCursorTimer = setTimeout(() => {
    completeCanvas.style.cursor = 'zoom-in';
  }, 400);
}, { passive: false });

let isDragging = false, dragStartX, dragStartY;
const cPts = new Map();
let cPinchDist = 0, cPinchScale = 1;
completeCanvas.addEventListener('pointerdown', (e) => {
  if (!completeFromCanvas) return;
  e.preventDefault();
  cPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (cPts.size === 1) {
    isDragging = true;
    dragStartX = e.clientX - canvasX;
    dragStartY = e.clientY - canvasY;
    completeCanvas.style.cursor = 'grabbing';
  } else if (cPts.size === 2) {
    isDragging = false;
    const p = [...cPts.values()];
    cPinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    cPinchScale = completeScale;
  }
});
completeCanvas.addEventListener('pointermove', (e) => {
  if (!completeFromCanvas || !cPts.has(e.pointerId)) return;
  cPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (cPts.size >= 2) {
    const p = [...cPts.values()];
    const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (cPinchDist > 0) {
      completeScale = Math.min(8, Math.max(0.1, cPinchScale * (d / cPinchDist)));
      applyCompleteTransform();
    }
  } else if (isDragging) {
    canvasX = e.clientX - dragStartX;
    canvasY = e.clientY - dragStartY;
    applyCompleteTransform();
  }
});
function completePtrEnd(e) {
  cPts.delete(e.pointerId);
  if (cPts.size < 2) cPinchDist = 0;
  if (cPts.size === 1) {
    const rem = [...cPts.values()][0];
    isDragging = true;
    dragStartX = rem.x - canvasX;
    dragStartY = rem.y - canvasY;
  } else if (cPts.size === 0) {
    isDragging = false;
    completeCanvas.style.cursor = completeFromCanvas ? 'zoom-in' : 'default';
  }
}
completeCanvas.addEventListener('pointerup', completePtrEnd);
completeCanvas.addEventListener('pointercancel', completePtrEnd);

// completeCanvasクリックで閉じる（completeモード時のみ）
completeCanvas.addEventListener('click', () => {
  if (!completeFromCanvas) completeModal.classList.remove('show');
});

// 背景クリックで閉じる
completeModal.addEventListener('click', (e) => {
  if (e.target === completeModal) completeModal.classList.remove('show');
});

// メインキャンバスクリックでcomplete後に再表示
revealCanvas.addEventListener('click', () => {
  if (isComplete) showComplete(true);
});

// キャンバスを直接ペイント（タップ=1ドット / 長押し=加速。手動モードのみ）
revealCanvas.addEventListener('pointerdown', (e) => {
  if (isComplete || isTimeMode || isTimerMode) return;
  e.preventDefault();
  try { revealCanvas.setPointerCapture(e.pointerId); } catch(_) {}
  holdTick = 0;
  paintDots(1);
  demoBtnTimer = setTimeout(() => { scheduleNext(); }, 350);
});
revealCanvas.addEventListener('pointerup', () => {
  if (!isComplete && !isTimeMode && !isTimerMode) { stopHold(); saveProgress(); }
});
revealCanvas.addEventListener('pointercancel', () => stopHold());
revealCanvas.addEventListener('pointerleave', () => {
  if (!isComplete && !isTimeMode && !isTimerMode) stopHold();
});


// ── アニメーションエンジン ──
const animCtx = animCanvas.getContext('2d');
const activeAnims = [];
let animFrameId = null;

function runAnimLoop() {
  // 毎フレームビューポートに合わせる
  if (animCanvas.width !== window.innerWidth || animCanvas.height !== window.innerHeight) {
    animCanvas.width  = window.innerWidth;
    animCanvas.height = window.innerHeight;
  }
  animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
  const now = performance.now();
  for (let i = activeAnims.length - 1; i >= 0; i--) {
    const a = activeAnims[i];
    const t = Math.min(1, (now - a.startTime) / a.duration);
    a.draw(animCtx, t, a);
    if (t >= 1) activeAnims.splice(i, 1);
  }
  if (activeAnims.length > 0) {
    animFrameId = requestAnimationFrame(runAnimLoop);
  } else {
    animFrameId = null;
    animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
  }
}

function spawnAnim(col, row, color) {
  if (!animEnabled) return;
  if (Math.random() > animFreq) return;
  const dirs = Array.from(animDirs);
  if (dirs.length === 0) return;

  const rect = revealCanvas.getBoundingClientRect();
  const dp = rect.width / dotCols;
  const cx = rect.left + (col + 0.5) * dp;
  const cy = rect.top  + (row + 0.5) * dp;
  const r = dp / 2;
  const W = animCanvas.width;
  const H = animCanvas.height;

  const dir = dirs[Math.floor(Math.random() * dirs.length)];

  let startX = cx, startY = cy;
  let isRare = false;
  let rareDiag = '';
  // 超レア：斜め射出（v1はENABLE_RARE_DIAG=falseでOFF）
  if (ENABLE_RARE_DIAG && Math.random() < RARE_DIAG_PROB) {
    isRare = true;
    rareDiag = ['upleft','upright','downleft','downright'][Math.floor(Math.random()*4)];
    if (rareDiag === 'upleft')    { startX = -r*2; startY = -r*2; }
    if (rareDiag === 'upright')   { startX = W+r*2; startY = -r*2; }
    if (rareDiag === 'downleft')  { startX = -r*2; startY = H+r*2; }
    if (rareDiag === 'downright') { startX = W+r*2; startY = H+r*2; }
  } else {
    if (dir === 'up')    startY = -r * 2;
    if (dir === 'down')  startY = H + r * 2;
    if (dir === 'left')  startX = -r * 2;
    if (dir === 'right') startX = W + r * 2;
  }

  const anim = {
    startTime: performance.now(),
    duration: animDuration,
    color, cx, cy, r, startX, startY, isRare, rareDiag,
    landed: false,
    draw: (ctx, t, a) => {
      const ease = 1 - Math.pow(1 - t, 3);
      const x = a.startX + (a.cx - a.startX) * ease;
      const y = a.startY + (a.cy - a.startY) * ease;
      const alpha = t < 0.8 ? 1 : (1 - t) / 0.2;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = a.color;
      ctx.fillRect(x - a.r, y - a.r, a.r * 2, a.r * 2);
      ctx.restore();
      // 着地タイミングでレア演出を発火（t >= 0.85 で1回だけ）
      if (a.isRare && !a.landed && t >= 0.85) {
        a.landed = true;
        spawnRareEffect(a.cx, a.cy, a.color, a.r, a.rareDiag);
      }
    }
  };

  activeAnims.push(anim);
  if (!animFrameId) animFrameId = requestAnimationFrame(runAnimLoop);
}
// ── レア演出：星パーティクル ──
function spawnRareEffect(cx, cy, color, r, diag) {
  const diagLabel = { upleft:'左上', upright:'右上', downleft:'左下', downright:'右下' };
  const label = diagLabel[diag] || '斜め';
  const notice = document.getElementById('rareNotice');
  const prob = Math.round(1 / RARE_DIAG_PROB).toLocaleString();
  notice.innerHTML = `⭐ ${label}が出ました！<br>確率：${prob}分の1`;
  notice.style.display = 'block';
  clearTimeout(notice._hideTimer);
  notice._hideTimer = setTimeout(() => { notice.style.display = 'none'; }, 8000);
  const starCount = 60;
  const colors = ['#fff', '#fff', '#ffe066', '#ffe066', '#fffacd'];

  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2 + Math.random() * 0.3;
    const speed = r * (8 + Math.random() * 20);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = r * (0.8 + Math.random() * 2);
    const starColor = colors[Math.floor(Math.random() * colors.length)];
    const delay = Math.random() * 80;
    const anim = {
      startTime: performance.now() + delay,
      duration: 900 + Math.random() * 600,
      color: starColor, cx, cy, vx, vy, size,
      draw: (ctx, t, a) => {
        if (t < 0) return;
        const gravity = t * t * r * 15;
        const x = a.cx + a.vx * t * 10;
        const y = a.cy + a.vy * t * 10 + gravity;
        const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        const scale = t < 0.1 ? t / 0.1 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = a.color;
        ctx.translate(x, y);
        ctx.rotate(t * Math.PI * 4);
        ctx.scale(scale, scale);
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const outerA = (j * 4 * Math.PI) / 5 - Math.PI / 2;
          const innerA = outerA + (2 * Math.PI) / 10;
          if (j === 0) ctx.moveTo(Math.cos(outerA) * a.size, Math.sin(outerA) * a.size);
          else ctx.lineTo(Math.cos(outerA) * a.size, Math.sin(outerA) * a.size);
          ctx.lineTo(Math.cos(innerA) * a.size * 0.4, Math.sin(innerA) * a.size * 0.4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };
    activeAnims.push(anim);
  }

  if (!animFrameId) animFrameId = requestAnimationFrame(runAnimLoop);
  setTimeout(() => {
    const wave2 = 30;
    for (let i = 0; i < wave2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = r * (5 + Math.random() * 12);
      const starColor = colors[Math.floor(Math.random() * colors.length)];
      const anim = {
        startTime: performance.now(),
        duration: 700 + Math.random() * 400,
        color: starColor, cx, cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: r * (0.5 + Math.random() * 1.2),
        draw: (ctx, t, a) => {
          const x = a.cx + a.vx * t * 10;
          const y = a.cy + a.vy * t * 10 + t * t * r * 10;
          const alpha = 1 - t;
          ctx.save();
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.fillStyle = a.color;
          ctx.translate(x, y);
          ctx.rotate(t * Math.PI * 3);
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const outerA = (j * 4 * Math.PI) / 5 - Math.PI / 2;
            const innerA = outerA + (2 * Math.PI) / 10;
            if (j === 0) ctx.moveTo(Math.cos(outerA) * a.size, Math.sin(outerA) * a.size);
            else ctx.lineTo(Math.cos(outerA) * a.size, Math.sin(outerA) * a.size);
            ctx.lineTo(Math.cos(innerA) * a.size * 0.4, Math.sin(innerA) * a.size * 0.4);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      };
      activeAnims.push(anim);
    }
    if (!animFrameId) animFrameId = requestAnimationFrame(runAnimLoop);
  }, 150);

  if (!animFrameId) animFrameId = requestAnimationFrame(runAnimLoop);
}

// ── サイドタブ切り替え ──
document.querySelectorAll('.side-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.side-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.side-page').forEach(p => p.style.display = 'none');
    document.getElementById('page' + tab.dataset.page.charAt(0).toUpperCase() + tab.dataset.page.slice(1)).style.display = 'flex';
  });
});

// ── スマホ: FAB（移動可能）+ 全画面設定オーバーレイ ──
(function setupFab() {
  const fab = document.getElementById('fab');
  const panel = document.getElementById('sidePanel');
  const closeBtn = document.getElementById('settingsClose');
  if (!fab || !panel) return;
  let dragging = false, moved = false, sx = 0, sy = 0, offX = 0, offY = 0;
  fab.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    try { fab.setPointerCapture(e.pointerId); } catch(_) {}
    const r = fab.getBoundingClientRect();
    offX = e.clientX - r.left; offY = e.clientY - r.top;
    sx = e.clientX; sy = e.clientY;
  });
  fab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 8) moved = true;
    if (moved) {
      const x = Math.max(4, Math.min(window.innerWidth - 60, e.clientX - offX));
      const y = Math.max(4, Math.min(window.innerHeight - 60, e.clientY - offY));
      fab.style.left = x + 'px'; fab.style.top = y + 'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
    }
  });
  fab.addEventListener('pointerup', () => {
    dragging = false;
    if (!moved) panel.classList.toggle('open');
  });
  fab.addEventListener('pointercancel', () => { dragging = false; });
  if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('open'));
})();

// ── アニメーション設定UI ──
document.getElementById('animEnabled').addEventListener('change', e => {
  animEnabled = e.target.checked;
});

document.querySelectorAll('.anim-freq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.anim-freq-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    animFreq = parseFloat(btn.dataset.freq);
  });
});

document.querySelectorAll('.anim-dir-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    const dir = btn.dataset.dir;
    if (btn.classList.contains('active')) animDirs.add(dir);
    else animDirs.delete(dir);
    // 全部OFFにはさせない
    if (animDirs.size === 0) {
      btn.classList.add('active');
      animDirs.add(dir);
    }
  });
});

const animSpeedRange = document.getElementById('animSpeed');
const animSpeedVal   = document.getElementById('animSpeedVal');
animSpeedRange.addEventListener('input', () => {
  animDuration = parseInt(animSpeedRange.value);
  animSpeedVal.textContent = animDuration;
});

// ── 進捗の復元（リロード/再訪時に続きから）──
function redrawRevealed() {
  const ctx = revealCanvas.getContext('2d');
  ctx.clearRect(0, 0, dotCols, dotRows);
  for (let n = 0; n < revealed; n++) {
    const i = paintOrder[n];
    if (i === undefined) break;
    const p = pixelData[i];
    const col = i % dotCols;
    const row = Math.floor(i / dotCols);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a/255})`;
    ctx.fillRect(col, row, 1, 1);
    eraseGridCell(col, row);
  }
  if (revealed > 0) {
    modeSeq.disabled = true;
    modeRnd.disabled = true;
    modeSeq.title = modeRnd.title = '開始後は変更できません';
  }
}
function restoreState() {
  let imgRec = null, prog = null;
  try { imgRec = JSON.parse(localStorage.getItem(IMG_KEY)); }  catch(e) {}
  try { prog   = JSON.parse(localStorage.getItem(PROG_KEY)); } catch(e) {}
  if (!imgRec || !imgRec.dataURL || !prog) return;
  const img = new Image();
  img.onload = () => {
    uploadedImage = img;
    currentImageDataURL = imgRec.dataURL;
    fileName.textContent = imgRec.fileName || '';
    document.getElementById('uploadArea').classList.add('hidden');
    document.getElementById('mainTitle').style.display = 'block';
    document.getElementById('mainLayout').classList.add('visible');
    document.getElementById('fab').classList.add('show');
    // 設定を復元
    dotSizeSelect.value = prog.dotSizeValue;
    randomMode = !!prog.randomMode;
    modeSeq.classList.toggle('active', !randomMode);
    modeRnd.classList.toggle('active',  randomMode);
    paintSeed = prog.paintSeed >>> 0;
    updateDotsPerSec(prog.dotsPerSec || 1);
    updateTimerDots(prog.timerDots || 1);
    countdownTotal = prog.countdownTotal || 0;
    countdownLeft  = countdownTotal;
    timerMinInput.value = Math.floor(countdownTotal / 60);
    timerSecInput.value = countdownTotal % 60;
    // 同じシードで塗り順を再構築
    convert(true);
    // 進捗を復元して描き直す
    revealed = Math.min(prog.revealed || 0, totalPixels);
    redrawRevealed();
    accumulatedSec = prog.accumulatedSec || 0;
    timerText.textContent = formatTime(accumulatedSec);
    setCountdownDisplay(countdownTotal, '#e8c84a');
    setInputMode(prog.inputMode || 'task');
    if (revealed >= totalPixels && totalPixels > 0) {
      isComplete = true;
      demoBtn.disabled = true;
    }
    updateCounter();
  };
  img.src = imgRec.dataURL;
}
// 閉じる直前にも保存（取りこぼし防止）
window.addEventListener('beforeunload', saveProgress);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveProgress(); });
restoreState();
