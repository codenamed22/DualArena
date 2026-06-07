# DuelByte Arena Testing Checklist

Use this checklist before recording or submitting the project.

## Setup Checks

- `npm install` completes successfully.
- `npm run dev` starts the Vite dev server.
- The game opens in a desktop browser.
- The canvas is centered and visible.
- Browser zoom is at 100%.

## Build Checks

- `npm run build` completes successfully.
- `npm run preview` serves the production build.
- No build artifacts need to be committed unless the submission rules require them.

## Menu and Selection Checks

- Menu loads without console errors.
- Enter opens Mode Select.
- `1` selects Local Duel.
- `2` selects Solo vs Bot.
- Map Select shows Cyber Core, Forest Arena, and Volcano Rift.
- `1`, `2`, and `3` select the correct maps.
- Bot Select accepts `0`, `1`, `2`, and `3`.
- Esc/Backspace returns to the previous selection screen.

## Gameplay Checks

- Countdown appears before combat.
- Players cannot move or shoot during countdown.
- P1 moves with WASD.
- P1 shoots with Space.
- In Local Duel, P2 moves with Arrow Keys.
- In Local Duel, P2 shoots with Enter/Shift.
- In Solo vs Bot, P2 moves and shoots automatically.
- Players stay inside the arena.
- Bullets disappear outside the arena.
- Bullets reduce health when they hit.
- Health bars update correctly.

## Powerup Checks

- Health Core restores health without exceeding max health.
- Shield Bubble reduces incoming damage.
- Speed Surge temporarily increases movement speed.
- Mega Shot temporarily increases shot power.
- Powerups respawn after pickup.
- Powerups are readable and do not spawn obviously inside obstacles.

## Map Checks

Test each map:

- Cyber Core Arena loads and displays correctly.
- Forest Arena loads and displays correctly.
- Volcano Rift loads and displays correctly.
- Moving obstacles appear and move predictably.
- Obstacles block players.
- Obstacles destroy bullets.

## Hazard Checks

- Cyber Glitch Lasers show warning before activation.
- Forest Root Surge shows warning before slowing.
- Volcano Lava Surge shows warning before damage.
- Hazards do not activate during countdown.
- Hazards stop when the round ends.
- Shields reduce/block hazard damage according to the current game logic.

## Bot Checks

- 0 extra bots preserves the classic duel.
- 1 extra bot moves and shoots.
- 2 extra bots work without cluttering the game too much.
- 3 extra bots are chaotic but playable.
- Players can destroy neutral bots.
- Neutral bots do not become match winners.
- Solo vs Bot plus extra bots still ends with P1 or P2 as the winner.

## Round and Winner Flow Checks

- Round ends when P1 or P2 reaches zero health.
- Round result overlay appears.
- Enter starts the next round.
- Scores carry across rounds.
- First to 2 round wins reaches the champion screen.
- `R` restarts the same match setup.
- Enter from the champion screen returns to map selection.

## Browser Console Checks

- No red console errors during menu flow.
- No red console errors during gameplay.
- No red console errors after restarting a match.
- No red console errors after changing maps/modes.

## Final Demo Readiness Checklist

- Use Local Duel + 0 bots first for clarity.
- Use Solo vs Bot if only one presenter is available.
- Use 1 extra bot for a controlled chaos showcase.
- Keep demo browser ready before presenting.
- Have a 60-90 second backup script prepared.
- Avoid starting with 3 bots unless the judges specifically ask for chaos.

## Suggested Smoke Test Sequence

1. Open the game.
2. Enter -> Local Duel -> Cyber Core -> 0 bots.
3. Move both players and fire shots.
4. Collect one powerup.
5. Wait for one hazard event.
6. Finish a round.
7. Press Enter for next round.
8. Press R to restart match.
9. Return and test Solo vs Bot -> Volcano -> 1 bot.
10. Reach or show the champion screen.
