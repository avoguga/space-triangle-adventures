let camera, scene, renderer, player;
let obstacles = [],
  powerups = [],
  particles = [],
  stars = [];
let gameState = "menu";
let score = 0,
  health = 100,
  level = 1,
  combo = 0;
let powerupActive = false;
let lastPowerupTime = 0;
let lastPowerupCollectTime = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastFrameTime = 0;
let isPaused = false;
let gameLoop;

const SETTINGS = {
  OBSTACLE_SPEED: 0.08,
  POWERUP_DURATION: 8000,
  PLAYER_SPEED: 0.2,
  IMMUNITY_DURATION: 1000,
  COMBO_TIMEOUT: 5000,
  LEVEL_SCORE_THRESHOLD: 1000,
  HEALTH_RECOVERY_RATE: 0.05,
  MAX_HEALTH: 100,
  SCORE_MULTIPLIER: 1,
};

const powerupSound = new Audio("./assets/powerup.mp3");
const bgMusic = new Audio("./assets/bgmusic.mp3");
const explosionSound = new Audio("./assets/explosion.mp3");

bgMusic.loop = true;
bgMusic.volume = 0.3;

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000022, 1, 30);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000022);
  document.body.appendChild(renderer.domElement);

  const playerGeometry = new THREE.Group();

  const mainBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.5, 4),
    new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00663c,
      shininess: 100,
    })
  );

  const wingGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.3);
  const wingMaterial = new THREE.MeshPhongMaterial({
    color: 0x00cc66,
    emissive: 0x004422,
  });
  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);

  leftWing.position.set(-0.3, -0.2, 0);
  rightWing.position.set(0.3, -0.2, 0);

  playerGeometry.add(mainBody);
  playerGeometry.add(leftWing);
  playerGeometry.add(rightWing);

  player = playerGeometry;
  player.rotation.x = Math.PI;
  scene.add(player);

  const engineLight = new THREE.PointLight(0x00ff88, 1, 2);
  engineLight.position.set(0, -1, 0);
  player.add(engineLight);

  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  const pointLight1 = new THREE.PointLight(0x00ff88, 0.5, 10);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x00ff88, 0.5, 10);
  pointLight2.position.set(-5, 5, 5);
  scene.add(pointLight2);

  createStarfield();
  camera.position.z = 5;
  player.position.y = -2;

  setupEventListeners();
  showMenu();
  document.getElementById(
    "high-score"
  ).textContent = `High Score: ${highScore}`;
}

function setupEventListeners() {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);
  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("blur", () => {
    if (gameState === "playing") pauseGame();
  });

  document
    .getElementById("start-button")
    .addEventListener("click", startGame);
  document
    .getElementById("tutorial-button")
    .addEventListener("click", showTutorial);
  document
    .getElementById("back-to-menu")
    .addEventListener("click", showMenu);
  document
    .getElementById("retry-button")
    .addEventListener("click", startGame);
  document
    .getElementById("menu-button")
    .addEventListener("click", showMenu);
  document
    .getElementById("pause-button")
    .addEventListener("click", togglePause);
  document
    .getElementById("resume-button")
    .addEventListener("click", resumeGame);
  document
    .getElementById("quit-button")
    .addEventListener("click", showMenu);
}

function showMenu() {
  gameState = "menu";
  isPaused = false;
  document.getElementById("menu-screen").style.display = "block";
  document.getElementById("tutorial-screen").style.display = "none";
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("pause-screen").style.display = "none";
  document.getElementById("pause-button").style.display = "none";
  if (gameLoop) cancelAnimationFrame(gameLoop);
}

function showTutorial() {
  document.getElementById("menu-screen").style.display = "none";
  document.getElementById("tutorial-screen").style.display = "block";
}

function createStarfield() {
  const starGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const starMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
  });

  for (let i = 0; i < 300; i++) {
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 50
    );
    const scale = Math.random() * 0.5 + 0.5;
    star.scale.set(scale, scale, scale);
    star.twinklePhase = Math.random() * Math.PI * 2;
    star.twinkleSpeed = 0.01 + Math.random() * 0.02;
    stars.push(star);
    scene.add(star);
  }
}

