// Simple Pong - HTML5 Canvas
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreLeftEl = document.getElementById('score-left');
  const scoreRightEl = document.getElementById('score-right');
  const restartBtn = document.getElementById('restart');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game objects
  const paddle = {
    w: 12,
    h: 100,
    x: 12,
    y: (HEIGHT - 100) / 2,
    speed: 6
  };

  const ai = {
    w: 12,
    h: 100,
    x: WIDTH - 12 - 12,
    y: (HEIGHT - 100) / 2,
    speed: 4.2
  };

  const ball = {
    r: 8,
    x: WIDTH / 2,
    y: HEIGHT / 2,
    speed: 5,
    vx: 0,
    vy: 0
  };

  let scoreLeft = 0;
  let scoreRight = 0;
  let isRunning = true;
  let waiting = false;

  // Controls
  const keys = { ArrowUp: false, ArrowDown: false };
  let mouseActive = false;

  function resetBall(toRight = (Math.random() < 0.5)) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speed = 5;
    const angle = (Math.random() * Math.PI / 3) - (Math.PI / 6); // -30..30 degrees
    ball.vx = (toRight ? 1 : -1) * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function drawMidline() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(WIDTH/2, 10);
    ctx.lineTo(WIDTH/2, HEIGHT - 10);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // midline
    drawMidline();

    // paddles
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

    // ball
    ctx.beginPath();
    ctx.fillStyle = '#00e6a3';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    // scores already shown in DOM; draw small hint
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = '12px system-ui, Arial';
    ctx.fillText('Left: You', 10, HEIGHT - 10);
    ctx.fillText('Right: Computer', WIDTH - 110, HEIGHT - 10);
  }

  function update() {
    if (!isRunning) return;

    // Player movement: keys
    if (keys.ArrowUp) paddle.y -= paddle.speed;
    if (keys.ArrowDown) paddle.y += paddle.speed;

    // clamp paddles
    paddle.y = clamp(paddle.y, 0, HEIGHT - paddle.h);

    // AI simple follow
    const targetY = ball.y - ai.h / 2;
    if (ai.y + ai.h/2 < ball.y - 6) {
      ai.y += ai.speed;
    } else if (ai.y + ai.h/2 > ball.y + 6) {
      ai.y -= ai.speed;
    }
    ai.y = clamp(ai.y, 0, HEIGHT - ai.h);

    // Ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom collision
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy = -ball.vy;
    } else if (ball.y + ball.r >= HEIGHT) {
      ball.y = HEIGHT - ball.r;
      ball.vy = -ball.vy;
    }

    // Left paddle collision
    if (ball.x - ball.r <= paddle.x + paddle.w) {
      if (ball.y >= paddle.y && ball.y <= paddle.y + paddle.h) {
        // hit - reflect
        ball.x = paddle.x + paddle.w + ball.r; // prevent sticking
        reflectFromPaddle(paddle);
      }
    }

    // Right paddle collision
    if (ball.x + ball.r >= ai.x) {
      if (ball.y >= ai.y && ball.y <= ai.y + ai.h) {
        ball.x = ai.x - ball.r;
        reflectFromPaddle(ai);
      }
    }

    // Score
    if (ball.x < -ball.r) {
      // right scores
      scoreRight++;
      scoreRightEl.textContent = scoreRight;
      pauseAndServe(false);
    } else if (ball.x > WIDTH + ball.r) {
      // left scores
      scoreLeft++;
      scoreLeftEl.textContent = scoreLeft;
      pauseAndServe(true);
    }
  }

  function reflectFromPaddle(p) {
    // Increase speed slightly on each hit
    ball.speed *= 1.03;
    // compute relative intersection ( -1 top, +1 bottom )
    const relative = (ball.y - (p.y + p.h / 2)) / (p.h / 2);
    const maxBounce = (75 * Math.PI) / 180; // 75 degrees
    const bounceAngle = relative * maxBounce;
    const dir = (p === paddle) ? 1 : -1; // left paddle sends rightwards (positive vx)
    ball.vx = dir * Math.abs(ball.speed * Math.cos(bounceAngle));
    ball.vy = ball.speed * Math.sin(bounceAngle);

    // add a tiny horizontal kick if collision happened when paddles were moving
    if (p === paddle && (keys.ArrowUp || keys.ArrowDown)) {
      ball.vy += (keys.ArrowUp ? -0.6 : 0.6);
    }
  }

  function pauseAndServe(leftServes) {
    isRunning = false;
    waiting = true;
    setTimeout(() => {
      resetBall(leftServes);
      isRunning = true;
      waiting = false;
    }, 700);
  }

  // Game loop
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Input handlers
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseY = (e.clientY - rect.top) * scaleY;
    // center paddle on mouse
    paddle.y = clamp(mouseY - paddle.h / 2, 0, HEIGHT - paddle.h);
    mouseActive = true;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseActive = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = true;
      // prevent page scroll when in window
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = false;
    }
  });

  restartBtn.addEventListener('click', () => {
    scoreLeft = 0;
    scoreRight = 0;
    scoreLeftEl.textContent = scoreLeft;
    scoreRightEl.textContent = scoreRight;
    paddle.y = (HEIGHT - paddle.h) / 2;
    ai.y = (HEIGHT - ai.h) / 2;
    resetBall(true);
    isRunning = true;
  });

  // Initialize
  resetBall(Math.random() < 0.5);
  scoreLeftEl.textContent = scoreLeft;
  scoreRightEl.textContent = scoreRight;

  // Start loop
  requestAnimationFrame(loop);
})();