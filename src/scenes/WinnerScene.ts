import Phaser from "phaser";
import type { ArenaMapId } from "../config/maps";
import type { PlayerId } from "../entities/Player";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../utils/constants";

type WinnerSceneData = {
  winnerId?: PlayerId;
  mapId?: ArenaMapId;
  score?: Record<PlayerId, number>;
};

export class WinnerScene extends Phaser.Scene {
  private winnerId: PlayerId = "P1";
  private mapId: ArenaMapId = "cyber-core";
  private score: Record<PlayerId, number> = { P1: 0, P2: 0 };

  constructor() {
    super(SCENE_KEYS.WINNER);
  }

  init(data: WinnerSceneData): void {
    this.winnerId = data.winnerId ?? "P1";
    this.mapId = data.mapId ?? "cyber-core";
    this.score = data.score ?? { P1: 0, P2: 0 };
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "soft-glow-lime").setScale(4).setAlpha(0.24);
    this.add.text(GAME_WIDTH / 2, 206, this.winnerId === "P1" ? "Player 1 is the DuelByte Champion!" : "Player 2 is the DuelByte Champion!", {
      color: "#b6ff4d",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "36px",
      fontStyle: "900",
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 260, `Final Score: P1 ${this.score.P1} - ${this.score.P2} P2`, {
      color: "#f4f7ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "22px",
      fontStyle: "800",
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 312, "Press R to Restart Match", {
      color: "#28f0ff",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "24px",
      fontStyle: "800",
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 350, "Press Enter for Map Select", {
      color: "#9aa6c8",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "18px",
      fontStyle: "700",
    }).setOrigin(0.5);

    this.input.keyboard?.once("keydown-R", () => {
      this.scene.start(SCENE_KEYS.GAME, { mapId: this.mapId });
    });
    this.input.keyboard?.once("keydown-ENTER", () => {
      this.scene.start(SCENE_KEYS.MAP_SELECT);
    });
  }
}
