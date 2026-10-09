import * as THREE from 'three'
import { ThreeMFLoader } from 'three/examples/jsm/Addons.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { AxesHelper } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { LoadingManager } from 'three'

if (window.innerWidth <= 480) {
  // Mobile: expose dummy goToWall so PORTFOLIO button doesn't error, then stop
  window.goToWall = () => {};
  throw new Error('mobile');
}

const loadingManager = new THREE.LoadingManager();

loadingManager.onError = (url) => {
  console.error('Loading error:', url);
};

//  important aspect, scene,canva,loader camera and render

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.01,
  1000)
camera.position.z = 3.4   // opening view; minDistance below is the floor
// camera.position.x= -.5

// selector query
const canva = document.querySelector('canvas.cubeCanvas')
console.log(canva)



// for the loader ------
//get element
const terminal = document.getElementById('loading-terminal');
const codeLines = document.getElementById('code-lines');

// ───────────────────────────────────────────────
// Boot sequence — a system check of Riya's certs and help desk skills,
// not decoration (spec p.2). Each line types in, check items pop an
// [ OK ] / [ FAIL ] badge, and Coffee fails once before retrying.
// ───────────────────────────────────────────────

let uiAudioCtx = null;
// Hook for ducking the UI beeps. Nothing lowers it now that the tablet's
// audio source is gone, but playTone still honours it.
let sfxGainScale = 1;
function getUiAudioCtx() {
  if (!uiAudioCtx) uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (uiAudioCtx.state === 'suspended') uiAudioCtx.resume();
  return uiAudioCtx;
}
function playTone({ freq, duration, type = 'sine', gain = 0.25, freqEnd = null, delay = 0 }) {
  // Browsers block audio until the first click. Rather than schedule against
  // a frozen (suspended) clock — which would queue sounds up and burst them
  // all out of sync once the context finally resumes — just stay silent
  // until the context is actually running.
  const audioCtx = getUiAudioCtx();
  if (audioCtx.state !== 'running') return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain * sfxGainScale, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}
// Typing now outruns the blip itself — without a floor between ticks they
// overlap several deep and read as one flat tone instead of a key clatter.
let lastTickAt = 0;
const TICK_MIN_GAP_MS = 26;

const sound = {
  startup() { playTone({ freq: 760, duration: 0.18, type: 'square', gain: 0.22 }); },
  tick() {
    const now = performance.now();
    if (now - lastTickAt < TICK_MIN_GAP_MS) return;
    lastTickAt = now;
    playTone({ freq: 1200, duration: 0.02, type: 'square', gain: 0.07 });
  },
  ok() { playTone({ freq: 1500, duration: 0.08, gain: 0.18, freqEnd: 1800 }); },
  fail() { playTone({ freq: 140, duration: 0.3, type: 'sawtooth', gain: 0.2, freqEnd: 95 }); },
  keyClick() { playTone({ freq: 1800 + Math.random() * 400, duration: 0.015, type: 'square', gain: 0.12 }); },
  accessChime() {
    playTone({ freq: 700, duration: 0.12, gain: 0.22 });
    playTone({ freq: 1050, duration: 0.18, gain: 0.22, delay: 0.09 });
  },
  blip() { playTone({ freq: 2000, duration: 0.03, gain: 0.12 }); },
};
// The network map's hover handling lives in index.html's own plain
// script (same cross-script bridge pattern as window.goToWall below).
window.reeosBlip = () => sound.blip();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Characters per tick. Browsers clamp nested setTimeout to ~4ms, so past a
// point the only way to type faster is to emit more per step rather than to
// shorten the wait.
const TYPE_CHUNK = 2;

async function typeInto(container, text, speed, tickSound, chunk = TYPE_CHUNK) {
  const lineEl = document.createElement('div');
  // index.html has a blanket `div { font-family: Orbitron; font-weight: bolder;
  // letter-spacing: 5px }` rule that directly matches any plain div like this one,
  // which beats inheriting the container's intended monospace terminal styling.
  // Force it back to "inherit" so it actually picks up the container's font.
  lineEl.style.fontFamily = 'inherit';
  lineEl.style.fontWeight = 'inherit';
  lineEl.style.letterSpacing = 'inherit';
  lineEl.style.color = 'inherit';
  container.appendChild(lineEl);
  for (let i = 0; i < text.length; i += chunk) {
    lineEl.textContent += text.slice(i, i + chunk);
    tickSound();
    await sleep(speed);
  }
  container.scrollTop = container.scrollHeight;
  return lineEl;
}

async function typeLine(text, speed = 6) {
  return typeInto(codeLines, text, speed, sound.tick);
}

const DOT_COLUMN = 30;
function dotsFor(label) {
  return '.'.repeat(Math.max(1, DOT_COLUMN - label.length));
}

async function typeCheckLine(label) {
  const lineEl = await typeLine(`${label} ${dotsFor(label)} `, 5);
  return lineEl;
}

function popBadge(lineEl, status) {
  const badge = document.createElement('span');
  badge.className = status === 'OK' ? 'ok-badge' : 'fail-badge';
  badge.textContent = status === 'OK' ? '[ OK ]' : '[ FAIL ]';
  lineEl.appendChild(badge);
  status === 'OK' ? sound.ok() : sound.fail();
}

const CHECK_LABELS = [
  'CompTIA Network+',
  'ISC2 CC',
  'Help desk, Tier 1',
  'Active Directory',
  'Microsoft 365',
  'Ticketing system',
  'People skills (60+ a day)',
];

async function runBootSequence() {
  sound.startup();
  await typeLine('REE BIOS v2026  (C) Riya Inc.', 6);
  await typeLine('Running system check...', 6);
  codeLines.appendChild(document.createElement('br'));

  for (const label of CHECK_LABELS) {
    const lineEl = await typeCheckLine(label);
    popBadge(lineEl, 'OK');
    await sleep(30);
  }

  // Coffee fails once, retries, then passes — the small joke IT people will get.
  // Keeps a touch more pause than the rest; rushed, the gag doesn't land.
  let coffeeLine = await typeCheckLine('Coffee');
  popBadge(coffeeLine, 'FAIL');
  await sleep(150);
  await typeLine('Retrying...', 7);
  await sleep(90);
  coffeeLine = await typeCheckLine('Coffee');
  popBadge(coffeeLine, 'OK');
  await sleep(30);

  codeLines.appendChild(document.createElement('br'));
  await typeLine('Open tickets: 0', 6);
  await typeLine('Location detected: Toronto ON', 6);
  await typeLine('All systems ready. Booting ReeOS...', 6);

  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  codeLines.appendChild(cursor);
}
// Start the boot sequence immediately, and don't let the room appear
// until the whole script has finished typing (with its sound), even if
// the GLB finishes loading sooner.
const bootSequenceDone = runBootSequence();
let modelLoaded = false;

// ───────────────────────────────────────────────
// Call this when your real loading is 100% done (e.g. from LoadingManager.onLoad)
function finishLoading() {
  modelLoaded = true;
  bootSequenceDone.then(() => {
    if (!modelLoaded) return;
    terminal.style.display = 'none';
    document.getElementById('login-screen').classList.add('visible');
  });
}

// ───────────────────────────────────────────────
// Login screen (spec p.3). The old corner job titles and the old
// name/location/clock block move into the status bar and user card —
// hide them from the room. This file only runs on desktop (mobile
// throws out at the top), so mobile's own layout is untouched.
// ───────────────────────────────────────────────
const oldTitles = document.querySelector('.right_details');
if (oldTitles) oldTitles.style.display = 'none';
const oldDetails = document.querySelector('.left_details');
if (oldDetails) oldDetails.style.display = 'none';

// The network map panel is shared with the mobile hero layout, so it can't
// default to hidden in CSS (mobile never runs this file to reveal it again).
// Hide it here instead, desktop-only, until the room + four corners appear.
const networkMapPanel = document.getElementById('constellation-panel');
if (networkMapPanel) networkMapPanel.style.display = 'none';

const loginScreen = document.getElementById('login-screen');
const ticketCard = document.getElementById('login-ticket-card');
const ticketLines = document.getElementById('login-ticket-lines');
const statusBar = document.getElementById('status-bar');
const ticketQueuePanel = document.getElementById('ticket-queue-panel');
let doorOpened = false;
let forgotPasswordClicked = false;

// ───────────────────────────────────────────────
// Room + four corners (spec p.4). Appear together once the door opens.
// ───────────────────────────────────────────────
function showRoomCorners() {
  statusBar.classList.add('visible');
  ticketQueuePanel.classList.add('visible');
  if (networkMapPanel) networkMapPanel.style.display = '';
  runTicketQueueLoop();
}

