# DuelByte Arena Game Design

## Concept

DuelByte Arena is a fast local arena battle game where two main competitors fight on the same screen. The game is built for short, readable, high-energy rounds that work well in a live hackathon demo.

## Theme Interpretation

The theme is **Same keyboard. No mercy.** The design leans into shared-device tension: both players are physically close, use different sides of the keyboard, and compete in a small arena where every dodge and shot matters.

## Core Gameplay Loop

1. Choose a mode.
2. Choose an arena.
3. Optionally add neutral arena bots.
4. Start a round after a countdown.
5. Move, shoot, dodge obstacles, collect powerups, and avoid hazards.
6. Win the round by defeating the other main player.
7. First to two round wins becomes champion.

## Win Condition

The main match is best-of-3. Player 1 or Player 2 wins a round when the other main player reaches zero health. Neutral arena bots can damage players, but they do not win rounds.

## Player Controls

Player 1 uses WASD to move and Space to shoot. In Local Duel, Player 2 uses Arrow Keys to move and Enter/Shift to shoot. In Solo vs Bot, Player 2 is AI-controlled.

## Combat Design

Combat is based on projectile shooting. Bullets move quickly enough to feel responsive but still leave room to dodge. Obstacles block bullets, which creates cover and positioning choices.

## Powerup Design

Powerups are designed to be readable and immediately useful:

- Health Core keeps players alive.
- Shield Bubble reduces incoming damage.
- Speed Surge rewards repositioning.
- Mega Shot creates a short offensive spike.

Only one powerup appears at a time so the arena stays understandable.

## Map Design

Each map uses the same core rules but has a distinct identity:

- Cyber Core Arena: clean neon tech duel space.
- Forest Arena: darker organic ruins with root pressure.
- Volcano Rift: aggressive molten battlefield.

This keeps the game easy to learn while making map selection meaningful.

## Dynamic Obstacle Design

Moving obstacles create cover and movement strategy. They are predictable, moderate in speed, and themed to the selected arena. Their purpose is to shape combat, not randomly punish players.

## Hazard/Event Design

Arena hazards trigger during active gameplay with a warning phase before the effect. This makes hazards fair and readable:

- Glitch Lasers deal light damage.
- Root Surge slows players.
- Lava Surge deals light damage.

Hazards add drama without becoming instant-kill traps.

## Bot and AI Design

Solo vs Bot uses AI-controlled Player 2 as the main rival. The AI moves toward Player 1, maintains distance, strafes, and shoots with slight inaccuracy.

Extra arena bots are neutral pressure units. They target human players, shoot lower-damage bullets, and can be destroyed. They are optional so the classic local duel remains stable.

## Round System

Each round begins with a countdown. During the countdown, players are visible but cannot move or shoot. Round results pause combat and let players advance to the next round. The final winner screen appears when one main player reaches two round wins.

## Balancing Philosophy

The game favors clarity and demo impact:

- Rounds should start quickly.
- Damage should be meaningful but not instant.
- Powerups should matter without overwhelming combat.
- Hazards should warn before affecting players.
- Bots should add pressure without replacing the player-vs-player focus.

## Scope Philosophy

The project prioritizes a complete playable loop over a large feature list. The core mechanic is simple projectile combat, supported by enough polish, powerups, hazards, and match flow to feel complete during a 3-5 minute demo.
