# DuelByte Arena Demo Script

This script is designed for a 3-5 minute hackathon demo. The safest demo path is to start with a clean Local Duel round, then show Solo vs Bot and optional arena bots as stretch features.

## Pre-Recording Checklist

- Run `npm install` if dependencies are not installed.
- Run `npm run dev`.
- Open the local Vite URL in a desktop browser.
- Keep browser zoom at 100%.
- Test fullscreen with `F` if using it in the recording.
- Confirm audio is enabled after the first key press or click.
- Test that Enter advances from menu, mode, map, and bot selection.
- Test P1 movement/shooting: WASD + Space.
- Test P2 movement/shooting in Local Duel: Arrow Keys + Enter/Shift.
- Keep a backup browser tab ready at the menu.

## 3-5 Minute Demo Flow

### 1. Opening Menu

Action:

- Start on the DuelByte Arena menu.
- Press Enter.

Voiceover:

"This is DuelByte Arena, our local same-screen arena game for the Multiplayer & Social Games track. The theme is Same keyboard. No mercy, so the core experience is two players fighting on one keyboard in a fast best-of-3 duel."

### 2. Mode Selection

Action:

- Show the mode selection screen.
- Press `1` for Local Duel.

Voiceover:

"The main mode is Local Duel: two human players sharing the same keyboard. We also added Solo vs Bot so the game can still be demonstrated by one person."

### 3. Map Selection

Action:

- Show all three map cards.
- Press `1` for Cyber Core Arena.

Voiceover:

"The game includes three arenas: Cyber Core, Forest Arena, and Volcano Rift. Each has a different visual theme, moving obstacles, and a map-specific hazard event."

### 4. Bot Selection

Action:

- Show Extra Arena Bots.
- Press `0` for the cleanest first demonstration.

Voiceover:

"Before a match, we can add optional neutral arena bots. For the first round, I’ll keep it classic with zero extra bots so the local duel is easy to read."

### 5. Countdown and Core Combat

Action:

- Let the countdown play.
- Move P1 with WASD.
- Move P2 with Arrow Keys.
- Shoot with Space and Enter/Shift.
- Intentionally land a few hits.

Voiceover:

"Each round starts with a countdown so both players are ready. Movement is responsive, diagonal movement is normalized, and players shoot energy projectiles in their facing direction. The HUD tracks health, round number, timer, and best-of-3 score."

### 6. Powerups

Action:

- Move one player into a powerup.
- If possible, show Health Core, Shield Bubble, Speed Surge, or Mega Shot.

Voiceover:

"Powerups create momentum swings. Health restores health, Shield reduces damage, Speed helps reposition, and Mega Shot makes attacks more dangerous for a short time."

### 7. Hazards and Dynamic Obstacles

Action:

- Keep the round alive until a warning banner appears.
- Let the hazard activate.
- Move around a moving obstacle or use it as cover.

Voiceover:

"The arenas are not just backgrounds. Moving obstacles block players and bullets, while map events add pressure after a warning phase. Cyber Core has Glitch Lasers, Forest has Root Surge, and Volcano has Lava Surge."

### 8. Round Result

Action:

- Finish a round.
- Show the round result overlay.
- Press Enter for the next round if needed.

Voiceover:

"Rounds end when one of the main players is defeated. The match is best-of-3, so the first player to win two rounds becomes the champion."

### 9. Solo vs Bot and Extra Bot Showcase

Action:

- Press `R` or use the champion flow if already available.
- Return to selection.
- Choose Solo vs Bot.
- Pick a different map, such as Volcano Rift.
- Select `1` extra arena bot.
- Show P2 AI movement/shooting and the neutral bot.

Voiceover:

"For demos or solo testing, Solo vs Bot replaces Player 2 with an AI rival that can move, shoot, and win the match. Extra arena bots are separate neutral enemies, so they add chaos without becoming the official winner."

### 10. Champion Screen

Action:

- Finish or cut to the champion screen if time is short.

Voiceover:

"The final result is a complete playable local arena game: controls, combat, powerups, hazards, round flow, and a winner screen."

## 60-90 Second Short Version

1. Show the title screen.
2. Press Enter, choose Local Duel.
3. Pick Cyber Core Arena.
4. Select 0 bots.
5. Show countdown, movement, shooting, health loss, and one powerup.
6. Mention the three maps and hazards while moving around obstacles.
7. Finish or show a round result.
8. Quickly mention Solo vs Bot and optional extra bots as stretch features.

Short voiceover:

"DuelByte Arena is a same-keyboard local battle game. Two players move, shoot, collect powerups, and survive arena hazards in a best-of-3 match. We built Local Duel for two players, Solo vs Bot for one-player demos, three themed arenas, dynamic obstacles, four powerups, optional neutral bots, and a final champion screen."

## Live Demo Backup Plan

- If two players are not available, use Solo vs Bot.
- If the round is taking too long, choose 1-2 extra arena bots to add pressure.
- If visuals are too chaotic, use Cyber Core with 0 bots.
- If audio does not start, click once or press a key to unlock browser audio.
- If fullscreen causes issues, keep the browser windowed at 100% zoom.