// ───────────────────────────────────────────────
// Live ticket queue (spec p.5). Runs the whole time the room is open:
// the in-progress ticket closes, then a new one types in at the bottom
// and the oldest scrolls off the top — no sound, it updates too often.
// ───────────────────────────────────────────────
async function typeIntoElement(el, text, speed = 14) {
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await sleep(speed);
  }
  return el;
}

const TICKET_POOL = [
  'Email sync error',
  'Account locked out',
  'Software install request',
  'Slow laptop performance',
  'Wi-Fi not connecting',
  'Shared drive access',
];

const tqList = document.getElementById('tq-list');
const tqClosedCountEl = document.getElementById('tq-closed-count');
const TQ_MAX_VISIBLE = 3;
let tqClosedCount = 2;
let tqNextTicketNumber = 1045;
let tqPoolIndex = 0;

function closeTicketRow(statusEl) {
  statusEl.textContent = 'CLOSED';
  statusEl.classList.remove('tq-progress');
  statusEl.classList.add('tq-closed');
  tqClosedCount++;
  tqClosedCountEl.textContent = tqClosedCount;
}

async function addTicketRow() {
  const desc = TICKET_POOL[tqPoolIndex % TICKET_POOL.length];
  tqPoolIndex++;
  const number = tqNextTicketNumber++;

  const row = document.createElement('div');
  row.className = 'tq-row tq-row-enter';
  const numEl = document.createElement('span');
  numEl.textContent = `#${number}`;
  const descEl = document.createElement('span');
  descEl.className = 'tq-desc';
  const statusEl = document.createElement('span');
  statusEl.className = 'tq-status tq-progress';
  statusEl.textContent = 'IN PROGRESS';
  row.append(numEl, descEl, statusEl);
  tqList.appendChild(row);

  // Oldest row scrolls off the top once we're over the visible limit —
  // removed outright rather than height-animated, so there's no window
  // where an entering and an exiting row can occupy the same slot.
  const rows = tqList.querySelectorAll('.tq-row');
  if (rows.length > TQ_MAX_VISIBLE) {
    rows[0].remove();
  }

  // Double rAF so the "enter" (faded/offset) state paints before we
  // transition out of it — opacity/transform only, so this never
  // affects layout or other rows' positions.
  requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove('tq-row-enter')));

  await sleep(420);
  await typeIntoElement(descEl, desc, 16);
  return statusEl;
}

let ticketQueueLoopStarted = false;
async function runTicketQueueLoop() {
  if (ticketQueueLoopStarted) return;
  ticketQueueLoopStarted = true;

  const initialStatus = document.getElementById('tq-initial-status');
  await sleep(4000 + Math.random() * 2000);
  closeTicketRow(initialStatus);

  while (true) {
    await sleep(3000 + Math.random() * 2000);
    const statusEl = await addTicketRow();
    await sleep(4000 + Math.random() * 3000);
    closeTicketRow(statusEl);
  }
}

const statusUptimeEl = document.getElementById('status-uptime');
setInterval(() => {
  statusUptimeEl.textContent = new Date().toLocaleString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}, 1000);

// ───────────────────────────────────────────────
// Tablet screens — both are drawn as canvas textures painted straight onto
// the screen meshes, so they're part of the 3D scene and stay glued to the
// screens at every angle. The screen quads are ~1.95:1, so the canvases match
// that aspect to avoid stretching the text.
// ───────────────────────────────────────────────
// Starts square; resized to each screen's true aspect once the model is in
// and the quad can actually be measured. The quads turn out portrait, not
// landscape — a parent node stretches Z by 2.5x and the rotated screen picks
// that up along its vertical edge — so the aspect can't be read off the raw
// local vertex positions.
const SCREEN_CANVAS_W = 1024;

function makeScreenCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_CANVAS_W;
  canvas.height = SCREEN_CANVAS_W;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

const accessScreen = makeScreenCanvas();
const pcScreen = makeScreenCanvas();

// ───────────────────────────────────────────────
// Room music. Starts when the visitor enters the room rather than on page
// load, so playback is tied to their click and isn't blocked as autoplay.
// Declared above the access log because the log reports its state.
// ───────────────────────────────────────────────
const MUSIC_TRACK = 'CHIHIRO - Billie Eilish';
const roomMusic = document.getElementById('room-music');
const statusMusicBtn = document.getElementById('status-music-btn');
roomMusic.volume = 0.3;
let musicOn = true;

function playRoomMusic() {
  if (!musicOn) return;
  roomMusic.play().catch(() => {
    // Blocked for want of a gesture; take the next click anywhere instead.
    document.body.addEventListener('click', playRoomMusic, { once: true });
  });
}

// Logging off the element's own events rather than the call sites, so every
// route into playing/paused gets recorded — button, tablet handover, or the
// browser stopping it on its own.
roomMusic.addEventListener('play', () => {
  logAccess(`Song playing - ${MUSIC_TRACK}`);
});
roomMusic.addEventListener('pause', () => {
  logAccess('Song paused');
});

statusMusicBtn.addEventListener('click', () => {
  musicOn = !musicOn;
  statusMusicBtn.classList.toggle('muted', !musicOn);
  // No logging here — the element's play/pause events below cover it, and
  // doing both would write every toggle twice.
  if (musicOn) playRoomMusic();
  else roomMusic.pause();
});

// ───────────────────────────────────────────────
// Access log — the right tablet screen. Types in a line for each thing the
// visitor does in the room. Lines are queued so two events firing close
// together can't interleave halfway through typing.
// ───────────────────────────────────────────────
const accessLogRows = [];
let accessLogQueue = Promise.resolve();

function accessLogTimestamp() {
  return new Date().toLocaleString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Read live at draw time rather than tracked as state, so it can't drift out
// of sync with what's actually playing.
function nowPlayingStatus() {
  if (!roomMusic.paused) return { text: `>> PLAYING - ${MUSIC_TRACK}`, on: true };
  if (!musicOn) return { text: '-- MUSIC OFF', on: false };
  return { text: `|| PAUSED - ${MUSIC_TRACK}`, on: false };
}

function drawAccessLog() {
  const { ctx, canvas } = accessScreen;
  const w = canvas.width, h = canvas.height;
  // Everything is proportional to the canvas so the layout survives being
  // resized to the screen's real aspect.
  const pad = w * 0.035;
  const bodyFont = w * 0.030;
  const lineHeight = bodyFont * 1.55;
  const headerY = pad * 0.8;
  const statusY = headerY + w * 0.045;
  const ruleY = statusY + lineHeight;
  const firstLineY = ruleY + lineHeight * 0.45;

  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);

  ctx.textBaseline = 'top';
  ctx.font = `bold ${w * 0.034}px "Courier New", Courier, monospace`;
  ctx.fillStyle = 'rgba(0,255,0,0.55)';
  ctx.fillText('ACCESS LOG', pad, headerY);

  const status = nowPlayingStatus();
  ctx.font = `${w * 0.028}px "Courier New", Courier, monospace`;
  ctx.fillStyle = status.on ? '#39FF14' : 'rgba(0,255,0,0.4)';
  ctx.fillText(status.text, pad, statusY);

  ctx.strokeStyle = 'rgba(0,255,0,0.25)';
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.beginPath();
  ctx.moveTo(pad, ruleY);
  ctx.lineTo(w - pad, ruleY);
  ctx.stroke();

  ctx.font = `${bodyFont}px "Courier New", Courier, monospace`;
  const gap = bodyFont * 0.45;
  accessLogRows.forEach((row, i) => {
    const y = firstLineY + i * lineHeight;
    const shown = row.text.slice(0, row.visibleChars);
    const stamp = `[${row.time}]`;
    ctx.fillStyle = 'rgba(0,255,0,0.5)';
    ctx.fillText(stamp, pad, y);
    const textX = pad + ctx.measureText(stamp).width + gap;
    ctx.fillStyle = '#0f0';
    ctx.fillText(shown, textX, y);

    const done = row.visibleChars >= row.text.length;
    let endX = textX + ctx.measureText(shown).width;
    if (row.blocked && done) {
      ctx.fillStyle = '#FF4D4D';
      ctx.fillText(' BLOCKED', endX, y);
      endX += ctx.measureText(' BLOCKED').width;
    }
    // Caret rides the newest line only.
    if (i === accessLogRows.length - 1 && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#0f0';
      ctx.fillRect(endX + gap * 0.5, y + bodyFont * 0.1, bodyFont * 0.5, bodyFont);
    }
  });

  accessScreen.texture.needsUpdate = true;
}