function createObstacle() {
  const geometry = new THREE.TetrahedronGeometry(0.5);
  const material = new THREE.MeshPhongMaterial({
    color: 0xff3333,
    emissive: 0x661111,
    shininess: 80,
    transparent: true,
  });
  const obstacle = new THREE.Mesh(geometry, material);

  obstacle.position.x = (Math.random() - 0.5) * 6;
  obstacle.position.y = 6;
  obstacle.rotation.x = Math.random() * Math.PI;
  obstacle.rotation.y = Math.random() * Math.PI;

  obstacle.rotationSpeed = {
    x: (Math.random() - 0.5) * 0.1,
    y: (Math.random() - 0.5) * 0.1,
    z: (Math.random() - 0.5) * 0.1,
  };

  obstacle.pulsePhase = Math.random() * Math.PI * 2;

  scene.add(obstacle);
  obstacles.push(obstacle);
}

function createPowerup() {
  const geometry = new THREE.OctahedronGeometry(0.3);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    emissive: 0x666600,
    shininess: 100,
    transparent: true,
  });
  const powerup = new THREE.Mesh(geometry, material);

  powerup.position.x = (Math.random() - 0.5) * 6;
  powerup.position.y = 6;

  powerup.oscillation = Math.random() * Math.PI * 2;
  powerup.baseX = powerup.position.x;
  powerup.pulsePhase = Math.random() * Math.PI * 2;

  scene.add(powerup);
  powerups.push(powerup);
}

function createExplosion(position, color = 0xff5500, scale = 1) {
  const particleCount = Math.floor(35 * scale);
  for (let i = 0; i < particleCount; i++) {
    const geometry = new THREE.SphereGeometry(0.8 * scale, 9, 4);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
    });
    const particle = new THREE.Mesh(geometry, material);

    particle.position.copy(position);
    const speed = 0.3 * scale;
    particle.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * speed,
      (Math.random() - 0.5) * speed,
      (Math.random() - 0.5) * speed
    );
    particle.life = 1.0;
    particle.fadeRate = 0.02 + Math.random() * 0.02;

    scene.add(particle);
    particles.push(particle);
  }
}

function showScorePopup(score, position) {
  const popup = document.createElement("div");
  popup.className = "score-popup";
  popup.textContent = typeof score === "number" ? `+${score}` : score;

  const vector = new THREE.Vector3();
  vector.setFromMatrixPosition(position.matrixWorld);
  vector.project(camera);

  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

  popup.style.left = x + "px";
  popup.style.top = y + "px";

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function playPowerupSound() {
  powerupSound.play();
}

function playExplosionSound() {
  explosionSound.play();
}

function startGame() {
  gameState = "playing";
  isPaused = false;
  score = 0;
  health = SETTINGS.MAX_HEALTH;
  level = 1;
  combo = 0;

  bgMusic.play();

  document.getElementById("score").textContent = "Score: 0";
  document.getElementById(
    "health"
  ).textContent = `Health: ${SETTINGS.MAX_HEALTH}`;
  document.getElementById("level").textContent = "Level: 1";
  document.getElementById("powerup-status").style.display = "none";
  document.getElementById("menu-screen").style.display = "none";
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("pause-screen").style.display = "none";
  document.getElementById("pause-button").style.display = "block";
  document.getElementById("combo-counter").textContent = "";

  player.position.set(0, -2, 0);

  obstacles.forEach((obstacle) => scene.remove(obstacle));
  powerups.forEach((powerup) => scene.remove(powerup));
  particles.forEach((particle) => scene.remove(particle));
  obstacles = [];
  powerups = [];
  particles = [];

  powerupActive = false;
  lastFrameTime = performance.now();
  animate();
}

function pauseGame() {
  if (gameState === "playing" && !isPaused) {
    isPaused = true;
    document.getElementById("pause-screen").style.display = "block";
    cancelAnimationFrame(gameLoop);
  }
}

function resumeGame() {
  if (gameState === "playing" && isPaused) {
    isPaused = false;
    document.getElementById("pause-screen").style.display = "none";
    lastFrameTime = performance.now();
    animate();
  }
}

function togglePause() {
  if (isPaused) resumeGame();
  else pauseGame();
}

function gameOver() {
  gameState = "menu";
  document.getElementById("game-over-screen").style.display = "block";
  document.getElementById("pause-button").style.display = "none";
  document.getElementById(
    "final-score"
  ).textContent = `Final Score: ${score}`;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    document.getElementById(
      "high-score"
    ).textContent = `High Score: ${highScore}`;
    document.getElementById("high-score-message").textContent =
      "🎉 New High Score! 🎉";
  } else {
    document.getElementById("high-score-message").textContent = "";
  }
}

