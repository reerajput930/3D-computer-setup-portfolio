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
  1,
  1000)
camera.position.z = 5
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
  g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}
const sound = {
  startup() { playTone({ freq: 760, duration: 0.18, type: 'square', gain: 0.22 }); },
  tick() { playTone({ freq: 1200, duration: 0.02, type: 'square', gain: 0.07 }); },
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

async function typeInto(container, text, speed, tickSound) {
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
  for (let i = 0; i < text.length; i++) {
    lineEl.textContent += text[i];
    tickSound();
    await sleep(speed);
  }
  container.scrollTop = container.scrollHeight;
  return lineEl;
}

async function typeLine(text, speed = 12) {
  return typeInto(codeLines, text, speed, sound.tick);
}

const DOT_COLUMN = 30;
function dotsFor(label) {
  return '.'.repeat(Math.max(1, DOT_COLUMN - label.length));
}

async function typeCheckLine(label) {
  const lineEl = await typeLine(`${label} ${dotsFor(label)} `, 9);
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
  await typeLine('REE BIOS v2026  (C) Riya Inc.', 10);
  await typeLine('Running system check...', 12);
  codeLines.appendChild(document.createElement('br'));

  for (const label of CHECK_LABELS) {
    const lineEl = await typeCheckLine(label);
    popBadge(lineEl, 'OK');
    await sleep(90);
  }

  // Coffee fails once, retries, then passes — the small joke IT people will get.
  let coffeeLine = await typeCheckLine('Coffee');
  popBadge(coffeeLine, 'FAIL');
  await sleep(260);
  await typeLine('Retrying...', 14);
  await sleep(180);
  coffeeLine = await typeCheckLine('Coffee');
  popBadge(coffeeLine, 'OK');
  await sleep(90);

  codeLines.appendChild(document.createElement('br'));
  await typeLine('Open tickets: 0', 10);
  await typeLine('Location detected: Toronto ON', 10);
  await typeLine('All systems ready. Booting ReeOS...', 12);

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

const statusMusicBtn = document.getElementById('status-music-btn');
const roomAudio = document.getElementById('mySong');
let statusMuted = false;
statusMusicBtn.addEventListener('click', () => {
  statusMuted = !statusMuted;
  roomAudio.volume = statusMuted ? 0 : 0.3;
  statusMusicBtn.classList.toggle('muted', statusMuted);
});

function openDoor() {
  if (doorOpened) return;
  doorOpened = true;
  sound.accessChime();
  loginScreen.classList.remove('visible');
  showRoomCorners();
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
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Camera fly-to-wall animation
let isAnimatingToWall = false;
const wallCamDest    = new THREE.Vector3(4.5, 0.5, 0.5);
const wallTargetDest = new THREE.Vector3(0.687, -0.126, 0.193);

window.goToWall = function() {
  isAnimatingToWall = true;
  controls.autoRotate = false;
};

const url = '/just_checkingglb.glb'
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
controls.minDistance = 3.5;      // how close they can zoom in
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


   

const renderloop = () => {

  requestAnimationFrame(renderloop)

  if (isAnimatingToWall) {
    camera.position.lerp(wallCamDest, 0.04);
    controls.target.lerp(wallTargetDest, 0.04);
    if (camera.position.distanceTo(wallCamDest) < 0.08) {
      isAnimatingToWall = false;
    }
  }

  renderer.render(scene, camera)
  controls.update();
}
renderloop()

console.log(renderer)

// Click the back wall → open portfolio overlay
canva.addEventListener('click', (e) => {
  if (!wallPlaneMesh) return;
  const rect = canva.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(wallPlaneMesh);
  if (hits.length > 0) {
    // only open if camera is on the visible (front) side of the wall
    const worldNormal = hits[0].face.normal.clone()
      .transformDirection(wallPlaneMesh.matrixWorld);
    const toCamera = camera.position.clone().sub(hits[0].point).normalize();
    if (worldNormal.dot(toCamera) < 0) {
      document.getElementById('portfolio-overlay').style.display = 'flex';
    }
  }
});

// Pointer cursor when hovering wall
canva.addEventListener('mousemove', (e) => {
  if (!wallPlaneMesh) return;
  const rect = canva.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hovered = raycaster.intersectObject(wallPlaneMesh).length > 0;
  canva.style.cursor = hovered ? 'pointer' : 'default';
  if (window.setWallHover) window.setWallHover(hovered);
});