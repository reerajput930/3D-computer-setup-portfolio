import * as THREE from 'three'
import { ThreeMFLoader } from 'three/examples/jsm/Addons.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { AxesHelper } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { LoadingManager } from 'three'

const progressText = document.getElementById('progress-text');

// Function to update progress (0 to 100)
function updateProgress(percent) {
  // console.log("safepercent",percent)
  // const safePercent = Math.min(100, Math.max(0, percent));
  progressText.textContent = Math.round(percent) + '%';
}

function finishLoadingPercent() {
  // Jump to 100% in case it didn't reach exactly
  updateProgress(100);
  
}
const loadingManager = new THREE.LoadingManager();

// Fake ramp: 0→18% in 800ms so the bar moves immediately on first paint
let fakePercent = 0;
let realStarted = false;
const fakeRamp = setInterval(() => {
  if (realStarted) { clearInterval(fakeRamp); return; }
  fakePercent = Math.min(fakePercent + 3, 18);
  updateProgress(fakePercent);
  if (fakePercent >= 18) clearInterval(fakeRamp);
}, 80);

loadingManager.onProgress = (url, loaded, total) => {
  if (total > 0) {
    realStarted = true;
    clearInterval(fakeRamp);
    const percent = (loaded / total) * 100;
    updateProgress(percent);
  }
};

loadingManager.onLoad = () => {
  finishLoadingPercent();
};

loadingManager.onError = (url) => {
  progressText.textContent = 'Error';
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

// Fake code snippets to "type" out (random-ish onboarding simulation)
const fakeCodeSnippets = [
   "> Finalizing welcome protocol...",
   "> Scanning user vibe - friendly human connection detected...",
   "> Loading personality matrix...",
  "> Sarcasm level: 87%, - Charm factor: MAX.....",
   "> Compiling reality shaders   - Glow intensity: high",
   "> Mounting virtual desk assets...",
  "  - Ring light calibration [COMPLETE]",
  "> System getting ready, fasten your seat belt.........",
  "> Access granted. Initiating immersion......"
];

// Typing animation settings
let currentLineIndex = 0;
let charIndex = 0;
let typingSpeed = 0;     // ms per char (faster = 20–30, slower = 60+)
let lineDelay = 0;      // pause after each line

function typeNextChar() {
  if (currentLineIndex >= fakeCodeSnippets.length) {
    // All lines done → keep blinking cursor or wait for real load finish
    codeLines.innerHTML += '<span class="cursor"></span>';
    return;
  }

  const currentLine = fakeCodeSnippets[currentLineIndex];

if (charIndex < currentLine.length) {
    // Add one char
    codeLines.innerHTML += currentLine[charIndex];
    charIndex++;
    setTimeout(typeNextChar, typingSpeed);
  } else {
    // Line finished → add newline + cursor, move to next
    codeLines.innerHTML += '<br>';
    charIndex = 0;
    currentLineIndex++;
    
    // Scroll to bottom
    codeLines.scrollTop = codeLines.scrollHeight;
    
    setTimeout(typeNextChar, lineDelay);
  }
}
// Start the fake typing immediately
typeNextChar();

// ───────────────────────────────────────────────
// Call this when your real loading is 100% done (e.g. from LoadingManager.onLoad)
function finishLoading() {
  
    terminal.style.display = 'none';
  
}


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
    finishLoadingPercent()

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
      updateProgress(percent);
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