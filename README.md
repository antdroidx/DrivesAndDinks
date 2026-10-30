# Drives & Dinks Pickleball

An early browser-based doubles pickleball prototype. Four players move automatically; control the near-side player marked with a yellow indicator or switch to watch mode.

## Run

Serve this directory with a local HTTP server, for example `python -m http.server 8000`, then visit `http://localhost:8000`. No runtime packages are required. Run the automated checks with `node --test` (Node.js 18 or newer).

## Controls

Choose drive, drop, dink, or lob with 1–4 or the on-screen buttons. Aim left/right with the mouse, arrow keys, or a touch on the court. Press Space, click/tap the court, or use HIT when the ball is within reach. The controlled player serves with the same action; other players serve automatically. Toggle PLAY/WATCH or start a new game with the buttons. Touching the court both aims and swings.

## Architecture

`src/core.js` contains configurable physics, movement, scoring and rule helpers; `src/game.js` manages the rally and player decisions; `src/main.js` renders and handles input. The simulation advances at a fixed 120 Hz independently of rendering. Court dimensions are in feet and time is in seconds.

## Prototype limitations

This is an early playable experiment, not a rules-certified simulation. AI positioning and shot selection are basic and need playtesting and tuning; reaction time and acceleration are not independently configurable. Shot timing is a reach window rather than a graded timing meter, and spin is a simplified drag effect. Kitchen faults only check the hitter's location at contact, not momentum or later contact with the zone. Service-line edge cases, partner positioning, and service rotation require more coverage. There is no player collision or serve motion validation. Rendering and mobile interaction need testing on real devices. A browser playtest was not completed in this development environment. Gameplay and rules should be reviewed before calling this v0.1 complete.
