# Drives & Dinks Pickleball

An early browser-based doubles pickleball prototype. Four players move automatically; control the near-side player marked with a cyan ring or switch to watch mode.

## Run

Run `node scripts/serve.js` and visit `http://127.0.0.1:8768`. The local server serves only the game files. You can also use another static HTTP server. No runtime packages are required. Run the automated checks with `node --test` (Node.js 18 or newer).

## Choose a player and paddle

The game opens with match setup. Choose from eight originals: Avery Lane, Remy Cruz, Morgan Reed, and Jordan Vale, plus female players Selena Ortiz, Harper Brooks, Quinn Vásquez, and Lena Park. Selecting a female player currently pairs with another female player and uses male opponents; selecting a male player does the reverse. Pick Allcourt (balanced), Ignite (power at a control cost), or Touch (placement and spin at a power cost). The comparison panel shows their combined effects relative to Avery + Allcourt. Jersey colors and Ocean/Ember/Mint paddle finishes affect appearance only, including the in-game sprites. Skin and hair retain the original sprite artwork. The four male and four female players currently use separate original sprite sheets.

Start a playable doubles match or a CPU demonstration. The remaining three characters fill the other positions. PLAYER & PADDLE or NEW GAME opens setup again and pauses the match; BACK TO MATCH resumes, while START NEW MATCH applies the choices and resets the score. Last-used selections are remembered locally in the browser, but character progression is not implemented.

## Force special-shot animations

Open `http://127.0.0.1:8768/?test=animations` for a visual QA mode that loops overhead, forehand, backhand, ATP and Erne swings. Use the SHOT and CHARACTER buttons to compare the clips on a male and female player. Female backhands use a two-handed grip; male backhands are one-handed. The URL also accepts `shot=overhead|forehand|backhand|atp|erne` and `character=avery|selena`. Run `node --test` to verify every forced clip for both character sets.

## Controls

Choose drive, drop, dink, lob, or slice with 1–5 or the on-screen buttons. Move the cyan target left or right on the opposite court with the mouse, arrow keys, or a touch on the court. The target indicates direction rather than the exact landing spot for every shot. Press Space or 1–5—selecting a shot by number also swings—click the court, or use HIT when the ball is within reach. The ring turns white and the display says HIT NOW when contact is available; a slightly early press is buffered. The controlled player serves with the same action; other players serve automatically. Toggle PLAY/WATCH or start a new game with the buttons. On a touchscreen, drag or tap the court to aim, then tap HIT to swing.

Sound unlocks on your first click or keypress; the SOUND button toggles synthesized paddle, bounce, and net effects. Ball trails, bounce rings, and contact flashes help show the ball trajectory.

## Architecture

`src/core.js` contains configurable physics, movement, scoring and rule helpers; `src/game.js` manages the rally and player decisions; `src/main.js` renders and handles input. The simulation advances at a fixed 120 Hz independently of rendering. Court dimensions are in feet and time is in seconds.

## Prototype limitations

This is an early playable experiment, not a rules-certified simulation. AI positioning and shot selection are basic and need playtesting and tuning; movement and reaction settings are configurable per player. Shot timing is a reach window rather than a graded timing meter, and spin is a simplified drag effect. Kitchen faults only check the hitter's location at contact, not momentum or later contact with the zone. Service-line edge cases, partner positioning, and service rotation need continued playtesting. There is no player collision or serve motion validation. Rendering and mobile interaction need testing on real devices. Desktop browser and a phone-sized landscape viewport have been checked; physical Android touch and performance have not been tested. Gameplay and rules should be reviewed before calling this v0.1 complete.

## Contextual plays, special shots and movement

Pressing Swing chooses the best available shot from the circumstance. A high reachable ball can become an automatic overhead. A very wide sideline contact can become an ATP. The same sideline contact, with height and the player near the kitchen, can become an Erne. These are not separate buttons; the player only chooses aim and stroke. Normal shot selection remains drive, drop, dink, lob and slice.

Players also get a short slide during fast lateral recovery. Speed, reach, control and paddle properties still influence contact quality and mishit chance.

## Professional doubles inspiration