// How many lines fit, given the canvas we ended up with.
function accessLogCapacity() {
  const w = accessScreen.canvas.width, h = accessScreen.canvas.height;
  const lineHeight = w * 0.030 * 1.55;
  const firstLineY = w * 0.035 * 0.8 + w * 0.045 + lineHeight + lineHeight * 0.45;
  return Math.max(3, Math.floor((h - firstLineY - w * 0.035) / lineHeight));
}

function logAccess(text, { blocked = false } = {}) {
  accessLogQueue = accessLogQueue.then(async () => {
    const row = { time: accessLogTimestamp(), text, blocked, visibleChars: 0 };
    accessLogRows.push(row);
    while (accessLogRows.length > accessLogCapacity()) accessLogRows.shift();

    for (let i = 0; i <= text.length; i++) {
      row.visibleChars = i;
      drawAccessLog();
      await sleep(22);
    }
  });
  return accessLogQueue;
}

logAccess('Access monitor online');

// index.html's own plain script owns the portfolio overlay's close button,
// so give it a way in (same cross-script bridge as window.reeosBlip).
window.reeosLog = (text, opts) => logAccess(text, opts);

// ───────────────────────────────────────────────
// ReeOS — the big monitor. Its quad measures 2.59:1, so the three windows sit
// side by side the way they would on a real ultrawide. Repainted on a timer
// rather than every frame: it's a large canvas and a full re-upload at 60fps
// buys nothing for a clock and a line graph.
// ───────────────────────────────────────────────
// 8fps is plenty for a clock, a typing terminal and a line graph, and keeps
// the per-repaint texture upload of this large canvas off the frame budget.
const PC_SCREEN_FPS = 8;
const PC_CANVAS_W = 1280;
let pcLastPaintAt = 0;

const TERMINAL_SCRIPT = [
  { cmd: 'ping 8.8.8.8', out: ['Reply from 8.8.8.8: bytes=32 time=12ms', 'Reply from 8.8.8.8: bytes=32 time=11ms'] },
  { cmd: 'ipconfig', out: ['IPv4 Address . . . : 10.0.14.22', 'Default Gateway  . : 10.0.14.1'] },
  { cmd: 'whoami', out: ['reeos\\riya   (help desk, tier 1)'] },
];
const TERM_PROMPT = 'C:\\ree> ';
const TERM_MAX_LINES = 11;

function buildTerminalQueue() {
  const q = [];
  for (const step of TERMINAL_SCRIPT) {
    q.push({ type: 'type', text: TERM_PROMPT + step.cmd });
    for (const line of step.out) q.push({ type: 'print', text: line });
    q.push({ type: 'wait', ticks: 7 });
  }
  q.push({ type: 'wait', ticks: 16 });
  q.push({ type: 'clear' });
  return q;
}

let termQueue = buildTerminalQueue();
let termStep = 0;
let termTyped = 0;
let termWaited = 0;
const termLines = [];

function advanceTerminal() {
  if (termStep >= termQueue.length) {
    termQueue = buildTerminalQueue();
    termStep = 0;
  }
  const step = termQueue[termStep];
  if (step.type === 'type') {
    termTyped = Math.min(step.text.length, termTyped + 3);
    if (termTyped >= step.text.length) {
      termLines.push(step.text);
      termTyped = 0;
      termStep++;
    }
  } else if (step.type === 'print') {
    termLines.push(step.text);
    termStep++;
  } else if (step.type === 'wait') {
    if (++termWaited >= step.ticks) { termWaited = 0; termStep++; }
  } else {
    termLines.length = 0;
    termStep++;
  }
  while (termLines.length > TERM_MAX_LINES) termLines.shift();
}

const PC_TICKETS = [
  ['#1047', 'Printer offline', 'CLOSED'],
  ['#1048', 'Email sync error', 'CLOSED'],
  ['#1049', 'VPN not connecting', 'OPEN'],
  ['#1050', 'Password reset', 'OPEN'],
];

const netSamples = new Array(56).fill(0.4);
function advanceNetwork() {
  const prev = netSamples[netSamples.length - 1];
  const next = Math.min(0.95, Math.max(0.08, prev + (Math.random() - 0.5) * 0.28));
  netSamples.push(next);
  netSamples.shift();
}

// Access-refused popup state.
let pcLockShownAt = -Infinity;
let pcShakeAt = -Infinity;
let pcShakeAmp = 0;
const PC_LOCK_MS = 2800;

