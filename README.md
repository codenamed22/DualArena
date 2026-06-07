# DuelByte Arena

**Same keyboard. No mercy.**

## Live Demo

Play here: https://duel-arena.vercel.app/


## Demo Video

Watch here: https://www.youtube.com/watch?v=qLCopEXsSKo

---



Track: **Multiplayer & Social Games**

DuelByte Arena is a fast local arena battle game built for a game-themed hackathon. Two competitors fight on the same screen, share one keyboard/device, dodge map hazards, use powerups, and race to win a best-of-3 match.

The project focuses on a complete playable demo over unnecessary complexity: responsive movement, clear projectile combat, readable health/score tracking, powerups, round flow, and a champion screen.

## Problem Statement Summary

The original challenge was to build a quick, fun, complete local multiplayer arena game where two players compete on the same keyboard or same device. Required elements included two playable characters, same-screen local multiplayer, one arena, one attack mechanic, at least two powerups, health or score tracking, round start/end, a winner screen, and basic controls.

DuelByte Arena satisfies those requirements with a polished Phaser-based implementation and adds optional stretch features such as multiple arenas, Solo vs Bot, extra arena bots, dynamic obstacles, hazards, particles, screen shake, procedural audio, and fullscreen support.

## What We Built

A neon arcade-style local battle game with:

- Two main competitors: Player 1 and Player 2.
- Local Duel mode for two humans on one keyboard.
- Solo vs Bot mode where Player 2 is AI-controlled.
- Three themed arenas with different visual identities and arena events.
- Projectile combat, health bars, score pips, countdowns, round results, and final champion flow.
- Powerups and moving obstacles that make each round more dynamic.
- Optional neutral arena bots for extra chaos.

## Requirement Coverage

| Original Requirement | Status |
| --- | --- |
| Working demo | Implemented as a playable browser game |
| GitHub/zip-ready project | Vite project with source, package files, and docs |
| Setup instructions | Included below |
| 3-5 minute demo support | See `docs/demo-script.md` |
| AI tool usage explanation | Included below and in `docs/ai-usage.md` |
| Completeness over complexity | One focused arena combat loop with complete match flow |
| Two playable characters | Player 1 and Player 2 |
| Same-screen local multiplayer | Local Duel mode |
| Attack mechanic | Projectile shooting |
| At least two powerups | Health, Shield, Speed, Mega Shot |
| Health/score tracking | HUD health bars and best-of-3 score pips |
| Round system | Countdown, round result, next round, final match winner |
| Winner screen | Champion screen after best-of-3 |
| Basic controls/instructions | Shown in menu/select screens and listed below |

## Game Modes

### Local Duel

Two players share one keyboard:

- Player 1 uses WASD + Space.
- Player 2 uses Arrow Keys + Enter/Shift.

This is the core hackathon mode and best represents the theme: **Same keyboard. No mercy.**

### Solo vs Bot

Player 1 fights an AI-controlled Player 2. The AI rival can move, shoot, win rounds, and win the match. This mode keeps the game playable even when only one person is available for a demo.

### Extra Arena Bots

After choosing a map, players can add 0-3 neutral arena bots. These bots move, shoot, and can be destroyed, but they do not win rounds. They act as optional pressure and chaos.

## Arena Maps

- **Cyber Core Arena**: neon grid, cyan/purple tech style, Glitch Lasers event.
- **Forest Arena**: dark moss-lit forest/ruins style, Root Surge event.
- **Volcano Rift**: molten rock/lava style, Lava Surge event.

Each map has themed visuals, moving obstacles, and a map-specific arena event.

## Powerups

- **Health Core**: restores health.
- **Shield Bubble**: reduces incoming damage for a short duration.
- **Speed Surge**: temporarily increases movement speed.
- **Mega Shot**: temporarily upgrades projectile damage.

Only one pickup appears at a time, and powerups respawn after a short delay.

## Dynamic Obstacles and Hazards

Each arena includes moving obstacles that block players and destroy bullets. They are styled to match the selected map and reset between rounds.

Map-specific arena events trigger during active gameplay with a warning phase first:

- **Glitch Lasers**: cyber laser lanes deal light damage.
- **Root Surge**: forest root zones slow players.
- **Lava Surge**: volcano cracks deal light damage.

## Controls

### Navigation

