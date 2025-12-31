const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restartBtn");

let keys = {};
let lastTime = 0;

let player;
let cops;
let obstacles;
let gameOver;
let score;
let spawnTimer;
let roadLines;

// Listen for keyboard input
document.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

restartBtn.addEventListener("click", resetGame);

// Initialize game state
resetGame();

function resetGame() {
  player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 100,
    width: 30,
    height: 50,
    speed: 4
  };

  cops = [];
  obstacles = [];
  roadLines = [];
  gameOver = false;
  score = 0;
  spawnTimer = 0;
  lastTime = 0;

  // Create some starting road lines
  for (let i = 0; i < 8; i++) {
    roadLines.push({
      x: canvas.width / 2 - 5,
      y: i * 80,
      width: 10,
      height: 40
    });
  }
}

// Main loop
function gameLoop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  update(delta);
  draw();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

function update(delta) {
  if (gameOver) return;

  const dt = delta / 16.67; // normalize to ~60 FPS

  // Increase score over time
  score += 0.05 * dt;

  handlePlayerMovement(dt);
  updateRoadLines(dt);
  spawnTimer += delta;

  // Spawn new cops every 1.2s, faster over time
  if (spawnTimer > 1200 - Math.min(score * 10, 700)) {
    spawnTimer = 0;
    spawnCopCar();
    if (Math.random() < 0.3) spawnObstacle();
  }

  updateCops(dt);
  updateObstacles(dt);

  checkCollisions();
}

function handlePlayerMovement(dt) {
  let moveX = 0;
  let moveY = 0;

  if (keys["arrowleft"] || keys["a"]) moveX -= 1;
  if (keys["arrowright"] || keys["d"]) moveX += 1;
  if (keys["arrowup"] || keys["w"]) moveY -= 1;
  if (keys["arrowdown"] || keys["s"]) moveY += 1;

  const len = Math.hypot(moveX, moveY);
  if (len > 0) {
    moveX /= len;
    moveY /= len;
  }

  player.x += moveX * player.speed * dt;
  player.y += moveY * player.speed * dt;

  // Boundaries
  const margin = 40; // road edges
  if (player.x < margin) player.x = margin;
  if (player.x + player.width > canvas.width - margin) {
    player.x = canvas.width - margin - player.width;
  }
  if (player.y < 40) player.y = 40;
  if (player.y + player.height > canvas.height - 10) {
    player.y = canvas.height - 10 - player.height;
  }
}

function updateRoadLines(dt) {
  roadLines.forEach(line => {
    line.y += 5 * dt;
  });

  // recycle lines
  roadLines.forEach(line => {
    if (line.y > canvas.height) {
      line.y = -40;
    }
  });
}

function spawnCopCar() {
  const laneWidth = (canvas.width - 80) / 3;
  const lane = Math.floor(Math.random() * 3);
  const x = 40 + lane * laneWidth + laneWidth / 2 - 15;

  cops.push({
    x: x,
    y: -60,
    width: 30,
    height: 50,
    speed: 2 + score * 0.05, // gets faster over time
    turnSpeed: 0.03 + score * 0.0005
  });
}

function spawnObstacle() {
  const laneWidth = (canvas.width - 80) / 3;
  const lane = Math.floor(Math.random() * 3);
  const x = 40 + lane * laneWidth + laneWidth / 2 - 20;

  obstacles.push({
    x: x,
    y: -40,
    width: 40,
    height: 30,
    speed: 3
  });
}

function updateCops(dt) {
  cops.forEach(cop => {
    // Move downwards
    cop.y += cop.speed * dt;

    // Simple chasing behavior: steer towards player.x
    const centerCop = cop.x + cop.width / 2;
    const centerPlayer = player.x + player.width / 2;

    if (centerPlayer < centerCop - 3) {
      cop.x -= cop.turnSpeed * dt * 100;
    } else if (centerPlayer > centerCop + 3) {
      cop.x += cop.turnSpeed * dt * 100;
    }
  });

  cops = cops.filter(cop => cop.y < canvas.height + 80);
}

function updateObstacles(dt) {
  obstacles.forEach(o => {
    o.y += o.speed * dt;
  });

  obstacles = obstacles.filter(o => o.y < canvas.height + 40);
}

function checkCollisions() {
  // Cop hits player
  for (let cop of cops) {
    if (isColliding(player, cop)) {
      gameOver = true;
      return;
    }
  }

  // Player hits obstacle
  for (let o of obstacles) {
    if (isColliding(player, o)) {
      gameOver = true;
      return;
    }
  }
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw road background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Road area
  ctx.fillStyle = "#333";
  ctx.fillRect(40, 0, canvas.width - 80, canvas.height);

  // Road edges
  ctx.fillStyle = "#888";
  ctx.fillRect(35, 0, 5, canvas.height);
  ctx.fillRect(canvas.width - 40, 0, 5, canvas.height);

  // Road center lines
  ctx.fillStyle = "#ddd";
  roadLines.forEach(line => {
    ctx.fillRect(line.x, line.y, line.width, line.height);
  });

  // Draw player car
  drawPlayer();

  // Draw police cars
  cops.forEach(drawCop);

  // Draw obstacles
  obstacles.forEach(drawObstacle);

  // Draw score
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("Score: " + Math.floor(score), 10, 25);

  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "42px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BUSTED!", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "20px Arial";
    ctx.fillText(
      "Final Score: " + Math.floor(score),
      canvas.width / 2,
      canvas.height / 2 + 15
    );
    ctx.fillText(
      "Press Restart to play again",
      canvas.width / 2,
      canvas.height / 2 + 45
    );
    ctx.textAlign = "start";
  }
}

function drawPlayer() {
  // Body
  ctx.fillStyle = "#00c8ff";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Windows
  ctx.fillStyle = "#003344";
  ctx.fillRect(player.x + 4, player.y + 6, player.width - 8, 12);
  ctx.fillRect(player.x + 4, player.y + player.height - 18, player.width - 8, 12);
}

function drawCop(cop) {
  // Body
  ctx.fillStyle = "#1010ff";
  ctx.fillRect(cop.x, cop.y, cop.width, cop.height);

  // Windows
  ctx.fillStyle = "#000033";
  ctx.fillRect(cop.x + 4, cop.y + 6, cop.width - 8, 12);
  ctx.fillRect(cop.x + 4, cop.y + cop.height - 18, cop.width - 8, 12);

  // Light bar
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(cop.x + 3, cop.y + cop.height / 2 - 3, 8, 6);
  ctx.fillStyle = "#00ffff";
  ctx.fillRect(cop.x + cop.width - 11, cop.y + cop.height / 2 - 3, 8, 6);
}

function drawObstacle(o) {
  ctx.fillStyle = "#aa5500";
  ctx.fillRect(o.x, o.y, o.width, o.height);

  ctx.fillStyle = "#663300";
  ctx.fillRect(o.x + 5, o.y + 5, o.width - 10, o.height - 10);
}
