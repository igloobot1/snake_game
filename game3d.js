import * as THREE from 'three';

// ── Config ──
const GRID = 20;
const CELL = 1;
const BASE_INTERVAL = 150;
const MIN_INTERVAL = 55;
const HALF = (GRID * CELL) / 2;

// ── DOM ──
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const finalScore = document.getElementById('final-score');

// ── Three.js Setup ──
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0e17, 0.025);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 28, 22);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x0a0e17);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ── Lights ──
const ambient = new THREE.AmbientLight(0x334455, 1.2);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0x7dd3fc, 1.5);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 60;
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -15;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x38bdf8, 0.6, 40);
pointLight.position.set(0, 8, 0);
scene.add(pointLight);

// ── Floor / Grid ──
const floorGeo = new THREE.PlaneGeometry(GRID * CELL, GRID * CELL);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.9,
  metalness: 0.1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Grid lines
const gridHelper = new THREE.GridHelper(GRID * CELL, GRID, 0x1e293b, 0x1e293b);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// Walls (thin glowing borders)
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b, emissive: 0x0e4a6e, emissiveIntensity: 0.3,
  roughness: 0.5, metalness: 0.3,
});
function addWall(x, z, sx, sz) {
  const g = new THREE.BoxGeometry(sx, 0.4, sz);
  const m = new THREE.Mesh(g, wallMat);
  m.position.set(x, 0.2, z);
  m.receiveShadow = true;
  scene.add(m);
}
addWall(0, -HALF - 0.15, GRID * CELL + 0.3, 0.3);
addWall(0, HALF + 0.15, GRID * CELL + 0.3, 0.3);
addWall(-HALF - 0.15, 0, 0.3, GRID * CELL + 0.3);
addWall(HALF + 0.15, 0, 0.3, GRID * CELL + 0.3);

// ── Materials ──
const headMat = new THREE.MeshStandardMaterial({
  color: 0x7dd3fc, emissive: 0x7dd3fc, emissiveIntensity: 0.4,
  roughness: 0.3, metalness: 0.5,
});
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8, emissive: 0x0e4a6e, emissiveIntensity: 0.15,
  roughness: 0.4, metalness: 0.4,
});
const tailMat = new THREE.MeshStandardMaterial({
  color: 0x0e4a6e, emissive: 0x0e4a6e, emissiveIntensity: 0.1,
  roughness: 0.5, metalness: 0.3,
});
const foodMat = new THREE.MeshStandardMaterial({
  color: 0xf87171, emissive: 0xf87171, emissiveIntensity: 0.5,
  roughness: 0.2, metalness: 0.6,
});

// ── Geometry pools ──
const segGeo = new THREE.BoxGeometry(CELL * 0.82, CELL * 0.55, CELL * 0.82, 1, 1, 1);
const headGeo = new THREE.BoxGeometry(CELL * 0.88, CELL * 0.65, CELL * 0.88, 2, 2, 2);
const foodGeo = new THREE.SphereGeometry(CELL * 0.35, 16, 16);

// ── Game State ──
let snake, dir, nextDir, food, foodMesh, score, highScore, running, lastTick;
let snakeMeshes = [];
let particles = [];

highScore = parseInt(localStorage.getItem('snake3d_hi') || '0', 10);
highEl.textContent = highScore;

// ── Helpers ──
function gridToWorld(gx, gz) {
  return new THREE.Vector3(
    (gx - GRID / 2 + 0.5) * CELL,
    CELL * 0.3,
    (gz - GRID / 2 + 0.5) * CELL
  );
}

function showOverlay(title, msg, extra) {
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  finalScore.textContent = extra;
  overlay.classList.remove('hidden');
}

function interval() {
  return Math.max(MIN_INTERVAL, BASE_INTERVAL - score * 2.5);
}

function placeFood() {
  const occupied = new Set(snake.map(s => `${s.x},${s.z}`));
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID), z: Math.floor(Math.random() * GRID) };
  } while (occupied.has(`${pos.x},${pos.z}`));
  food = pos;

  if (foodMesh) scene.remove(foodMesh);
  foodMesh = new THREE.Mesh(foodGeo, foodMat);
  const wp = gridToWorld(food.x, food.z);
  foodMesh.position.copy(wp);
  foodMesh.position.y = CELL * 0.4;
  foodMesh.castShadow = true;
  scene.add(foodMesh);
}

function spawnParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 0.3;
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.2 + 0.1,
      (Math.random() - 0.5) * 0.3
    );
    scene.add(mesh);
    particles.push({ mesh, vel, life: 1 });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 2;
    p.vel.y -= dt * 0.5;
    p.mesh.position.addScaledVector(p.vel, dt * 4);
    p.mesh.scale.setScalar(Math.max(0, p.life));
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}