| Screen | Control |
| --- | --- |
| Menu | Enter to continue |
| Mode Select | 1 Local Duel, 2 Solo vs Bot |
| Map Select | 1 Cyber Core, 2 Forest Arena, 3 Volcano Rift |
| Bot Select | 0-3 extra arena bots |
| Select Screens | Esc or Backspace to go back |
| Any Screen | F to toggle fullscreen |

### Gameplay

| Player / Action | Control |
| --- | --- |
| Player 1 Move | W A S D |
| Player 1 Shoot | Space |
| Player 2 Move, Local Duel | Arrow Keys |
| Player 2 Shoot, Local Duel | Enter or Shift |
| Player 2, Solo vs Bot | AI controlled |
| Restart Match | R |
| Next Round | Enter on round result screen |
| Rematch | R on champion screen |
| Return to Map Select | Enter on champion screen |

Note: Enter is used for Player 2 shooting during active Local Duel gameplay and for navigation on menu/result screens.

## Tech Stack

- **Vite**: development server and build tooling.
- **TypeScript**: typed game logic and safer iteration.
- **Phaser.js**: 2D scene, input, rendering, particles, tweens, and game loop.
- **CSS**: page shell, canvas centering, and neon browser presentation.

No React, Next.js, backend service, Python runtime, or Three.js is used.

## Project Structure

```text
.
├── index.html
├── package.json
├── tsconfig.json
├── src
│   ├── main.ts
│   ├── styles.css
│   ├── config
│   │   ├── gameConfig.ts
│   │   └── maps.ts
│   ├── entities
│   │   ├── Bot.ts
│   │   ├── Bullet.ts
│   │   ├── BulletPool.ts
│   │   ├── DynamicObstacle.ts
│   │   ├── Player.ts
│   │   └── Powerup.ts
│   ├── scenes
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── ModeSelectScene.ts
│   │   ├── MapSelectScene.ts
│   │   ├── BotSelectScene.ts
│   │   ├── GameScene.ts
│   │   ├── ArenaBackground.ts
│   │   └── WinnerScene.ts
│   ├── ui
│   │   └── Hud.ts
│   └── utils
│       ├── audio.ts
│       ├── background.ts
│       ├── constants.ts
│       └── theme.ts
└── docs
```

## Setup and Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for submission:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The game is best played in a desktop/laptop browser with a keyboard.

## Suggested Demo Flow

1. Open the menu and introduce the theme.
2. Choose **Local Duel**.
3. Pick **Cyber Core Arena**.
4. Select **0 extra bots** for the cleanest first round.
5. Show both players moving, shooting, taking damage, and collecting a powerup.
6. Let an arena hazard or moving obstacle appear.
7. Show a round result.
8. Restart or return to map/mode selection.
9. Choose **Solo vs Bot** with 1 extra arena bot to show AI and chaos.
10. End on the champion screen.

See `docs/demo-script.md` for a full 3-5 minute script and fallback short version.

## AI Tool Usage

AI tools were used as assistants during planning, implementation support, debugging, balancing discussions, visual polish ideas, and documentation drafting. The team reviewed, tested, and customized the final code and design choices.

AI was not treated as a replacement for team ownership. The final game direction, feature scope, and submission materials remain team decisions.

More detail is available in `docs/ai-usage.md`.

## Team Contributions



| Team Member | Contributions |
| --- | --- |
| Vansh | Gameplay / engineering / design |
| Nitish | UI / polish / testing |
| Vansh & Nitish | Documentation / demo / balancing |

## Known Limitations

- Local same-screen play only; no online multiplayer.
- Keyboard-focused; no mobile/touch control support.
- AI uses lightweight steering and shooting logic, not advanced pathfinding.
- Visuals and audio are generated/stylized in code rather than built from a custom asset pack.
- Best experienced on a laptop or desktop browser.
- No dedicated pause or mute UI is currently documented in the game flow.

## Future Improvements

- Add more arenas or arena variants.
- Add character selection.
- Add difficulty settings for Solo vs Bot.
- Add richer sound/music controls.
- Add local controller support.
- Add post-match stats.
- Add online multiplayer as a larger future milestone.

## License and Assets Note

This hackathon project uses generated/stylized in-game visuals and procedural audio effects. No external art asset pack is required for the current build.
