export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const ARENA_BOUNDS = {
  x: 28,
  y: 96,
  width: 904,
  height: 422,
} as const;

export const SCENE_KEYS = {
  BOOT: "BootScene",
  MENU: "MenuScene",
  MAP_SELECT: "MapSelectScene",
  GAME: "GameScene",
  WINNER: "WinnerScene",
} as const;

export const COLORS = {
  background: 0x070914,
  cyan: 0x28f0ff,
  pink: 0xff3df2,
  lime: 0xb6ff4d,
  text: 0xf4f7ff,
  muted: 0x9aa6c8,
  panel: 0x080c1c,
};
