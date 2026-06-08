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


loadingManager.onProgress = (url, loaded, total) => {
  if (total > 0) {
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

    // build win95 desktop canvas texture for back wall
    const wc = document.createElement('canvas');
    wc.width = 1024; wc.height = 1024;
    const ctx = wc.getContext('2d');

    // desktop background fills entire canvas
    ctx.fillStyle = '#008080';
    ctx.fillRect(0, 0, wc.width, wc.height);

    // large centered portfolio window
    const wx = 120, wy = 80, ww = 780, wh = 700;
    // window shadow
    ctx.fillStyle = '#005555';
    ctx.fillRect(wx + 6, wy + 6, ww, wh);
    // window body
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(wx, wy, ww, wh);
    // title bar
    ctx.fillStyle = '#000080';
    ctx.fillRect(wx + 2, wy + 2, ww - 4, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Riya  -  Portfolio 2026', wx + 12, wy + 26);
    // window control buttons
    [[ww - 24, '×'], [ww - 48, '□'], [ww - 72, '_']].forEach(([bx, sym]) => {
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(wx + bx, wy + 6, 20, 22);
      ctx.fillStyle = '#808080';
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx + bx, wy + 6, 20, 22);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sym, wx + bx + 10, wy + 22);
    });
    // white content area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 4, wy + 40, ww - 8, wh - 44);

    // portfolio content inside window
    ctx.fillStyle = '#000080';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RIYA', wx + ww / 2, wy + 160);

    ctx.fillStyle = '#444444';
    ctx.font = '26px Arial';
    ctx.fillText('UI/UX Designer  •  Developer  •  3D Artist', wx + ww / 2, wy + 210);

    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(wx + 60, wy + 228, ww - 120, 2);

    // nav links
    ['ABOUT', 'PROJECTS', 'SKILLS', 'CONTACT'].forEach((item, i) => {
      ctx.fillStyle = '#0000cc';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item, wx + 130 + i * 175, wy + 310);
      ctx.fillStyle = '#0000cc';
      ctx.fillRect(wx + 130 + i * 175 - 38, wy + 316, 76, 2);
    });

    ctx.fillStyle = '#888888';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Coding with Ree'  •  Ontario, Canada", wx + ww / 2, wy + 640);

    // left desktop icons
    ['Projects', 'About', 'Skills', 'Contact'].forEach((label, i) => {
      const ix = 18, iy = 60 + i * 160;
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(ix, iy, 88, 68);
      ctx.fillStyle = '#000080';
      ctx.fillRect(ix + 5, iy + 5, 78, 44);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, ix + 44, iy + 88);
    });

    // taskbar
    const tbH = 56;
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, wc.height - tbH, wc.width, tbH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, wc.height - tbH, wc.width, 2);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('> Start', 14, wc.height - 18);
    ctx.textAlign = 'right';
    ctx.fillText('12:27 PM', wc.width - 14, wc.height - 18);

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
  if (raycaster.intersectObject(wallPlaneMesh).length > 0) {
    document.getElementById('portfolio-overlay').style.display = 'flex';
  }
});

// Pointer cursor when hovering wall
canva.addEventListener('mousemove', (e) => {
  if (!wallPlaneMesh) return;
  const rect = canva.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  canva.style.cursor = raycaster.intersectObject(wallPlaneMesh).length > 0 ? 'pointer' : 'default';
});