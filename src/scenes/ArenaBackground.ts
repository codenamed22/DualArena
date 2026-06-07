import Phaser from "phaser";
import type { ArenaMap } from "../config/maps";

/**
 * Rich, self-animating per-map arena backdrop. Each map gets a unique
 * "game world" look built entirely from Canvas shapes + particles (no assets):
 *   - cyber-core: tech grid, circuit nodes, rotating rings, scanline, data streams
 *   - forest: canopy shade, foliage clusters, god-rays, fireflies
 *   - volcano: pulsing lava-crack network, bubbling lava pools, rising embers
 *
 * Everything renders below obstacles/players (depths 1-6) and animates via
 * tweens/emitters, so the GameScene doesn't need to drive it each frame.
 */
export class ArenaBackground {
  private readonly scene: Phaser.Scene;
  private readonly b: Phaser.Geom.Rectangle;
  private readonly map: ArenaMap;

  constructor(scene: Phaser.Scene, map: ArenaMap, bounds: Phaser.Geom.Rectangle) {
    this.scene = scene;
    this.map = map;
    this.b = bounds;

    if (map.id === "forest") {
      this.buildForest();
    } else if (map.id === "volcano") {
      this.buildVolcano();
    } else {
      this.buildCyber();
    }
  }

  // ---------------------------------------------------------------- cyber ----
  private buildCyber(): void {
    const { scene, b, map } = this;

    const grid = scene.add.graphics().setDepth(1);
    grid.lineStyle(1, map.gridColor, 0.16);
    for (let x = b.left + 24; x <= b.right - 24; x += 48) {
      grid.moveTo(x, b.top);
      grid.lineTo(x, b.bottom);
    }
    for (let y = b.top; y <= b.bottom; y += 48) {
      grid.moveTo(b.left, y);
      grid.lineTo(b.right, y);
    }
    grid.strokePath();

    // Pulsing nodes scattered across the grid.
    for (let i = 0; i < 14; i += 1) {
      const node = scene.add
        .circle(
          Phaser.Math.Between(b.left + 40, b.right - 40),
          Phaser.Math.Between(b.top + 30, b.bottom - 30),
          2,
          map.gridColor,
          0.85,
        )
        .setDepth(2)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: node,
        alpha: 0.12,
        scale: 1.8,
        duration: Phaser.Math.Between(1400, 2600),
        delay: i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Faint circuit traces (right-angle PCB paths with pads).
    const trace = scene.add.graphics().setDepth(2);
    trace.lineStyle(2, map.accentColor, 0.12);
    trace.moveTo(b.left + 60, b.top + 60);
    trace.lineTo(b.left + 200, b.top + 60);
    trace.lineTo(b.left + 200, b.top + 150);
    trace.moveTo(b.right - 60, b.bottom - 60);
    trace.lineTo(b.right - 220, b.bottom - 60);
    trace.lineTo(b.right - 220, b.bottom - 160);
    trace.strokePath();

    this.techRing(b.left + 120, b.top + 96);
    this.techRing(b.right - 120, b.bottom - 96);

    // Sweeping scanline.
    const scan = scene.add
      .rectangle(b.centerX, b.top + 4, b.width - 8, 3, map.accentColor, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5);
    scene.tweens.add({
      targets: scan,
      y: b.bottom - 4,
      duration: 3400,
      repeat: -1,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

    this.dataStream(b.left + 22, map.accentColor);
    this.dataStream(b.right - 22, map.secondaryColor);
  }

  private techRing(x: number, y: number): void {
    const ring = this.scene.add.container(x, y).setDepth(2);
    const outer = this.scene.add.circle(0, 0, 34, this.map.accentColor, 0).setStrokeStyle(2, this.map.accentColor, 0.22);
    const inner = this.scene.add.circle(0, 0, 20, this.map.secondaryColor, 0).setStrokeStyle(1, this.map.secondaryColor, 0.3);
    const ticks = this.scene.add.graphics();
    ticks.lineStyle(2, this.map.accentColor, 0.3);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ticks.moveTo(Math.cos(a) * 26, Math.sin(a) * 26);
      ticks.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
    }
    ticks.strokePath();
    ring.add([outer, inner, ticks]);
    this.scene.tweens.add({ targets: ring, rotation: Math.PI * 2, duration: 14000, repeat: -1, ease: "Linear" });
  }

  private dataStream(x: number, color: number): void {
    const stream = this.scene.add
      .particles(0, 0, "soft-glow-cyan", {
        x,
        y: this.b.bottom,
        lifespan: 2600,
        speedY: { min: -120, max: -70 },
        scale: { start: 0.18, end: 0 },
        alpha: { start: 0.5, end: 0 },
        tint: color,
        frequency: 240,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(4);
    stream.setName("arena-fx");
  }

  // --------------------------------------------------------------- forest ----
  private buildForest(): void {
    const { scene, b } = this;

    // Soft lit clearing in the middle of darker ground.
    scene.add.ellipse(b.centerX, b.centerY, b.width * 0.72, b.height * 0.7, 0x123a1c, 0.25).setDepth(1);

    // Canopy shade blobs.
    for (let i = 0; i < 7; i += 1) {
      scene.add
        .ellipse(
          Phaser.Math.Between(b.left + 40, b.right - 40),
          Phaser.Math.Between(b.top + 30, b.bottom - 30),
          Phaser.Math.Between(90, 160),
          Phaser.Math.Between(60, 110),
          0x020a04,
          0.18,
        )
        .setDepth(1);
    }

    // Foliage clusters around the perimeter (keep the centre playable).
    const spots = [
      [b.left + 56, b.top + 52],
      [b.right - 56, b.top + 64],
      [b.left + 70, b.bottom - 58],
      [b.right - 64, b.bottom - 64],
      [b.centerX, b.top + 40],
      [b.centerX, b.bottom - 44],
    ];
    spots.forEach(([x, y]) => this.bushCluster(x, y));

    // A few stones.
    for (let i = 0; i < 5; i += 1) {
      const x = Phaser.Math.Between(b.left + 60, b.right - 60);
      const y = Phaser.Math.Between(b.top + 50, b.bottom - 50);
      scene.add.ellipse(x, y, 18, 12, 0x4a4f46, 0.5).setDepth(2);
      scene.add.ellipse(x - 2, y - 2, 10, 6, 0x6b7064, 0.4).setDepth(2);
    }

    // Angled god-rays from the canopy.
    for (let i = 0; i < 3; i += 1) {
      const ray = scene.add
        .rectangle(b.left + 120 + i * 230, b.top, 60, b.height * 1.3, 0xffe9a3, 0.05)
        .setOrigin(0.5, 0)
        .setRotation(0.32)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4);
      scene.tweens.add({
        targets: ray,
        alpha: 0.11,
        duration: 3200 + i * 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Drifting, twinkling fireflies.
    scene.add
      .particles(0, 0, "soft-glow-lime", {
        x: { min: b.left + 20, max: b.right - 20 },
        y: { min: b.top + 20, max: b.bottom - 20 },
        lifespan: 4200,
        speedX: { min: -14, max: 14 },
        speedY: { min: -10, max: 10 },
        scale: { start: 0.12, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: [0xb6ff4d, 0xffe66d],
        frequency: 360,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(5);
  }

  private bushCluster(x: number, y: number): void {
    const greens = [0x1d3a1c, 0x274d24, 0x356b2f];
    for (let i = 0; i < 5; i += 1) {
      this.scene.add
        .circle(
          x + Phaser.Math.Between(-22, 22),
          y + Phaser.Math.Between(-14, 14),
          Phaser.Math.Between(12, 20),
          Phaser.Utils.Array.GetRandom(greens),
          0.92,
        )
        .setDepth(2);
    }
    this.scene.add.circle(x - 6, y - 8, 7, 0x6fae54, 0.5).setDepth(2);
  }

  // -------------------------------------------------------------- volcano ----
  private buildVolcano(): void {
    const { scene, b } = this;

    // Under-glow rising from the cracks.
    const glow = scene.add
      .image(b.centerX, b.centerY, "soft-glow-gold")
      .setTint(0xff5a1e)
      .setScale(8)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    scene.tweens.add({ targets: glow, alpha: 0.28, scale: 9, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Dark basalt fracture lines.
    const basalt = scene.add.graphics().setDepth(1);
    basalt.lineStyle(2, 0x000000, 0.4);
    for (let i = 0; i < 10; i += 1) {
      const x = Phaser.Math.Between(b.left + 30, b.right - 30);
      const y = Phaser.Math.Between(b.top + 30, b.bottom - 30);
      const angle = Phaser.Math.FloatBetween(0, Math.PI);
      basalt.moveTo(x, y);
      basalt.lineTo(x + Math.cos(angle) * 40, y + Math.sin(angle) * 40);
    }
    basalt.strokePath();

    // Glowing lava cracks radiating from the centre — base layer + pulsing bright layer.
    const ends = [
      [b.left + 40, b.top + 60],
      [b.right - 50, b.top + 80],
      [b.left + 70, b.bottom - 50],
      [b.right - 40, b.bottom - 70],
      [b.left + 20, b.centerY],
      [b.right - 20, b.centerY + 30],
    ];
    const base = scene.add.graphics().setDepth(2);
    base.lineStyle(5, 0x7a1f08, 0.9);
    ends.forEach(([ex, ey]) => this.jaggedLine(base, b.centerX, b.centerY, ex, ey));
    base.strokePath();

    const bright = scene.add.graphics().setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    bright.lineStyle(2, 0xff8a3d, 0.95);
    ends.forEach(([ex, ey]) => this.jaggedLine(bright, b.centerX, b.centerY, ex, ey));
    bright.strokePath();
    scene.tweens.add({ targets: bright, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Bubbling lava pools.
    const pools = [
      [b.left + 90, b.bottom - 70],
      [b.right - 100, b.top + 80],
      [b.centerX + 40, b.bottom - 50],
    ];
    pools.forEach(([x, y], i) => {
      const pool = scene.add
        .ellipse(x, y, 70, 38, 0xff5a1e, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      scene.add.ellipse(x, y, 44, 22, 0xffc24d, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(2);
      scene.tweens.add({
        targets: pool,
        scaleX: 1.12,
        scaleY: 1.18,
        alpha: 0.75,
        duration: 1200 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });

    // Rising embers.
    scene.add
      .particles(0, 0, "soft-glow-gold", {
        x: { min: b.left + 20, max: b.right - 20 },
        y: b.bottom - 10,
        lifespan: 3200,
        speedY: { min: -90, max: -40 },
        speedX: { min: -12, max: 12 },
        scale: { start: 0.16, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [0xff6b2b, 0xffc24d],
        frequency: 200,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(5);
  }

  private jaggedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const segments = 5;
    g.moveTo(x1, y1);
    for (let i = 1; i <= segments; i += 1) {
      const t = i / segments;
      const jitter = i === segments ? 0 : 12;
      g.lineTo(
        x1 + (x2 - x1) * t + Phaser.Math.Between(-jitter, jitter),
        y1 + (y2 - y1) * t + Phaser.Math.Between(-jitter, jitter),
      );
    }
  }
}
