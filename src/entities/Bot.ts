import Phaser from "phaser";
import type { Player } from "./Player";

export type BotId = "BOT";

type BotConfig = {
  index: number;
  x: number;
  y: number;
  bounds: Phaser.Geom.Rectangle;
};

const BOT_COLORS = [0xffb347, 0xffe66d, 0xb56dff] as const;

export class Bot {
  readonly id: BotId = "BOT";
  readonly label: string;
  readonly color: number;
  readonly maxHealth = 70;
  readonly container: Phaser.GameObjects.Container;

  private readonly body: Phaser.GameObjects.Arc;
  private readonly face: Phaser.GameObjects.Triangle;
  private readonly healthBar: Phaser.GameObjects.Rectangle;
  private readonly bounds: Phaser.Geom.Rectangle;
  private readonly spawnPosition: Phaser.Math.Vector2;
  private readonly speed = 188;
  private readonly radiusValue = 18;
  private readonly shootCooldown = 860;
  private readonly preferredDistance = 210;
  private readonly minDistance = 135;
  private obstacles: Phaser.Geom.Rectangle[] = [];
  private health = this.maxHealth;
  private facing = new Phaser.Math.Vector2(1, 0);
  private strafeDirection = 1;
  private nextStrafeAt = 0;
  private nextShotAt = 0;
  private target?: Player;

  constructor(scene: Phaser.Scene, config: BotConfig) {
    this.label = `BOT ${config.index + 1}`;
    this.color = BOT_COLORS[config.index % BOT_COLORS.length];
    this.bounds = config.bounds;
    this.spawnPosition = new Phaser.Math.Vector2(config.x, config.y);

    const shadow = scene.add.ellipse(0, 24, 34, 10, 0x000000, 0.26);
    this.body = scene.add.circle(0, 0, this.radiusValue, this.color, 0.82).setStrokeStyle(2, 0x2b1834, 0.92);
    const core = scene.add.circle(0, 0, 8, 0x050814, 0.5);
    this.face = scene.add.triangle(23, 0, 0, -6, 13, 0, 0, 6, 0xf4f7ff, 0.86);
    const label = scene.add.text(0, -38, this.label, {
      color: "#ffe66d",
      fontFamily: '"Rajdhani", Arial, sans-serif',
      fontSize: "13px",
      fontStyle: "700",
    }).setOrigin(0.5);
    const track = scene.add.rectangle(0, -27, 38, 4, 0x030712, 0.78);
    this.healthBar = scene.add.rectangle(-19, -27, 38, 4, this.color, 0.95).setOrigin(0, 0.5);

    this.container = scene.add.container(config.x, config.y, [shadow, this.body, core, this.face, label, track, this.healthBar]);
    this.container.setDepth(19);
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
      dx = Math.abs(this.container.x - rect.left) < Math.abs(rect.right - this.container.x) ? -1 : 1;
      distance = 1;
    }