function pcWindow(ctx, x, y, w, h, title) {
  ctx.fillStyle = 'rgba(16,20,24,0.94)';
  ctx.strokeStyle = 'rgba(57,255,20,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  const bar = Math.round(h * 0.085);
  ctx.fillStyle = 'rgba(32,38,44,0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, bar, [8, 8, 0, 0]);
  ctx.fill();
  ctx.fillStyle = 'rgba(57,255,20,0.75)';
  ctx.font = `bold ${Math.round(bar * 0.52)}px "Courier New", Courier, monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + 14, y + bar / 2);
  [['#ff5f56', w - 54], ['#ffbd2e', w - 36], ['#27c93f', w - 18]].forEach(([col, dx]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + dx, y + bar / 2, bar * 0.17, 0, Math.PI * 2);
    ctx.fill();
  });
  return { cx: x + 14, cy: y + bar + 12, cw: w - 28, ch: h - bar - 24 };
}

function drawReeOS() {
  const { ctx, canvas } = pcScreen;
  const w = canvas.width, h = canvas.height;

  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, w * 0.55);
  glow.addColorStop(0, 'rgba(57,255,20,0.10)');
  glow.addColorStop(1, 'rgba(5,7,10,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const taskH = Math.round(h * 0.085);
  const margin = Math.round(w * 0.016);
  const gap = Math.round(w * 0.013);
  const winW = Math.round((w - margin * 2 - gap * 2) / 3);
  const winY = margin;
  const winH = h - taskH - margin * 2;
  const mono = '"Courier New", Courier, monospace';

  // ── Terminal
  {
    const b = pcWindow(ctx, margin, winY, winW, winH, 'terminal');
    const fs = Math.round(winH * 0.045);
    ctx.font = `${fs}px ${mono}`;
    ctx.textBaseline = 'top';
    const lh = fs * 1.5;
    termLines.forEach((line, i) => {
      ctx.fillStyle = line.startsWith(TERM_PROMPT) ? '#39FF14' : 'rgba(170,255,170,0.65)';
      ctx.fillText(line, b.cx, b.cy + i * lh);
    });
    const step = termQueue[termStep];
    if (step && step.type === 'type') {
      ctx.fillStyle = '#39FF14';
      const partial = step.text.slice(0, termTyped);
      const y = b.cy + termLines.length * lh;
      ctx.fillText(partial, b.cx, y);
      if (Math.floor(Date.now() / 400) % 2 === 0) {
        ctx.fillRect(b.cx + ctx.measureText(partial).width + 3, y, fs * 0.55, fs);
      }
    }
  }

  // ── Ticket dashboard
  {
    const x = margin + winW + gap;
    const b = pcWindow(ctx, x, winY, winW, winH, 'tickets');
    const fs = Math.round(winH * 0.045);
    ctx.font = `${fs}px ${mono}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(170,255,170,0.5)';
    ctx.fillText('QUEUE', b.cx, b.cy);
    const open = PC_TICKETS.filter((t) => t[2] === 'OPEN').length;
    ctx.fillStyle = '#39FF14';
    ctx.fillText(`${open} OPEN`, b.cx + b.cw - ctx.measureText(`${open} OPEN`).width, b.cy);

    const rowH = fs * 2.1;
    PC_TICKETS.forEach(([id, desc, status], i) => {
      const y = b.cy + fs * 2.2 + i * rowH;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(b.cx, y - fs * 0.35, b.cw, rowH * 0.82, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(170,255,170,0.75)';
      ctx.fillText(id, b.cx + 8, y);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const maxDesc = Math.floor((b.cw - 150) / (fs * 0.6));
      ctx.fillText(desc.slice(0, maxDesc), b.cx + 8 + fs * 3.6, y);
      ctx.fillStyle = status === 'OPEN' ? '#FFD23F' : '#39FF14';
      ctx.fillText(status, b.cx + b.cw - ctx.measureText(status).width - 8, y);
    });
  }

  // ── Network monitor
  {
    const x = margin + (winW + gap) * 2;
    const b = pcWindow(ctx, x, winY, winW, winH, 'network');
    const fs = Math.round(winH * 0.045);
    ctx.font = `${fs}px ${mono}`;
    ctx.textBaseline = 'top';
    const mbps = (netSamples[netSamples.length - 1] * 94 + 6).toFixed(1);
    ctx.fillStyle = '#39FF14';
    ctx.fillText(`${mbps} Mb/s`, b.cx, b.cy);
    ctx.fillStyle = 'rgba(170,255,170,0.45)';
    ctx.fillText('5 nodes up', b.cx + b.cw - ctx.measureText('5 nodes up').width, b.cy);

    const gy = b.cy + fs * 2.4;
    const gh = b.ch - fs * 3.4;
    ctx.strokeStyle = 'rgba(57,255,20,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const yy = gy + (gh / 3) * i;
      ctx.beginPath();
      ctx.moveTo(b.cx, yy);
      ctx.lineTo(b.cx + b.cw, yy);
      ctx.stroke();
    }
    ctx.beginPath();
    netSamples.forEach((v, i) => {
      const px = b.cx + (b.cw / (netSamples.length - 1)) * i;
      const py = gy + gh - v * gh;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.strokeStyle = '#39FF14';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(b.cx + b.cw, gy + gh);
    ctx.lineTo(b.cx, gy + gh);
    ctx.closePath();
    ctx.fillStyle = 'rgba(57,255,20,0.10)';
    ctx.fill();
  }

  // ── Taskbar
  {
    const ty = h - taskH;
    ctx.fillStyle = 'rgba(10,14,18,0.96)';
    ctx.fillRect(0, ty, w, taskH);
    ctx.strokeStyle = 'rgba(57,255,20,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(w, ty);
    ctx.stroke();

    const fs = Math.round(taskH * 0.42);
    ctx.font = `bold ${fs}px ${mono}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#39FF14';
    ctx.fillText('ReeOS', margin, ty + taskH / 2);
    ctx.font = `${fs}px ${mono}`;
    ctx.fillStyle = 'rgba(170,255,170,0.5)';
    ['terminal', 'tickets', 'network'].forEach((t, i) => {
      ctx.fillText(t, margin + fs * 6 + i * fs * 7, ty + taskH / 2);
    });
    const clock = new Date().toLocaleString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    ctx.fillStyle = '#39FF14';
    ctx.fillText(clock, w - margin - ctx.measureText(clock).width, ty + taskH / 2);
  }

  // ── Access-refused popup
  const sinceLock = Date.now() - pcLockShownAt;
  if (sinceLock < PC_LOCK_MS) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, w, h);

    const sinceShake = Date.now() - pcShakeAt;
    const decay = Math.max(0, 1 - sinceShake / 450);
    const dx = Math.sin(sinceShake / 16) * pcShakeAmp * decay;

    const bw = w * 0.42, bh = h * 0.42;
    const bx = (w - bw) / 2 + dx, by = (h - bh) / 2;
    ctx.fillStyle = 'rgba(18,8,10,0.97)';
    ctx.strokeStyle = '#FF4D4D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.stroke();

    // padlock
    const lx = bx + bw / 2, ly = by + bh * 0.3, lw = bh * 0.17;
    ctx.strokeStyle = '#FF4D4D';
    ctx.lineWidth = Math.max(3, lw * 0.18);
    ctx.beginPath();
    ctx.arc(lx, ly - lw * 0.1, lw * 0.42, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#FF4D4D';
    ctx.beginPath();
    ctx.roundRect(lx - lw * 0.62, ly + lw * 0.1, lw * 1.24, lw * 0.95, 4);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF4D4D';
    ctx.font = `bold ${Math.round(bh * 0.15)}px ${mono}`;
    ctx.fillText('ACCESS RESTRICTED', lx, by + bh * 0.62);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${Math.round(bh * 0.085)}px ${mono}`;
    ctx.fillText('Private property \u00b7 Monitored by Ree', lx, by + bh * 0.80);
    ctx.textAlign = 'left';
  }

  pcScreen.texture.needsUpdate = true;
}

// ───────────────────────────────────────────────
// Wall camera — drifts to follow the pointer within a narrow arc, hinged at
// its mount. Tracked from its own listener rather than the canvas one, which
// bails early while a screen is focused.
// ───────────────────────────────────────────────
const pointerNdc = new THREE.Vector2();
window.addEventListener('mousemove', (e) => {
  pointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

const WALL_CAM_YAW = THREE.MathUtils.degToRad(11);
const WALL_CAM_PITCH = THREE.MathUtils.degToRad(6);
const WALL_CAM_EASE = 0.035;   // low, so it creeps like a real servo
let wallCamYaw = 0;
let wallCamPitch = 0;
const wallCamQ = new THREE.Quaternion();
const wallCamAxisY = new THREE.Vector3(0, 1, 0);
const wallCamAxisX = new THREE.Vector3(1, 0, 0);

function updateWallCamera() {
  if (!wallCamera) return;
  wallCamYaw += (-pointerNdc.x * WALL_CAM_YAW - wallCamYaw) * WALL_CAM_EASE;
  wallCamPitch += (pointerNdc.y * WALL_CAM_PITCH - wallCamPitch) * WALL_CAM_EASE;
  // Applied in world space, then the mount's own orientation — the mesh's
  // local axes don't line up with pan/tilt.
  wallCamera.quaternion
    .setFromAxisAngle(wallCamAxisY, wallCamYaw)
    .multiply(wallCamQ.setFromAxisAngle(wallCamAxisX, wallCamPitch))
    .multiply(wallCameraBaseQuat);
}

// ───────────────────────────────────────────────
// Ring light — switches its own glow on, lifts the room, and opens the
// Creative Side block of the portfolio.
// ───────────────────────────────────────────────
function openPortfolio(section) {
  const frame = document.getElementById('portfolio-iframe');
  const want = section ? `/portfolio.html#${section}` : '/portfolio.html';
  if (frame.getAttribute('src') !== want) frame.setAttribute('src', want);
  document.getElementById('portfolio-overlay').style.display = 'flex';
}

function toggleRingLight() {
  ringLightOn = !ringLightOn;
  sound.ok();
  if (ringLightOn) {
    logAccess('Ring light on - creative side');
    openPortfolio('creative');
  } else {
    logAccess('Ring light off');
    document.getElementById('portfolio-overlay').style.display = 'none';
  }
}

// Eases the lamp and its glow toward whatever the switch says. The glow
// always tracks the eased value, including on the way down, so switching off
// fades rather than snapping.
function updateRingLight() {
  const target = ringLightOn ? ROOM_FILL_ON : 0;
  roomFillCurrent += (target - roomFillCurrent) * 0.08;
  roomFill.intensity = roomFillCurrent;
  if (ringGlowMat) ringGlowMat.emissive.setScalar(roomFillCurrent / ROOM_FILL_ON);
}

// ───────────────────────────────────────────────
// A slow breath on the things you can click, so they read as interactive
// without needing a label. Skipped on whatever the cursor is already on,
// which has its own brighter state.
// ───────────────────────────────────────────────
const HINT_PERIOD_MS = 2400;
const HINT_SCREEN_LOW = 0.72;
const HINT_SCREEN_HIGH = 0.88;

function updateClickHints() {
  const pulse = 0.5 + 0.5 * Math.sin((Date.now() / HINT_PERIOD_MS) * Math.PI * 2);

  [tabletLeftScreen, tabletRightScreen, pcScreenMesh].forEach((mesh) => {
    if (!mesh || mesh === hoveredScreen || !mesh.material.color) return;
    mesh.material.color.setScalar(
      HINT_SCREEN_LOW + (HINT_SCREEN_HIGH - HINT_SCREEN_LOW) * pulse);
  });

  // The lamp hints only while it's off, and never dims the real glow —
  // whichever is brighter wins, so a fade-out hands over to the hint.
  if (ringGlowMat && !ringLightOn) {
    const hint = 0.05 + 0.1 * pulse;
    ringGlowMat.emissive.setScalar(Math.max(roomFillCurrent / ROOM_FILL_ON, hint));
  }
}

const statusThreatsEl = document.getElementById('status-threats');
// Add 'RGBM' here to flash the motherboard and RAM along with the fans.
const FAN_GLOW_MATERIALS = ['Fan_Glow'];
const FAN_FLASH_MS = 1000;
let threatsBlocked = 0;
let fanFlashUntil = 0;

function refusePcAccess() {
  const now = Date.now();
  // A click while the notice is already up is a retry — shake harder.
  pcShakeAmp = now - pcLockShownAt < PC_LOCK_MS ? 18 : 7;
  pcShakeAt = now;
  pcLockShownAt = now;
  fanFlashUntil = now + FAN_FLASH_MS;

  threatsBlocked++;
  statusThreatsEl.textContent = threatsBlocked;

  sound.fail();
  logAccess('Touched the PC —', { blocked: true });
  drawReeOS();
}

// The fans breathe between dark and light blue. The hue is pinned to the
// model's own glow (208deg) and only the lightness moves, so the cycle can
// never wander into another colour. Each fan is offset a third of a cycle,
// which reads as a slow wave across the three. Written fresh every frame,
// so there's no base colour to restore afterwards.
const FAN_RED = new THREE.Color(0xff1414);
const FAN_CYCLE_MS = 9000;
const FAN_HUE = 0.577;
const FAN_LIGHT_DARK = 0.28;
const FAN_LIGHT_PALE = 0.72;

function updateFanGlow() {
  if (!fanGlows.length) return;
  const now = Date.now();
  const remaining = fanFlashUntil - now;
  const flashing = remaining > 0;
  // Two quick pulses across the flash rather than one flat colour change.
  const pulse = flashing
    ? Math.abs(Math.sin((1 - remaining / FAN_FLASH_MS) * Math.PI * 2)) : 0;

  fanGlows.forEach(({ mat, phase }) => {
    const wave = 0.5 + 0.5 * Math.sin((now / FAN_CYCLE_MS + phase) * Math.PI * 2);
    mat.emissive.setHSL(FAN_HUE, 1, FAN_LIGHT_DARK + (FAN_LIGHT_PALE - FAN_LIGHT_DARK) * wave);
    if (flashing) mat.emissive.lerp(FAN_RED, pulse);
  });
}

// ───────────────────────────────────────────────
// Left tablet video. A same-origin <video> can be sampled as a texture, so
// this renders on the mesh itself and needs no DOM pane tracking the screen.
// Muted: that's what lets it autoplay, and it keeps the room music as the
// only audio source.
// ───────────────────────────────────────────────
const tabletVideo = document.getElementById('tablet-video');
const tabletVideoTexture = new THREE.VideoTexture(tabletVideo);
tabletVideoTexture.colorSpace = THREE.SRGBColorSpace;

function playTabletVideo() {
  tabletVideo.play().catch(() => {
    document.body.addEventListener('click', playTabletVideo, { once: true });
  });
}
playTabletVideo();

// Scales the UVs so the video fills the screen and the overflow is cropped,
// rather than letterboxed: with clamped wrapping, sampling outside 0..1
// smears the edge pixels instead of giving black bars. The source is square
// and the screen slightly portrait, so this trims about a fifth of the width.
function fitVideoToScreen(screenAspect) {
  const apply = () => {
    const vw = tabletVideo.videoWidth, vh = tabletVideo.videoHeight;
    if (!vw || !vh) return;
    const videoAspect = vw / vh;
    if (videoAspect > screenAspect) {
      tabletVideoTexture.repeat.set(screenAspect / videoAspect, 1);
    } else {
      tabletVideoTexture.repeat.set(1, videoAspect / screenAspect);
    }
    tabletVideoTexture.offset.set(
      (1 - tabletVideoTexture.repeat.x) / 2,
      (1 - tabletVideoTexture.repeat.y) / 2,
    );
  };
  if (tabletVideo.videoWidth) apply();
  else tabletVideo.addEventListener('loadedmetadata', apply, { once: true });
}

function openDoor() {
  if (doorOpened) return;
  doorOpened = true;
  sound.accessChime();
  loginScreen.classList.remove('visible');
  showRoomCorners();
  playRoomMusic();
  logAccess('Guest (Recruiter) logged in');
}

document.getElementById('login-enter-btn').addEventListener('click', openDoor);

document.getElementById('login-forgot-link').addEventListener('click', async (e) => {
  e.preventDefault();
  if (forgotPasswordClicked) return;
  forgotPasswordClicked = true;

  ticketCard.classList.add('visible');
  await typeInto(ticketLines, 'Issue:   Guest locked out of ReeOS', 10, sound.keyClick);
  await sleep(150);
  await typeInto(ticketLines, 'Checked: account status, password policy', 10, sound.keyClick);
  await sleep(150);
  await typeInto(ticketLines, 'Fix:     password reset, access granted', 10, sound.keyClick);
  await sleep(150);
  const statusLine = await typeInto(ticketLines, 'Status:  ', 10, sound.keyClick);
  const statusValue = document.createElement('span');
  statusValue.textContent = 'Closed by Ree in 4 seconds';
  statusValue.style.color = '#39FF14';
  statusLine.appendChild(statusValue);
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  statusLine.appendChild(cursor);

  await sleep(500);
  openDoor();
});


const loader = new GLTFLoader(loadingManager)


// draco for loading
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'); 
loader.setDRACOLoader(dracoLoader);
// declaring globally
let object;
let wallPlaneMesh = null;
let tabletLeftScreen = null;
let tabletRightScreen = null;
// The whole dual-screen device (body, stand, both screens) — what the hover
// preview frames, as opposed to the single screen quad a click zooms into.
let tabletUnit = null;
let pcScreenMesh = null;
let pcMeshes = [];
// Wall-mounted camera that tracks the pointer, and the ring light switch.
let wallCamera = null;
const wallCameraBaseQuat = new THREE.Quaternion();
let ringLightMesh = null;
let ringGlowMat = null;
let ringLightOn = false;
// One cloned Fan_Glow material per fan, each with its own hue offset.
const FAN_ROOTS = ['Corsair_Fan', 'Corsair_Fan1', 'Corsair_Fan2'];
const fanGlows = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ───────────────────────────────────────────────
// Painting the screens. Each tablet screen is a flat 4-vertex quad whose
// material carries no texture of its own, so we swap in an unlit material
// with our canvas texture. UVs are rebuilt from the local vertex positions
// rather than trusting whatever the exporter wrote — the quad lies in local
// XY facing +Z, so u/v fall straight out of x/y and the text is guaranteed
// upright and unmirrored.
// ───────────────────────────────────────────────
const SCREEN_COLOR_IDLE = 0xbbbbbb;
const SCREEN_COLOR_HOVER = 0xffffff;

// The quad's real size in world space, measured off its corners. Can't be
// derived from local vertex positions times getWorldScale(): a parent scales
// Z by 2.5x and the screen is rotated under it, so that arithmetic reports
// the height at roughly half its true value.
function quadWorldMetrics(mesh) {
  const pos = mesh.geometry.attributes.position;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minX = Math.min(minX, pos.getX(i)); maxX = Math.max(maxX, pos.getX(i));
    minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i));
  }
  const z = pos.getZ(0);
  const origin = mesh.localToWorld(new THREE.Vector3(minX, minY, z));
  const alongX = mesh.localToWorld(new THREE.Vector3(maxX, minY, z));
  const alongY = mesh.localToWorld(new THREE.Vector3(minX, maxY, z));
  const center = mesh.localToWorld(new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, z));
  const width = origin.distanceTo(alongX);
  const height = origin.distanceTo(alongY);
  return { center, width, height, aspect: width / height };
}

