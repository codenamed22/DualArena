import Phaser from "phaser";
import type { PlayerId } from "./Player";

export class Bullet {
  readonly ownerId: PlayerId;
  readonly damage = 15;
  readonly sprite: Phaser.GameObjects.Arc;

  private readonly velocity: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, ownerId: PlayerId, x: number, y: number, direction: Phaser.Math.Vector2, color: number) {
    this.ownerId = ownerId;
    this.velocity = direction.clone().normalize().scale(540);
    this.sprite = scene.add.circle(x, y, 7, color, 1).setStrokeStyle(2, 0xffffff, 0.42);
    this.sprite.setDepth(18);
  }

  update(deltaSeconds: number): void {
    this.sprite.x += this.velocity.x * deltaSeconds;
    this.sprite.y += this.velocity.y * deltaSeconds;
  }

  isOutside(bounds: Phaser.Geom.Rectangle): boolean {
    return !bounds.contains(this.sprite.x, this.sprite.y);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
