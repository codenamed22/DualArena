import Phaser from "phaser";
import { SCENE_KEYS } from "../utils/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create(): void {
    this.createGlowTexture("soft-glow-cyan", 0x28f0ff);
    this.createGlowTexture("soft-glow-pink", 0xff3df2);
    this.createGlowTexture("soft-glow-lime", 0xb6ff4d);
    this.scene.start(SCENE_KEYS.MENU);
  }

  private createGlowTexture(key: string, color: number): void {
    const size = 96;
    const graphics = this.make.graphics({ x: 0, y: 0 });

    for (let radius = 44; radius > 0; radius -= 4) {
      graphics.fillStyle(color, radius / 160);
      graphics.fillCircle(size / 2, size / 2, radius);
    }

    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }
}
