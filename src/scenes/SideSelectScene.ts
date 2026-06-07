import Phaser from "phaser";
import type { PlayerId } from "../entities/Player";
import { GAME_WIDTH, SCENE_KEYS, type GameMode } from "../utils/constants";
import { AnimatedBackground } from "../utils/background";
import { addSceneBloom, applyNeonGlow, bodyStyle, headingStyle, HEX, titleStyle } from "../utils/theme";
import { audio } from "../utils/audio";

type SideSelectSceneData = {
  gameMode?: GameMode;
};

type SideOption = {
  key: string;
  side: PlayerId;
  title: string;
  controls: string;
  accent: number;
  accentHex: string;
};

const SIDE_OPTIONS: SideOption[] = [
  {
    key: "1",
    side: "P1",
    title: "PLAYER 1",
    controls: "WASD + Space",
    accent: 0x28f0ff,
    accentHex: HEX.cyan,
  },
  {
    key: "2",
    side: "P2",
    title: "PLAYER 2",
    controls: "Arrow Keys + Space",
    accent: 0xff3df2,
    accentHex: HEX.pink,
  },
];

export class SideSelectScene extends Phaser.Scene {
  private gameMode: GameMode = "solo-bot";

  constructor() {
    super(SCENE_KEYS.SIDE_SELECT);
  }

  init(data: SideSelectSceneData): void {
    this.gameMode = data.gameMode ?? "solo-bot";
  }

  create(): void {
    new AnimatedBackground(this, { gridColor: 0xffe66d, dustColors: [0x28f0ff, 0xff3df2, 0xffe66d] });
    addSceneBloom(this, 0.6);

    const title = this.add
      .text(GAME_WIDTH / 2, 78, "CHOOSE YOUR FIGHTER", titleStyle(46, HEX.text))
      .setOrigin(0.5);
    applyNeonGlow(title, HEX.gold, 16);

    this.add
      .text(GAME_WIDTH / 2, 128, "The other side is AI-controlled   /   Press  1  or  2", headingStyle(20, HEX.lime))
      .setOrigin(0.5);

    SIDE_OPTIONS.forEach((option, index) => {
      this.addSideCard(300 + index * 360, 300, option);
    });

    this.add
      .text(GAME_WIDTH / 2, 478, "Esc / Backspace: Return to Mode Select", bodyStyle(16, HEX.muted, "600"))
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const option = SIDE_OPTIONS.find((candidate) => event.code === `Digit${candidate.key}`);
      if (option) {
        this.launch(option.side);
      }

      if (event.code === "Escape" || event.code === "Backspace") {
        audio.uiSelect();
        this.cameras.main.fadeOut(240, 5, 7, 18);
        this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(SCENE_KEYS.MODE_SELECT));
      }
    });

    this.cameras.main.fadeIn(320, 5, 7, 18);
  }

  private addSideCard(x: number, y: number, option: SideOption): void {
    const card = this.add
      .rectangle(x, y, 310, 220, 0x060a18, 0.84)
      .setStrokeStyle(2, option.accent, 0.62);

    this.add.circle(x, y - 62, 28, option.accent, 0.18).setStrokeStyle(2, option.accent, 0.8);
    this.add.text(x, y - 66, option.key, titleStyle(34, option.accentHex)).setOrigin(0.5);
    const heading = this.add.text(x, y + 2, option.title, headingStyle(25, option.accentHex)).setOrigin(0.5);
    applyNeonGlow(heading, option.accentHex, 10);
    this.add
      .text(x, y + 44, option.controls, {
        ...bodyStyle(17, HEX.text, "600"),
        align: "center",
        wordWrap: { width: 250 },
      })
      .setOrigin(0.5);
    this.add.text(x, y + 84, `PRESS ${option.key}`, bodyStyle(15, HEX.muted, "700")).setOrigin(0.5);

    this.tweens.add({
      targets: card,
      alpha: 0.68,
      duration: option.side === "P1" ? 1500 : 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private launch(humanSide: PlayerId): void {
    audio.uiSelect();
    this.cameras.main.fadeOut(260, 5, 7, 18);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start(SCENE_KEYS.MAP_SELECT, { gameMode: this.gameMode, humanSide });
    });
  }
}
