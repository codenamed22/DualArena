import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

type BackgroundOptions = {
  baseColor?: number;
  gridColor?: number;
  gridAlpha?: number;
  gridSize?: number;
  dustColors?: number[];
  glowCorners?: boolean;
};

/**
 * Reusable animated neon backdrop: a softly pulsing grid plus slow-drifting
 * glow "dust" particles. Sits behind everything (negative depth) so scenes can
 * just instantiate it and add their content on top.
 */
export class AnimatedBackground {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, options: BackgroundOptions = {}) {
    const {
      baseColor = 0x070914,
      gridColor = 0x28f0ff,
      gridAlpha = 0.14,
      gridSize = 48,
      dustColors = [0x28f0ff, 0xff3df2],
      glowCorners = true,
    } = options;

    const base = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, baseColor)
      .setDepth(-30);
    this.objects.push(base);

    const grid = scene.add.graphics().setDepth(-25);
    grid.lineStyle(1, gridColor, gridAlpha);
    for (let x = 0; x <= GAME_WIDTH; x += gridSize) {
      grid.moveTo(x, 0);
      grid.lineTo(x, GAME_HEIGHT);
    }
    for (let y = 0; y <= GAME_HEIGHT; y += gridSize) {
      grid.moveTo(0, y);
      grid.lineTo(GAME_WIDTH, y);
    }
    grid.strokePath();
    this.objects.push(grid);

    scene.tweens.add({
      targets: grid,
      alpha: 0.45,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    if (glowCorners) {
      const cornerGlows = [
        scene.add.image(140, 120, "soft-glow-cyan").setScale(3.4).setAlpha(0.22),
        scene.add.image(GAME_WIDTH - 160, GAME_HEIGHT - 120, "soft-glow-pink").setScale(3.6).setAlpha(0.18),
      ];
      cornerGlows.forEach((glow, index) => {
        glow.setDepth(-24).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
          targets: glow,
          scale: glow.scale * 1.16,
          alpha: glow.alpha * 1.5,
          duration: 3200 + index * 600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      });
      this.objects.push(...cornerGlows);
    }

    // Slow-drifting glow dust for depth and motion.
    dustColors.forEach((color, index) => {
      const textureKey =
        color === 0xff3df2 ? "soft-glow-pink" : color === 0xb6ff4d ? "soft-glow-lime" : "soft-glow-cyan";
      const emitter = scene.add.particles(0, 0, textureKey, {
        x: { min: 0, max: GAME_WIDTH },
        y: GAME_HEIGHT + 16,
        lifespan: 9000,
        speedY: { min: -22, max: -10 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.16 + index * 0.04, end: 0.02 },
        alpha: { start: 0.42, end: 0 },
        frequency: 520 + index * 180,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
      });
      emitter.setDepth(-22);
      this.objects.push(emitter);
    });
  }

  destroy(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects.length = 0;
  }
}
