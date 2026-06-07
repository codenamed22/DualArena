# DuelByte Arena Technical Design

## Tech Stack

- **Vite** provides fast local development and production builds.
- **TypeScript** keeps game state, scene data, entities, and configs easier to reason about.
- **Phaser.js** handles rendering, scenes, input, tweens, particles, timing, and the game loop.
- **CSS** styles the browser shell and keeps the canvas centered.

Phaser was chosen because it fits a 2D browser game well without requiring a custom engine or backend.

## Boot and Scene Architecture

The Phaser game starts in `src/main.ts` using `src/config/gameConfig.ts`.

Scene flow:

1. `BootScene`
2. `MenuScene`
3. `ModeSelectScene`
4. `MapSelectScene`
5. `BotSelectScene`
6. `GameScene`
7. `WinnerScene`

Scene data carries `gameMode`, `mapId`, and `botCount` forward so rematches can preserve the selected setup.

## Main Scene Responsibilities

`GameScene` owns the active match. It coordinates:

- Player creation and updates
- Local and AI-controlled input
- Bullets and bullet pooling
- Powerup spawning and effects
- Neutral bots
- Static and dynamic obstacles
- Arena hazards/events
- Best-of-3 scoring
- Countdown and round-over state
- HUD updates
- Winner scene transition

This is acceptable for a hackathon, but it is the largest long-term maintainability risk.

## Entity Architecture

`Player.ts`

- Represents Player 1 and Player 2.
- Handles movement, facing, health, damage, shield/speed/mega effects, and obstacle collision.

`Bullet.ts` and `BulletPool.ts`

- Represent projectiles and reuse bullet objects to reduce allocations during combat.
- Bullets can be owned by Player 1, Player 2, or neutral bots.

`Powerup.ts`

- Represents collectible powerups and their visuals.
- Effects are applied by `GameScene`.

`Bot.ts`

- Represents optional neutral arena bots.
- Handles simple steering, targeting, shooting cooldowns, health, and obstacle/hazard avoidance.

`DynamicObstacle.ts`

- Represents moving map-specific obstacles.
- Provides visual style and collision bounds used by `GameScene`.

## Map Config Design

`src/config/maps.ts` defines the available arenas. Each map has an id, name, subtitle, and theme colors. `GameScene`, selection screens, HUD, backgrounds, hazards, and obstacles use this selected map data.

## HUD and Presentation Utilities

`src/ui/Hud.ts` renders health bars, score pips, round number, timer, map name, and event banner.

`src/utils/background.ts` provides reusable animated backgrounds for menu-style scenes.

`src/scenes/ArenaBackground.ts` draws themed gameplay backgrounds.

`src/utils/theme.ts` centralizes fonts, colors, text styles, and glow helpers.

## Audio

`src/utils/audio.ts` implements lightweight procedural Web Audio effects. Audio is unlocked from the first user interaction in `src/main.ts`, which follows browser autoplay restrictions.

## State Flow

- Menu chooses when to start.
- Mode selection chooses Local Duel or Solo vs Bot.
- Map selection chooses the arena.
- Bot selection chooses extra neutral bot count.
- GameScene runs best-of-3.
- WinnerScene receives final score and setup data.
- Rematch restarts the same setup.

## Performance Considerations

- Phaser handles rendering and timing.
- Bullet pooling reduces frequent projectile allocations.
- Arena visuals use generated graphics and particles instead of external assets.
- Canvas size is fixed at 960x540 and scaled to fit the browser.

## Maintainability Notes

The current structure is strong for a hackathon submission. Future refactors could split `GameScene` into smaller managers:

- RoundManager
- PowerupManager
- HazardManager
- BotManager
- ObstacleManager

These are not required for the current demo, but they would make future features safer.

## Current Technical Limitations

- Local browser play only.
- No online networking.
- No mobile/touch control layer.
- AI uses simple steering, not pathfinding.
- No dedicated pause or mute UI is documented.
