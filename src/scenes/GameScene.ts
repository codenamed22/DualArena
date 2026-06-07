import Phaser from "phaser";
import { getArenaMap, type ArenaMap, type ArenaMapId } from "../config/maps";
import { Bot } from "../entities/Bot";
import { Bullet } from "../entities/Bullet";
import { BulletPool } from "../entities/BulletPool";
import { DynamicObstacle, type DynamicObstacleConfig } from "../entities/DynamicObstacle";
import { Player } from "../entities/Player";
import { Powerup, type PowerupType } from "../entities/Powerup";
import { ArenaBackground } from "./ArenaBackground";
import { ARENA_BOUNDS, COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS, type GameMode } from "../utils/constants";
import { addSceneBloom, bodyStyle, HEX, titleStyle } from "../utils/theme";
import { audio } from "../utils/audio";
import { Hud } from "../ui/Hud";

type GameSceneData = {
  mapId?: ArenaMapId;
  gameMode?: GameMode;
  botCount?: number;
};

type RoundPhase = "countdown" | "playing" | "round-over";
type ArenaEventPhase = "idle" | "warning" | "active";

type ArenaEventZone = {
  bounds: Phaser.Geom.Rectangle;
  visual: Phaser.GameObjects.Rectangle;
};

export class GameScene extends Phaser.Scene {
  private selectedMap: ArenaMap = getArenaMap("cyber-core");
  private players: Player[] = [];
  private bots: Bot[] = [];
  private bullets: Bullet[] = [];
  private bulletPool!: BulletPool;
  private arenaBounds = new Phaser.Geom.Rectangle(ARENA_BOUNDS.x, ARENA_BOUNDS.y, ARENA_BOUNDS.width, ARENA_BOUNDS.height);
  private obstacles: Phaser.Geom.Rectangle[] = [];
  private staticObstacles: Phaser.Geom.Rectangle[] = [];
  private dynamicObstacles: DynamicObstacle[] = [];
  private hud!: Hud;
  private countdownText?: Phaser.GameObjects.Text;
  private roundEndsAt = 0;
  private roundTimeLeftMs = 0;
  private roundOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private playerOneAttack?: Phaser.Input.Keyboard.Key;
  private playerTwoEnterAttack?: Phaser.Input.Keyboard.Key;
  private playerTwoShiftAttack?: Phaser.Input.Keyboard.Key;
  private lastShotAt: Record<"P1" | "P2", number> = { P1: -Infinity, P2: -Infinity };
  private activePowerup?: Powerup;
  private nextPowerupSpawnAt = 0;
  private combatActive = true;
  private roundPhase: RoundPhase = "countdown";
  private arenaEventPhase: ArenaEventPhase = "idle";
  private arenaEventZones: ArenaEventZone[] = [];
  private arenaEventTimers: Phaser.Time.TimerEvent[] = [];
  private nextArenaEventAt = Number.POSITIVE_INFINITY;
  private lastEventDamageAt: Record<"P1" | "P2", number> = { P1: -Infinity, P2: -Infinity };
  private roundNumber = 1;
  private roundWins: Record<"P1" | "P2", number> = { P1: 0, P2: 0 };
  private gameMode: GameMode = "local";
  private botCount = 0;
  private aiStrafeDirection = 1;
  private nextAiStrafeAt = 0;
  private nextAiShotAt = 0;

  private readonly roundDurationMs = 90000;
  private readonly winsNeeded = 2;
  private readonly shootCooldown = 260;
  private readonly healthRestoreAmount = 25;
  private readonly shieldDuration = 5000;
  private readonly speedDuration = 5000;
  private readonly megaDuration = 6000;
  private readonly powerupFirstSpawn = { min: 800, max: 1600 };
  private readonly powerupRespawn = { min: 1500, max: 3000 };
  private readonly arenaEventWarningDuration = 1000;
  private readonly arenaEventActiveDuration = 2200;
  private readonly arenaEventDamageCooldown = 650;
  private readonly botBulletDamage = 9;
  private readonly aiShotCooldown = { min: 520, max: 760 };
  private readonly aiPreferredDistance = 245;
  private readonly aiMinDistance = 150;

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  init(data: GameSceneData): void {
    this.selectedMap = getArenaMap(data.mapId ?? "cyber-core");
    this.gameMode = data.gameMode ?? "local";
    this.botCount = Phaser.Math.Clamp(Math.floor(data.botCount ?? 0), 0, 3);
  }

  create(): void {
    this.players = [];
    this.bots = [];
    this.bullets = [];
    this.bulletPool = new BulletPool(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bulletPool.destroyAll();
      this.destroyDynamicObstacles();
      this.destroyBots();
    });
    this.clearPowerups();
    this.lastShotAt = { P1: -Infinity, P2: -Infinity };
    this.lastEventDamageAt = { P1: -Infinity, P2: -Infinity };
    this.nextPowerupSpawnAt = Number.POSITIVE_INFINITY;
    this.nextArenaEventAt = Number.POSITIVE_INFINITY;
    this.combatActive = false;
    this.roundPhase = "countdown";
    this.roundNumber = 1;
    this.roundWins = { P1: 0, P2: 0 };
    this.aiStrafeDirection = 1;
    this.nextAiStrafeAt = 0;
    this.nextAiShotAt = 0;
    this.drawArena();
    this.drawObstacles();
    this.hud = new Hud(this, this.selectedMap.name, this.selectedMap.accentColor, this.winsNeeded);
    this.createPlayers();
    this.players.forEach((player) => player.setObstacles(this.obstacles));
    this.createBots();
    this.createAttackKeys();
    this.startCountdown();

    addSceneBloom(this, 0.45);
    this.cameras.main.fadeIn(360, 5, 7, 18);

