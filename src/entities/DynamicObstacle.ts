import Phaser from "phaser";

export type DynamicObstacleStyle = "tech" | "root" | "lava";

export type DynamicObstacleConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  axis: "x" | "y";
  travel: number;
  cycleMs: number;
  phase?: number;
  style: DynamicObstacleStyle;
  fillColor: number;
  strokeColor: number;
  accentColor: number;
};

type ObstacleTheme = {
  baseColor: number;
  baseAlpha: number;
  borderColor: number;
  accentColor: number;
  glowAlpha: number;
  accentAlpha: number;
  cornerAlpha: number;
};

export class DynamicObstacle {
  readonly bounds: Phaser.Geom.Rectangle;
  readonly style: DynamicObstacleStyle;
  readonly strokeColor: number;
  readonly accentColor: number;

  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private readonly accent: Phaser.GameObjects.Shape;
  private readonly config: DynamicObstacleConfig;
  private startTime = 0;

  constructor(scene: Phaser.Scene, config: DynamicObstacleConfig) {
    this.config = config;
    this.style = config.style;
    this.strokeColor = config.strokeColor;
    this.accentColor = config.accentColor;
    this.bounds = new Phaser.Geom.Rectangle(
      config.x - config.width / 2,
      config.y - config.height / 2,
      config.width,
      config.height,
    );

    const theme = this.applyObstacleTheme();
    const shadow = scene.add.rectangle(0, 8, config.width + 6, config.height + 6, 0x000000, 0.22);
    this.glow = scene.add
      .rectangle(0, 0, config.width + 14, config.height + 14, theme.borderColor, theme.glowAlpha)
      .setBlendMode(Phaser.BlendModes.ADD);

    const visuals =
      config.style === "tech"
        ? this.drawCyberObstacle(scene, theme)
        : config.style === "root"
          ? this.drawForestObstacle(scene, theme)
          : this.drawVolcanoObstacle(scene, theme);

    this.accent = visuals.accent;
    this.container = scene.add.container(config.x, config.y, [shadow, this.glow, ...visuals.parts]);
    this.container.setDepth(15);
    this.reset(scene.time.now);
  }

  reset(time: number): void {
    this.startTime = time;
    this.update(time);
  }

  update(time: number): void {
    const progress = ((time - this.startTime) / this.config.cycleMs) * Math.PI * 2 + (this.config.phase ?? 0);
    const offset = Math.sin(progress) * this.config.travel;
    const x = this.config.x + (this.config.axis === "x" ? offset : 0);
    const y = this.config.y + (this.config.axis === "y" ? offset : 0);
    const pulse = 0.86 + Math.sin(progress * 2) * 0.08;

    this.container.setPosition(x, y);
    this.glow.setAlpha(this.applyObstacleTheme().glowAlpha * pulse);
    this.accent.setAlpha(this.applyObstacleTheme().accentAlpha * pulse);
    this.bounds.setTo(x - this.config.width / 2, y - this.config.height / 2, this.config.width, this.config.height);
  }

  destroy(): void {
    this.container.destroy();
  }

  private applyObstacleTheme(): ObstacleTheme {
    if (this.config.style === "root") {
      return {
        baseColor: 0x182416,
        baseAlpha: 0.96,
        borderColor: 0x6fa85a,
        accentColor: 0xb6d86a,
        glowAlpha: 0.08,
        accentAlpha: 0.44,
        cornerAlpha: 0.22,
      };
    }

    if (this.config.style === "lava") {
      return {
        baseColor: 0x17100f,
        baseAlpha: 0.98,
        borderColor: 0xff6b2b,
        accentColor: 0xffb347,
        glowAlpha: 0.1,
        accentAlpha: 0.58,
        cornerAlpha: 0.2,
      };
    }

    return {
      baseColor: 0x071225,
      baseAlpha: 0.94,
      borderColor: this.config.strokeColor,
      accentColor: this.config.accentColor,
      glowAlpha: 0.1,
      accentAlpha: 0.58,
      cornerAlpha: 0.5,
    };
  }

  private drawCyberObstacle(
    scene: Phaser.Scene,
    theme: ObstacleTheme,
  ): { parts: Phaser.GameObjects.GameObject[]; accent: Phaser.GameObjects.Shape } {
    const { width, height } = this.config;
    const body = scene.add.rectangle(0, 0, width, height, theme.baseColor, theme.baseAlpha).setStrokeStyle(2, theme.borderColor, 0.88);
    const panel = scene.add.rectangle(0, 0, width - 8, height - 8, 0x050b18, 0.35).setStrokeStyle(1, theme.accentColor, 0.22);
    const accent = scene.add.rectangle(0, 0, Math.max(8, width * 0.58), Math.max(2, Math.min(4, height * 0.14)), theme.accentColor, theme.accentAlpha);
    const cornerLength = Math.min(10, Math.max(6, Math.min(width, height) * 0.35));
    const corners = [
      scene.add.rectangle(-width / 2 + 7, -height / 2 + 7, cornerLength, 2, theme.borderColor, theme.cornerAlpha),
      scene.add.rectangle(width / 2 - 7, -height / 2 + 7, cornerLength, 2, theme.borderColor, theme.cornerAlpha),
      scene.add.rectangle(-width / 2 + 7, height / 2 - 7, cornerLength, 2, theme.borderColor, theme.cornerAlpha),
      scene.add.rectangle(width / 2 - 7, height / 2 - 7, cornerLength, 2, theme.borderColor, theme.cornerAlpha),
    ];

    return { parts: [body, panel, accent, ...corners], accent };
  }

  private drawForestObstacle(
    scene: Phaser.Scene,
    theme: ObstacleTheme,
  ): { parts: Phaser.GameObjects.GameObject[]; accent: Phaser.GameObjects.Shape } {
    const { width, height } = this.config;
    const body = scene.add.rectangle(0, 0, width, height, theme.baseColor, theme.baseAlpha).setStrokeStyle(2, theme.borderColor, 0.7);
    const moss = scene.add.rectangle(0, 0, width - 8, height - 8, 0x23351d, 0.34);
    const accent = scene.add.ellipse(-width * 0.08, 0, Math.max(16, width * 0.46), Math.max(5, height * 0.32), theme.accentColor, 0);
    accent.setStrokeStyle(2, theme.accentColor, theme.accentAlpha);
    accent.setRotation(-0.12);
    const leaf = scene.add.ellipse(width * 0.25, -height * 0.16, 7, 4, theme.accentColor, 0.28).setRotation(0.45);

    return { parts: [body, moss, accent, leaf], accent };
  }

  private drawVolcanoObstacle(
    scene: Phaser.Scene,
    theme: ObstacleTheme,
  ): { parts: Phaser.GameObjects.GameObject[]; accent: Phaser.GameObjects.Shape } {
    const { width, height } = this.config;
    const body = scene.add.rectangle(0, 0, width, height, theme.baseColor, theme.baseAlpha).setStrokeStyle(2, theme.borderColor, 0.75);
    const crust = scene.add.rectangle(0, 0, width - 8, height - 8, 0x0d0807, 0.42);
    const accent = scene.add.rectangle(-width * 0.08, 0, Math.max(14, width * 0.54), 3, theme.accentColor, theme.accentAlpha).setRotation(-0.16);
    const smallCrack = scene.add.rectangle(width * 0.26, height * 0.18, Math.max(8, width * 0.18), 2, theme.borderColor, 0.42).setRotation(0.22);

    return { parts: [body, crust, accent, smallCrack], accent };
  }
}