const keys = {
  left: false,
  right: false,
};

function onKeyDown(event) {
  if (event.code === "Space" && gameState === "menu") {
    startGame();
  } else if (event.code === "ArrowLeft") {
    keys.left = true;
  } else if (event.code === "ArrowRight") {
    keys.right = true;
  } else if (event.code === "KeyP") {
    if (gameState === "playing") togglePause();
  }
}

function onKeyUp(event) {
  if (event.code === "ArrowLeft") {
    keys.left = false;
  } else if (event.code === "ArrowRight") {
    keys.right = false;
  }
}

function onMouseMove(event) {
  if (gameState === "playing" && !isPaused) {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    player.position.x = mouseX * 3;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function checkCollision(object1, object2) {
  const box1 = new THREE.Box3().setFromObject(object1);
  const box2 = new THREE.Box3().setFromObject(object2);
  return box1.intersectsBox(box2);
}

function updateParticles(deltaTime) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.position.add(
      particle.velocity.clone().multiplyScalar(deltaTime)
    );
    particle.life -= particle.fadeRate * deltaTime * 60;
    particle.material.opacity = particle.life;
    particle.scale.multiplyScalar(0.98);

    if (particle.life <= 0) {
      scene.remove(particle);
      particles.splice(i, 1);
    }
  }
}

function updateStars(deltaTime) {
  stars.forEach((star) => {
    star.position.y -= 0.02 * (1 + level * 0.1) * deltaTime * 60;
    if (star.position.y < -50) star.position.y = 50;

    star.twinklePhase += star.twinkleSpeed * deltaTime * 60;
    star.material.opacity = 0.5 + Math.sin(star.twinklePhase) * 0.5;
  });
}

function updateCombo() {
  if (combo > 0) {
    const timeSinceLastPowerup = Date.now() - lastPowerupCollectTime;
    if (timeSinceLastPowerup > SETTINGS.COMBO_TIMEOUT) {
      combo = 0;
      document.getElementById("combo-counter").textContent = "";
    }
  }
}

function checkLevelUp() {
  const newLevel = Math.floor(score / SETTINGS.LEVEL_SCORE_THRESHOLD) + 1;
  if (newLevel > level) {
    level = newLevel;
    document.getElementById("level").textContent = `Level: ${level}`;

    const levelUp = document.getElementById("level-up");
    levelUp.style.opacity = "1";
    levelUp.textContent = `Level ${level}!`;
    setTimeout(() => {
      levelUp.style.opacity = "0";
    }, 2000);

    createExplosion(player.position, 0x00ff88, 2);
  }
}