The CPU uses deep returns, third-shot drops or drives, transition toward the kitchen, and dinks or attacks based on ball height. The serving team stays back for the return bounce. These are simplified tactical heuristics inspired by [USA Pickleball's third-shot guidance](https://usapickleball.org/pickleball-skills/level-four/third-shot-drive-fifth-shot-drop-and-driving-slice-return/) and [drop placement guidance](https://usapickleball.org/pickleball-skills/level-three/where-to-hit-your-drops/). They are not calibrated from PPA tracking data or individual professional players. Shot flight, error rates, reactions, and movement remain approximations requiring playtesting.

## Repeatable match checks

Run `node --test` for rules, movement, contact, and state checks. Run `node scripts/simulate.js 20` to play 20 deterministic matches (alternating watch mode and simulated human input). The runner reports completed games, rally outcomes, shot distribution, maximum rally length, simulated human hits, and execution time; it exits unsuccessfully if a match fails to finish or the human-side bot never hits. The match count can be 1–1000. These checks exercise game logic, not browser rendering or real touch latency.

A realistic playtest should also cover keyboard and mouse on desktop, plus serving, aiming, shot selection, rallies, and landscape layout on an actual Android device. A mobile-sized browser viewport is only a layout check. The simulation is a tuning aid, not proof of professional realism: very long dink exchanges and an over-reliance on out calls remain possible.


## Abilities, appearance, and equipment foundation

Each player now owns separate `abilities`, `appearance`, and `paddle` settings. Speed, acceleration, reach, reaction delay, and control affect movement, contact, and mishit chance. Paddle power affects drive flight time; spin and control affect spin, placement, and mishit resistance. `appearance.jersey` selects one of the four existing jersey palettes. Defaults are equal for all players. Settings survive between rallies, but there is no character progression or saved career yet.

The selection screen now exposes original character identities, jersey and paddle colors, and equipment tradeoffs. Future development should add distinct character artwork, broader appearance options, progression, and persistent career saves. Keep appearance independent of abilities; store equipment separately from earned player development. New paddle art and dedicated volley/serve sprite sheets can build on the current stroke classification and timing.

Contact is evaluated by distance, current movement, ball height, shot difficulty, control and buffered timing. Higher control makes mishits less likely. A mishit is still a contact, but it travels slower, more slowly recovers its arc, and can be off-target; the display labels it MISHIT. The current animation uses distance-based footwork and a short planted contact stance. Overheads use a raised vertical-strike sequence, forehands use the side-swing sequence, and backhands reverse that sequence with opposite body orientation. Female backhands add a second arm reaching to the grip. ATP and Erne have their own clips. These are assembled from the existing sprite frames and body transforms, not motion-captured stroke mechanics.

## Player/paddle balance smoke test

Run `node scripts/balance.js 12` for 288 deterministic CPU matches covering all twelve combinations, with the candidate tested on both court sides alongside a standard partner against standard opponents. The test requires every match to finish; at twelve or more paired seeds, it flags win rates outside a broad 20–80% band. Results are a balance warning system, not evidence of competitive parity or human performance. The sample `balance-results.json` records the latest check. Run `node scripts/simulate.js 24 --roster` to additionally exercise the roster in watch mode and with simulated human input; the runner reports mishits.

## Doubles movement and poaching

Players shade laterally with the ball, protect the middle when a partner is pulled wide, pinch after drives, and retreat to cover lobs. A short trajectory forecast selects one incoming-ball owner. A kitchen player can poach a reachable middle volley when it offers an interception advantage; the partner covers the vacated lane. Rally coverage may switch temporarily, while scoring/service positions reset correctly for the next serve. Service receivers and the two-bounce opening remain protected. Soft spacing makes the supporting player give room to the hitter.

`src/tactics.js` contains these decisions. The match runner reports poach attempts, actual poach hits, coverage swaps and off-ball travel; runs of twenty or more games fail if no poach contacts occur. The positioning is still heuristic and should be tuned through human playtests.

Keyboard aim now moves about 2.5 court feet per arrow press, adjusted by combined player/paddle control: higher control gives slightly smaller, more precise steps. Shift + arrow uses quarter-size fine adjustments; mouse and touch aim remain continuous. Slice (5) is a deep backspin shot with a lower rebound and modest speed loss on the bounce. Spin behavior remains a simplified game model.
