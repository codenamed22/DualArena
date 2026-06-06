import Phaser from "phaser";
import type { ActiveEffect, PlayerId } from "../entities/Player";
import { GAME_WIDTH } from "../utils/constants";
import { applyNeonGlow, bodyStyle, headingStyle, HEX } from "../utils/theme";

const BAR_WIDTH = 248;
const BAR_HEIGHT = 14;
const BAR_Y = 60;
const GHOST_COLOR = 0xff5a6e;

type SideConfig = {
  id: PlayerId;
  color: number;
  hexColor: string;
  anchorX: number;
  origin: 0 | 1;
};

type HudState = {
  p1Health: number;
  p2Health: number;
  maxHealth: number;
  p1Effects: ActiveEffect[];
  p2Effects: ActiveEffect[];
  roundNumber: number;
  wins: Record<PlayerId, number>;
  winsNeeded: number;
  timeLeftMs: number;
};

type SideRefs = {
  fill: Phaser.GameObjects.Rectangle;
  ghost: Phaser.GameObjects.Rectangle;
  value: Phaser.GameObjects.Text;
  chipLabel: Phaser.GameObjects.Text;
  pips: Phaser.GameObjects.Arc[];
  displayed: number;
  ghostHealth: number;
};

/**
 * The in-game heads-up display: chip-damage health bars, score pips,
 * round timer and active-powerup chips. Kept separate from GameScene so the
 * render layer is isolated from game logic (per the design doc's architecture).
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly sides: Record<PlayerId, SideRefs>;
  private readonly roundText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly eventBanner: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, mapName: string, accentColor: number, winsNeeded: number) {
    this.scene = scene;

    this.sides = {
      P1: this.buildSide({ id: "P1", color: 0x28f0ff, hexColor: HEX.cyan, anchorX: 28, origin: 0 }, winsNeeded),
      P2: this.buildSide({ id: "P2", color: 0xff3df2, hexColor: HEX.pink, anchorX: GAME_WIDTH - 28, origin: 1 }, winsNeeded),
    };

    // Center cluster: round badge, timer, map name, event banner.
    const centerPanel = this.scene.add
      .rectangle(GAME_WIDTH / 2, 46, 240, 78, 0x050814, 0.82)
      .setStrokeStyle(2, accentColor, 0.6)
      .setDepth(40);
    centerPanel.setScrollFactor(0);

    this.roundText = this.scene.add
      .text(GAME_WIDTH / 2, 24, "ROUND 1", headingStyle(16, HEX.text))
      .setOrigin(0.5)
      .setDepth(41);

    this.timerText = this.scene.add
      .text(GAME_WIDTH / 2, 50, "90", headingStyle(30, HEX.text))
      .setOrigin(0.5)
      .setDepth(41);
    applyNeonGlow(this.timerText, HEX.cyan, 10);

    this.scene.add
      .text(GAME_WIDTH / 2, 76, mapName, bodyStyle(13, HEX.lime, "600"))
      .setOrigin(0.5)
      .setDepth(41);

    this.eventBanner = this.scene.add
      .text(GAME_WIDTH / 2, 102, "", headingStyle(14, HEX.gold))
      .setOrigin(0.5)
      .setDepth(41);
    applyNeonGlow(this.eventBanner, HEX.gold, 10);
  }

  private buildSide(config: SideConfig, winsNeeded: number): SideRefs {
    const { color, hexColor, anchorX, origin } = config;
    const labelX = origin === 0 ? anchorX : anchorX;

    this.scene.add
      .text(labelX, 26, config.id === "P1" ? "PLAYER 1" : "PLAYER 2", headingStyle(16, hexColor))
      .setOrigin(origin, 0)
      .setDepth(41);

    // Health bar: track -> ghost (chip) -> fill.
    const trackX = origin === 0 ? anchorX : anchorX - BAR_WIDTH;
    this.scene.add
      .rectangle(trackX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 0x01030c, 0.92)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.16)
      .setDepth(40);

    const ghostX = origin === 0 ? anchorX : anchorX;
    const ghost = this.scene.add
      .rectangle(ghostX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, GHOST_COLOR, 0.85)
      .setOrigin(origin, 0.5)
      .setDepth(40);

    const fill = this.scene.add
      .rectangle(ghostX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, color, 1)
      .setOrigin(origin, 0.5)
      .setDepth(41);

    const value = this.scene.add
      .text(labelX, 76, "100 / 100", bodyStyle(14, HEX.text, "600"))
      .setOrigin(origin, 0)
      .setDepth(41);

    const chipLabel = this.scene.add
      .text(labelX, BAR_Y + 30, "", bodyStyle(13, HEX.gold, "700"))
      .setOrigin(origin, 0)
      .setDepth(41);

    // Score pips above the bar, growing inward from the player's edge.
    const pips: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < winsNeeded; i += 1) {
      const offset = 16 + i * 22;
      const px = origin === 0 ? anchorX + BAR_WIDTH - offset : anchorX - BAR_WIDTH + offset;
      pips.push(
        this.scene.add
          .circle(px, 33, 6, color, 0.18)
          .setStrokeStyle(2, color, 0.8)
          .setDepth(41),
      );
    }

    return { fill, ghost, value, chipLabel, pips, displayed: 100, ghostHealth: 100 };
  }

  setEventBanner(text: string): void {
    this.eventBanner.setText(text);
  }

  update(state: HudState): void {
    this.updateSide("P1", state.p1Health, state.maxHealth, state.p1Effects);
    this.updateSide("P2", state.p2Health, state.maxHealth, state.p2Effects);

    this.roundText.setText(`ROUND ${state.roundNumber}`);

    const seconds = Math.max(0, Math.ceil(state.timeLeftMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const display = seconds >= 60 ? `${minutes}:${(seconds % 60).toString().padStart(2, "0")}` : `${seconds}`;
    this.timerText.setText(display);
    const urgent = seconds <= 10;
    this.timerText.setColor(urgent ? HEX.pink : HEX.text);
    this.timerText.setScale(urgent ? 1 + Math.sin(this.scene.time.now / 120) * 0.06 : 1);

    (["P1", "P2"] as PlayerId[]).forEach((id) => {
      this.sides[id].pips.forEach((pip, index) => {
        pip.setFillStyle(this.sides[id].fill.fillColor, index < state.wins[id] ? 0.95 : 0.18);
      });
    });
  }

  private updateSide(id: PlayerId, health: number, maxHealth: number, effects: ActiveEffect[]): void {
    const side = this.sides[id];

    // Fill snaps quickly; ghost lags behind to show chip damage.
    side.displayed += (health - side.displayed) * 0.4;
    side.ghostHealth += (side.displayed - side.ghostHealth) * 0.07;
    if (side.ghostHealth < side.displayed) {
      side.ghostHealth = side.displayed;
    }

    side.fill.width = BAR_WIDTH * Phaser.Math.Clamp(side.displayed / maxHealth, 0, 1);
    side.ghost.width = BAR_WIDTH * Phaser.Math.Clamp(side.ghostHealth / maxHealth, 0, 1);
    side.value.setText(`${Math.max(0, Math.round(health))} / ${maxHealth}`);

    const chip = effects[0];
    side.chipLabel.setText(chip ? `${chip.label}  ${chip.secondsLeft}s` : "");
    if (chip) {
      side.chipLabel.setColor(`#${chip.color.toString(16).padStart(6, "0")}`);
    }
  }
}