function animate() {
  if (isPaused) return;

  gameLoop = requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.1);
  lastFrameTime = currentTime;

  if (gameState === "playing") {
    if (keys.left)
      player.position.x -= SETTINGS.PLAYER_SPEED * deltaTime * 60;
    if (keys.right)
      player.position.x += SETTINGS.PLAYER_SPEED * deltaTime * 60;

    if (Math.random() < 0.02 * (1 + level * 0.1) * deltaTime * 60) {
      createObstacle();
    }

    if (Math.random() < 0.005 * deltaTime * 60) {
      createPowerup();
    }

    player.rotation.z = Math.sin(currentTime * 0.003) * 0.1;

    if (powerupActive) {
      const timeLeft =
        (SETTINGS.POWERUP_DURATION - (currentTime - lastPowerupTime)) /
        1000;
      document.getElementById(
        "powerup-status"
      ).textContent = `Shield Active! (${timeLeft.toFixed(1)}s)`;
    }

    if (!powerupActive && health < SETTINGS.MAX_HEALTH) {
      health = Math.min(
        health + SETTINGS.HEALTH_RECOVERY_RATE * deltaTime,
        SETTINGS.MAX_HEALTH
      );
      document.getElementById(
        "health"
      ).textContent = `Health: ${Math.floor(health)}`;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      obstacle.position.y -=
        SETTINGS.OBSTACLE_SPEED * (1 + level * 0.1) * deltaTime * 60;

      obstacle.rotation.x += obstacle.rotationSpeed.x * deltaTime * 60;
      obstacle.rotation.y += obstacle.rotationSpeed.y * deltaTime * 60;
      obstacle.rotation.z += obstacle.rotationSpeed.z * deltaTime * 60;

      obstacle.pulsePhase += 0.1 * deltaTime * 60;
      obstacle.material.opacity =
        0.8 + Math.sin(obstacle.pulsePhase) * 0.2;

      if (!powerupActive && checkCollision(player, obstacle)) {
        const damage = 20;
        health -= damage;
        document.getElementById(
          "health"
        ).textContent = `Health: ${Math.floor(health)}`;
        createExplosion(obstacle.position);
        playExplosionSound();

        showScorePopup(-damage, obstacle);
        scene.remove(obstacle);
        obstacles.splice(i, 1);
        combo = 0;
        document.getElementById("combo-counter").textContent = "";

        if (health <= 0) {
          createExplosion(player.position, 0xff0000, 3);
          gameOver();
        }
        continue;
      }

      if (obstacle.position.y < -4) {
        const pointsGained = Math.floor(
          10 * SETTINGS.SCORE_MULTIPLIER * (1 + level * 0.1)
        );
        score += pointsGained;
        document.getElementById("score").textContent = `Score: ${score}`;
        scene.remove(obstacle);
        obstacles.splice(i, 1);

        checkLevelUp();
      }
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
      const powerup = powerups[i];
      powerup.position.y -=
        SETTINGS.OBSTACLE_SPEED *
        0.7 *
        (1 + level * 0.05) *
        deltaTime *
        60;

      powerup.oscillation += 0.05 * deltaTime * 60;
      powerup.position.x =
        powerup.baseX + Math.sin(powerup.oscillation) * 0.5;

      powerup.rotation.x += 0.03 * deltaTime * 60;
      powerup.rotation.y += 0.03 * deltaTime * 60;

      powerup.pulsePhase += 0.1 * deltaTime * 60;
      powerup.material.opacity = 0.8 + Math.sin(powerup.pulsePhase) * 0.2;

      if (checkCollision(player, powerup)) {
        powerupActive = true;
        lastPowerupTime = currentTime;
        lastPowerupCollectTime = currentTime;
        combo++;

        document.getElementById("powerup-status").style.display = "block";
        document.getElementById(
          "combo-counter"
        ).textContent = `Combo: x${combo}`;

        createExplosion(powerup.position, 0xffff00);

        playPowerupSound();

        const comboBonus = Math.floor(
          50 * combo * SETTINGS.SCORE_MULTIPLIER
        );
        score += comboBonus;
        document.getElementById("score").textContent = `Score: ${score}`;
        showScorePopup(comboBonus, powerup);

        if (health < SETTINGS.MAX_HEALTH) {
          const healing = Math.min(20, SETTINGS.MAX_HEALTH - health);
          health += healing;
          document.getElementById(
            "health"
          ).textContent = `Health: ${Math.floor(health)}`;
          showScorePopup(`+${healing} HP`, powerup);
        }

        scene.remove(powerup);
        powerups.splice(i, 1);
        continue;
      }

      if (powerup.position.y < -4) {
        scene.remove(powerup);
        powerups.splice(i, 1);
      }
    }

    if (
      powerupActive &&
      currentTime - lastPowerupTime > SETTINGS.POWERUP_DURATION
    ) {
      powerupActive = false;
      document.getElementById("powerup-status").style.display = "none";
    }

    updateCombo();
    player.position.x = Math.max(-3, Math.min(3, player.position.x));

    const engineTrailIntensity = 0.5 + Math.random() * 0.5;
    player.children[player.children.length - 1].intensity =
      engineTrailIntensity;

    if (powerupActive) {
      const shieldPulse = 0.5 + Math.sin(currentTime * 0.005) * 0.5;
      player.children[0].material.emissive.setHex(0x00ff88);
      player.children[0].material.emissiveIntensity = shieldPulse;
    } else {
      player.children[0].material.emissive.setHex(0x00663c);
      player.children[0].material.emissiveIntensity = 1;
    }

    updateParticles(deltaTime);
    updateStars(deltaTime);
  }

  renderer.render(scene, camera);
}

init();
animate();