# Drives & Dinks Pickleball

An early browser-based doubles pickleball prototype. Four players move automatically; control the near-side player marked with a cyan ring or switch to watch mode.

## Run

Serve this directory with a local HTTP server, for example `python -m http.server 8000`, then visit `http://localhost:8000`. No runtime packages are required. Run the automated checks with `node --test` (Node.js 18 or newer).

## Controls

Choose drive, drop, dink, or lob with 1–4 or the on-screen buttons. Move the cyan target left or right on the opposite court with the mouse, arrow keys, or a touch on the court. The target indicates direction rather than the exact landing spot for every shot. Press Space, click the court, or use HIT when the ball is within reach. The ring turns white and the display says HIT NOW when contact is available; a slightly early press is buffered. The controlled player serves with the same action; other players serve automatically. Toggle PLAY/WATCH or start a new game with the buttons. On a touchscreen, drag or tap the court to aim, then tap HIT to swing.

## Architecture

`src/core.js` contains configurable physics, movement, scoring and rule helpers; `src/game.js` manages the rally and player decisions; `src/main.js` renders and handles input. The simulation advances at a fixed 120 Hz independently of rendering. Court dimensions are in feet and time is in seconds.

## Prototype limitations

This is an early playable experiment, not a rules-certified simulation. AI positioning and shot selection are basic and need playtesting and tuning; reaction time and acceleration are not independently configurable. Shot timing is a reach window rather than a graded timing meter, and spin is a simplified drag effect. Kitchen faults only check the hitter's location at contact, not momentum or later contact with the zone. Service-line edge cases, partner positioning, and service rotation need continued playtesting. There is no player collision or serve motion validation. Rendering and mobile interaction need testing on real devices. Desktop browser and a phone-sized landscape viewport have been checked; physical Android touch and performance have not been tested. Gameplay and rules should be reviewed before calling this v0.1 complete.

## Professional doubles inspiration

The CPU uses deep returns, third-shot drops or drives, transition toward the kitchen, and dinks or attacks based on ball height. The serving team stays back for the return bounce. These are simplified tactical heuristics inspired by [USA Pickleball's third-shot guidance](https://usapickleball.org/pickleball-skills/level-four/third-shot-drive-fifth-shot-drop-and-driving-slice-return/) and [drop placement guidance](https://usapickleball.org/pickleball-skills/level-three/where-to-hit-your-drops/). They are not calibrated from PPA tracking data or individual professional players. Shot flight, error rates, reactions, and movement remain approximations requiring playtesting.
