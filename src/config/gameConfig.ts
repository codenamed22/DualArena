import Phaser from "phaser";
import { BotSelectScene } from "../scenes/BotSelectScene";
import { BootScene } from "../scenes/BootScene";
import { GameScene } from "../scenes/GameScene";
import { MapSelectScene } from "../scenes/MapSelectScene";
import { MenuScene } from "../scenes/MenuScene";
import { ModeSelectScene } from "../scenes/ModeSelectScene";
import { WinnerScene } from "../scenes/WinnerScene";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  scene: [BootScene, MenuScene, ModeSelectScene, MapSelectScene, BotSelectScene, GameScene, WinnerScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};
