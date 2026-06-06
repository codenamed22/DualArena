import Phaser from "phaser";
import type { ArenaMapId } from "../config/maps";
import type { PlayerId } from "../entities/Player";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../utils/constants";
import { AnimatedBackground } from "../utils/background";
import { addSceneBloom, applyNeonGlow, bodyStyle, headingStyle, HEX, titleStyle } from "../utils/theme";
import { audio } from "../utils/audio";

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
    const isP1 = this.winnerId === "P1";
    const accent = isP1 ? HEX.cyan : HEX.pink;
    const accentNum = isP1 ? 0x28f0ff : 0xff3df2;

    new AnimatedBackground(this, { gridColor: accentNum, dustColors: [accentNum, 0xb6ff4d] });
    addSceneBloom(this, 0.8);

    this.add.image(GAME_WIDTH / 2, 168, "soft-glow-gold").setScale(4.2).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);

    const champ = this.add
      .text(GAME_WIDTH / 2, 150, "CHAMPION", titleStyle(30, HEX.gold))
      .setOrigin(0.5);
    applyNeonGlow(champ, HEX.gold, 18);

    const winner = this.add
      .text(GAME_WIDTH / 2, 214, isP1 ? "PLAYER 1" : "PLAYER 2", titleStyle(64, accent))
      .setOrigin(0.5);
    applyNeonGlow(winner, accent, 24);
    winner.setScale(0.6);
    this.tweens.add({ targets: winner, scale: 1, duration: 520, ease: "Back.easeOut" });

    this.add
      .text(GAME_WIDTH / 2, 286, `FINAL SCORE   P1  ${this.score.P1}  —  ${this.score.P2}  P2`, headingStyle(22, HEX.text))
      .setOrigin(0.5);

    this.confettiBurst(accentNum);
    audio.matchWin();

    const restart = this.add
      .text(GAME_WIDTH / 2, 358, "PRESS  R  TO REMATCH", headingStyle(24, HEX.cyan))
      .setOrigin(0.5);
    applyNeonGlow(restart, HEX.cyan, 12);
    this.tweens.add({ targets: restart, alpha: 0.45, duration: 720, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add
      .text(GAME_WIDTH / 2, 400, "Press Enter for Map Select", bodyStyle(18, HEX.muted, "600"))
      .setOrigin(0.5);

    this.input.keyboard?.once("keydown-R", () => this.transitionTo(SCENE_KEYS.GAME, { mapId: this.mapId }));
    this.input.keyboard?.once("keydown-ENTER", () => this.transitionTo(SCENE_KEYS.MAP_SELECT));

    this.cameras.main.fadeIn(420, 5, 7, 18);
  }

  private confettiBurst(color: number): void {
    const colors = [color, 0xffe66d, 0xb6ff4d, 0xf4f7ff];
    for (let i = 0; i < 60; i += 1) {
      const x = Phaser.Math.Between(GAME_WIDTH / 2 - 240, GAME_WIDTH / 2 + 240);
      const piece = this.add
        .rectangle(x, -10, Phaser.Math.Between(4, 8), Phaser.Math.Between(8, 14), Phaser.Utils.Array.GetRandom(colors), 0.95)
        .setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: piece,
        y: GAME_HEIGHT + 20,
        angle: piece.angle + Phaser.Math.Between(180, 540),
        duration: Phaser.Math.Between(1600, 2800),
        delay: Phaser.Math.Between(0, 900),
        ease: "Cubic.easeIn",
        onComplete: () => piece.destroy(),
      });
    }
  }

  private transitionTo(key: string, data?: object): void {
    this.cameras.main.fadeOut(280, 5, 7, 18);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(key, data));
  }
}
