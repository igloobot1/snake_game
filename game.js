(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high-score');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');
  const finalScore = document.getElementById('final-score');

  const GRID = 20;
  const BASE_INTERVAL = 140;
  const MIN_INTERVAL = 60;

  let cols, rows, cellSize;
  let snake, dir, nextDir, food, score, highScore, running, loopId, lastTick;

  function resize() {
    const w = canvas.clientWidth * devicePixelRatio;
    canvas.width = canvas.height = w;
    cellSize = w / GRID;
    cols = rows = GRID;
  }

  function init() {
    resize();
    highScore = parseInt(localStorage.getItem('snake_hi') || '0', 10);
    highEl.textContent = highScore;
    showOverlay('🐍 Snake', 'Press Space or Tap to Start', '');
  }

  function showOverlay(title, msg, extra) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    finalScore.textContent = extra;
    overlay.classList.remove('hidden');
  }

  function startGame() {
    overlay.classList.add('hidden');
    const mid = Math.floor(GRID / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    dir = { x: 1, y: 0 };
    nextDir = { ...dir };
    score = 0;
    scoreEl.textContent = 0;
    running = true;
    placeFood();
    lastTick = performance.now();
    loopId = requestAnimationFrame(loop);
  }

  function placeFood() {
    const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
    let pos;
    do { pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; }
    while (occupied.has(`${pos.x},${pos.y}`));
    food = pos;
  }

  function interval() {
    return Math.max(MIN_INTERVAL, BASE_INTERVAL - score * 3);
  }

  function loop(ts) {
    if (!running) return;
    if (ts - lastTick >= interval()) {
      lastTick = ts;
      update();
    }
    draw();
    loopId = requestAnimationFrame(loop);
  }

  function update() {
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // wall or self collision
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows ||
        snake.some(s => s.x === head.x && s.y === head.y)) {
      return gameOver();
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      if (score > highScore) { highScore = score; highEl.textContent = highScore; localStorage.setItem('snake_hi', highScore); }
      placeFood();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(loopId);
    showOverlay('Game Over', 'Tap or Press Space to Retry', `Score: ${score}`);
  }

  // ── Drawing ──
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid lines (subtle)
    ctx.strokeStyle = 'rgba(30,41,59,.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      const p = i * cellSize;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
    }

    // food
    const pad = cellSize * 0.12;
    ctx.fillStyle = '#f87171';
    ctx.shadowColor = '#f87171';
    ctx.shadowBlur = 10;
    roundRect(food.x * cellSize + pad, food.y * cellSize + pad, cellSize - pad * 2, cellSize - pad * 2, 4);
    ctx.shadowBlur = 0;

    // snake
    snake.forEach((s, i) => {
      const t = i / snake.length;
      ctx.fillStyle = i === 0 ? '#7dd3fc' : lerpColor('#38bdf8', '#0e4a6e', t);
      ctx.shadowColor = i === 0 ? '#7dd3fc' : 'transparent';
      ctx.shadowBlur = i === 0 ? 8 : 0;
      roundRect(s.x * cellSize + pad, s.y * cellSize + pad, cellSize - pad * 2, cellSize - pad * 2, 4);
      ctx.shadowBlur = 0;
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function lerpColor(a, b, t) {
    const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
    const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return `rgb(${c})`;
  }

  // ── Input ──
  function setDir(x, y) {
    if (x !== 0 && dir.x === 0) nextDir = { x, y: 0 };
    if (y !== 0 && dir.y === 0) nextDir = { x: 0, y };
  }

  window.addEventListener('keydown', e => {
    if (['Space', 'Enter'].includes(e.code) && !running) return startGame();
    const map = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
                   KeyW: [0,-1], KeyS: [0,1], KeyA: [-1,0], KeyD: [1,0] };
    if (map[e.code]) { e.preventDefault(); setDir(...map[e.code]); }
  });

  // touch / swipe
  let tx, ty;
  overlay.addEventListener('click', () => { if (!running) startGame(); });
  canvas.addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (!running) return startGame();
    const t = e.changedTouches[0];
    const dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener('resize', resize);
  init();
})();