// Which local axes the texture's u and v run along, and whether either is
// reversed. The tablets lie in local XY, but the monitor lies in YZ facing
// +X, and its viewer-right runs along -Z — so the mapping has to be stated
// per screen or the UI comes out sideways or mirrored.
const MAP_XY = { u: 0, v: 1, uFlip: false, vFlip: false };
const MAP_ZY_MIRRORED = { u: 2, v: 1, uFlip: true, vFlip: false };
const AXIS_GET = ['getX', 'getY', 'getZ'];

function applyScreenTexture(mesh, screen, mapping = MAP_XY, canvasWidth = SCREEN_CANVAS_W) {
  if (!mesh) return;
  const pos = mesh.geometry.attributes.position;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.count; i++) {
    for (let a = 0; a < 3; a++) {
      const val = pos[AXIS_GET[a]](i);
      if (val < min[a]) min[a] = val;
      if (val > max[a]) max[a] = val;
    }
  }
  const spanU = max[mapping.u] - min[mapping.u] || 1;
  const spanV = max[mapping.v] - min[mapping.v] || 1;

  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const u = (pos[AXIS_GET[mapping.u]](i) - min[mapping.u]) / spanU;
    const v = (pos[AXIS_GET[mapping.v]](i) - min[mapping.v]) / spanV;
    uv[i * 2] = mapping.uFlip ? 1 - u : u;
    uv[i * 2 + 1] = mapping.vFlip ? 1 - v : v;
  }
  mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // Match the canvas to the screen's true proportions, measured in world
  // space, or the contents come out stretched.
  const corner = (axis) => {
    const p = min.slice();
    p[axis] = max[axis];
    return mesh.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
  };
  const origin = mesh.localToWorld(new THREE.Vector3(min[0], min[1], min[2]));
  const aspect = corner(mapping.u).distanceTo(origin) / corner(mapping.v).distanceTo(origin);
  // Video sources have no canvas to resize; they're fitted via UV repeat.
  if (screen.canvas) {
    screen.canvas.width = canvasWidth;
    screen.canvas.height = Math.round(canvasWidth / aspect);
  }

  mesh.material = new THREE.MeshBasicMaterial({
    map: screen.texture,
    side: THREE.DoubleSide,
  });
  mesh.material.color.setHex(SCREEN_COLOR_IDLE);
  return aspect;
}