    this.input.keyboard?.on("keydown-R", () => {
      this.resetMatch();
    });
  }

  update(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;

    if (this.combatActive && this.roundPhase === "playing") {
      this.updateDynamicObstacles(time);
      this.updatePlayers(time, deltaSeconds);
      this.updateBots(time, deltaSeconds);
      this.updateShooting(time);
      this.updateBotShooting(time);
      this.updateBullets(deltaSeconds);
      this.checkBulletHits();
      this.updatePowerupEffects(time);
      this.updateArenaEvent(time);
      this.updateRoundTimer(time);
    }

    this.updateHud();
  }

  private updateRoundTimer(time: number): void {
    this.roundTimeLeftMs = Math.max(0, this.roundEndsAt - time);

    if (this.roundTimeLeftMs <= 0) {
      this.endRoundByTime();
    }
  }

  private drawArena(): void {
    const cx = this.arenaBounds.centerX;
    const cy = this.arenaBounds.centerY;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add
      .rectangle(cx, cy, ARENA_BOUNDS.width, ARENA_BOUNDS.height, this.selectedMap.floorColor, 0.94)
      .setStrokeStyle(4, this.selectedMap.accentColor, 0.88)
      .setDepth(0);

    // Rich, animated per-map world (grid/circuits, foliage, or lava).
    new ArenaBackground(this, this.selectedMap, this.arenaBounds);

    this.add
      .rectangle(cx, cy, ARENA_BOUNDS.width - 42, ARENA_BOUNDS.height - 42)
      .setStrokeStyle(2, this.selectedMap.secondaryColor, 0.55)
      .setDepth(9);
  }

  /** Symmetric cover blocks per map — block bullets and movement, keep both sides fair. */
  private getArenaObstacles(): Phaser.Geom.Rectangle[] {
    const centered = (cx: number, cy: number, w: number, h: number): Phaser.Geom.Rectangle =>
      new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
    const cx = this.arenaBounds.centerX;
    const cy = this.arenaBounds.centerY;

    if (this.selectedMap.id === "forest") {
      return [
        centered(cx - 150, cy - 84, 48, 48),
        centered(cx + 150, cy - 84, 48, 48),
        centered(cx - 150, cy + 84, 48, 48),
        centered(cx + 150, cy + 84, 48, 48),
        centered(cx, cy, 58, 58),
      ];
    }

    if (this.selectedMap.id === "volcano") {
      return [
        centered(cx - 150, cy, 46, 150),
        centered(cx + 150, cy, 46, 150),
        centered(cx, cy - 104, 96, 30),
        centered(cx, cy + 104, 96, 30),
      ];
    }

    // cyber-core: three vertical slabs along the midline to peek around.
    return [
      centered(cx - 150, cy, 28, 128),
      centered(cx, cy, 30, 128),
      centered(cx + 150, cy, 28, 128),
    ];
  }

  private drawObstacles(): void {
    this.staticObstacles = this.getArenaObstacles();
    this.obstacles = [...this.staticObstacles];

    this.staticObstacles.forEach((rect) => {
      this.add
        .rectangle(rect.centerX, rect.centerY, rect.width, rect.height, 0x0e1630, 1)
        .setStrokeStyle(3, this.selectedMap.accentColor, 0.95)
        .setDepth(14);
      this.add
        .rectangle(rect.centerX, rect.centerY, rect.width - 8, rect.height - 8)
        .setStrokeStyle(1, this.selectedMap.secondaryColor, 0.5)
        .setDepth(14);
    });

    this.createDynamicObstacles();
  }

  private createDynamicObstacles(): void {
    this.destroyDynamicObstacles();
    this.dynamicObstacles = this.getDynamicObstacleConfigs().map((config) => new DynamicObstacle(this, config));
    this.obstacles.push(...this.dynamicObstacles.map((obstacle) => obstacle.bounds));
  }

  private getDynamicObstacleConfigs(): DynamicObstacleConfig[] {
    const cx = this.arenaBounds.centerX;
    const cy = this.arenaBounds.centerY;

    if (this.selectedMap.id === "forest") {
      return [
        {
          x: cx - 170,
          y: cy - 28,
          width: 104,
          height: 24,
          axis: "y",
          travel: 58,
          cycleMs: 4600,
          style: "root",
          fillColor: 0x1d2714,
          strokeColor: 0x7dff72,
          accentColor: 0xffe66d,
        },
        {
          x: cx + 170,
          y: cy + 28,
          width: 104,
          height: 24,
          axis: "y",
          travel: 58,
          cycleMs: 4600,
          phase: Math.PI,
          style: "root",
          fillColor: 0x1d2714,
          strokeColor: 0x7dff72,
          accentColor: 0xffe66d,
        },
        {
          x: cx,
          y: cy,
          width: 34,
          height: 110,
          axis: "x",
          travel: 78,
          cycleMs: 5600,
          phase: Math.PI / 2,
          style: "root",
          fillColor: 0x23190f,
          strokeColor: 0xffe66d,
          accentColor: 0x7dff72,
        },
      ];
    }

    if (this.selectedMap.id === "volcano") {
      return [
        {
          x: cx,
          y: cy - 94,
          width: 148,
          height: 26,
          axis: "x",
          travel: 92,
          cycleMs: 5000,
          style: "lava",
          fillColor: 0x21100d,
          strokeColor: 0xff6b2b,
          accentColor: 0xff2b2b,
        },
        {
          x: cx,
          y: cy + 94,
          width: 148,
          height: 26,
          axis: "x",
          travel: 92,
          cycleMs: 5000,
          phase: Math.PI,
          style: "lava",
          fillColor: 0x21100d,
          strokeColor: 0xff6b2b,
          accentColor: 0xffe66d,
        },
      ];
    }

    return [
      {
        x: cx,
        y: cy - 108,
        width: 96,
        height: 24,
        axis: "x",
        travel: 150,
        cycleMs: 4300,
        style: "tech",
        fillColor: 0x09162f,
        strokeColor: 0x28f0ff,
        accentColor: 0xff3df2,
      },
      {
        x: cx,
        y: cy + 108,
        width: 96,
        height: 24,
        axis: "x",
        travel: 150,
        cycleMs: 4300,
        phase: Math.PI,
        style: "tech",
        fillColor: 0x120b2d,
        strokeColor: 0xff3df2,
        accentColor: 0x28f0ff,
      },
      {
        x: cx,
        y: cy,
        width: 24,
        height: 84,
        axis: "y",
        travel: 68,
        cycleMs: 5200,
        phase: Math.PI / 2,
        style: "tech",
        fillColor: 0x09162f,
        strokeColor: 0x28f0ff,
        accentColor: 0xff3df2,
      },
    ];
  }

  private updateDynamicObstacles(time: number): void {
    this.dynamicObstacles.forEach((obstacle) => {
      obstacle.update(time);
      this.players.forEach((player) => player.pushOutOfObstacle(obstacle.bounds));
      this.bots.forEach((bot) => bot.pushOutOfObstacle(obstacle.bounds));
    });
  }

  private resetDynamicObstacles(): void {
    this.dynamicObstacles.forEach((obstacle) => obstacle.reset(this.time.now));
  }

  private destroyDynamicObstacles(): void {
    this.dynamicObstacles.forEach((obstacle) => obstacle.destroy());
    this.dynamicObstacles = [];
  }

  private hitsObstacle(bullet: Bullet): boolean {
    return this.obstacles.some((rect) => rect.contains(bullet.sprite.x, bullet.sprite.y));
  }

  private createBots(): void {
    if (this.botCount <= 0) {
      return;
    }

    const positions = this.getBotSpawnPositions(this.botCount);
    this.bots = positions.map((position, index) => {
      const bot = new Bot(this, {
        index,
        x: position.x,
        y: position.y,
        bounds: this.arenaBounds,
      });
      bot.setObstacles(this.obstacles);
      return bot;
    });
  }

  private getBotSpawnPositions(count: number): Phaser.Math.Vector2[] {
    const cx = this.arenaBounds.centerX;
    const cy = this.arenaBounds.centerY;
    const presets = [
      [new Phaser.Math.Vector2(cx, cy - 78)],
      [new Phaser.Math.Vector2(cx, cy - 118), new Phaser.Math.Vector2(cx, cy + 118)],
      [new Phaser.Math.Vector2(cx, cy - 124), new Phaser.Math.Vector2(cx, cy + 124), new Phaser.Math.Vector2(cx, cy)],
    ];
    const preferred = presets[count - 1] ?? [];

    return preferred.map((position, index) => this.getSafeBotPosition(position, index));
  }

  private getSafeBotPosition(preferred: Phaser.Math.Vector2, index: number): Phaser.Math.Vector2 {
    const candidates = [
      preferred,
      new Phaser.Math.Vector2(this.arenaBounds.centerX - 96, this.arenaBounds.centerY - 118),
      new Phaser.Math.Vector2(this.arenaBounds.centerX + 96, this.arenaBounds.centerY + 118),
      new Phaser.Math.Vector2(this.arenaBounds.centerX + 120, this.arenaBounds.centerY - 92),
      new Phaser.Math.Vector2(this.arenaBounds.centerX - 120, this.arenaBounds.centerY + 92),
      new Phaser.Math.Vector2(this.arenaBounds.left + 270 + index * 58, this.arenaBounds.centerY),
    ];

    return candidates.find((candidate) => this.isSafeBotSpot(candidate)) ?? preferred;
  }

  private isSafeBotSpot(position: Phaser.Math.Vector2): boolean {
    const padding = 46;
    const b = this.arenaBounds;

    if (position.x < b.left + padding || position.x > b.right - padding || position.y < b.top + padding || position.y > b.bottom - padding) {
      return false;
    }

    const safeFromPlayers = this.players.every((player) => Phaser.Math.Distance.Between(
      position.x,
      position.y,
      player.position.x,
      player.position.y,
    ) > 120);
    const safeFromBots = this.bots.every((bot) => Phaser.Math.Distance.Between(
      position.x,
      position.y,
      bot.position.x,
      bot.position.y,
    ) > 90);
    const safeFromObstacles = this.obstacles.every((rect) => {
      const inflated = new Phaser.Geom.Rectangle(rect.x - 28, rect.y - 28, rect.width + 56, rect.height + 56);
      return !inflated.contains(position.x, position.y);
    });
    const safeFromPowerup = !this.activePowerup || Phaser.Math.Distance.Between(
      position.x,
      position.y,
      this.activePowerup.position.x,
      this.activePowerup.position.y,
    ) > 80;

    return safeFromPlayers && safeFromBots && safeFromObstacles && safeFromPowerup;
  }

  private updateBots(time: number, deltaSeconds: number): void {
    if (this.bots.length === 0) {
      return;
    }

    const avoidZones = this.arenaEventPhase === "warning" || this.arenaEventPhase === "active"
      ? this.arenaEventZones.map((zone) => zone.bounds)
      : [];
    this.bots.forEach((bot) => bot.update(time, deltaSeconds, this.players, avoidZones));
  }

  private updatePlayers(time: number, deltaSeconds: number): void {
    const [playerOne, playerTwo] = this.players;

    playerOne?.update(deltaSeconds);

    if (!playerTwo) {
      return;
    }

    if (this.gameMode === "solo-bot" && playerOne) {
      this.updateAiOpponent(playerOne, playerTwo, time, deltaSeconds);
      return;
    }

    playerTwo.update(deltaSeconds);
  }

  private updateAiOpponent(target: Player, aiPlayer: Player, time: number, deltaSeconds: number): void {
    if (time >= this.nextAiStrafeAt) {
      this.aiStrafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
      this.nextAiStrafeAt = time + Phaser.Math.Between(850, 1450);
    }

    const toTarget = target.position.subtract(aiPlayer.position);
    const distance = Math.max(1, toTarget.length());
    const desired = toTarget.clone().normalize();

    if (distance < this.aiMinDistance) {
      desired.scale(-0.9);
    } else if (distance < this.aiPreferredDistance) {
      desired.scale(0.16);
    }

    const strafe = new Phaser.Math.Vector2(-toTarget.y, toTarget.x).normalize().scale(this.aiStrafeDirection * 0.45);
    const avoid = this.getAiHazardAvoidance(aiPlayer).scale(1.35);
    const movement = desired.add(strafe).add(avoid);

    aiPlayer.updateWithMovement(deltaSeconds, movement);
    aiPlayer.aimAt(this.getJitteredAimPoint(aiPlayer.position, target.position, 0.09));
  }

  private getAiHazardAvoidance(player: Player): Phaser.Math.Vector2 {
    if (this.arenaEventPhase !== "warning" && this.arenaEventPhase !== "active") {
      return new Phaser.Math.Vector2(0, 0);
    }

    const avoid = new Phaser.Math.Vector2(0, 0);
    const playerBounds = new Phaser.Geom.Rectangle(
      player.position.x - player.radius,
      player.position.y - player.radius,
      player.radius * 2,
      player.radius * 2,
    );

    this.arenaEventZones.forEach((zone) => {
      const inflated = new Phaser.Geom.Rectangle(zone.bounds.x - 42, zone.bounds.y - 42, zone.bounds.width + 84, zone.bounds.height + 84);
      if (Phaser.Geom.Intersects.RectangleToRectangle(inflated, playerBounds)) {
        avoid.add(new Phaser.Math.Vector2(player.position.x - zone.bounds.centerX, player.position.y - zone.bounds.centerY).normalize());
      }
    });

    return avoid;
  }

  private createPlayers(): void {
    if (!this.input.keyboard) {
      return;
    }

    const playerOne = new Player(this, {
      id: "P1",
      x: ARENA_BOUNDS.x + 150,
      y: ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2,
      color: 0x28f0ff,
      accentColor: 0x126fff,
      labelColor: "#28f0ff",
      bounds: this.arenaBounds,
      controls: {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      },
    });

    const playerTwo = new Player(this, {
      id: "P2",
      x: ARENA_BOUNDS.x + ARENA_BOUNDS.width - 150,
      y: ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2,
      color: 0xff3df2,
      accentColor: 0xff334f,
      labelColor: "#ff3df2",
      bounds: this.arenaBounds,
      controls: {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      },
    });

    this.players.push(playerOne, playerTwo);

    const controlsText = this.gameMode === "solo-bot"
      ? "P1: WASD + Space      P2: AI Controlled"
      : "P1: WASD + Space      P2: Arrow Keys + Enter / Shift";
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, controlsText, bodyStyle(15, HEX.muted, "600"))
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH - 28, GAME_HEIGHT - 14, `Bots: ${this.botCount}`, bodyStyle(15, HEX.gold, "700"))
      .setOrigin(1, 0.5);
    this.add
      .text(28, GAME_HEIGHT - 14, `Mode: ${this.getModeLabel()}`, bodyStyle(15, HEX.gold, "700"))
      .setOrigin(0, 0.5);
  }

  private getModeLabel(): string {
    return this.gameMode === "solo-bot" ? "Solo vs Bot" : "Local Duel";
  }

  private createAttackKeys(): void {
    if (!this.input.keyboard) {
      return;
    }

    this.playerOneAttack = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.playerTwoEnterAttack = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.playerTwoShiftAttack = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  private startCountdown(): void {
    this.roundPhase = "countdown";
    this.combatActive = false;
    this.roundTimeLeftMs = this.roundDurationMs;
    this.countdownText?.destroy();
    this.countdownText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "3", titleStyle(88, HEX.text))
      .setOrigin(0.5)
      .setDepth(50)
      .setShadow(0, 0, "#28f0ff", 18);

    const steps = ["3", "2", "1", "DUEL!"];

    steps.forEach((step, index) => {
      this.time.delayedCall(index * 760, () => {
        if (!this.countdownText) {
          return;
        }

        this.countdownText.setText(step);
        this.countdownText.setScale(step === "DUEL!" ? 0.7 : 1);

        if (step === "DUEL!") {
          audio.duel();
        } else {
          audio.countdownTick();
        }
        this.tweens.add({
          targets: this.countdownText,
          scale: step === "DUEL!" ? 1.12 : 1.24,
          alpha: 0.35,
          duration: 520,
          yoyo: true,
          ease: "Sine.easeOut",
        });
      });
    });

    this.time.delayedCall(steps.length * 760, () => {
      this.countdownText?.destroy();
      this.countdownText = undefined;
      this.startRound();
    });
  }

  private startRound(): void {
    this.roundPhase = "playing";
    this.combatActive = true;
    this.nextPowerupSpawnAt = this.time.now + Phaser.Math.Between(this.powerupFirstSpawn.min, this.powerupFirstSpawn.max);
    this.scheduleArenaEvent(this.time.now);
    this.lastShotAt = { P1: -Infinity, P2: -Infinity };
    this.nextAiShotAt = this.gameMode === "solo-bot" ? this.time.now + Phaser.Math.Between(450, 850) : 0;
    this.roundEndsAt = this.time.now + this.roundDurationMs;
    this.roundTimeLeftMs = this.roundDurationMs;
  }

  private resetRound(): void {
    this.clearRoundObjects();
    this.resetDynamicObstacles();
    this.players.forEach((player) => player.resetForRound());
    this.resetBots();
    this.lastShotAt = { P1: -Infinity, P2: -Infinity };
    this.nextAiShotAt = 0;
    this.nextAiStrafeAt = 0;
    this.nextPowerupSpawnAt = Number.POSITIVE_INFINITY;
    this.nextArenaEventAt = Number.POSITIVE_INFINITY;
    this.lastEventDamageAt = { P1: -Infinity, P2: -Infinity };
    this.combatActive = false;
    this.startCountdown();
  }

  private resetMatch(): void {
    this.scene.restart({ mapId: this.selectedMap.id, gameMode: this.gameMode, botCount: this.botCount });
  }

  private clearRoundObjects(): void {
    this.bullets.forEach((bullet) => this.bulletPool.release(bullet));
    this.bullets = [];
    this.clearPowerups();
    this.clearArenaEvent();
    this.countdownText?.destroy();
    this.countdownText = undefined;
    this.clearRoundOverlay();
  }

  private clearRoundOverlay(): void {
    this.roundOverlayObjects.forEach((object) => object.destroy());
    this.roundOverlayObjects = [];
  }

  private resetBots(): void {
    this.destroyBots();
    this.createBots();
  }

  private destroyBots(): void {
    this.bots.forEach((bot) => bot.destroy());
    this.bots = [];
  }

  private updateShooting(time: number): void {
    const [playerOne, playerTwo] = this.players;

    if (playerOne && this.playerOneAttack?.isDown) {
      this.tryShoot(playerOne, time);
    }

    if (this.gameMode === "solo-bot") {
      if (playerOne && playerTwo) {
        this.tryAiOpponentShoot(playerTwo, playerOne, time);
      }
      return;
    }

    if (playerTwo && (this.playerTwoEnterAttack?.isDown || this.playerTwoShiftAttack?.isDown)) {
      this.tryShoot(playerTwo, time);
    }
  }

  private tryAiOpponentShoot(aiPlayer: Player, target: Player, time: number): void {
    if (time < this.nextAiShotAt) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(aiPlayer.position.x, aiPlayer.position.y, target.position.x, target.position.y);
    if (distance > 430 || Phaser.Math.FloatBetween(0, 1) < 0.16) {
      return;
    }

    aiPlayer.aimAt(this.getJitteredAimPoint(aiPlayer.position, target.position, 0.12));
    this.tryShoot(aiPlayer, time);
    this.nextAiShotAt = time + Phaser.Math.Between(this.aiShotCooldown.min, this.aiShotCooldown.max);
  }

  private getJitteredAimPoint(origin: Phaser.Math.Vector2, target: Phaser.Math.Vector2, maxRadians: number): Phaser.Math.Vector2 {
    const direction = target.subtract(origin);
    direction.rotate(Phaser.Math.FloatBetween(-maxRadians, maxRadians));
    return origin.add(direction);
  }

  private updateBotShooting(time: number): void {
    this.bots.forEach((bot) => {
      if (!bot.tryConsumeShot(time)) {
        return;
      }

      const direction = bot.getShootDirection();
      const spawnDistance = bot.radius + 12;
      const position = bot.position.add(direction.clone().scale(spawnDistance));
      const bullet = this.bulletPool.obtain();
      bullet.spawn(bot.id, position.x, position.y, direction, bot.color, false, this.botBulletDamage);

      this.bullets.push(bullet);
      this.muzzleFlash(position.x, position.y, bot.color);
      audio.shoot();
    });
  }

  private tryShoot(player: Player, time: number): void {
    if (time - this.lastShotAt[player.id] < this.shootCooldown) {
      return;
    }

    const direction = player.facingDirection;
    const spawnDistance = player.radius + 14;
    const position = player.position.add(direction.clone().scale(spawnDistance));
    const bullet = this.bulletPool.obtain();
    bullet.spawn(player.id, position.x, position.y, direction, player.color, player.hasMega);

    this.bullets.push(bullet);
    this.lastShotAt[player.id] = time;
    this.muzzleFlash(position.x, position.y, player.color);
    audio.shoot();
  }

  private muzzleFlash(x: number, y: number, color: number): void {
    const flash = this.add.circle(x, y, 10, color, 0.9).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      duration: 150,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private hitRing(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 8, color, 0).setStrokeStyle(3, color, 0.9).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 240,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private cameraPunch(amount: number): void {
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1 + amount,
      duration: 60,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  private playerDeath(player: Player): void {
    this.spawnImpact(player.position.x, player.position.y, player.color, 30, 78);
    this.hitRing(player.position.x, player.position.y, player.color);
    this.cameras.main.flash(180, 255, 255, 255, false);
    this.cameras.main.shake(280, 0.014);
  }

  private updateBullets(deltaSeconds: number): void {
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index];

      bullet.update(deltaSeconds);

      if (bullet.isOutside(this.arenaBounds)) {
        this.bulletPool.release(bullet);
        this.bullets.splice(index, 1);
        continue;
      }

      if (this.hitsObstacle(bullet)) {
        this.spawnObstacleImpact(bullet.sprite.x, bullet.sprite.y);
        this.bulletPool.release(bullet);
        this.bullets.splice(index, 1);
      }
    }
  }

  private spawnObstacleImpact(x: number, y: number): void {
    const colors =
      this.selectedMap.id === "forest"
        ? [0x7dff72, 0xb6ff4d, 0x8a5a2b]
        : this.selectedMap.id === "volcano"
          ? [0xff6b2b, 0xff2b2b, 0xffe66d]
          : [0x28f0ff, 0xff3df2, 0x126fff];

    const flash = this.add.circle(x, y, 5, colors[0], 0.42).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 140,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });

    for (let index = 0; index < 5; index += 1) {
      const color = Phaser.Utils.Array.GetRandom(colors);
      const particle =
        this.selectedMap.id === "forest"
          ? this.add.ellipse(x, y, 4, 2, color, 0.48)
          : this.add.circle(x, y, 2, color, 0.72);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(8, 22);

      particle.setDepth(19).setBlendMode(this.selectedMap.id === "forest" ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
      particle.setRotation(angle);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: this.selectedMap.id === "forest" ? 0.6 : 0.2,
        duration: this.selectedMap.id === "volcano" ? 260 : 190,
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private checkBulletHits(): void {
    for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = this.bullets[bulletIndex];

      if (bullet.ownerId === "BOT" && this.checkBotBulletHit(bullet, bulletIndex)) {
        continue;
      }

      if (bullet.ownerId !== "BOT" && this.checkPlayerBulletHit(bullet, bulletIndex)) {
        continue;
      }
    }
  }

  private checkBotBulletHit(bullet: Bullet, bulletIndex: number): boolean {
    const target = this.players.find((player) => {
      const distance = Phaser.Math.Distance.Between(bullet.sprite.x, bullet.sprite.y, player.position.x, player.position.y);
      return distance <= player.radius + bullet.sprite.radius;
    });

    if (!target) {
      return false;
    }

    this.damageHumanTarget(target, bullet);
    this.bulletPool.release(bullet);
    this.bullets.splice(bulletIndex, 1);

    if (target.currentHealth <= 0) {
      const winner = this.getSurvivingHumanWinner(target);
      this.playerDeath(target);
      this.endRound(winner);
    }

    return true;
  }

  private checkPlayerBulletHit(bullet: Bullet, bulletIndex: number): boolean {
    const humanTarget = this.players.find((player) => {
      if (player.id === bullet.ownerId) {
        return false;
      }

      const distance = Phaser.Math.Distance.Between(bullet.sprite.x, bullet.sprite.y, player.position.x, player.position.y);
      return distance <= player.radius + bullet.sprite.radius;
    });

    if (humanTarget) {
      this.damageHumanTarget(humanTarget, bullet);
      this.bulletPool.release(bullet);
      this.bullets.splice(bulletIndex, 1);

      if (humanTarget.currentHealth <= 0) {
        const winner = this.players.find((player) => player.id === bullet.ownerId);

        if (winner) {
          this.playerDeath(humanTarget);
          this.endRound(winner);
        }
      }

      return true;
    }

    const botTarget = this.bots.find((bot) => {
      if (!bot.alive) {
        return false;
      }

      const distance = Phaser.Math.Distance.Between(bullet.sprite.x, bullet.sprite.y, bot.position.x, bot.position.y);
      return distance <= bot.radius + bullet.sprite.radius;
    });

    if (!botTarget) {
      return false;
    }

    botTarget.takeDamage(bullet.damage);
    audio.hit();
    this.spawnImpact(bullet.sprite.x, bullet.sprite.y, botTarget.color, bullet.mega ? 16 : 8, 34);
    this.showFloatingText(botTarget.position.x, botTarget.position.y - 42, `-${bullet.damage}`, "#ffe66d");
    this.bulletPool.release(bullet);
    this.bullets.splice(bulletIndex, 1);

    if (!botTarget.alive) {
      this.destroyBot(botTarget);
    }

    return true;
  }

  private damageHumanTarget(target: Player, bullet: Bullet): void {
    const hadShield = target.hasShield;
    const damageDealt = target.takeDamage(bullet.damage);

    if (hadShield) {
      audio.shieldHit();
    } else {
      audio.hit();
    }

    const impactColor = hadShield ? 0xffe66d : bullet.sprite.fillColor;
    this.spawnImpact(bullet.sprite.x, bullet.sprite.y, impactColor, bullet.mega ? 20 : 12);
    this.hitRing(bullet.sprite.x, bullet.sprite.y, impactColor);
    this.showFloatingText(target.position.x, target.position.y - 48, hadShield ? `SHIELD -${damageDealt}` : `-${damageDealt}`, hadShield ? "#ffe66d" : "#f4f7ff");
    this.cameras.main.shake(120, bullet.mega ? 0.008 : 0.004);
    this.cameraPunch(bullet.mega ? 0.03 : 0.016);
  }

  private destroyBot(bot: Bot): void {
    this.spawnImpact(bot.position.x, bot.position.y, bot.color, 18, 52);
    this.hitRing(bot.position.x, bot.position.y, bot.color);
    bot.destroy();
    this.bots = this.bots.filter((candidate) => candidate !== bot);
  }

  private getSurvivingHumanWinner(defeated: Player): Player {
    const survivor = this.players.find((player) => player.id !== defeated.id && player.currentHealth > 0);
    if (survivor) {
      return survivor;
    }

    const [playerOne, playerTwo] = this.players;
    return playerOne.currentHealth >= playerTwo.currentHealth ? playerOne : playerTwo;
  }

  private spawnImpact(x: number, y: number, color: number, count = 12, maxDistance = 48): void {
    for (let index = 0; index < count; index += 1) {
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.92);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(20, maxDistance);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 260,
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private updateHud(): void {
    const [playerOne, playerTwo] = this.players;

    if (!playerOne || !playerTwo) {
      return;
    }

    this.hud.update({
      p1Health: playerOne.currentHealth,
      p2Health: playerTwo.currentHealth,
      maxHealth: playerOne.maxHealth,
      p1Effects: playerOne.getActiveEffects(),
      p2Effects: playerTwo.getActiveEffects(),
      roundNumber: this.roundNumber,
      wins: this.roundWins,
      winsNeeded: this.winsNeeded,
      timeLeftMs: this.roundTimeLeftMs,
    });
  }

  private endRoundByTime(): void {
    if (this.roundPhase !== "playing") {
      return;
    }

    const [playerOne, playerTwo] = this.players;

    if (!playerOne || !playerTwo) {
      return;
    }

    if (playerOne.currentHealth === playerTwo.currentHealth) {
      this.roundPhase = "round-over";
      this.combatActive = false;
      this.clearRoundObjects();
      this.showDrawResult();
      return;
    }

    const winner = playerOne.currentHealth > playerTwo.currentHealth ? playerOne : playerTwo;
    this.endRound(winner);
  }

  private updatePowerupEffects(time: number): void {
    if (!this.activePowerup && time >= this.nextPowerupSpawnAt) {
      this.spawnPowerup();
    }

    if (!this.activePowerup) {
      return;
    }

    for (const player of this.players) {
      const distance = Phaser.Math.Distance.Between(
        player.position.x,
        player.position.y,
        this.activePowerup.position.x,
        this.activePowerup.position.y,
      );

      if (distance <= player.radius + this.activePowerup.radius) {
        this.applyPowerup(player, this.activePowerup);
        this.activePowerup.destroy();
        this.activePowerup = undefined;
        this.nextPowerupSpawnAt = time + Phaser.Math.Between(this.powerupRespawn.min, this.powerupRespawn.max);
        return;
      }
    }
  }

  private scheduleArenaEvent(time: number): void {
    this.arenaEventPhase = "idle";
    this.nextArenaEventAt = time + Phaser.Math.Between(12000, 15000);
    this.hud.setEventBanner("");
  }

  private updateArenaEvent(time: number): void {
    if (this.arenaEventPhase === "idle" && time >= this.nextArenaEventAt) {
      this.startArenaEventWarning();
    }

    if (this.arenaEventPhase === "active") {
      this.applyArenaEventEffects(time);
    }
  }

  private startArenaEventWarning(): void {
    this.clearArenaEvent();
    this.arenaEventPhase = "warning";
    this.hud.setEventBanner(this.getArenaEventBanner());
    this.createArenaEventZones(false);

    const timer = this.time.delayedCall(this.arenaEventWarningDuration, () => {
      if (this.roundPhase === "playing") {
        this.activateArenaEvent();
      }
    });

    this.arenaEventTimers.push(timer);
  }

  private activateArenaEvent(): void {
    this.arenaEventPhase = "active";
    this.arenaEventZones.forEach((zone) => {
      zone.visual.setAlpha(this.selectedMap.id === "forest" ? 0.42 : 0.72);
      zone.visual.setFillStyle(this.getArenaEventColor(), this.selectedMap.id === "forest" ? 0.34 : 0.48);
    });

    const timer = this.time.delayedCall(this.arenaEventActiveDuration, () => {
      this.clearArenaEvent();
      this.scheduleArenaEvent(this.time.now);
    });

    this.arenaEventTimers.push(timer);
  }

  private createArenaEventZones(isActive: boolean): void {
    const zones = this.getArenaEventBounds();

    this.arenaEventZones = zones.map((bounds) => {
      const visual = this.add.rectangle(
        bounds.centerX,
        bounds.centerY,
        bounds.width,
        bounds.height,
        this.getArenaEventColor(),
        isActive ? 0.45 : 0.16,
      ).setStrokeStyle(2, this.getArenaEventStrokeColor(), 0.9).setDepth(10);

      if (this.selectedMap.id === "cyber-core") {
        visual.setBlendMode(Phaser.BlendModes.ADD);
      }

      this.tweens.add({
        targets: visual,
        alpha: isActive ? 0.74 : 0.3,
        duration: 220,
        yoyo: true,
        repeat: -1,
      });

      return { bounds, visual };
    });
  }

  /**
   * Randomized hazard zones that are mirrored about the arena centre, so the
   * layout differs every event but is always symmetric — no player is ever
   * exposed to more danger than the other.
   */
  private getArenaEventBounds(): Phaser.Geom.Rectangle[] {
    const b = this.arenaBounds;
    const cx = b.centerX;
    const cy = b.centerY;
    const zones: Phaser.Geom.Rectangle[] = [];
    const centered = (x: number, y: number, w: number, h: number): Phaser.Geom.Rectangle =>
      new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h);
    // Point-mirror a zone to the opposite side of the arena for fairness.
    const addMirrored = (x: number, y: number, w: number, h: number): void => {
      zones.push(centered(x, y, w, h));
      zones.push(centered(2 * cx - x, 2 * cy - y, w, h));
    };

    if (this.selectedMap.id === "cyber-core") {
      // Glitch lasers: full-height vertical bars at mirrored random offsets.
      const pairs = Phaser.Math.Between(1, 2);
      for (let i = 0; i < pairs; i += 1) {
        const offset = Phaser.Math.Between(90, b.width / 2 - 70);
        zones.push(centered(cx - offset, cy, 18, b.height - 12));
        zones.push(centered(cx + offset, cy, 18, b.height - 12));
      }
      if (Phaser.Math.Between(0, 1) === 0) {
        zones.push(centered(cx, cy, 18, b.height - 12));
      }
      return zones;
    }

    if (this.selectedMap.id === "forest") {
      const pairs = Phaser.Math.Between(1, 2);
      for (let i = 0; i < pairs; i += 1) {
        const x = Phaser.Math.Between(b.left + 90, cx - 30);
        const y = Phaser.Math.Between(b.top + 70, b.bottom - 70);
        addMirrored(x, y, Phaser.Math.Between(120, 160), Phaser.Math.Between(48, 60));
      }
      return zones;
    }

    const pairs = Phaser.Math.Between(1, 2);
    for (let i = 0; i < pairs; i += 1) {
      const x = Phaser.Math.Between(b.left + 100, cx - 30);
      const y = Phaser.Math.Between(b.top + 80, b.bottom - 80);
      addMirrored(x, y, Phaser.Math.Between(150, 190), Phaser.Math.Between(24, 30));
    }
    return zones;
  }

  private applyArenaEventEffects(time: number): void {
    for (const player of this.players) {
      const playerBounds = new Phaser.Geom.Rectangle(
        player.position.x - player.radius,
        player.position.y - player.radius,
        player.radius * 2,
        player.radius * 2,
      );
      const isTouchingZone = this.arenaEventZones.some((zone) => Phaser.Geom.Intersects.RectangleToRectangle(zone.bounds, playerBounds));

      if (!isTouchingZone) {
        continue;
      }

      if (this.selectedMap.id === "forest") {
        player.applySlow(420, 0.48);

        if (time - this.lastEventDamageAt[player.id] >= this.arenaEventDamageCooldown) {
          this.lastEventDamageAt[player.id] = time;
          this.showFloatingText(player.position.x, player.position.y - 52, "ROOTED", "#7dff72");
        }

        continue;
      }

      if (time - this.lastEventDamageAt[player.id] < this.arenaEventDamageCooldown) {
        continue;
      }

      const damage = this.selectedMap.id === "volcano" ? 8 : 6;
      const finalDamage = player.takeDamage(damage);
      this.lastEventDamageAt[player.id] = time;
      this.spawnImpact(player.position.x, player.position.y, this.getArenaEventColor());
      this.showFloatingText(player.position.x, player.position.y - 52, player.hasShield ? `SHIELD -${finalDamage}` : `-${finalDamage}`, "#ffe66d");

      if (player.currentHealth <= 0) {
        const winner = this.players.find((candidate) => candidate.id !== player.id);

        if (winner) {
          this.playerDeath(player);
          this.endRound(winner);
        }
      }
    }
  }

  private clearArenaEvent(): void {
    this.arenaEventTimers.forEach((timer) => timer.remove(false));
    this.arenaEventTimers = [];
    this.arenaEventZones.forEach((zone) => {
      this.tweens.killTweensOf(zone.visual);
      zone.visual.destroy();
    });
    this.arenaEventZones = [];
    this.arenaEventPhase = "idle";
    this.hud.setEventBanner("");
  }

  private getArenaEventBanner(): string {
    if (this.selectedMap.id === "forest") {
      return "Root Surge Incoming";
    }

    if (this.selectedMap.id === "volcano") {
      return "Lava Surge Incoming";
    }

    return "Glitch Lasers Incoming";
  }

  private getArenaEventColor(): number {
    if (this.selectedMap.id === "forest") {
      return 0x7dff72;
    }

    if (this.selectedMap.id === "volcano") {
      return 0xff6b2b;
    }

    return 0x28f0ff;
  }

  private getArenaEventStrokeColor(): number {
    if (this.selectedMap.id === "forest") {
      return 0xffe66d;
    }

    if (this.selectedMap.id === "volcano") {
      return 0xff2b2b;
    }

    return 0xff3df2;
  }

  private spawnPowerup(): void {
    const types: PowerupType[] = ["health-core", "shield-bubble", "speed-surge", "mega-shot"];
    const type = Phaser.Utils.Array.GetRandom(types);
    const position = this.getFairPowerupPosition();

    this.activePowerup = new Powerup(this, type, position.x, position.y);
  }

  private isSafePowerupSpot(position: Phaser.Math.Vector2): boolean {
    const padding = 58;
    const b = this.arenaBounds;

    if (
      position.x < b.left + padding ||
      position.x > b.right - padding ||
      position.y < b.top + padding ||
      position.y > b.bottom - padding
    ) {
      return false;
    }

    const safeFromPlayers = this.players.every((player) => Phaser.Math.Distance.Between(
      position.x,
      position.y,
      player.position.x,
      player.position.y,
    ) > 120);
    const safeFromBots = this.bots.every((bot) => Phaser.Math.Distance.Between(
      position.x,
      position.y,
      bot.position.x,
      bot.position.y,
    ) > 90);
    const safeFromObstacles = this.obstacles.every((rect) => {
      const inflated = new Phaser.Geom.Rectangle(rect.x - 40, rect.y - 40, rect.width + 80, rect.height + 80);
      return !inflated.contains(position.x, position.y);
    });

    return safeFromPlayers && safeFromBots && safeFromObstacles;
  }

  /**
   * Spawn on the perpendicular bisector between the two players: every such
   * point is exactly equidistant from both, so a pickup is always a fair race.
   * Falls back to a random safe spot only if no fair spot is reachable.
   */
  private getFairPowerupPosition(): Phaser.Math.Vector2 {
    const [playerOne, playerTwo] = this.players;

    if (playerOne && playerTwo) {
      const mid = new Phaser.Math.Vector2(
        (playerOne.position.x + playerTwo.position.x) / 2,
        (playerOne.position.y + playerTwo.position.y) / 2,
      );
      const between = new Phaser.Math.Vector2(
        playerTwo.position.x - playerOne.position.x,
        playerTwo.position.y - playerOne.position.y,
      );

      if (between.lengthSq() > 1) {
        const perp = new Phaser.Math.Vector2(-between.y, between.x).normalize();

        for (let attempt = 0; attempt < 22; attempt += 1) {
          const reach = Phaser.Math.Between(40, 240) * (Phaser.Math.Between(0, 1) === 0 ? -1 : 1);
          const candidate = new Phaser.Math.Vector2(mid.x + perp.x * reach, mid.y + perp.y * reach);

          if (this.isSafePowerupSpot(candidate)) {
            return candidate;
          }
        }

        if (this.isSafePowerupSpot(mid)) {
          return mid;
        }
      }
    }

    return this.getSafePowerupPosition();
  }

  private getSafePowerupPosition(): Phaser.Math.Vector2 {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const position = new Phaser.Math.Vector2(
        Phaser.Math.Between(this.arenaBounds.left + 58, this.arenaBounds.right - 58),
        Phaser.Math.Between(this.arenaBounds.top + 58, this.arenaBounds.bottom - 58),
      );

      if (this.isSafePowerupSpot(position)) {
        return position;
      }
    }

    const fallbackPositions = [
      new Phaser.Math.Vector2(this.arenaBounds.centerX, this.arenaBounds.centerY),
      new Phaser.Math.Vector2(this.arenaBounds.left + 116, this.arenaBounds.top + 116),
      new Phaser.Math.Vector2(this.arenaBounds.right - 116, this.arenaBounds.top + 116),
      new Phaser.Math.Vector2(this.arenaBounds.left + 116, this.arenaBounds.bottom - 116),
      new Phaser.Math.Vector2(this.arenaBounds.right - 116, this.arenaBounds.bottom - 116),
    ];

    return fallbackPositions.find((position) => this.isSafePowerupSpot(position)) ?? fallbackPositions[0];
  }

  private applyPowerup(player: Player, powerup: Powerup): void {
    if (powerup.type === "health-core") {
      player.heal(this.healthRestoreAmount);
      this.showFloatingText(player.position.x, player.position.y - 52, "+25 HP", "#b6ff4d");
      this.spawnImpact(player.position.x, player.position.y, 0xb6ff4d);
      audio.powerupHealth();
      return;
    }

    if (powerup.type === "speed-surge") {
      player.activateSpeed(this.speedDuration);
      this.showFloatingText(player.position.x, player.position.y - 52, "SPEED!", "#b6ff4d");
      this.spawnImpact(player.position.x, player.position.y, 0xb6ff4d);
      audio.powerupHealth();
      return;
    }

    if (powerup.type === "mega-shot") {
      player.activateMega(this.megaDuration);
      this.showFloatingText(player.position.x, player.position.y - 52, "MEGA SHOT!", "#ff6b2b");
      this.spawnImpact(player.position.x, player.position.y, 0xff6b2b);
      audio.powerupShield();
      return;
    }

    player.activateShield(this.shieldDuration);
    this.showFloatingText(player.position.x, player.position.y - 52, "SHIELD", "#ffe66d");
    this.spawnImpact(player.position.x, player.position.y, 0x28f0ff);
    audio.powerupShield();
  }

  private clearPowerups(): void {
    this.activePowerup?.destroy();
    this.activePowerup = undefined;
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, titleStyle(18, color))
      .setOrigin(0.5)
      .setDepth(30);

    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 760,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private endRound(winner: Player): void {
    if (this.roundPhase === "round-over") {
      return;
    }

    this.roundPhase = "round-over";
    this.combatActive = false;
    this.roundWins[winner.id] += 1;
    this.clearRoundObjects();

    if (this.roundWins[winner.id] >= this.winsNeeded) {
      this.time.delayedCall(650, () => {
        this.cameras.main.fadeOut(360, 5, 7, 18);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.start(SCENE_KEYS.WINNER, {
            winnerId: winner.id,
            mapId: this.selectedMap.id,
            gameMode: this.gameMode,
            botCount: this.botCount,
            score: { ...this.roundWins },
          });
        });
      });
      return;
    }

    this.showRoundResult(winner);
  }

  private showRoundResult(winner: Player): void {
    const accent = winner.id === "P1" ? HEX.cyan : HEX.pink;
    this.buildResultOverlay(
      winner.color,
      winner.id === "P1" ? "PLAYER 1 WINS ROUND" : "PLAYER 2 WINS ROUND",
      accent,
    );
  }

  private showDrawResult(): void {
    this.buildResultOverlay(0xb6ff4d, "ROUND DRAW", HEX.lime);
  }

  private buildResultOverlay(strokeColor: number, titleText: string, titleColor: string): void {
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 190, 0x030712, 0.9)
      .setStrokeStyle(2, strokeColor, 0.85)
      .setDepth(45);
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, titleText, titleStyle(34, titleColor))
      .setOrigin(0.5)
      .setDepth(46);
    const score = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 8,
        `MATCH SCORE   P1  ${this.roundWins.P1} - ${this.roundWins.P2}  P2`,
        bodyStyle(20, HEX.text, "700"),
      )
      .setOrigin(0.5)
      .setDepth(46);
    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 54, "PRESS ENTER FOR NEXT ROUND", bodyStyle(20, HEX.lime, "700"))
      .setOrigin(0.5)
      .setDepth(46);

    audio.roundWin();
    this.tweens.add({ targets: prompt, alpha: 0.45, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    panel.setScale(0.85);
    this.tweens.add({ targets: panel, scale: 1, duration: 320, ease: "Back.easeOut" });

    this.roundOverlayObjects = [panel, title, score, prompt];

    this.input.keyboard?.once("keydown-ENTER", () => {
      this.roundNumber += 1;
      this.resetRound();
    });
  }
}
