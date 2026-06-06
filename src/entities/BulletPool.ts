import Phaser from "phaser";
import { Bullet } from "./Bullet";

/**
 * Reuses Bullet instances instead of allocating one per shot. Spent bullets are
 * returned here (hidden) and handed back out on the next shot — implementing the
 * object-pooling strategy from the design doc's performance section.
 */
export class BulletPool {
  private readonly free: Bullet[] = [];
  private readonly all: Bullet[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  obtain(): Bullet {
    const recycled = this.free.pop();
    if (recycled) {
      return recycled;
    }

    const bullet = new Bullet(this.scene);
    this.all.push(bullet);
    return bullet;
  }

  release(bullet: Bullet): void {
    bullet.deactivate();
    this.free.push(bullet);
  }

  destroyAll(): void {
    this.all.forEach((bullet) => bullet.destroy());
    this.all.length = 0;
    this.free.length = 0;
  }
}
