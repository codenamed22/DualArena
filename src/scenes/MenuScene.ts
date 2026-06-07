import Phaser from "phaser";
import { GAME_WIDTH, SCENE_KEYS } from "../utils/constants";
import { AnimatedBackground } from "../utils/background";
import { addSceneBloom, applyNeonGlow, bodyStyle, headingStyle, HEX, titleStyle } from "../utils/theme";
import { audio } from "../utils/audio";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    new AnimatedBackground(this, { gridColor: 0x28f0ff });
    addSceneBloom(this, 0.7);

    this.addTitle();
    this.addControls();

    this.add
      .text(GAME_WIDTH / 2, 460, "Press  F  for Fullscreen", bodyStyle(15, HEX.muted, "600"))
      .setOrigin(0.5);

    this.input.keyboard?.once("keydown-ENTER", () => {
      audio.resume();
      audio.uiSelect();
      this.cameras.main.fadeOut(280, 5, 7, 18);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(SCENE_KEYS.MODE_SELECT));
    });

    this.cameras.main.fadeIn(420, 5, 7, 18);
  }

  private addTitle(): void {
    const title = this.add
      .text(GAME_WIDTH / 2, 86, "DUELBYTE ARENA", titleStyle(64, HEX.text))
      .setOrigin(0.5);
    applyNeonGlow(title, HEX.cyan, 22);

    // Subtle breathing pulse on the title glow.
    this.tweens.add({
      targets: title,
      scale: 1.02,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(GAME_WIDTH / 2, 152, "Same keyboard. No mercy.", headingStyle(24, HEX.lime))
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_WIDTH / 2, 234, "PRESS ENTER TO START", headingStyle(26, HEX.cyan))
      .setOrigin(0.5);
    applyNeonGlow(prompt, HEX.cyan, 14);

    this.tweens.add({
      targets: prompt,
      alpha: 0.4,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private addControls(): void {
    this.addControlCard(300, "PLAYER 1", "MOVE", "W  A  S  D", "ATTACK", "SPACE", HEX.cyan, 0x28f0ff);
    this.addControlCard(660, "PLAYER 2", "MOVE", "ARROW KEYS", "ATTACK", "ENTER / SHIFT", HEX.pink, 0xff3df2);
  }

  private addControlCard(
    x: number,
    title: string,
    moveLabel: string,
    move: string,
    attackLabel: string,
    attack: string,
    color: string,
    colorNum: number,
  ): void {
    this.add
      .rectangle(x, 360, 312, 140, 0x060a18, 0.78)
      .setStrokeStyle(2, colorNum, 0.6);

    const heading = this.add.text(x, 314, title, headingStyle(22, color)).setOrigin(0.5);
    applyNeonGlow(heading, color, 10);

    this.add.text(x - 120, 352, moveLabel, bodyStyle(14, HEX.muted, "700")).setOrigin(0, 0.5);
    this.add.text(x + 130, 352, move, bodyStyle(18, HEX.text, "700")).setOrigin(1, 0.5);
    this.add.text(x - 120, 386, attackLabel, bodyStyle(14, HEX.muted, "700")).setOrigin(0, 0.5);
    this.add.text(x + 130, 386, attack, bodyStyle(18, HEX.text, "700")).setOrigin(1, 0.5);
  }
}
