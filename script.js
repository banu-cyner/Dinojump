const SCRIPT_URL = "URL_WEB_APP_GOOGLE_SCRIPT_ANDA";

// DOM Elements
const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const overScreen = document.getElementById("over-screen");
const leaderboardScreen = document.getElementById("leaderboard-screen");

const startForm = document.getElementById("start-form");
const usernameInput = document.getElementById("username");
const waInput = document.getElementById("wa");

const currentScoreDisplay = document.getElementById("current-score");
const highScoreDisplay = document.getElementById("high-score");
const finalScoreDisplay = document.getElementById("final-score");
const leaderboardList = document.getElementById("leaderboard-list");

const btnMenuLeaderboard = document.getElementById("btn-menu-leaderboard");
const btnOverLeaderboard = document.getElementById("btn-over-leaderboard");
const btnBackMenu = document.getElementById("btn-back-menu");
const btnRestart = document.getElementById("btn-restart");
const btnJump = document.getElementById("btn-jump");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// State Global
let playerInfo = { username: "", wa: "" };
let gameLoopId = null;
let isGameOver = false; // Flag status game over
let score = 0;
let highScore = 0;
let gameSpeed = 4;
let gravity = 0.6;

// Objek Runner
let runner = {
  x: 40,
  y: 200,
  width: 24,
  height: 32,
  dy: 0,
  jumpForce: -11,
  groundY: 200,
  isGrounded: true
};

// Objek Rintangan
let obstacles = [];
let spawnTimer = 0;

// Input Handling
function triggerJump() {
  if (runner.isGrounded && !isGameOver) {
    runner.dy = runner.jumpForce;
    runner.isGrounded = false;
  }
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    triggerJump();
  }
});

btnJump.addEventListener("click", triggerJump);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  triggerJump();
});

// Event Form Start
startForm.addEventListener("submit", (e) => {
  e.preventDefault();
  playerInfo.username = usernameInput.value.trim();
  playerInfo.wa = waInput.value.trim();

  if (playerInfo.username && playerInfo.wa) {
    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    initGame();
  }
});

// Navigation Handlers
function openLeaderboard() {
  menuScreen.classList.add("hidden");
  overScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  leaderboardScreen.classList.remove("hidden");
  fetchLeaderboard();
}

btnMenuLeaderboard.addEventListener("click", openLeaderboard);
btnOverLeaderboard.addEventListener("click", openLeaderboard);

btnBackMenu.addEventListener("click", () => {
  leaderboardScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
});

btnRestart.addEventListener("click", () => {
  overScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  initGame();
});

// Init Game
function initGame() {
  // Hentikan loop lama jika masih ada yang berjalan
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }

  isGameOver = false;
  score = 0;
  gameSpeed = 4;
  obstacles = [];
  spawnTimer = 0;
  runner.y = runner.groundY;
  runner.dy = 0;
  runner.isGrounded = true;

  currentScoreDisplay.textContent = "0";

  gameLoop();
}

function spawnObstacle() {
  let height = Math.floor(Math.random() * 20) + 25;
  obstacles.push({
    x: canvas.width,
    y: runner.groundY + runner.height - height,
    width: 16,
    height: height
  });
}

function update() {
  // BENTENG 1: Hentikan eksekusi jika game over
  if (isGameOver) return;

  // Update Runner
  runner.dy += gravity;
  runner.y += runner.dy;

  if (runner.y >= runner.groundY) {
    runner.y = runner.groundY;
    runner.dy = 0;
    runner.isGrounded = true;
  }

  // Update Score Game (HANYA update elemen skor gameplay, BUKAN final-score)
  score += 0.2;
  currentScoreDisplay.textContent = Math.floor(score);

  if (Math.floor(score) % 100 === 0 && score > 0) {
    gameSpeed += 0.005;
  }

  // Spawn Obstacles
  spawnTimer++;
  if (spawnTimer > Math.max(60, 120 - gameSpeed * 5)) {
    spawnObstacle();
    spawnTimer = 0;
  }

  // Update & Collision Detection
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.x -= gameSpeed;

    // AABB Collision Detection
    if (
      runner.x < obs.x + obs.width &&
      runner.x + runner.width > obs.x &&
      runner.y < obs.y + obs.height &&
      runner.y + runner.height > obs.y
    ) {
      gameOver();
      return; // Langsung keluar dari fungsi
    }

    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ground Line
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, runner.groundY + runner.height);
  ctx.lineTo(canvas.width, runner.groundY + runner.height);
  ctx.stroke();

  // Runner
  ctx.fillStyle = "#10b981";
  ctx.fillRect(runner.x, runner.y, runner.width, runner.height);

  // Obstacles
  ctx.fillStyle = "#ef4444";
  obstacles.forEach((obs) => {
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });
}

function gameLoop() {
  // BENTENG 2: Jangan minta frame baru jika isGameOver true
  if (isGameOver) return;

  update();
  render();

  // BENTENG 3: Hanya minta frame baru jika game belum over setelah update
  if (!isGameOver) {
    gameLoopId = requestAnimationFrame(gameLoop);
  }
}

function gameOver() {
  // Set flag game over dan batalkan frame secara total
  isGameOver = true;
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }

  // Ambil skor akhir saat momen tabrakan
  let finalScore = Math.floor(score);

  if (finalScore > highScore) {
    highScore = finalScore;
    highScoreDisplay.textContent = highScore;
  }

  // Kunci nilai skor akhir di layar Game Over
  finalScoreDisplay.textContent = finalScore;

  // Pindah Tampilan
  gameScreen.classList.add("hidden");
  overScreen.classList.remove("hidden");

  // Simpan ke Google Sheets
  saveScore(finalScore);
}

// Database Services
function saveScore(scoreValue) {
  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "saveScore",
      username: playerInfo.username,
      wa: playerInfo.wa,
      score: scoreValue
    })
  }).catch((err) => console.error("Gagal menyimpan:", err));
}

function fetchLeaderboard() {
  leaderboardList.innerHTML = '<li class="loading">Memuat data leaderboard...</li>';

  fetch(SCRIPT_URL)
    .then((res) => res.json())
    .then((data) => {
      leaderboardList.innerHTML = "";
      if (!data || data.length === 0) {
        leaderboardList.innerHTML = '<li class="loading">Belum ada skor tercatatkan.</li>';
        return;
      }

      data.forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = `${entry.username} — ${entry.score} Poin`;
        leaderboardList.appendChild(li);
      });
    })
    .catch((err) => {
      console.error("Gagal mengambil leaderboard:", err);
      leaderboardList.innerHTML = '<li class="loading">Gagal memuat leaderboard.</li>';
    });
    }
