import Phaser from "phaser";

/**
 * Central visual identity for DuelByte Arena's premium-neon look.
 * All scenes/entities pull fonts, colors and text styles from here so the
 * UI stays consistent and is tunable from a single place.
 */

// Display font (titles, big numbers) + body font (HUD, labels).
export const FONTS = {
  display: '"Orbitron", "Arial Black", sans-serif',
  body: '"Rajdhani", "Arial", sans-serif',
} as const;

// Web font families that must be loaded before the canvas renders text.
export const WEB_FONT_FAMILIES = ["Orbitron", "Rajdhani"] as const;

// Hex-string palette for text/CSS contexts (mirrors numeric COLORS in constants.ts).
export const HEX = {
  cyan: "#28f0ff",
  pink: "#ff3df2",
  lime: "#b6ff4d",
  gold: "#ffe66d",
  orange: "#ff6b2b",
  text: "#f4f7ff",
  muted: "#9aa6c8",
  ink: "#050814",
} as const;

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/** Big neon display title, e.g. menu/win headings. */
export function titleStyle(size: number, color: string = HEX.text): TextStyle {
  return {
    color,
    fontFamily: FONTS.display,
    fontSize: `${size}px`,
    fontStyle: "900",
  };
}

/** Section/heading text. */
export function headingStyle(size: number, color: string = HEX.text): TextStyle {
  return {
    color,
    fontFamily: FONTS.display,
    fontSize: `${size}px`,
    fontStyle: "700",
  };
}

/** HUD labels and prompts (uses the condensed body font). */
export function bodyStyle(size: number, color: string = HEX.text, weight: string = "600"): TextStyle {
  return {
    color,
    fontFamily: FONTS.body,
    fontSize: `${size}px`,
    fontStyle: weight,
  };
}

/** Apply the signature neon glow drop-shadow to a text object. */
export function applyNeonGlow(
  text: Phaser.GameObjects.Text,
  color: string = HEX.cyan,
  blur = 16,
): Phaser.GameObjects.Text {
  return text.setShadow(0, 0, color, blur, true, true);
}

/**
 * Add a subtle camera-wide bloom for the AAA neon glow. WebGL-only; safely
 * no-ops on the Canvas renderer. Tuned so bright neon spreads while the
 * threshold keeps darker HUD text crisp.
 */
export function addSceneBloom(scene: Phaser.Scene, blendAmount = 0.6, blurRadius = 5): void {
  if (scene.game.renderer.type !== Phaser.WEBGL) {
    return;
  }

  Phaser.Actions.AddEffectBloom(scene.cameras.main, {
    threshold: 0.55,
    blurRadius,
    blurSteps: 4,
    blurQuality: 1,
    blendAmount,
  });
}
