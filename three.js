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
  console.log("safepercent",percent)
  const safePercent = Math.min(100, Math.max(0, percent));
  progressText.textContent = Math.round(safePercent) + '%';
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
  // Optional: finish typing faster or show final message
  codeLines.innerHTML += '<br>> Access granted. Initiating immersion...<br>';
  
  // Fade out the terminal
  terminal.classList.add('hidden');
  
  // Remove from DOM after fade
  setTimeout(() => {
    terminal.style.display = 'none';
  }, 900);
}


const loader = new GLTFLoader(loadingManager)
// declaring globally
let object;

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
},10000)
 

// after loading the item, time to show on browser with render 
const renderer = new THREE.WebGLRenderer({canvas:canva,alpha:true, antialias:true})
const width = window.innerWidth   // 50% of window width
const height = window.innerHeight // 50% of window height
renderer.setSize(width, height)


   

const renderloop = () => {
 
  requestAnimationFrame(renderloop) // loop continuously


   

  renderer.render(scene, camera)
  

controls.update();
}
renderloop()

console.log(renderer)