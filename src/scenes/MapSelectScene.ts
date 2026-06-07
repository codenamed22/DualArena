import Phaser from "phaser";
import { arenaMaps, type ArenaMap } from "../config/maps";
import type { PlayerId } from "../entities/Player";
import { GAME_WIDTH, SCENE_KEYS, type GameMode } from "../utils/constants";
import { AnimatedBackground } from "../utils/background";
import { addSceneBloom, applyNeonGlow, bodyStyle, headingStyle, HEX, titleStyle } from "../utils/theme";
import { audio } from "../utils/audio";

type MapSelectSceneData = {
  gameMode?: GameMode;
  humanSide?: PlayerId;
};

export class MapSelectScene extends Phaser.Scene {
  private gameMode: GameMode = "local";
  private humanSide: PlayerId = "P1";

  constructor() {
    super(SCENE_KEYS.MAP_SELECT);
  }

  init(data: MapSelectSceneData): void {
    this.gameMode = data.gameMode ?? "local";
    this.humanSide = data.humanSide === "P2" ? "P2" : "P1";
  }

  create(): void {
    new AnimatedBackground(this, { gridColor: 0x28f0ff });
    addSceneBloom(this, 0.55);

    const title = this.add
      .text(GAME_WIDTH / 2, 74, "CHOOSE YOUR ARENA", titleStyle(46, HEX.text))
      .setOrigin(0.5);
    applyNeonGlow(title, HEX.cyan, 16);

    this.add
      .text(GAME_WIDTH / 2, 124, `${this.getModeLabel()}   /   Press  1  /  2  /  3`, headingStyle(20, HEX.lime))
      .setOrigin(0.5);

    const cardWidth = 270;
    const gap = 28;
    const startX = GAME_WIDTH / 2 - (cardWidth * 3 + gap * 2) / 2 + cardWidth / 2;

    arenaMaps.forEach((map, index) => {
      this.addMapCard(startX + index * (cardWidth + gap), 296, cardWidth, map, index + 1);
    });

    this.add
      .text(GAME_WIDTH / 2, 478, "Esc / Backspace: Return to Menu", bodyStyle(16, HEX.muted, "600"))
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (["Digit1", "Digit2", "Digit3"].includes(event.code)) {
        const index = Number(event.code.replace("Digit", "")) - 1;
        this.launch(arenaMaps[index]);
      }

      if (event.code === "Escape" || event.code === "Backspace") {
        this.cameras.main.fadeOut(260, 5, 7, 18);
        const backScene = this.gameMode === "solo-bot" ? SCENE_KEYS.SIDE_SELECT : SCENE_KEYS.MODE_SELECT;
        this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(backScene, { gameMode: this.gameMode }));
      }
    });

    this.cameras.main.fadeIn(360, 5, 7, 18);
  }

  private launch(map: ArenaMap): void {
    audio.uiSelect();
    this.cameras.main.fadeOut(280, 5, 7, 18);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start(SCENE_KEYS.GAME, { mapId: map.id, gameMode: this.gameMode, humanSide: this.humanSide });
    });
  }

  private getModeLabel(): string {
    return this.gameMode === "solo-bot" ? "Solo vs Bot" : "Local Duel";
  }

  private addMapCard(x: number, y: number, width: number, map: ArenaMap, hotkey: number): void {
    const accent = map.accentColor;

    const card = this.add
      .rectangle(x, y, width, 244, 0x060a18, 0.86)
      .setStrokeStyle(2, accent, 0.6);

    // Preview panel showing the arena's theme palette + grid.
    this.add.rectangle(x, y - 58, width - 44, 82, map.floorColor, 1).setStrokeStyle(2, map.secondaryColor, 0.5);

    const preview = this.add.graphics();
    preview.lineStyle(1, map.gridColor, 0.28);
    for (let offset = -96; offset <= 96; offset += 24) {
      preview.moveTo(x - 104 + offset, y - 94);
      preview.lineTo(x - 104 + offset, y - 22);
      preview.moveTo(x - 110, y - 58 + offset / 2.6);
      preview.lineTo(x + 110, y - 58 + offset / 2.6);
    }
    preview.strokePath();

    // Two mini duelists to suggest the matchup.
    this.add.circle(x - 56, y - 58, 8, 0x28f0ff, 1).setStrokeStyle(2, 0x126fff, 1);
    this.add.circle(x + 56, y - 58, 8, 0xff3df2, 1).setStrokeStyle(2, 0xff334f, 1);

    const hot = this.add.text(x, y + 22, `PRESS ${hotkey}`, headingStyle(18, hexFromInt(accent))).setOrigin(0.5);
    applyNeonGlow(hot, hexFromInt(accent), 8);

    this.add.text(x, y + 58, map.name, headingStyle(21, HEX.text)).setOrigin(0.5);
    this.add
      .text(x, y + 94, map.subtitle, {
        ...bodyStyle(13, HEX.muted, "500"),
        align: "center",
        wordWrap: { width: width - 34 },
      })
      .setOrigin(0.5);

    // Hover-style pulse so the cards feel alive.
    this.tweens.add({
      targets: card,
      alpha: 0.7,
      duration: 1600 + hotkey * 200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}

function hexFromInt(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}