// Centre, world size and facing direction of a flat screen, for any axis
// pairing. The monitor sits in YZ facing +X, so the tablets' XY assumption
// would report its width as zero.
function planarMetrics(mesh, mapping) {
  const pos = mesh.geometry.attributes.position;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.count; i++) {
    for (let a = 0; a < 3; a++) {
      const val = pos[AXIS_GET[a]](i);
      if (val < min[a]) min[a] = val;
      if (val > max[a]) max[a] = val;
    }
  }
  const at = (axis) => {
    const p = min.slice();
    if (axis !== null) p[axis] = max[axis];
    return mesh.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
  };
  const origin = at(null);
  const center = mesh.localToWorld(new THREE.Vector3(
    (min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2));

  mesh.updateWorldMatrix(true, false);
  const normalAxis = 3 - mapping.u - mapping.v;
  const normal = new THREE.Vector3();
  normal.setComponent(normalAxis, 1);
  normal.transformDirection(mesh.matrixWorld).normalize();

  return {
    center,
    normal,
    width: at(mapping.u).distanceTo(origin),
    height: at(mapping.v).distanceTo(origin),
  };
}

// Pulls up close enough to read ReeOS, with the bezel still in shot.
const PC_VIEW_PADDING = 1.3;

function pcViewpoint() {
  const { center, normal, width, height } = planarMetrics(pcScreenMesh, MAP_ZY_MIRRORED);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const distance = Math.max(
    (height / 2) / Math.tan(vFov / 2),
    (width / 2) / (Math.tan(vFov / 2) * camera.aspect),
  ) * PC_VIEW_PADDING;
  return { position: center.clone().add(normal.multiplyScalar(distance)), target: center };
}

// ───────────────────────────────────────────────
// Camera moves. One lerp driver for both the portfolio wall fly-to and the
// click-to-focus on a tablet screen, so the two can't fight each other.
// ───────────────────────────────────────────────
const camAnim = {
  active: false, pos: new THREE.Vector3(), target: new THREE.Vector3(),
  onArrive: null, speed: 0.14,
};
const CAM_LERP = 0.14;          // per frame; higher lands sooner
// Pulling back out is snappier than going in: on the way in you're watching
// the subject arrive, on the way out you just want control back.
const CAM_LERP_RETURN = 0.22;

// While zoomed in, the room's own HUD gets out of the way and the browser's
// normal arrow comes back — the custom dot cursor is hard to aim with when
// you're reading a screen.
const zoomUiPanels = [document.getElementById('constellation-panel')].filter(Boolean);
function setZoomedUI(on) {
  document.body.classList.toggle('native-cursor', on);
  // A class, not an inline style: the network map's own display is already
  // managed elsewhere and must not be clobbered.
  zoomUiPanels.forEach((el) => el.classList.toggle('hidden-while-zoomed', on));
}

function flyCameraTo(pos, target, onArrive = null, speed = CAM_LERP) {
  camAnim.active = true;
  camAnim.pos.copy(pos);
  camAnim.target.copy(target);
  camAnim.onArrive = onArrive;
  camAnim.speed = speed;
  controls.autoRotate = false;
}

// null when free-orbiting; otherwise the screen mesh we're locked onto.
let focusedScreen = null;
let focusBusy = false;
let previewing = false;
const savedCamPos = new THREE.Vector3();
const savedCamTarget = new THREE.Vector3();
let savedMinDistance = null;
let viewSaved = false;
let orbitLocked = false;

// The free-orbit view to come back to. Taken once, on the first move away
// from it, so hover-preview → click-focus → back lands where you started
// rather than at the preview framing.
function saveView() {
  if (viewSaved) return;
  savedCamPos.copy(camera.position);
  savedCamTarget.copy(controls.target);
  viewSaved = true;
}

// Both the preview and the focus sit far closer than minDistance, and
// OrbitControls.update() re-clamps distance and polar angle on every call
// even while disabled — so it has to be relaxed and skipped, not just off.
function lockOrbit() {
  if (orbitLocked) return;
  orbitLocked = true;
  savedMinDistance = controls.minDistance;
  controls.minDistance = 0.001;
  controls.enabled = false;
}

function unlockOrbit() {
  if (!orbitLocked) return;
  orbitLocked = false;
  controls.minDistance = savedMinDistance;
  controls.enabled = true;
}

const backBtn = document.getElementById('screen-back-btn');

// Where to put the camera so a screen quad fills the view head-on. The
// padding leaves the tablet's bezel visible around the edge, which is what
// sells the embed as being inside the device rather than floating over it.
const SCREEN_VIEW_PADDING = 1.22;

function screenViewpoint(mesh) {
  const { center, width, height } = quadWorldMetrics(mesh);
  // The quad's face is its local +Z, which is what getWorldDirection returns.
  // Always approach from that side: the material is double-sided, so landing
  // behind the screen would render the texture mirrored. (The right tablet's
  // face points slightly away from the default camera, so "whichever side the
  // viewer is on" would pick the wrong one.)
  const normal = mesh.getWorldDirection(new THREE.Vector3());

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const fitHeight = (height / 2) / Math.tan(vFov / 2);
  const fitWidth = (width / 2) / (Math.tan(vFov / 2) * camera.aspect);
  const distance = Math.max(fitHeight, fitWidth) * SCREEN_VIEW_PADDING;

  return { position: center.clone().add(normal.multiplyScalar(distance)), target: center };
}

// Frames the whole device so both screens and the body sit centred and large.
// The extents are measured on the camera's own view plane rather than from a
// bounding sphere — a sphere has to swallow the unit's long diagonal, which
// here would push the camera back more than twice as far and leave the
// tablets at ~40% of the frame instead of ~85%.
// 1.15 left the tablet at ~87% of the frame height — so little margin that
// the top read as clipped. 1.28 keeps it large but visibly inset all round.
const TABLET_VIEW_PADDING = 1.28;

function tabletUnitViewpoint() {
  const center = new THREE.Box3().setFromObject(tabletUnit).getCenter(new THREE.Vector3());

  // Midway between the two screens' facing directions — they splay slightly,
  // so the average looks at both squarely instead of favouring one.
  const dir = tabletLeftScreen.getWorldDirection(new THREE.Vector3())
    .add(tabletRightScreen.getWorldDirection(new THREE.Vector3()))
    .normalize();

  const right = new THREE.Vector3().crossVectors(camera.up, dir).normalize();
  const up = new THREE.Vector3().crossVectors(dir, right);

  // Bounds are tracked as min/max on each view-plane axis, not as max(|..|)
  // around the box centre. The tablet reaches further "up" the screen than
  // down, so a symmetric measurement pins its top against the frame edge and
  // pools all the slack underneath it.
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  const corner = new THREE.Vector3();
  tabletUnit.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    const bb = child.geometry.boundingBox;
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? bb.max.x : bb.min.x,
        i & 2 ? bb.max.y : bb.min.y,
        i & 4 ? bb.max.z : bb.min.z,
      );
      child.localToWorld(corner).sub(center);
      const u = corner.dot(right);
      const v = corner.dot(up);
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  });

  const halfW = (maxU - minU) / 2;
  const halfH = (maxV - minV) / 2;
  // Aim at where the tablet actually sits in the frame, which is offset from
  // its bounding-box centre. Both offsets lie in the view plane, so this
  // recentres the shot without changing how far away the camera ends up.
  const aim = center.clone()
    .addScaledVector(right, (maxU + minU) / 2)
    .addScaledVector(up, (maxV + minV) / 2);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distance = Math.max(
    halfH / Math.tan(vFov / 2),
    halfW / Math.tan(hFov / 2),
  ) * TABLET_VIEW_PADDING;

  return { position: aim.clone().add(dir.multiplyScalar(distance)), target: aim };
}

// Which thing the hover preview is framing: the tablet unit or the monitor.
// Staying in the preview is judged against this object rather than the small
// screen that triggered it, since centring the subject can otherwise slide it
// out from under the cursor and bounce the camera straight back out.
const PREVIEW_TARGETS = {
  tablet: { viewpoint: () => tabletUnitViewpoint(), stayObject: () => tabletUnit },
  pc: { viewpoint: () => pcViewpoint(), stayObject: () => pcScreenMesh },
};
let previewTarget = null;

function enterPreview(target) {
  const spec = PREVIEW_TARGETS[target];
  if (previewing || focusedScreen || focusBusy || !spec || !spec.stayObject()) return;
  previewing = true;
  previewTarget = target;
  saveView();
  lockOrbit();
  setZoomedUI(true);
  const view = spec.viewpoint();
  flyCameraTo(view.position, view.target);
}