    const overlap = this.radius - distance + 1;
    this.container.x += (dx / distance) * overlap;
    this.container.y += (dy / distance) * overlap;
    this.container.x = Phaser.Math.Clamp(this.container.x, this.bounds.left + this.radius, this.bounds.right - this.radius);
    this.container.y = Phaser.Math.Clamp(this.container.y, this.bounds.top + this.radius, this.bounds.bottom - this.radius);
  }

  update(time: number, deltaSeconds: number, humans: Player[], avoidZones: Phaser.Geom.Rectangle[]): void {
    if (!this.alive) {
      return;
    }

    this.target = this.pickTarget(humans);
    if (!this.target) {
      return;
    }

    if (time >= this.nextStrafeAt) {
      this.strafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
      this.nextStrafeAt = time + Phaser.Math.Between(850, 1500);
    }

    const toTarget = this.target.position.subtract(this.position);
    const distance = Math.max(1, toTarget.length());
    const desired = toTarget.clone().normalize();

    if (distance < this.minDistance) {
      desired.scale(-0.9);
    } else if (distance < this.preferredDistance) {
      desired.scale(0.2);
    }

    const strafe = new Phaser.Math.Vector2(-toTarget.y, toTarget.x).normalize().scale(this.strafeDirection * 0.42);
    const avoid = this.getHazardAvoidance(avoidZones).scale(1.4);
    const movement = desired.add(strafe).add(avoid);

    if (movement.lengthSq() > 0.01) {
      movement.normalize();
      this.moveAxis("x", movement.x * this.speed * deltaSeconds);
      this.moveAxis("y", movement.y * this.speed * deltaSeconds);
    }

    this.facing = toTarget.normalize();
    this.face.rotation = this.facing.angle();
    this.container.x = Phaser.Math.Clamp(this.container.x, this.bounds.left + this.radius, this.bounds.right - this.radius);
    this.container.y = Phaser.Math.Clamp(this.container.y, this.bounds.top + this.radius, this.bounds.bottom - this.radius);
  }

  tryConsumeShot(time: number): boolean {
    if (!this.target || time < this.nextShotAt || !this.alive) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(this.container.x, this.container.y, this.target.position.x, this.target.position.y);
    if (distance > 380 || Phaser.Math.FloatBetween(0, 1) < 0.18) {
      return false;
    }

    this.nextShotAt = time + this.shootCooldown + Phaser.Math.Between(-80, 180);
    return true;
  }

  getShootDirection(): Phaser.Math.Vector2 {
    if (!this.target) {
      return this.facing.clone();
    }

    const direction = this.target.position.subtract(this.position).normalize();
    direction.rotate(Phaser.Math.FloatBetween(-0.16, 0.16));
    return direction;
  }

  takeDamage(amount: number): number {
    this.health = Math.max(0, this.health - amount);
    this.healthBar.width = 38 * (this.health / this.maxHealth);
    this.flash();
    return amount;
  }

  reset(): void {
    this.container.setPosition(this.spawnPosition.x, this.spawnPosition.y);
    this.health = this.maxHealth;
    this.healthBar.width = 38;
    this.container.setVisible(true).setActive(true);
  }

  destroy(): void {
    this.container.destroy();
  }

  get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.container.x, this.container.y);
  }

  get currentHealth(): number {
    return this.health;
  }

  get alive(): boolean {
    return this.health > 0;
  }

  get radius(): number {
    return this.radiusValue;
  }

  private pickTarget(humans: Player[]): Player | undefined {
    const living = humans.filter((player) => player.currentHealth > 0);
    return living.sort((a, b) => (
      Phaser.Math.Distance.Between(this.container.x, this.container.y, a.position.x, a.position.y) -
      Phaser.Math.Distance.Between(this.container.x, this.container.y, b.position.x, b.position.y)
    ))[0];
  }

  private getHazardAvoidance(zones: Phaser.Geom.Rectangle[]): Phaser.Math.Vector2 {
    const avoid = new Phaser.Math.Vector2(0, 0);
    const botBounds = new Phaser.Geom.Rectangle(
      this.container.x - this.radius,
      this.container.y - this.radius,
      this.radius * 2,
      this.radius * 2,
    );

    zones.forEach((zone) => {
      const inflated = new Phaser.Geom.Rectangle(zone.x - 32, zone.y - 32, zone.width + 64, zone.height + 64);
      if (Phaser.Geom.Intersects.RectangleToRectangle(inflated, botBounds)) {
        avoid.add(new Phaser.Math.Vector2(this.container.x - zone.centerX, this.container.y - zone.centerY).normalize());
      }
    });

    return avoid;
  }

  private moveAxis(axis: "x" | "y", delta: number): void {
    if (delta === 0) {
      return;
    }

    if (axis === "x") {
      this.container.x += delta;
    } else {
      this.container.y += delta;
    }

    for (const rect of this.obstacles) {
      if (!this.overlapsRect(this.container.x, this.container.y, rect)) {
        continue;
      }

      if (axis === "x") {
        this.container.x = delta > 0 ? rect.left - this.radius : rect.right + this.radius;
      } else {
        this.container.y = delta > 0 ? rect.top - this.radius : rect.bottom + this.radius;
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

  private flash(): void {
    this.body.setFillStyle(0xffffff, 1);
    this.body.scene.time.delayedCall(80, () => {
      if (this.container.active) {
        this.body.setFillStyle(this.color, 0.82);
      }
    });
  }
}
