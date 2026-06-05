import "./styles.css";

function getCanvas(): HTMLCanvasElement {
  const canvasElement = document.querySelector<HTMLCanvasElement>("#gameCanvas");

  if (!canvasElement) {
    throw new Error("Game canvas was not found.");
  }

  return canvasElement;
}

function getCanvasContext(canvasElement: HTMLCanvasElement): CanvasRenderingContext2D {
  const canvasContext = canvasElement.getContext("2d");

  if (!canvasContext) {
    throw new Error("2D canvas context is not available.");
  }

  return canvasContext;
}

const canvas = getCanvas();
const ctx = getCanvasContext(canvas);

const GAME_STATES = {
  MENU: "MENU",
  PLAYING: "PLAYING",
  WINNER: "WINNER",
} as const;

type GameState = (typeof GAME_STATES)[keyof typeof GAME_STATES];

let gameState: GameState = GAME_STATES.MENU;
let lastFrameTime = 0;

const colors = {
  background: "#080b16",
  grid: "rgba(40, 240, 255, 0.12)",
  cyan: "#28f0ff",
  pink: "#ff3df2",
  lime: "#b6ff4d",
  text: "#f4f7ff",
  muted: "#9aa6c8",
};

type Vector = {
  x: number;
  y: number;
};

type Player = {
  id: "P1" | "P2";
  position: Vector;
  spawnPosition: Vector;
  facing: Vector;
  spawnFacing: Vector;
  radius: number;
  speed: number;
  maxHealth: number;
  health: number;
  shootCooldown: number;
  lastShotAt: number;
  hitFlashUntil: number;
  shieldUntil: number;
  color: string;
  accentColor: string;
  controls: {
    up: string;
    down: string;
    left: string;
    right: string;
  };
};

type Bullet = {
  ownerId: Player["id"];
  position: Vector;
  velocity: Vector;
  radius: number;
  damage: number;
  color: string;
};

type HitMarker = {
  position: Vector;
  color: string;
  expiresAt: number;
};

type PowerupType = "HEALTH_CORE" | "SHIELD_BUBBLE";

type Powerup = {
  type: PowerupType;
  position: Vector;
  radius: number;
};

type FloatingText = {
  text: string;
  position: Vector;
  color: string;
  expiresAt: number;
};

type ArenaBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const arenaBounds: ArenaBounds = {
  x: 64,
  y: 64,
  width: canvas.width - 128,
  height: canvas.height - 128,
};

const pressedKeys = new Set<string>();
const bullets: Bullet[] = [];
const hitMarkers: HitMarker[] = [];
const floatingTexts: FloatingText[] = [];
let activePowerup: Powerup | null = null;
let nextPowerupSpawnAt = 0;
let winnerText = "";

const bulletSpeed = 520;
const bulletDamage = 15;
const hitFeedbackDuration = 140;
const healthRestoreAmount = 25;
const shieldDuration = 5000;
const shieldDamageMultiplier = 0.25;
const powerupRespawnDelay = 1800;

const players: Player[] = [
  {
    id: "P1",
    position: { x: arenaBounds.x + 140, y: arenaBounds.y + arenaBounds.height / 2 },
    spawnPosition: { x: arenaBounds.x + 140, y: arenaBounds.y + arenaBounds.height / 2 },
    facing: { x: 1, y: 0 },
    spawnFacing: { x: 1, y: 0 },
    radius: 22,
    speed: 245,
    maxHealth: 100,
    health: 100,
    shootCooldown: 320,
    lastShotAt: -Infinity,
    hitFlashUntil: 0,
    shieldUntil: 0,
    color: colors.cyan,
    accentColor: "#126fff",
    controls: {
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
    },
  },
  {
    id: "P2",
    position: { x: arenaBounds.x + arenaBounds.width - 140, y: arenaBounds.y + arenaBounds.height / 2 },
    spawnPosition: { x: arenaBounds.x + arenaBounds.width - 140, y: arenaBounds.y + arenaBounds.height / 2 },
    facing: { x: -1, y: 0 },
    spawnFacing: { x: -1, y: 0 },
    radius: 22,
    speed: 245,
    maxHealth: 100,
    health: 100,
    shootCooldown: 320,
    lastShotAt: -Infinity,
    hitFlashUntil: 0,
    shieldUntil: 0,
    color: colors.pink,
    accentColor: "#ff334f",
    controls: {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    },
  },
];

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && gameState === GAME_STATES.MENU) {
    resetRound();
    gameState = GAME_STATES.PLAYING;
  }

  if (event.code === "KeyR" && gameState === GAME_STATES.PLAYING) {
    resetRound();
  }

  if (event.code === "KeyR" && gameState === GAME_STATES.WINNER) {
    resetRound();
    gameState = GAME_STATES.PLAYING;
  }

  pressedKeys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
});