function exitPreview() {
  if (!previewing || focusedScreen || focusBusy) return;
  previewing = false;
  previewTarget = null;
  setZoomedUI(false);
  flyCameraTo(savedCamPos, savedCamTarget, () => {
    unlockOrbit();
    viewSaved = false;
  }, CAM_LERP_RETURN);
}

function focusScreen(mesh) {
  if (!mesh || focusedScreen || focusBusy) return;
  focusBusy = true;
  focusedScreen = mesh;
  previewing = false;

  saveView();      // no-op if the preview already captured it
  lockOrbit();
  setZoomedUI(true);
  canva.style.cursor = 'default';
  if (hoveredScreen) {
    hoveredScreen.material.color.setHex(SCREEN_COLOR_IDLE);
    hoveredScreen = null;
  }

  logAccess(mesh === tabletLeftScreen ? 'Opened the music screen' : 'Opened the access log');

  const view = screenViewpoint(mesh);
  flyCameraTo(view.position, view.target, () => {
    focusBusy = false;
    backBtn.classList.add('visible');
  });
}

function exitScreenFocus() {
  if (!focusedScreen || focusBusy) return;
  focusBusy = true;
  backBtn.classList.remove('visible');
  setZoomedUI(false);
  logAccess('Stepped back from the screen');

  flyCameraTo(savedCamPos, savedCamTarget, () => {
    unlockOrbit();
    viewSaved = false;
    focusedScreen = null;
    focusBusy = false;
    // The cursor is probably still over the tablet; don't snap straight back
    // into the preview the user just backed out of.
    hoverSuppressed = true;
  }, CAM_LERP_RETURN);
}

backBtn.addEventListener('click', exitScreenFocus);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') exitScreenFocus();
});

// Camera fly-to-wall animation
const wallCamDest    = new THREE.Vector3(4.5, 0.5, 0.5);
const wallTargetDest = new THREE.Vector3(0.687, -0.126, 0.193);

window.goToWall = function() {
  if (focusedScreen || focusBusy) return;
  // Drop any hover preview first, or the wall move would run with the orbit
  // still locked and get yanked back the next time the mouse moves.
  clearPreviewTimers();
  if (previewing) {
    previewing = false;
    unlockOrbit();
    viewSaved = false;
  }
  logAccess('Moved to the portfolio wall');
  flyCameraTo(wallCamDest, wallTargetDest);
};

const url = '/room_v2_webp.glb'
// load the item in three.js
loader.load(url, (gltf) => {
    object = gltf.scene

    scene.add(object)           // Add GLB model to the scene
    gltf.scene.position.set(0, 0, 0) // Position it in the center
    object.rotation.y = -3
    object.position.y = -1
    // object.position.x = -.5
    object.position.z = -1
    console.log('loader working fine')
    finishLoading();

    // Some meshes' bounding spheres (baked at export time) don't line up with
    // where the room transform actually puts them, so Three's frustum culling
    // pops them out near the view edges even though they're on screen. Just
    // skip culling for the whole room — it's a small, bounded scene.
    object.traverse((child) => {
      if (child.isMesh) child.frustumCulled = false;
    });

    tabletLeftScreen = object.getObjectByName('Tablet_Left_Screen');
    tabletRightScreen = object.getObjectByName('Tablet_Right_Screen');
    tabletUnit = object.getObjectByName('tablet_6');
    pcMeshes = ['pc', 'pc.001', 'pc.002', 'PC_Screen']
      .map((name) => object.getObjectByName(name))
      .filter(Boolean);

    pcScreenMesh = object.getObjectByName('PC_Screen');

    wallCamera = object.getObjectByName('Wall_Camera');
    if (wallCamera) wallCameraBaseQuat.copy(wallCamera.quaternion);

    ringLightMesh = object.getObjectByName('Ring_Light');
    if (ringLightMesh) {
      // Ring_Glow is used by this mesh alone, so it's safe to drive directly.
      ringGlowMat = ringLightMesh.material;
      ringGlowMat.emissive = ringGlowMat.emissive || new THREE.Color(0x000000);
    }

    fitVideoToScreen(applyScreenTexture(tabletLeftScreen, { texture: tabletVideoTexture }));
    applyScreenTexture(tabletRightScreen, accessScreen);
    applyScreenTexture(pcScreenMesh, pcScreen, MAP_ZY_MIRRORED, PC_CANVAS_W);
    drawAccessLog();
    drawReeOS();

    // Fan_Glow is the three Corsair fans' emissive ring. (RGBM, despite the
    // name, is the motherboard and RAM — not the fans.) All three fans share
    // one material out of the file, so each gets its own clone — otherwise
    // they can only ever be the same colour as each other.
    FAN_ROOTS.forEach((name, i) => {
      const root = object.getObjectByName(name);
      if (!root) return;
      let perFanMaterial = null;
      root.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        if (!FAN_GLOW_MATERIALS.includes(child.material.name)) return;
        if (!perFanMaterial) perFanMaterial = child.material.clone();
        child.material = perFanMaterial;
      });
      if (perFanMaterial) fanGlows.push({ mat: perFanMaterial, phase: i / FAN_ROOTS.length });
    });

    // macOS dark canvas texture for back wall
    const wc = document.createElement('canvas');
    wc.width = 1024; wc.height = 1024;
    const ctx = wc.getContext('2d');

    // dark desktop background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, wc.width, wc.height);

    // macOS window
    const wx = 80, wy = 60, ww = 860, wh = 780;
    // window shadow
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#1c1c1e';
    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    // title bar
    ctx.fillStyle = '#2c2c2e';
    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, 44, [12, 12, 0, 0]);
    ctx.fill();

    // title bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx, wy + 44);
    ctx.lineTo(wx + ww, wy + 44);
    ctx.stroke();

    // traffic lights
    const tlY = wy + 22;
    [['#ff5f56', wx+20], ['#ffbd2e', wx+40], ['#27c93f', wx+60]].forEach(([color, x]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, tlY, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // window title
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Riya — Portfolio 2026", wx + ww / 2, wy + 28);

    // sidebar
    ctx.fillStyle = '#232325';
    ctx.fillRect(wx, wy + 44, 180, wh - 44);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx + 180, wy + 44);
    ctx.lineTo(wx + 180, wy + wh);
    ctx.stroke();

    // sidebar avatar circle
    ctx.fillStyle = '#0a84ff';
    ctx.beginPath();
    ctx.arc(wx + 90, wy + 104, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('R', wx + 90, wy + 113);

    // sidebar name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Arial';
    ctx.fillText('Riya', wx + 90, wy + 150);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px Arial';
    ctx.fillText("Coding with Ree'", wx + 90, wy + 170);

    // sidebar nav items
    const navItems = ['Home', 'About', 'Experience', 'Projects', 'Skills', 'Contact'];
    navItems.forEach((item, i) => {
      const ny = wy + 210 + i * 44;
      if (i === 0) {
        ctx.fillStyle = 'rgba(10,132,255,0.2)';
        ctx.beginPath();
        ctx.roundRect(wx + 8, ny - 14, 164, 30, 6);
        ctx.fill();
        ctx.fillStyle = '#4db8ff';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
      }
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item, wx + 24, ny + 6);
    });

    // content area
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Welcome', wx + 180 + (ww - 180) / 2, wy + 140);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '22px Arial';
    ctx.fillText("I'm Riya", wx + 180 + (ww - 180) / 2, wy + 178);

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx + 200, wy + 200);
    ctx.lineTo(wx + ww - 20, wy + 200);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '15px Arial';
    const bio = 'DevOps-oriented developer  •  2+ years experience  •  Ontario, Canada';
    ctx.fillText(bio, wx + 180 + (ww - 180) / 2, wy + 250);

    // resume card
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(wx + 200, wy + 290, ww - 220, 64, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📄  Resume — Download PDF →', wx + 228, wy + 330);

    // dock
    const dockW = 240, dockH = 52, dockX = wx + ww/2 - dockW/2, dockY = wy + wh - 70;
    ctx.fillStyle = 'rgba(40,40,44,0.75)';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(dockX, dockY, dockW, dockH, 14);
    ctx.fill();
    ctx.stroke();
    ['💻','🔗','▶️','📄'].forEach((icon, i) => {
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(icon, dockX + 32 + i * 56, dockY + 34);
    });

    const wallTexture = new THREE.CanvasTexture(wc);
    wallTexture.repeat.set(-1, 1);
    wallTexture.offset.set(1, 0);

    object.traverse((child) => {
      if (child.name === 'Cube019_Baked_Baked') {
        const wallPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(3.8, 3.753),
          new THREE.MeshBasicMaterial({ map: wallTexture, side: THREE.DoubleSide })
        );

        // exact world center from console + push slightly toward camera
        wallPlane.position.set(0.687, -0.126, -0.2);
        wallPlane.rotation.y = object.rotation.y + Math.PI / 2;
        scene.add(wallPlane);
        wallPlaneMesh = wallPlane;
      }
    });


},(progress)=>{
if (progress.lengthComputable) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
    console.log(`Loading: ${percent}%`);
    }
}, undefined, (error) => {
    console.error('Error loading GLB', error)
})

