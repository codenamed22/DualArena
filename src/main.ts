import Phaser from "phaser";
import { gameConfig } from "./config/gameConfig";
import { audio } from "./utils/audio";
import "./styles.css";

const game = new Phaser.Game(gameConfig);

// Browser autoplay rules require a gesture before audio can play.
const unlockAudio = (): void => audio.resume();
window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("pointerdown", unlockAudio, { once: true });

// Press F to toggle fullscreen (the keypress satisfies the browser gesture rule).
window.addEventListener("keydown", (event) => {
  if (event.key === "f" || event.key === "F") {
    game.scale.toggleFullscreen();
  }
});
