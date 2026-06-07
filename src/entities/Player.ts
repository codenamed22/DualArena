import Phaser from "phaser";

export type PlayerId = "P1" | "P2";

export type PlayerControls = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

/** A timed buff currently affecting the player, surfaced to the HUD as a chip. */
export type ActiveEffect = {
  id: string;
  label: string;
  color: number;
  secondsLeft: number;
};

type PlayerConfig = {
  id: PlayerId;
  x: number;
  y: number;
  color: number;
  accentColor: number;
  labelColor: string;
  controls: PlayerControls;
  bounds: Phaser.Geom.Rectangle;
};

export class Player {
  readonly id: PlayerId;
  readonly color: number;
  readonly container: Phaser.GameObjects.Container;
  readonly maxHealth = 100;

  private readonly body: Phaser.GameObjects.Arc;
  private readonly facingIndicator: Phaser.GameObjects.Triangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly shieldAura: Phaser.GameObjects.Arc;
  private readonly controls: PlayerControls;
  private readonly bounds: Phaser.Geom.Rectangle;
  private readonly speed = 245;
  private readonly accentColor: number;
  private readonly spawnPosition: Phaser.Math.Vector2;
  private readonly spawnFacing: Phaser.Math.Vector2;
  private facing = new Phaser.Math.Vector2(1, 0);
  private obstacles: Phaser.Geom.Rectangle[] = [];
  private health = this.maxHealth;
  private shieldUntil = 0;
  private slowUntil = 0;
  private slowMultiplier = 1;
  private speedUntil = 0;
  private megaUntil = 0;
  private readonly speedBoostMultiplier = 1.6;

  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    this.id = config.id;
    this.color = config.color;
    this.accentColor = config.accentColor;
    this.controls = config.controls;
    this.bounds = config.bounds;
    this.spawnPosition = new Phaser.Math.Vector2(config.x, config.y);
    this.spawnFacing = new Phaser.Math.Vector2(config.id === "P1" ? 1 : -1, 0);
    this.facing = this.spawnFacing.clone();

    const shadow = scene.add.ellipse(0, 30, 42, 12, 0x000000, 0.28);
    this.body = scene.add.circle(0, 0, 22, config.color, 0.95).setStrokeStyle(3, config.accentColor, 1);
    const highlight = scene.add.circle(-7, -8, 9, 0xffffff, 0.18);

    this.facingIndicator = scene.add.triangle(31, 0, 0, -9, 18, 0, 0, 9, config.accentColor, 1);
    this.shieldAura = scene.add.circle(0, 0, 34, 0x28f0ff, 0.08).setStrokeStyle(3, 0xffe66d, 0.86);
    this.shieldAura.setVisible(false);
    this.label = scene.add.text(0, -44, config.id, {
      color: config.labelColor,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "16px",
      fontStyle: "900",
    }).setOrigin(0.5);

    this.container = scene.add.container(config.x, config.y, [
      shadow,
      this.body,
      highlight,
      this.facingIndicator,
      this.shieldAura,
      this.label,
    ]);

