import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../utils/constants";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    this.drawBackground();
    this.addTitle();
    this.addControls();

    this.input.keyboard?.once("keydown-ENTER", () => {
      this.scene.start(SCENE_KEYS.MAP_SELECT);
    });
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.cyan, 0.12);

    for (let x = 0; x <= GAME_WIDTH; x += 48) {
      grid.moveTo(x, 0);
      grid.lineTo(x, GAME_HEIGHT);
    }

    for (let y = 0; y <= GAME_HEIGHT; y += 48) {
      grid.moveTo(0, y);
      grid.lineTo(GAME_WIDTH, y);
    }

    grid.strokePath();
    this.add.image(160, 110, "soft-glow-cyan").setScale(3.4).setAlpha(0.32);
    this.add.image(800, 420, "soft-glow-pink").setScale(3.6).setAlpha(0.26);
  }

  private addTitle(): void {
    this.add.text(GAME_WIDTH / 2, 118, "DuelByte Arena", {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "62px",
      fontStyle: "900",
    }).setOrigin(0.5).setShadow(0, 0, "#28f0ff", 18);

    this.add.text(GAME_WIDTH / 2, 188, "Same keyboard. No mercy.", {
      color: "#b6ff4d",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "24px",
      fontStyle: "700",
    }).setOrigin(0.5);

    const prompt = this.add.text(GAME_WIDTH / 2, 272, "Press Enter to Start", {
      color: "#28f0ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "28px",
      fontStyle: "800",
    }).setOrigin(0.5).setShadow(0, 0, "#28f0ff", 14);

    this.tweens.add({
      targets: prompt,
      alpha: 0.45,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private addControls(): void {
    this.addControlCard(300, "P1 Controls", "Move: W A S D", "Attack: Space", "#28f0ff");
    this.addControlCard(660, "P2 Controls", "Move: Arrow Keys", "Attack: Enter / Shift", "#ff3df2");
  }

  private addControlCard(x: number, title: string, move: string, attack: string, color: string): void {
    this.add.rectangle(x, 386, 306, 128, 0x060a18, 0.82).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.55);
    this.add.text(x, 350, title, {
      color,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "22px",
      fontStyle: "800",
    }).setOrigin(0.5);
    this.add.text(x, 388, move, {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "17px",
    }).setOrigin(0.5);
    this.add.text(x, 418, attack, {
      color: "#9aa6c8",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "17px",
    }).setOrigin(0.5);
  }
}