// for window change flexibility
window.addEventListener("resize",()=>{
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth/window.innerHeight
  camera.updateProjectionMatrix()

})

// adding light
 const Toplight = new THREE.DirectionalLight(0xffffff,1);
 Toplight.position.set(500,500,500)
 Toplight.castShadow= true;
 scene.add(Toplight);

// Sits at zero until the ring light is switched on, then eases up to lift the
// whole room a little. Eased rather than snapped so it reads as a lamp
// warming up instead of a lighting bug.
const roomFill = new THREE.AmbientLight(0xfff4e0, 0);
scene.add(roomFill);
const ROOM_FILL_ON = 0.55;
let roomFillCurrent = 0;

//  const axeshelper = new THREE.AxesHelper(5)
// scene.add(axeshelper)


// orbit control and user intraction
const controls = new OrbitControls(camera,canva)
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 3;
controls.minPolarAngle = 0;                    // can look fully from above (top view)
controls.maxPolarAngle = Math.PI / 2;          // stops at horizontal → cannot go below equator
// Make user rotation slower & more weighty
    
// zoom in and out limit
// The desk and its contents form a dense shell 2.0-2.5 units out from the
// orbit target, with almost nothing between 2.5 and 3.5 — so 2.6 sits just
// clear of the furniture and is as close as the camera can get without
// pushing through it. Must also stay under the 3.88 units the PORTFOLIO
// fly-to-wall lands at, since update() clamps that move too.
controls.minDistance = 2.6;
controls.maxDistance = 10;       //how far they can zoom out

//for extra inertia/weight
controls.enableDamping = true;
controls.dampingFactor = 0.08;       // 0.05–0.12 range — higher = quicker stop, lower = longer "coasting"


controls.zoomSpeed = 0.7;


setTimeout(()=>{
 controls.autoRotate = false;
 console.log("i am activated")
},8000)
 

// after loading the item, time to show on browser with render 
const renderer = new THREE.WebGLRenderer({canvas:canva,alpha:true, antialias:true})
const width = window.innerWidth   // 50% of window width
const height = window.innerHeight // 50% of window height
renderer.setSize(width, height)


   

let lastCaretPhase = -1;

const renderloop = () => {

  requestAnimationFrame(renderloop)

  if (camAnim.active) {
    camera.position.lerp(camAnim.pos, camAnim.speed);
    controls.target.lerp(camAnim.target, camAnim.speed);
    if (camera.position.distanceTo(camAnim.pos) < 0.01) {
      camera.position.copy(camAnim.pos);
      controls.target.copy(camAnim.target);
      camAnim.active = false;
      const done = camAnim.onArrive;
      camAnim.onArrive = null;
      if (done) done();
    }
  }

  // update() is what aims the camera at controls.target, but it also re-clamps
  // distance and polar angle on every call, which would drag the camera back
  // off the screen while locked on. So while locked, do the aiming by hand —
  // otherwise the camera moves into position still pointing the old way and
  // the subject lands off-centre.
  if (orbitLocked) camera.lookAt(controls.target);
  else controls.update();

  renderer.render(scene, camera)

  // Only repaint for the caret blink — a full 1024px canvas re-upload every
  // frame is not worth it. Typing repaints on its own.
  const caretPhase = Math.floor(Date.now() / 500);
  if (accessLogRows.length && caretPhase !== lastCaretPhase) {
    lastCaretPhase = caretPhase;
    drawAccessLog();
  }

  updateFanGlow();
  updateWallCamera();
  // Ring light first: the hint reads its eased value to decide whether to
  // take over the glow.
  updateRingLight();
  updateClickHints();

  // The monitor runs on its own slow clock for the same reason.
  const now = Date.now();
  if (pcScreenMesh && now - pcLastPaintAt > 1000 / PC_SCREEN_FPS) {
    pcLastPaintAt = now;
    advanceTerminal();
    advanceNetwork();
    drawReeOS();
  }
}
renderloop()

console.log(renderer)

function setPointerFromEvent(e) {
  const rect = canva.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
}

function tabletScreens() {
  return [tabletLeftScreen, tabletRightScreen].filter(Boolean);
}

// Tablets take priority, then the back wall, then the PC — one handler so a
// single click can't trigger two of them.
canva.addEventListener('click', (e) => {
  if (focusedScreen || focusBusy) return;
  if (!wallPlaneMesh) return;
  setPointerFromEvent(e);

  const tabletHit = raycaster.intersectObjects(tabletScreens(), false)[0];
  if (tabletHit) {
    clearPreviewTimers();
    sound.blip();
    focusScreen(tabletHit.object);
    return;
  }

  if (ringLightMesh && raycaster.intersectObject(ringLightMesh, false).length > 0) {
    toggleRingLight();
    return;
  }

  const hits = raycaster.intersectObject(wallPlaneMesh);
  if (hits.length > 0) {
    // only open if camera is on the visible (front) side of the wall
    const worldNormal = hits[0].face.normal.clone()
      .transformDirection(wallPlaneMesh.matrixWorld);
    const toCamera = camera.position.clone().sub(hits[0].point).normalize();
    if (worldNormal.dot(toCamera) < 0) {
      openPortfolio(null);
      logAccess('Opened a screen');
    }
    return;
  }

  if (pcMeshes.length && raycaster.intersectObjects(pcMeshes, true).length > 0) {
    refusePcAccess();
  }
});

// Pointer cursor over the wall; tablets also brighten so they read as clickable.
let hoveredScreen = null;
let hoverSuppressed = false;
let previewEnterTimer = null;
let previewExitTimer = null;

function clearPreviewTimers() {
  clearTimeout(previewEnterTimer);
  clearTimeout(previewExitTimer);
  previewEnterTimer = null;
  previewExitTimer = null;
}

canva.addEventListener('mousemove', (e) => {
  if (focusedScreen || focusBusy) return;
  if (!wallPlaneMesh) return;
  setPointerFromEvent(e);

  // Only the screen quads are tested here, never the PC tower's hundreds of
  // meshes — this runs on every mouse move.
  const tabletHit = raycaster.intersectObjects(tabletScreens(), false)[0];
  const pcHit = !tabletHit && pcScreenMesh
    ? raycaster.intersectObject(pcScreenMesh, false)[0] : null;
  const nextHovered = (tabletHit && tabletHit.object) || (pcHit && pcHit.object) || null;
  if (nextHovered !== hoveredScreen) {
    if (hoveredScreen) hoveredScreen.material.color.setHex(SCREEN_COLOR_IDLE);
    if (nextHovered) nextHovered.material.color.setHex(SCREEN_COLOR_HOVER);
    hoveredScreen = nextHovered;
  }

  const wantedTarget = tabletHit ? 'tablet' : (pcHit ? 'pc' : null);
  const stayObject = previewing && PREVIEW_TARGETS[previewTarget].stayObject();
  const overStay = stayObject
    && raycaster.intersectObject(stayObject, true).length > 0;
  if (!overStay && !wantedTarget) hoverSuppressed = false;

  if (previewing) {
    if (overStay) {
      clearTimeout(previewExitTimer);
      previewExitTimer = null;
    } else if (!previewExitTimer) {
      previewExitTimer = setTimeout(() => { previewExitTimer = null; exitPreview(); }, 120);
    }
  } else if (wantedTarget && !hoverSuppressed) {
    // Short delay so a cursor passing over the desk doesn't yank the camera.
    if (!previewEnterTimer) {
      previewEnterTimer = setTimeout(() => {
        previewEnterTimer = null;
        enterPreview(wantedTarget);
      }, 200);
    }
  } else if (previewEnterTimer) {
    clearTimeout(previewEnterTimer);
    previewEnterTimer = null;
  }

  const ringHovered = !nextHovered && ringLightMesh
    && raycaster.intersectObject(ringLightMesh, false).length > 0;
  const wallHovered = !nextHovered && !ringHovered
    && raycaster.intersectObject(wallPlaneMesh).length > 0;
  canva.style.cursor = (nextHovered || ringHovered || wallHovered) ? 'pointer' : 'default';
  if (window.setWallHover) window.setWallHover(wallHovered);
});

// Leaving the canvas entirely can't be caught by a raycast.
canva.addEventListener('mouseleave', () => {
  clearPreviewTimers();
  if (previewing) exitPreview();
});