function clearSnakeMeshes() {
  snakeMeshes.forEach(m => { scene.remove(m); m.geometry?.dispose(); });
  snakeMeshes = [];
}

function rebuildSnake() {
  clearSnakeMeshes();
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const t = snake.length > 1 ? i / (snake.length - 1) : 0;
    const geo = isHead ? headGeo : segGeo;
    let mat;
    if (isHead) mat = headMat;
    else if (t < 0.5) mat = bodyMat;
    else mat = tailMat;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const wp = gridToWorld(seg.x, seg.z);
    mesh.position.copy(wp);
    // Scale down tail segments
    const s = isHead ? 1 : 1 - t * 0.3;
    mesh.scale.set(s, s, s);
    scene.add(mesh);
    snakeMeshes.push(mesh);
  });
}

// ── Smooth interpolation ──
let prevPositions = [];
let lerpT = 0;

function storePrevPositions() {
  prevPositions = snake.map(s => gridToWorld(s.x, s.z));
}

function lerpSnake(t) {
  snakeMeshes.forEach((mesh, i) => {
    if (i < snake.length && i < prevPositions.length) {
      const target = gridToWorld(snake[i].x, snake[i].z);
      mesh.position.lerpVectors(prevPositions[i], target, Math.min(1, t));
    }
  });
}

// ── Game Logic ──
function startGame() {
  overlay.classList.add('hidden');
  clearSnakeMeshes();
  const mid = Math.floor(GRID / 2);
  snake = [
    { x: mid, z: mid },
    { x: mid - 1, z: mid },
    { x: mid - 2, z: mid },
  ];
  dir = { x: 1, z: 0 };
  nextDir = { ...dir };
  score = 0;
  scoreEl.textContent = 0;
  running = true;
  placeFood();
  rebuildSnake();
  storePrevPositions();
  lastTick = performance.now();
  lerpT = 1;
}

function update() {
  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, z: snake[0].z + dir.z };

  // Wall collision
  if (head.x < 0 || head.x >= GRID || head.z < 0 || head.z >= GRID) {
    return gameOver();
  }
  // Self collision
  if (snake.some(s => s.x === head.x && s.z === head.z)) {
    return gameOver();
  }

  storePrevPositions();
  snake.unshift(head);

  if (head.x === food.x && head.z === food.z) {
    score++;
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highEl.textContent = highScore;
      localStorage.setItem('snake3d_hi', highScore);
    }
    spawnParticles(gridToWorld(food.x, food.z), 0xf87171, 12);
    placeFood();
  } else {
    snake.pop();
  }

  rebuildSnake();
  lerpT = 0;
}

function gameOver() {
  running = false;
  // Explosion particles at head
  if (snake.length > 0) {
    spawnParticles(gridToWorld(snake[0].x, snake[0].z), 0x7dd3fc, 20);
  }
  showOverlay('Game Over', 'Tap or Press Space to Retry', `Score: ${score}`);
}

// ── Input ──
function setDir(x, z) {
  if (x !== 0 && dir.x === 0) nextDir = { x, z: 0 };
  if (z !== 0 && dir.z === 0) nextDir = { x: 0, z };
}

window.addEventListener('keydown', e => {
  if (['Space', 'Enter'].includes(e.code) && !running) return startGame();
  const map = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0],
  };
  if (map[e.code]) { e.preventDefault(); setDir(...map[e.code]); }
});

overlay.addEventListener('click', () => { if (!running) startGame(); });

// Touch / swipe
let tx, ty;
renderer.domElement.addEventListener('touchstart', e => {
  const t = e.touches[0]; tx = t.clientX; ty = t.clientY;
}, { passive: true });
renderer.domElement.addEventListener('touchend', e => {
  if (!running) return startGame();
  const t = e.changedTouches[0];
  const dx = t.clientX - tx, dy = t.clientY - ty;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
  else setDir(0, dy > 0 ? 1 : -1);
}, { passive: true });

// ── Resize ──
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Animation Loop ──
let lastFrame = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  if (running) {
    if (now - lastTick >= interval()) {
      lastTick = now;
      update();
    }
    // Smooth interpolation
    const elapsed = now - lastTick;
    lerpT = Math.min(1, elapsed / interval());
    lerpSnake(lerpT);
  }

  // Animate food bobbing + rotation
  if (foodMesh) {
    foodMesh.position.y = CELL * 0.4 + Math.sin(now * 0.004) * 0.15;
    foodMesh.rotation.y = now * 0.002;
  }

  // Animate particles
  updateParticles(dt);

  // Subtle camera sway
  camera.position.x = Math.sin(now * 0.0003) * 1.5;

  // Head glow pulse
  if (snakeMeshes.length > 0) {
    headMat.emissiveIntensity = 0.3 + Math.sin(now * 0.005) * 0.15;
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
