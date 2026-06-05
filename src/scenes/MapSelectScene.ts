import Phaser from "phaser";
import { arenaMaps, type ArenaMap } from "../config/maps";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../utils/constants";

export class MapSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MAP_SELECT);
  }

  create(): void {
    this.drawBackground();

    this.add.text(GAME_WIDTH / 2, 78, "Choose Your Arena", {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "48px",
      fontStyle: "900",
    }).setOrigin(0.5).setShadow(0, 0, "#28f0ff", 16);

    this.add.text(GAME_WIDTH / 2, 126, "Press 1 / 2 / 3 to deploy", {
      color: "#b6ff4d",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "20px",
      fontStyle: "700",
    }).setOrigin(0.5);

    const cardWidth = 270;
    const gap = 28;
    const startX = GAME_WIDTH / 2 - (cardWidth * 3 + gap * 2) / 2 + cardWidth / 2;

    arenaMaps.forEach((map, index) => {
      this.addMapCard(startX + index * (cardWidth + gap), 288, cardWidth, map, index + 1);
    });

    this.add.text(GAME_WIDTH / 2, 478, "Esc / Backspace: Return to Menu", {
      color: "#9aa6c8",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "16px",
    }).setOrigin(0.5);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (["Digit1", "Digit2", "Digit3"].includes(event.code)) {
        const index = Number(event.code.replace("Digit", "")) - 1;
        this.scene.start(SCENE_KEYS.GAME, { mapId: arenaMaps[index].id });
      }

      if (event.code === "Escape" || event.code === "Backspace") {
        this.scene.start(SCENE_KEYS.MENU);
      }
    });
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.image(180, 150, "soft-glow-cyan").setScale(3.2).setAlpha(0.22);
    this.add.image(780, 388, "soft-glow-pink").setScale(3.4).setAlpha(0.2);
  }

  private addMapCard(x: number, y: number, width: number, map: ArenaMap, hotkey: number): void {
    const accent = map.accentColor;
    this.add.rectangle(x, y, width, 236, 0x060a18, 0.88).setStrokeStyle(2, accent, 0.56);
    this.add.rectangle(x, y - 54, width - 44, 78, map.floorColor, 1).setStrokeStyle(2, map.secondaryColor, 0.5);

    const preview = this.add.graphics();
    preview.lineStyle(1, map.gridColor, 0.24);

    for (let offset = -96; offset <= 96; offset += 24) {
      preview.moveTo(x - 104 + offset, y - 88);
      preview.lineTo(x - 104 + offset, y - 20);
      preview.moveTo(x - 108, y - 54 + offset / 2);
      preview.lineTo(x + 108, y - 54 + offset / 2);
    }

    preview.strokePath();
    this.add.rectangle(x, y - 54, width - 84, 38).setStrokeStyle(4, accent, 0.88);

    this.add.text(x, y + 18, `Press ${hotkey}`, {
      color: Phaser.Display.Color.IntegerToColor(accent).rgba,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "18px",
      fontStyle: "800",
    }).setOrigin(0.5);
    this.add.text(x, y + 56, map.name, {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "21px",
      fontStyle: "900",
      align: "center",
    }).setOrigin(0.5);
    this.add.text(x, y + 92, map.subtitle, {
      color: "#9aa6c8",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "13px",
      align: "center",
      wordWrap: { width: width - 34 },
    }).setOrigin(0.5);
  }
}
