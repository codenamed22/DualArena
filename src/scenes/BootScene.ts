import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../utils/constants";
import { applyNeonGlow, HEX, titleStyle, WEB_FONT_FAMILIES } from "../utils/theme";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create(): void {
    this.createGlowTexture("soft-glow-cyan", 0x28f0ff);
    this.createGlowTexture("soft-glow-pink", 0xff3df2);
    this.createGlowTexture("soft-glow-lime", 0xb6ff4d);
    this.createGlowTexture("soft-glow-gold", 0xffe66d);

    this.showLoading();
    this.loadFontsThenStart();
  }

  private showLoading(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050814);
    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "DUELBYTE", titleStyle(40, HEX.cyan))
      .setOrigin(0.5);
    applyNeonGlow(label, HEX.cyan, 18);

    this.tweens.add({
      targets: label,
      alpha: 0.35,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Wait for web fonts so canvas text renders with Orbitron/Rajdhani; fall back gracefully if offline. */
  private loadFontsThenStart(): void {
    const fontsApi = (document as Document & { fonts?: FontFaceSet }).fonts;

    if (!fontsApi) {
      this.time.delayedCall(200, () => this.scene.start(SCENE_KEYS.MENU));
      return;
    }

    const loaders = WEB_FONT_FAMILIES.flatMap((family) => [
      fontsApi.load(`700 24px "${family}"`),
      fontsApi.load(`900 24px "${family}"`),
    ]);

    let started = false;
    const start = (): void => {
      if (started) {
        return;
      }
      started = true;
      this.startNext();
    };

    Promise.all(loaders)
      .then(() => fontsApi.ready)
      .then(start)
      .catch(start);

    // Safety net: never let a slow/blocked font CDN stall the boot.
    this.time.delayedCall(2500, start);
  }

  /** Honor an optional `#map=<id>` deep-link to jump straight into a match (handy for testing/demos). */
  private startNext(): void {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const directMap = params.get("map");
    const valid = ["cyber-core", "forest", "volcano"];

    if (directMap && valid.includes(directMap)) {
      this.scene.start(SCENE_KEYS.GAME, { mapId: directMap });
      return;
    }

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
