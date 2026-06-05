import Phaser from "phaser";

export type PowerupType = "health-core" | "shield-bubble";

export class Powerup {
  readonly type: PowerupType;
  readonly sprite: Phaser.GameObjects.Container;
  readonly radius = 22;

  constructor(scene: Phaser.Scene, type: PowerupType, x: number, y: number) {
    this.type = type;

    const color = type === "health-core" ? 0xb6ff4d : 0x28f0ff;
    const accent = type === "health-core" ? 0xb6ff4d : 0xffe66d;
    const ring = scene.add.circle(0, 0, 20, color, 0.18).setStrokeStyle(3, accent, 0.94);
    const core = scene.add.circle(0, 0, 11, color, 0.36);
    const label = scene.add.text(0, 0, type === "health-core" ? "+" : "S", {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "18px",
      fontStyle: "700",
    }).setOrigin(0.5);

    this.sprite = scene.add.container(x, y, [ring, core, label]);
    this.sprite.setDepth(12);

    scene.tweens.add({
      targets: this.sprite,
      y: y - 6,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