    this.container.setDepth(20);
    this.facingIndicator.rotation = this.facing.angle();
  }

  setObstacles(obstacles: Phaser.Geom.Rectangle[]): void {
    this.obstacles = obstacles;
  }

  pushOutOfObstacle(rect: Phaser.Geom.Rectangle): void {
    if (!this.overlapsRect(this.container.x, this.container.y, rect)) {
      return;
    }

    const closestX = Phaser.Math.Clamp(this.container.x, rect.left, rect.right);
    const closestY = Phaser.Math.Clamp(this.container.y, rect.top, rect.bottom);
    let dx = this.container.x - closestX;
    let dy = this.container.y - closestY;
    let distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      const leftGap = Math.abs(this.container.x - rect.left);
      const rightGap = Math.abs(rect.right - this.container.x);
      const topGap = Math.abs(this.container.y - rect.top);
      const bottomGap = Math.abs(rect.bottom - this.container.y);
      const minGap = Math.min(leftGap, rightGap, topGap, bottomGap);

      if (minGap === leftGap) {
        dx = -1;
      } else if (minGap === rightGap) {
        dx = 1;
      } else if (minGap === topGap) {
        dy = -1;
      } else {
        dy = 1;
      }

      distance = 1;
    }

    const overlap = this.radius - distance + 1;
    this.container.x += (dx / distance) * overlap;
    this.container.y += (dy / distance) * overlap;
    this.container.x = Phaser.Math.Clamp(this.container.x, this.bounds.left + 24, this.bounds.right - 24);
    this.container.y = Phaser.Math.Clamp(this.container.y, this.bounds.top + 24, this.bounds.bottom - 24);
  }

  update(deltaSeconds: number): void {
    const movement = this.getMovementVector();

    if (movement.lengthSq() > 0) {
      movement.normalize();
      this.facing = movement.clone();
      const now = this.body.scene.time.now;
      const slowFactor = this.slowUntil > now ? this.slowMultiplier : 1;
      const boostFactor = this.speedUntil > now ? this.speedBoostMultiplier : 1;
      const step = this.speed * slowFactor * boostFactor * deltaSeconds;

      // Move and resolve collisions per-axis so players slide along cover.
      this.moveAxis("x", movement.x * step);
      this.moveAxis("y", movement.y * step);
      this.facingIndicator.rotation = this.facing.angle();
    }

    this.container.x = Phaser.Math.Clamp(this.container.x, this.bounds.left + 24, this.bounds.right - 24);
    this.container.y = Phaser.Math.Clamp(this.container.y, this.bounds.top + 24, this.bounds.bottom - 24);

    this.updateShieldVisual();
  }

  private moveAxis(axis: "x" | "y", delta: number): void {
    if (delta === 0) {
      return;
    }

    const container = this.container;
    if (axis === "x") {
      container.x += delta;
    } else {
      container.y += delta;
    }

    for (const rect of this.obstacles) {
      if (!this.overlapsRect(container.x, container.y, rect)) {
        continue;
      }

      if (axis === "x") {
        container.x = delta > 0 ? rect.left - this.radius : rect.right + this.radius;
      } else {
        container.y = delta > 0 ? rect.top - this.radius : rect.bottom + this.radius;
      }
    }
  }

  private overlapsRect(cx: number, cy: number, rect: Phaser.Geom.Rectangle): boolean {
    const closestX = Phaser.Math.Clamp(cx, rect.left, rect.right);
    const closestY = Phaser.Math.Clamp(cy, rect.top, rect.bottom);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < this.radius * this.radius;
  }

  get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.container.x, this.container.y);
  }

  get facingDirection(): Phaser.Math.Vector2 {
    return this.facing.clone();
  }

  get currentHealth(): number {
    return this.health;
  }

  get hasShield(): boolean {
    return this.shieldUntil > this.body.scene.time.now;
  }

  get radius(): number {
    return 22;
  }

  takeDamage(amount: number): number {
    const finalDamage = this.hasShield ? Math.ceil(amount * 0.25) : amount;

    this.health = Math.max(this.health - finalDamage, 0);
    this.flash();
    return finalDamage;
  }

  heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  activateShield(durationMs: number): void {
    this.shieldUntil = this.body.scene.time.now + durationMs;
    this.updateShieldVisual();
  }

  activateSpeed(durationMs: number): void {
    this.speedUntil = this.body.scene.time.now + durationMs;
  }

  activateMega(durationMs: number): void {
    this.megaUntil = this.body.scene.time.now + durationMs;
  }

  get hasSpeed(): boolean {
    return this.speedUntil > this.body.scene.time.now;
  }

  get hasMega(): boolean {
    return this.megaUntil > this.body.scene.time.now;
  }

  applySlow(durationMs: number, multiplier: number): void {
    this.slowUntil = this.body.scene.time.now + durationMs;
    this.slowMultiplier = multiplier;
  }

  resetForRound(): void {
    this.container.setPosition(this.spawnPosition.x, this.spawnPosition.y);
    this.facing = this.spawnFacing.clone();
    this.facingIndicator.rotation = this.facing.angle();
    this.health = this.maxHealth;
    this.shieldUntil = 0;
    this.slowUntil = 0;
    this.slowMultiplier = 1;
    this.speedUntil = 0;
    this.megaUntil = 0;
    this.body.setFillStyle(this.color, 0.95);
    this.body.setStrokeStyle(3, this.accentColor, 1);
    this.updateShieldVisual();
  }

  getShieldTimeLeft(): number {
    return Math.max(this.shieldUntil - this.body.scene.time.now, 0);
  }

  /** Active timed buffs, newest-relevant first, for HUD chip rendering. */
  getActiveEffects(): ActiveEffect[] {
    const effects: ActiveEffect[] = [];

    if (this.hasShield) {
      effects.push({
        id: "shield",
        label: "SHIELD",
        color: 0xffe66d,
        secondsLeft: Math.ceil(this.getShieldTimeLeft() / 1000),
      });
    }

    if (this.hasSpeed) {
      effects.push({
        id: "speed",
        label: "SPEED",
        color: 0xb6ff4d,
        secondsLeft: Math.ceil((this.speedUntil - this.body.scene.time.now) / 1000),
      });
    }

    if (this.hasMega) {
      effects.push({
        id: "mega",
        label: "MEGA",
        color: 0xff6b2b,
        secondsLeft: Math.ceil((this.megaUntil - this.body.scene.time.now) / 1000),
      });
    }

    return effects;
  }

  private flash(): void {
    this.body.setFillStyle(this.hasShield ? 0xffe66d : 0xffffff, 1);

    this.body.scene.time.delayedCall(90, () => {
      this.body.setFillStyle(this.color, 0.95);
      this.body.setStrokeStyle(3, this.accentColor, 1);
    });
  }

  private updateShieldVisual(): void {
    const isShielded = this.hasShield;

    this.shieldAura.setVisible(isShielded);
    this.label.setText(isShielded ? `${this.id} SHIELD` : this.id);

    if (isShielded) {
      this.shieldAura.setScale(1 + Math.sin(this.body.scene.time.now / 120) * 0.05);
    }
  }

  private getMovementVector(): Phaser.Math.Vector2 {
    const x = Number(this.controls.right.isDown) - Number(this.controls.left.isDown);
    const y = Number(this.controls.down.isDown) - Number(this.controls.up.isDown);

    return new Phaser.Math.Vector2(x, y);
  }
}