function clearCanvas(): void {
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawText(
  text: string,
  x: number,
  y: number,
  size: number,
  color = colors.text,
  align: CanvasTextAlign = "center",
): void {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawGrid(): void {
  ctx.save();
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawControls(): void {
  const leftX = canvas.width * 0.32;
  const rightX = canvas.width * 0.68;
  const y = 360;

  drawText("P1 Controls", leftX, y, 22, colors.cyan);
  drawText("Move: W A S D", leftX, y + 38, 18, colors.muted);
  drawText("Attack: Space", leftX, y + 68, 18, colors.muted);

  drawText("P2 Controls", rightX, y, 22, colors.pink);
  drawText("Move: Arrow Keys", rightX, y + 38, 18, colors.muted);
  drawText("Attack: Shift", rightX, y + 68, 18, colors.muted);
}

function drawMenu(): void {
  clearCanvas();
  drawGrid();

  drawText("DuelByte Arena", canvas.width / 2, 145, 56, colors.text);
  drawText("Same keyboard. No mercy.", canvas.width / 2, 205, 24, colors.lime);
  drawText("Press Enter to Start", canvas.width / 2, 280, 28, colors.cyan);
  drawControls();
}

function drawArenaBoundary(): void {
  ctx.save();
  ctx.strokeStyle = colors.cyan;
  ctx.lineWidth = 4;
  ctx.shadowColor = colors.cyan;
  ctx.shadowBlur = 16;
  ctx.strokeRect(arenaBounds.x, arenaBounds.y, arenaBounds.width, arenaBounds.height);

  ctx.strokeStyle = "rgba(255, 61, 242, 0.45)";
  ctx.lineWidth = 2;
  ctx.shadowColor = colors.pink;
  ctx.strokeRect(arenaBounds.x + 16, arenaBounds.y + 16, arenaBounds.width - 32, arenaBounds.height - 32);
  ctx.restore();
}

function resetPlayer(player: Player): void {
  player.position = { ...player.spawnPosition };
  player.facing = { ...player.spawnFacing };
  player.health = player.maxHealth;
  player.lastShotAt = -Infinity;
  player.hitFlashUntil = 0;
  player.shieldUntil = 0;
}

function resetRound(): void {
  players.forEach(resetPlayer);
  bullets.length = 0;
  hitMarkers.length = 0;
  floatingTexts.length = 0;
  activePowerup = null;
  nextPowerupSpawnAt = 0;
  winnerText = "";
  pressedKeys.clear();
}

function getPlayerInput(player: Player): Vector {
  let x = 0;
  let y = 0;

  if (pressedKeys.has(player.controls.left)) {
    x -= 1;
  }

  if (pressedKeys.has(player.controls.right)) {
    x += 1;
  }

  if (pressedKeys.has(player.controls.up)) {
    y -= 1;
  }

  if (pressedKeys.has(player.controls.down)) {
    y += 1;
  }

  if (x === 0 && y === 0) {
    return { x, y };
  }

  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function updatePlayer(player: Player, deltaSeconds: number): void {
  const input = getPlayerInput(player);

  if (input.x !== 0 || input.y !== 0) {
    player.facing = input;
  }

  player.position.x += input.x * player.speed * deltaSeconds;
  player.position.y += input.y * player.speed * deltaSeconds;

  player.position.x = clamp(
    player.position.x,
    arenaBounds.x + player.radius,
    arenaBounds.x + arenaBounds.width - player.radius,
  );
  player.position.y = clamp(
    player.position.y,
    arenaBounds.y + player.radius,
    arenaBounds.y + arenaBounds.height - player.radius,
  );
}

function updatePlayers(deltaSeconds: number): void {
  players.forEach((player) => updatePlayer(player, deltaSeconds));
}

function isAttackPressed(player: Player): boolean {
  if (player.id === "P1") {
    return pressedKeys.has("Space");
  }

  return pressedKeys.has("Enter") || pressedKeys.has("ShiftRight") || pressedKeys.has("ShiftLeft");
}

function createBullet(player: Player): Bullet {
  const spawnDistance = player.radius + 12;

  return {
    ownerId: player.id,
    position: {
      x: player.position.x + player.facing.x * spawnDistance,
      y: player.position.y + player.facing.y * spawnDistance,
    },
    velocity: {
      x: player.facing.x * bulletSpeed,
      y: player.facing.y * bulletSpeed,
    },
    radius: 7,
    damage: bulletDamage,
    color: player.color,
  };
}

function updateShooting(currentTime: number): void {
  for (const player of players) {
    if (!isAttackPressed(player)) {
      continue;
    }

    if (currentTime - player.lastShotAt < player.shootCooldown) {
      continue;
    }

    bullets.push(createBullet(player));
    player.lastShotAt = currentTime;
  }
}

function isBulletInsideArena(bullet: Bullet): boolean {
  return (
    bullet.position.x + bullet.radius >= arenaBounds.x &&
    bullet.position.x - bullet.radius <= arenaBounds.x + arenaBounds.width &&
    bullet.position.y + bullet.radius >= arenaBounds.y &&
    bullet.position.y - bullet.radius <= arenaBounds.y + arenaBounds.height
  );
}

function updateBullets(deltaSeconds: number): void {
  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    const bullet = bullets[index];
    bullet.position.x += bullet.velocity.x * deltaSeconds;
    bullet.position.y += bullet.velocity.y * deltaSeconds;

    if (!isBulletInsideArena(bullet)) {
      bullets.splice(index, 1);
    }
  }
}

function getDistance(a: Vector, b: Vector): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function setWinner(winner: Player): void {
  winnerText = winner.id === "P1" ? "Player 1 Wins!" : "Player 2 Wins!";
  bullets.length = 0;
  hitMarkers.length = 0;
  floatingTexts.length = 0;
  activePowerup = null;
  pressedKeys.clear();
  gameState = GAME_STATES.WINNER;
}

function checkBulletHits(currentTime: number): void {
  for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = bullets[bulletIndex];
    const target = players.find((player) => player.id !== bullet.ownerId);

    if (!target || getDistance(bullet.position, target.position) > bullet.radius + target.radius) {
      continue;
    }

    const hasShield = target.shieldUntil > currentTime;
    const damage = hasShield ? Math.ceil(bullet.damage * shieldDamageMultiplier) : bullet.damage;

    target.health = Math.max(target.health - damage, 0);
    target.hitFlashUntil = currentTime + hitFeedbackDuration;
    hitMarkers.push({ position: { ...target.position }, color: hasShield ? colors.lime : bullet.color, expiresAt: currentTime + 180 });
    floatingTexts.push({
      text: hasShield ? "BLOCK" : `-${damage}`,
      position: { x: target.position.x, y: target.position.y - 42 },
      color: hasShield ? colors.lime : bullet.color,
      expiresAt: currentTime + 650,
    });
    bullets.splice(bulletIndex, 1);

    if (target.health <= 0) {
      const winner = players.find((player) => player.id === bullet.ownerId);

      if (winner) {
        setWinner(winner);
      }

      return;
    }
  }
}

function updateHitMarkers(currentTime: number): void {
  for (let index = hitMarkers.length - 1; index >= 0; index -= 1) {
    if (hitMarkers[index].expiresAt <= currentTime) {
      hitMarkers.splice(index, 1);
    }
  }
}

function updateFloatingTexts(currentTime: number): void {
  for (let index = floatingTexts.length - 1; index >= 0; index -= 1) {
    const text = floatingTexts[index];
    text.position.y -= 0.45;

    if (text.expiresAt <= currentTime) {
      floatingTexts.splice(index, 1);
    }
  }
}

function getRandomPowerupType(): PowerupType {
  return Math.random() > 0.5 ? "HEALTH_CORE" : "SHIELD_BUBBLE";
}

function getSafePowerupPosition(): Vector {
  const padding = 56;
  const minPlayerDistance = 120;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const position = {
      x: arenaBounds.x + padding + Math.random() * (arenaBounds.width - padding * 2),
      y: arenaBounds.y + padding + Math.random() * (arenaBounds.height - padding * 2),
    };
    const isAwayFromPlayers = players.every((player) => getDistance(position, player.position) >= minPlayerDistance);

    if (isAwayFromPlayers) {
      return position;
    }
  }

  return {
    x: arenaBounds.x + arenaBounds.width / 2,
    y: arenaBounds.y + arenaBounds.height / 2,
  };
}

function spawnPowerup(): void {
  activePowerup = {
    type: getRandomPowerupType(),
    position: getSafePowerupPosition(),
    radius: 18,
  };
}

function applyPowerup(player: Player, powerup: Powerup, currentTime: number): void {
  if (powerup.type === "HEALTH_CORE") {
    player.health = Math.min(player.health + healthRestoreAmount, player.maxHealth);
    floatingTexts.push({
      text: "+25 HP",
      position: { x: player.position.x, y: player.position.y - 46 },
      color: colors.lime,
      expiresAt: currentTime + 850,
    });
    return;
  }

  player.shieldUntil = currentTime + shieldDuration;
  floatingTexts.push({
    text: "SHIELD",
    position: { x: player.position.x, y: player.position.y - 46 },
    color: colors.cyan,
    expiresAt: currentTime + 850,
  });
}

function checkPowerupPickup(currentTime: number): void {
  if (!activePowerup) {
    return;
  }

  for (const player of players) {
    if (getDistance(player.position, activePowerup.position) > player.radius + activePowerup.radius) {
      continue;
    }

    applyPowerup(player, activePowerup, currentTime);
    activePowerup = null;
    nextPowerupSpawnAt = currentTime + powerupRespawnDelay;
    return;
  }
}

function updatePowerups(currentTime: number): void {
  if (!activePowerup && currentTime >= nextPowerupSpawnAt) {
    spawnPowerup();
  }

  checkPowerupPickup(currentTime);
}

function drawPlayer(player: Player): void {
  const { x, y } = player.position;
  const facingAngle = Math.atan2(player.facing.y, player.facing.x);
  const isFlashing = player.hitFlashUntil > performance.now();
  const hasShield = player.shieldUntil > performance.now();

  ctx.save();
  ctx.translate(x, y);

  ctx.shadowColor = player.color;
  ctx.shadowBlur = 18;

  if (hasShield) {
    ctx.strokeStyle = colors.lime;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, player.radius + 8, player.radius * 0.9, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isFlashing ? colors.text : player.color;
  ctx.strokeStyle = player.accentColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.rotate(facingAngle);
  ctx.shadowBlur = 8;
  ctx.fillStyle = player.accentColor;
  ctx.beginPath();
  ctx.moveTo(player.radius + 11, 0);
  ctx.lineTo(player.radius - 7, -8);
  ctx.lineTo(player.radius - 7, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(244, 247, 255, 0.92)";
  ctx.beginPath();
  ctx.arc(7, -6, 4, 0, Math.PI * 2);
  ctx.arc(7, 6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  drawText(hasShield ? `${player.id} SHIELD` : player.id, x, y - player.radius - 20, 16, hasShield ? colors.lime : player.color);
}

function drawPlayers(): void {
  players.forEach(drawPlayer);
}

function drawBullets(): void {
  for (const bullet of bullets) {
    const angle = Math.atan2(bullet.velocity.y, bullet.velocity.x);

    ctx.save();
    ctx.translate(bullet.position.x, bullet.position.y);
    ctx.rotate(angle);
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, bullet.radius * 1.7, bullet.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(244, 247, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(bullet.radius * 0.8, 0, bullet.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHitMarkers(): void {
  for (const marker of hitMarkers) {
    const lifePercent = clamp((marker.expiresAt - performance.now()) / 180, 0, 1);
    const size = 24 + (1 - lifePercent) * 16;

    ctx.save();
    ctx.globalAlpha = lifePercent;
    ctx.strokeStyle = marker.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = marker.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(marker.position.x - size, marker.position.y - size);
    ctx.lineTo(marker.position.x + size, marker.position.y + size);
    ctx.moveTo(marker.position.x + size, marker.position.y - size);
    ctx.lineTo(marker.position.x - size, marker.position.y + size);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFloatingTexts(): void {
  for (const text of floatingTexts) {
    const lifePercent = clamp((text.expiresAt - performance.now()) / 850, 0, 1);

    ctx.save();
    ctx.globalAlpha = lifePercent;
    drawText(text.text, text.position.x, text.position.y, 18, text.color);
    ctx.restore();
  }
}

function drawPowerups(): void {
  if (!activePowerup) {
    return;
  }

  const { x, y } = activePowerup.position;

  ctx.save();
  ctx.translate(x, y);

  if (activePowerup.type === "HEALTH_CORE") {
    ctx.shadowColor = colors.lime;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(182, 255, 77, 0.2)";
    ctx.strokeStyle = colors.lime;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, activePowerup.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.lime;
    ctx.fillRect(-3, -10, 6, 20);
    ctx.fillRect(-10, -3, 20, 6);
  } else {
    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(40, 240, 255, 0.18)";
    ctx.strokeStyle = "#ffe66d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(18, -12, 14, 7);
    ctx.quadraticCurveTo(8, 20, 0, 24);
    ctx.quadraticCurveTo(-8, 20, -14, 7);
    ctx.quadraticCurveTo(-18, -12, 0, -20);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawHealthBar(player: Player, x: number, y: number, width: number, align: CanvasTextAlign): void {
  const height = 16;
  const healthPercent = clamp(player.health / player.maxHealth, 0, 1);
  const fillWidth = width * healthPercent;

  ctx.save();
  ctx.fillStyle = "rgba(6, 9, 22, 0.82)";
  ctx.strokeStyle = "rgba(244, 247, 255, 0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = player.color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.roundRect(x, y, fillWidth, height, 6);
  ctx.fill();
  ctx.restore();

  drawText(`${player.id}  ${player.health}/${player.maxHealth}`, align === "left" ? x : x + width, y - 14, 16, player.color, align);

  if (player.shieldUntil > performance.now()) {
    drawText("SHIELD", align === "left" ? x : x + width, y + 31, 13, colors.lime, align);
  }
}

function drawHud(): void {
  const barWidth = 260;
  const barY = 26;

  drawHealthBar(players[0], 42, barY, barWidth, "left");
  drawHealthBar(players[1], canvas.width - barWidth - 42, barY, barWidth, "right");

  drawText("Round 1", canvas.width / 2, 26, 20, colors.text);
  drawText("Last Player Standing", canvas.width / 2, 52, 15, colors.muted);
}

function drawPlaying(): void {
  clearCanvas();
  drawGrid();
  drawHud();
  drawArenaBoundary();
  drawPowerups();
  drawBullets();
  drawPlayers();
  drawHitMarkers();
  drawFloatingTexts();
}

function drawWinner(): void {
  clearCanvas();
  drawGrid();
  drawText(winnerText, canvas.width / 2, canvas.height / 2 - 28, 46, colors.lime);
  drawText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 34, 24, colors.cyan);
}

function gameLoop(currentTime = 0): void {
  const deltaSeconds = Math.min((currentTime - lastFrameTime) / 1000, 0.05);
  lastFrameTime = currentTime;

  if (gameState === GAME_STATES.MENU) {
    drawMenu();
  } else if (gameState === GAME_STATES.PLAYING) {
    updatePlayers(deltaSeconds);
    updateShooting(currentTime);
    updateBullets(deltaSeconds);
    checkBulletHits(currentTime);
    updateHitMarkers(currentTime);
    updatePowerups(currentTime);
    updateFloatingTexts(currentTime);
    drawPlaying();
  } else if (gameState === GAME_STATES.WINNER) {
    drawWinner();
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
