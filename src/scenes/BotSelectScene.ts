import Phaser from "phaser";
import { getArenaMap, type ArenaMapId } from "../config/maps";
import { GAME_WIDTH, SCENE_KEYS, type GameMode } from "../utils/constants";
import { AnimatedBackground } from "../utils/background";
import { addSceneBloom, applyNeonGlow, bodyStyle, headingStyle, HEX, titleStyle } from "../utils/theme";
import { audio } from "../utils/audio";

type BotSelectSceneData = {
  mapId?: ArenaMapId;
  gameMode?: GameMode;
};

const BOT_OPTIONS = [
  { count: 0, title: "0 EXTRA BOTS", subtitle: "No Extra Bots" },
  { count: 1, title: "1 EXTRA BOT", subtitle: "One Extra Bot" },
  { count: 2, title: "2 EXTRA BOTS", subtitle: "Two Extra Bots" },
  { count: 3, title: "3 EXTRA BOTS", subtitle: "Maximum Chaos" },
] as const;

export class BotSelectScene extends Phaser.Scene {
  private mapId: ArenaMapId = "cyber-core";
  private gameMode: GameMode = "local";

  constructor() {
    super(SCENE_KEYS.BOT_SELECT);
  }

  init(data: BotSelectSceneData): void {
    this.mapId = data.mapId ?? "cyber-core";
    this.gameMode = data.gameMode ?? "local";
  }

  create(): void {
    const map = getArenaMap(this.mapId);
    new AnimatedBackground(this, { gridColor: map.accentColor, dustColors: [map.accentColor, map.secondaryColor] });
    addSceneBloom(this, 0.55);

    const title = this.add
      .text(GAME_WIDTH / 2, 70, "EXTRA ARENA BOTS", titleStyle(44, HEX.text))
      .setOrigin(0.5);
    applyNeonGlow(title, HEX.gold, 16);

    this.add
      .text(GAME_WIDTH / 2, 116, `${map.name}   /   ${this.getModeLabel()}`, headingStyle(19, HEX.lime))
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 146, "Press  0  /  1  /  2  /  3", bodyStyle(18, HEX.muted, "700"))
      .setOrigin(0.5);

    const startX = 162;
    const gap = 212;
    BOT_OPTIONS.forEach((option, index) => {
      this.addBotCard(startX + index * gap, 302, option.count, option.title, option.subtitle);
    });

    this.add
      .text(GAME_WIDTH / 2, 478, "Esc / Backspace: Return to Arena Select", bodyStyle(16, HEX.muted, "600"))
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (["Digit0", "Digit1", "Digit2", "Digit3"].includes(event.code)) {
        this.launch(Number(event.code.replace("Digit", "")));
      }

      if (event.code === "Escape" || event.code === "Backspace") {
        audio.uiSelect();
        this.cameras.main.fadeOut(240, 5, 7, 18);
        this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(SCENE_KEYS.MAP_SELECT, { gameMode: this.gameMode }));
      }
    });

    this.cameras.main.fadeIn(320, 5, 7, 18);
  }

  private addBotCard(x: number, y: number, count: number, title: string, subtitle: string): void {
    const accent = count === 0 ? 0x28f0ff : count === 1 ? 0xffe66d : count === 2 ? 0xff9f43 : 0xff3df2;
    const accentHex = `#${accent.toString(16).padStart(6, "0")}`;

    const card = this.add
      .rectangle(x, y, 176, 210, 0x060a18, 0.84)
      .setStrokeStyle(2, accent, 0.58);

    this.add.circle(x, y - 54, 24, accent, count === 0 ? 0.12 : 0.34).setStrokeStyle(2, accent, 0.7);
    this.add.text(x, y - 58, `${count}`, titleStyle(34, accentHex)).setOrigin(0.5);
    this.add.text(x, y + 6, title, headingStyle(20, HEX.text)).setOrigin(0.5);
    this.add.text(x, y + 42, subtitle, bodyStyle(17, accentHex, "700")).setOrigin(0.5);
    this.add.text(x, y + 78, `PRESS ${count}`, bodyStyle(15, HEX.muted, "700")).setOrigin(0.5);

    this.tweens.add({
      targets: card,
      alpha: 0.68,
      duration: 1300 + count * 170,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private launch(botCount: number): void {
    audio.uiSelect();
    this.cameras.main.fadeOut(260, 5, 7, 18);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start(SCENE_KEYS.GAME, { mapId: this.mapId, gameMode: this.gameMode, botCount });
    });
  }

  private getModeLabel(): string {
    return this.gameMode === "solo-bot" ? "Solo vs Bot" : "Local Duel";
  }
}
