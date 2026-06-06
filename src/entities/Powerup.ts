import Phaser from "phaser";

export type PowerupType = "health-core" | "shield-bubble" | "speed-surge" | "mega-shot";

type PowerupStyle = {
  color: number;
  accent: number;
  glyph: string;
};

const POWERUP_STYLES: Record<PowerupType, PowerupStyle> = {
  "health-core": { color: 0xb6ff4d, accent: 0xb6ff4d, glyph: "+" },
  "shield-bubble": { color: 0x28f0ff, accent: 0xffe66d, glyph: "S" },
  "speed-surge": { color: 0xb6ff4d, accent: 0x7dff72, glyph: "»" },
  "mega-shot": { color: 0xff6b2b, accent: 0xffe66d, glyph: "★" },
};

export class Powerup {
  readonly type: PowerupType;
  readonly sprite: Phaser.GameObjects.Container;
  readonly radius = 22;

  constructor(scene: Phaser.Scene, type: PowerupType, x: number, y: number) {
    this.type = type;

    const style = POWERUP_STYLES[type];
    const ring = scene.add.circle(0, 0, 20, style.color, 0.18).setStrokeStyle(3, style.accent, 0.94);
    const core = scene.add.circle(0, 0, 11, style.color, 0.36);
    const label = scene.add
      .text(0, 0, style.glyph, {
        color: "#f4f7ff",
        fontFamily: '"Rajdhani", Arial, sans-serif',
        fontSize: "20px",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    // Outer pulse ring to draw the eye to the pickup.
    const pulse = scene.add.circle(0, 0, 20, style.accent, 0).setStrokeStyle(2, style.accent, 0.6);
    scene.tweens.add({
      targets: pulse,
      scale: 1.8,
      alpha: 0,
      duration: 1100,
      repeat: -1,
      ease: "Cubic.easeOut",
    });

    this.sprite = scene.add.container(x, y, [pulse, ring, core, label]);
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
