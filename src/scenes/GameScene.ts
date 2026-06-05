import Phaser from "phaser";
import { getArenaMap, type ArenaMap, type ArenaMapId } from "../config/maps";
import { Bullet } from "../entities/Bullet";
import { Player } from "../entities/Player";
import { Powerup, type PowerupType } from "../entities/Powerup";
import { ARENA_BOUNDS, COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../utils/constants";

type GameSceneData = {
  mapId?: ArenaMapId;
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
  private bullets: Bullet[] = [];
  private arenaBounds = new Phaser.Geom.Rectangle(ARENA_BOUNDS.x, ARENA_BOUNDS.y, ARENA_BOUNDS.width, ARENA_BOUNDS.height);
  private playerOneHealthBar?: Phaser.GameObjects.Rectangle;
  private playerTwoHealthBar?: Phaser.GameObjects.Rectangle;
  private playerOneHealthText?: Phaser.GameObjects.Text;
  private playerTwoHealthText?: Phaser.GameObjects.Text;
  private playerOneShieldText?: Phaser.GameObjects.Text;
  private playerTwoShieldText?: Phaser.GameObjects.Text;
  private roundTitleText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private eventBannerText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
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

  private readonly shootCooldown = 260;
  private readonly healthRestoreAmount = 25;
  private readonly shieldDuration = 5000;
  private readonly powerupRespawnDelay = 1700;
  private readonly arenaEventWarningDuration = 1000;
  private readonly arenaEventActiveDuration = 2200;
  private readonly arenaEventDamageCooldown = 650;

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  init(data: GameSceneData): void {
    this.selectedMap = getArenaMap(data.mapId ?? "cyber-core");
  }

  create(): void {
    this.players = [];
    this.bullets = [];
    this.clearPowerups();
    this.lastShotAt = { P1: -Infinity, P2: -Infinity };
    this.lastEventDamageAt = { P1: -Infinity, P2: -Infinity };
    this.nextPowerupSpawnAt = Number.POSITIVE_INFINITY;
    this.nextArenaEventAt = Number.POSITIVE_INFINITY;
    this.combatActive = false;
    this.roundPhase = "countdown";
    this.roundNumber = 1;
    this.roundWins = { P1: 0, P2: 0 };
    this.drawArena();
    this.drawHud();
    this.createPlayers();
    this.createAttackKeys();
    this.startCountdown();

    this.input.keyboard?.on("keydown-R", () => {
      this.resetMatch();
    });
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;

    if (this.combatActive && this.roundPhase === "playing") {
      this.players.forEach((player) => player.update(deltaSeconds));
      this.updateShooting(_time);
      this.updateBullets(deltaSeconds);
      this.checkBulletHits();
      this.updatePowerupEffects(_time);
      this.updateArenaEvent(_time);
    }

    this.updateHud();
  }

  private drawArena(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, ARENA_BOUNDS.width, ARENA_BOUNDS.height, this.selectedMap.floorColor, 0.94).setStrokeStyle(4, this.selectedMap.accentColor, 0.88);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, ARENA_BOUNDS.width - 42, ARENA_BOUNDS.height - 42).setStrokeStyle(2, this.selectedMap.secondaryColor, 0.55);

    const grid = this.add.graphics();
    grid.lineStyle(1, this.selectedMap.gridColor, 0.16);

    for (let x = ARENA_BOUNDS.x + 24; x <= ARENA_BOUNDS.x + ARENA_BOUNDS.width - 24; x += 48) {
      grid.moveTo(x, ARENA_BOUNDS.y);
      grid.lineTo(x, ARENA_BOUNDS.y + ARENA_BOUNDS.height);
    }

    for (let y = ARENA_BOUNDS.y; y <= ARENA_BOUNDS.y + ARENA_BOUNDS.height; y += 48) {
      grid.moveTo(ARENA_BOUNDS.x, y);
      grid.lineTo(ARENA_BOUNDS.x + ARENA_BOUNDS.width, y);
    }

    grid.strokePath();
    this.drawThemeAccents();
  }

  private drawThemeAccents(): void {
    const accents = this.add.graphics();
    accents.lineStyle(4, this.selectedMap.secondaryColor, 0.78);

    if (this.selectedMap.id === "volcano") {
      accents.lineBetween(230, 145, 306, 236);
      accents.lineBetween(306, 236, 276, 322);
      accents.lineBetween(672, 128, 604, 228);
      accents.lineBetween(604, 228, 682, 348);
    } else if (this.selectedMap.id === "forest") {
      accents.strokeCircle(196, 160, 28);
      accents.strokeCircle(744, 170, 24);
      accents.strokeCircle(266, 382, 22);
      accents.strokeCircle(710, 366, 30);
    } else {
      accents.strokeRect(128, 104, 88, 28);
      accents.strokeRect(744, 408, 88, 28);
      accents.lineBetween(290, 104, 366, 144);
      accents.lineBetween(594, 396, 670, 436);
    }
  }

  private drawHud(): void {
    this.add.rectangle(180, 42, 270, 58, 0x050814, 0.86).setStrokeStyle(2, 0x28f0ff, 0.55);
    this.add.rectangle(780, 42, 270, 58, 0x050814, 0.86).setStrokeStyle(2, 0xff3df2, 0.55);
    this.add.rectangle(GAME_WIDTH / 2, 42, 288, 64, 0x050814, 0.86).setStrokeStyle(2, this.selectedMap.accentColor, 0.6);

    this.add.text(58, 26, "PLAYER 1", { color: "#28f0ff", fontFamily: "Arial", fontSize: "15px", fontStyle: "800" });
    this.add.rectangle(180, 58, 218, 12, 0x01030c, 0.9).setStrokeStyle(1, 0xffffff, 0.18);
    this.playerOneHealthBar = this.add.rectangle(71, 58, 218, 12, 0x28f0ff, 1).setOrigin(0, 0.5);
    this.playerOneHealthText = this.add.text(58, 49, "100 / 100", { color: "#f4f7ff", fontFamily: "Arial", fontSize: "14px" });
    this.playerOneShieldText = this.add.text(58, 68, "", { color: "#ffe66d", fontFamily: "Arial", fontSize: "12px", fontStyle: "800" });
    this.add.text(830, 26, "PLAYER 2", { color: "#ff3df2", fontFamily: "Arial", fontSize: "15px", fontStyle: "800" }).setOrigin(1, 0);
    this.add.rectangle(780, 58, 218, 12, 0x01030c, 0.9).setStrokeStyle(1, 0xffffff, 0.18);
    this.playerTwoHealthBar = this.add.rectangle(889, 58, 218, 12, 0xff3df2, 1).setOrigin(1, 0.5);
    this.playerTwoHealthText = this.add.text(830, 49, "100 / 100", { color: "#f4f7ff", fontFamily: "Arial", fontSize: "14px" }).setOrigin(1, 0);
    this.playerTwoShieldText = this.add.text(830, 68, "", { color: "#ffe66d", fontFamily: "Arial", fontSize: "12px", fontStyle: "800" }).setOrigin(1, 0);

    this.roundTitleText = this.add.text(GAME_WIDTH / 2, 28, "Round 1", { color: "#f4f7ff", fontFamily: "Arial", fontSize: "18px", fontStyle: "900" }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 52, this.selectedMap.name, { color: "#b6ff4d", fontFamily: "Arial", fontSize: "13px" }).setOrigin(0.5);
    this.scoreText = this.add.text(GAME_WIDTH / 2, 70, "P1 0 - 0 P2 | Last Player Standing", {
      color: "#9aa6c8",
      fontFamily: "Arial",
      fontSize: "11px",
      fontStyle: "700",
    }).setOrigin(0.5);
    this.eventBannerText = this.add.text(GAME_WIDTH / 2, 92, "", {
      color: "#ffe66d",
      fontFamily: "Arial",
      fontSize: "13px",
      fontStyle: "900",
    }).setOrigin(0.5);
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

    this.add.text(GAME_WIDTH / 2, 494, "P1: WASD + Space    P2: Arrow Keys + Enter / Shift", {
      color: "#9aa6c8",
      fontFamily: "Arial",
      fontSize: "15px",
    }).setOrigin(0.5);
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
    this.countdownText?.destroy();
    this.countdownText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "3", {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "88px",
      fontStyle: "900",
    }).setOrigin(0.5).setDepth(50).setShadow(0, 0, "#28f0ff", 18);

    const steps = ["3", "2", "1", "DUEL!"];

    steps.forEach((step, index) => {
      this.time.delayedCall(index * 760, () => {
        if (!this.countdownText) {
          return;
        }

        this.countdownText.setText(step);
        this.countdownText.setScale(step === "DUEL!" ? 0.7 : 1);
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
    this.nextPowerupSpawnAt = this.time.now + 1000;
    this.scheduleArenaEvent(this.time.now);
    this.lastShotAt = { P1: -Infinity, P2: -Infinity };
  }

  private resetRound(): void {
    this.clearRoundObjects();
    this.players.forEach((player) => player.resetForRound());
    this.lastShotAt = { P1: -Infinity, P2: -Infinity };
    this.nextPowerupSpawnAt = Number.POSITIVE_INFINITY;
    this.nextArenaEventAt = Number.POSITIVE_INFINITY;
    this.lastEventDamageAt = { P1: -Infinity, P2: -Infinity };
    this.combatActive = false;
    this.startCountdown();
  }

  private resetMatch(): void {
    this.scene.restart({ mapId: this.selectedMap.id });
  }

  private clearRoundObjects(): void {
    this.bullets.forEach((bullet) => bullet.destroy());
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

  private updateShooting(time: number): void {
    const [playerOne, playerTwo] = this.players;

    if (playerOne && this.playerOneAttack?.isDown) {
      this.tryShoot(playerOne, time);
    }

    if (playerTwo && (this.playerTwoEnterAttack?.isDown || this.playerTwoShiftAttack?.isDown)) {
      this.tryShoot(playerTwo, time);
    }
  }

  private tryShoot(player: Player, time: number): void {
    if (time - this.lastShotAt[player.id] < this.shootCooldown) {
      return;
    }

    const direction = player.facingDirection;
    const spawnDistance = player.radius + 14;
    const position = player.position.add(direction.clone().scale(spawnDistance));
    const bullet = new Bullet(this, player.id, position.x, position.y, direction, player.color);

    this.bullets.push(bullet);
    this.lastShotAt[player.id] = time;
  }

  private updateBullets(deltaSeconds: number): void {
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index];

      bullet.update(deltaSeconds);

      if (bullet.isOutside(this.arenaBounds)) {
        bullet.destroy();
        this.bullets.splice(index, 1);
      }
    }
  }

  private checkBulletHits(): void {
    for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = this.bullets[bulletIndex];
      const target = this.players.find((player) => player.id !== bullet.ownerId);

      if (!target) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(bullet.sprite.x, bullet.sprite.y, target.position.x, target.position.y);

      if (distance > target.radius + bullet.sprite.radius) {
        continue;
      }

      const hadShield = target.hasShield;
      const damageDealt = target.takeDamage(bullet.damage);

      this.spawnImpact(bullet.sprite.x, bullet.sprite.y, hadShield ? 0xffe66d : bullet.sprite.fillColor);
      this.showFloatingText(target.position.x, target.position.y - 48, hadShield ? `SHIELD -${damageDealt}` : `-${damageDealt}`, hadShield ? "#ffe66d" : "#f4f7ff");
      this.cameras.main.shake(120, 0.004);
      bullet.destroy();
      this.bullets.splice(bulletIndex, 1);

      if (target.currentHealth <= 0) {
        const winner = this.players.find((player) => player.id === bullet.ownerId);

        if (winner) {
          this.endRound(winner);
        }
      }
    }
  }

  private spawnImpact(x: number, y: number, color: number): void {
    for (let index = 0; index < 12; index += 1) {
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.92);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(20, 48);

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

    if (playerOne && this.playerOneHealthBar && this.playerOneHealthText) {
      this.playerOneHealthBar.width = 218 * (playerOne.currentHealth / playerOne.maxHealth);
      this.playerOneHealthText.setText(`${playerOne.currentHealth} / ${playerOne.maxHealth}`);
      this.playerOneShieldText?.setText(playerOne.hasShield ? `SHIELD ${Math.ceil(playerOne.getShieldTimeLeft() / 1000)}s` : "");
    }

    if (playerTwo && this.playerTwoHealthBar && this.playerTwoHealthText) {
      this.playerTwoHealthBar.width = 218 * (playerTwo.currentHealth / playerTwo.maxHealth);
      this.playerTwoHealthText.setText(`${playerTwo.currentHealth} / ${playerTwo.maxHealth}`);
      this.playerTwoShieldText?.setText(playerTwo.hasShield ? `SHIELD ${Math.ceil(playerTwo.getShieldTimeLeft() / 1000)}s` : "");
    }

    this.roundTitleText?.setText(`Round ${this.roundNumber}`);
    this.scoreText?.setText(`P1 ${this.roundWins.P1} - ${this.roundWins.P2} P2 | Last Player Standing`);
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
        this.nextPowerupSpawnAt = time + this.powerupRespawnDelay;
        return;
      }
    }
  }

  private scheduleArenaEvent(time: number): void {
    this.arenaEventPhase = "idle";
    this.nextArenaEventAt = time + Phaser.Math.Between(12000, 15000);
    this.eventBannerText?.setText("");
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
    this.eventBannerText?.setText(this.getArenaEventBanner());
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

  private getArenaEventBounds(): Phaser.Geom.Rectangle[] {
    if (this.selectedMap.id === "cyber-core") {
      return [
        new Phaser.Geom.Rectangle(this.arenaBounds.left + 110, this.arenaBounds.top, 18, this.arenaBounds.height),
        new Phaser.Geom.Rectangle(this.arenaBounds.centerX - 9, this.arenaBounds.top, 18, this.arenaBounds.height),
        new Phaser.Geom.Rectangle(this.arenaBounds.right - 128, this.arenaBounds.top, 18, this.arenaBounds.height),
      ];
    }

    if (this.selectedMap.id === "forest") {
      return [
        new Phaser.Geom.Rectangle(this.arenaBounds.left + 96, this.arenaBounds.top + 72, 150, 54),
        new Phaser.Geom.Rectangle(this.arenaBounds.centerX - 72, this.arenaBounds.centerY + 38, 144, 56),
        new Phaser.Geom.Rectangle(this.arenaBounds.right - 246, this.arenaBounds.top + 224, 154, 54),
      ];
    }

    return [
      new Phaser.Geom.Rectangle(this.arenaBounds.left + 132, this.arenaBounds.top + 88, 178, 26),
      new Phaser.Geom.Rectangle(this.arenaBounds.centerX - 96, this.arenaBounds.centerY + 72, 192, 28),
      new Phaser.Geom.Rectangle(this.arenaBounds.right - 286, this.arenaBounds.top + 248, 174, 26),
    ];
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
    this.eventBannerText?.setText("");
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
    const type: PowerupType = Math.random() > 0.5 ? "health-core" : "shield-bubble";
    const position = this.getSafePowerupPosition();

    this.activePowerup = new Powerup(this, type, position.x, position.y);
  }

  private getSafePowerupPosition(): Phaser.Math.Vector2 {
    const padding = 58;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const position = new Phaser.Math.Vector2(
        Phaser.Math.Between(this.arenaBounds.left + padding, this.arenaBounds.right - padding),
        Phaser.Math.Between(this.arenaBounds.top + padding, this.arenaBounds.bottom - padding),
      );
      const safeFromPlayers = this.players.every((player) => Phaser.Math.Distance.Between(
        position.x,
        position.y,
        player.position.x,
        player.position.y,
      ) > 120);

      if (safeFromPlayers) {
        return position;
      }
    }

    return new Phaser.Math.Vector2(this.arenaBounds.centerX, this.arenaBounds.centerY);
  }

  private applyPowerup(player: Player, powerup: Powerup): void {
    if (powerup.type === "health-core") {
      player.heal(this.healthRestoreAmount);
      this.showFloatingText(player.position.x, player.position.y - 52, "+25 HP", "#b6ff4d");
      this.spawnImpact(player.position.x, player.position.y, 0xb6ff4d);
      return;
    }

    player.activateShield(this.shieldDuration);
    this.showFloatingText(player.position.x, player.position.y - 52, "SHIELD", "#ffe66d");
    this.spawnImpact(player.position.x, player.position.y, 0x28f0ff);
  }

  private clearPowerups(): void {
    this.activePowerup?.destroy();
    this.activePowerup = undefined;
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const label = this.add.text(x, y, text, {
      color,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "18px",
      fontStyle: "900",
    }).setOrigin(0.5).setDepth(30);

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

    if (this.roundWins[winner.id] >= 2) {
      this.time.delayedCall(500, () => {
        this.scene.start(SCENE_KEYS.WINNER, {
          winnerId: winner.id,
          mapId: this.selectedMap.id,
          score: { ...this.roundWins },
        });
      });
      return;
    }

    this.showRoundResult(winner);
  }

  private showRoundResult(winner: Player): void {
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 178, 0x030712, 0.88)
      .setStrokeStyle(2, winner.color, 0.8)
      .setDepth(45);
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 38, winner.id === "P1" ? "Player 1 Wins Round!" : "Player 2 Wins Round!", {
      color: winner.id === "P1" ? "#28f0ff" : "#ff3df2",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "34px",
      fontStyle: "900",
    }).setOrigin(0.5).setDepth(46);
    const score = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8, `Match Score: P1 ${this.roundWins.P1} - ${this.roundWins.P2} P2`, {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "18px",
      fontStyle: "800",
    }).setOrigin(0.5).setDepth(46);
    const prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 52, "Press Enter for Next Round", {
      color: "#b6ff4d",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "20px",
      fontStyle: "900",
    }).setOrigin(0.5).setDepth(46);

    this.roundOverlayObjects = [panel, title, score, prompt];

    this.input.keyboard?.once("keydown-ENTER", () => {
      this.roundNumber += 1;
      this.resetRound();
    });
  }
}
