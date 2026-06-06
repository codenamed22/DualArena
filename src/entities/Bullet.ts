import Phaser from "phaser";
import type { PlayerId } from "./Player";

/**
 * A projectile. Designed to be pooled (see BulletPool): the sprite and trail
 * emitter are created once and reconfigured on each spawn() / deactivate(),
 * avoiding per-shot allocation and GC churn (per the design doc's perf goals).
 */
export class Bullet {
  ownerId: PlayerId = "P1";
  damage = 15;
  mega = false;
  readonly sprite: Phaser.GameObjects.Arc;

  private readonly velocity = new Phaser.Math.Vector2(0, 0);
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.circle(0, 0, 7, 0xffffff, 1).setStrokeStyle(2, 0xffffff, 0.42).setDepth(18);

    this.trail = scene.add.particles(0, 0, "soft-glow-cyan", {
      follow: this.sprite,
      lifespan: 220,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      frequency: 14,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.trail.setDepth(17);

    this.deactivate();
  }

  get active(): boolean {
    return this.sprite.active;
  }

  spawn(ownerId: PlayerId, x: number, y: number, direction: Phaser.Math.Vector2, color: number, mega: boolean): void {
    this.ownerId = ownerId;
    this.mega = mega;
    this.damage = mega ? 32 : 15;
    this.velocity.copy(direction).normalize().scale(mega ? 500 : 540);

    this.sprite
      .setActive(true)
      .setVisible(true)
      .setPosition(x, y)
      .setRadius(mega ? 13 : 7)
      .setFillStyle(color, 1)
      .setStrokeStyle(mega ? 3 : 2, mega ? 0xffe66d : 0xffffff, mega ? 0.8 : 0.42);

    this.trail.setParticleTint(color);
    this.trail.setParticleLifespan(mega ? 280 : 200);
    this.trail.start();
  }

  deactivate(): void {
    this.trail.stop();
    this.sprite.setActive(false).setVisible(false).setPosition(-50, -50);
  }

  update(deltaSeconds: number): void {
    this.sprite.x += this.velocity.x * deltaSeconds;
    this.sprite.y += this.velocity.y * deltaSeconds;
  }

  isOutside(bounds: Phaser.Geom.Rectangle): boolean {
    return !bounds.contains(this.sprite.x, this.sprite.y);
  }

  destroy(): void {
    this.trail.destroy();
    this.sprite.destroy();
  }
}
