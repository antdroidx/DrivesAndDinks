# Drives & Dinks Pickleball

Browser doubles pickleball with original SNES-inspired pixel characters. No runtime dependencies; Node 18+ runs the local server and checks.

## Play and inspect

```sh
npm start
npm test
```

The server prints its local URL (normally `http://127.0.0.1:8768`). Both `/` and `/dev/` serve this **development checkout locally**. GitHub Pages publishes one active build:

- Public release: `https://antdroidx.github.io/DrivesAndDinks/` — unchanged frozen build 15.
- Dev playtest: `https://antdroidx.github.io/DrivesAndDinks/dev/` — the `codex/high-resolution-players` development branch.
- Motion studio: `https://antdroidx.github.io/DrivesAndDinks/dev/studio.html`.

The Pages root remains on frozen build 15 while the randomized-player work is tested under `/dev/`. The experimental preview build is no longer published.

The studio compares male T-shirt/shorts and female tennis-dress players for running, side-step, volley, forehand/backhand drives, forehand/backhand dinks, forehand/backhand drops, overhead smash, lob, and two-handed backhand drive. Select front/back view, change materials, slow playback, pause, scrub, or jump to impact at 52%. Use Ready pose to inspect the net-facing stance and Joints to show the shoulder/elbow/wrist chains. The Zoom control defaults to 75% so complete characters fit inside each comparison card. `studio.html?view=near&pose=ready` opens the back-facing ready comparison. A ball marker approaches and leaves toward the net for the selected court view. The studio uses the same renderer as matches.

## High-density character rendering

The character buffer rasterizes limb and clothing curves on a 3× grid instead of enlarging a 48 × 64 source grid directly. High-quality downsampling maps that detail back to the existing character proportions. The game court uses a 2× backing canvas (1920 × 1200); the studio and player preview use 2× too. This adds desktop detail without increasing the court-space size of the players. A headless desktop check held about 85 FPS at 1440 × 1000.

## Rebuilt character system

`src/pixel-character.js` draws an original 48 × 64 pixel rig using integer scan conversion. Two hip/knee/ankle chains and two shoulder/elbow/wrist chains are shared by all actions. Upper-body joints are solved in body-relative 3D space with fixed bone lengths and downward elbow poles, then projected for the selected court end. Arms and paddles are depth-sorted around the torso, so the near-side back covers forward-held equipment. The far-side view mirrors anatomical right and left; gameplay selects forehand/backhand relative to the player's facing, not the screen. The male wears a short-sleeve T-shirt and shorts; the female wears a sleeveless pleated tennis dress. Near-court players show their backs; far-court players show their faces.

Match receivers start a short anticipation from the incoming-ball forecast; drives retain a full stroke away from the kitchen. Follow-throughs last 0.5–0.9 seconds depending on the shot, with the paddle contact constraint releasing early enough to show the swing. Ball response remains immediate.

Authored stroke paths use continuous cubic Hermite interpolation through anticipation, impact, follow-through, and recovery. Velocity carries through impact. Locomotion runs from distance traveled, independently of frame rate; it continues underneath swings. A two-handed backhand joins both hands to the short paddle grip. Grip style follows archetype and contact situation; both bodies can demonstrate either grip in the studio.

Gameplay now applies the animated pixel 2.5D pass: the high-density silhouette is preserved, identity-specific hair and uniform accents add readable variety, wristbands and socks detail the limbs, and stroke poses shift stance and weight through loading, contact and recovery. A faint top-left warm highlight follows the arena lights, and cool shadow falls through the lower-right. Paddle guards use one solid selected edge color; any shading comes only from the character lighting pass.

At a real hit, the solid paddle face targets the recorded ball contact point and court depth, then releases smoothly into follow-through. Grips point back toward the shoulder in 3D; low contacts bend the torso and knees while the feet stay planted. Targets beyond anatomical reach are limited instead of stretching the forearm. Physics responds immediately; a queued human swing uses a preparation pose. These are procedural animations, not captured athletic motion. Extreme reaches can leave a small paddle-centre alignment offset; the nominal studio contact demonstration does not replace live rally playtesting. Ball height, player height and the net share a perspective scale. Ordinary contacts reach chest height; overhead selection starts at 5.2 court feet, with an overhead reach ceiling of 7.4 feet.

Material palettes independently control clothing, hair, skin, and paddle edge guards. Twelve solid-color guards remain independently selectable; all paddle faces stay black. No source-image hue replacement or generated atlases are used. Retired dev sprite sheets and one-off repair scripts have been removed.

## Match setup and controls

The setup screen has one archetype selector, a preview, fourteen horizontal rating bars (0–100), visible paddle choices, and a collapsible appearance section. Eight visual identities share five distinct playstyles. All playtest archetypes average about 70, with 70 as the neutral dev baseline; paddle power and control effects appear as separate bar deltas and do not alter the underlying archetype profile. A new match generates unique names and kits for the human player's partner and both opponents, and the four roster slots use different cultural name pools. Skin-tone choices overlap broadly within each pool so generated names and complexions stay coherent without mapping a group to one tone. The human player's clothing, hair, skin, paddle guard, and court choices persist locally. Dev abilities derive from the ratings, retaining skilled playtest movement, serve, control and reaction baselines. Mishit probability is rolled separately from hit quality, so a clean rolled contact is not automatically mislabeled a mishit; shot-specific ratings and control provide mishit resistance.

Players move automatically. Aim with mouse, touch, or left/right arrows; hold Shift for fine arrow adjustments. Space swings. Keys 1–3 or the shot buttons select and immediately attempt Attack (drive/high ball), Soft (drop/dink), or Lob. Attack and Soft become hard/soft serves; Lob is unavailable during a serve. The ring turns white when contact is available. Early presses queue briefly; Easy widens the timing window. P or Escape pauses. Play/Watch toggles control or CPU demonstration. Sound unlocks on the first gesture.

## Deployment

`.github/workflows/pages.yml` tests the development branch, restores the frozen public root from `gh-pages`, and packages the current source plus motion studio into `/dev`. `main` remains unchanged while the dev build is validated. Publishing removes the retired experimental preview without changing the public root or rewrites to Git history. All dev modules and studio entry points receive the deployment build number for cache invalidation. A root-scoped service worker makes page navigations network-first and build-numbered modules continue to provide asset cache invalidation. Loading a URL with a fresh query, such as `?v=15`, also escapes any stale browser copy of the HTML. This checkout's root files are dev **source**, not the generated GitHub Pages site.

## Verification and limitations

`node --test` covers game rules, movement, tactics, player/paddle abilities, palette isolation, every motion's continuity, fixed limb counts, two-handed grip, contact constraints, and build versioning. `node scripts/simulate.js 20` runs deterministic match checks. Browser QA should cover both views, all fifteen motions at slow speed, extreme material combinations, live contacts, and desktop/phone layouts.

`src/core.js` handles physics and scoring; `src/game.js` manages matches; `src/tactics.js` plans doubles positioning; `src/main.js` renders and handles input. Simulation advances at 120 Hz. Ball flight now includes velocity-squared drag, Magnus curve, spin decay, radius-aware net contact, and speed-dependent bounce restitution. CPU shot selection uses aggression, Court IQ and relative attack/soft skill. Kitchen faults check the hitter at contact, not subsequent momentum; there is no player collision. Physical-device touch performance and the final athletic feel still require human playtests.


## Public prototype and future development

The public root and `/prototype/` preserve Playable Prototype Build 48 from commit `dd6eae74fc3ae3a32c2d2a15cb27a27e4629124e`, including the public Motion Viewer at `studio.html`. Build 15 is preserved at `/archive/build-15/` from its original frozen commit. The `main` branch is the starting point for future game development, published under `/dev/`; changes there do not replace the frozen prototype. The Pages workflow pins both historical versions explicitly.


## Development gameplay tuning

Replays use a larger centered banner and play at 75% speed. Timing windows (early / late seconds) are Easy 0.60 / 0.20, Normal 0.30 / 0.08, Hard 0.15 / 0.00; Normal is the default, with explicit difficulty choices saved locally. CPU planning includes descending head-height contacts and prioritizes legal overhead attacks. Lobs vary in height and depth; overhead pace and depth depend on technique and contact quality.

Backhand style is independent of gender: bangers use two hands; speed and net styles use one; balanced and soft styles mix grips. Two hands receive power ×1.07, control ×1.08 and topspin ×1.15 with reach ×0.94. One hand receives reach ×1.10 and slice spin ×1.20. Stretched contacts and slices release to one hand. The 13th studio motion, two-handed backhand dink, temporarily shares the drive path. The 14th adds an Erne approach with lateral root travel, an airborne side volley, landing, and recovery. Men’s shorts use a connected bridge beneath the shirt so thigh panels cannot separate during motion.


Shorts and skirt hems are generated from the animated thigh positions, so the lower garment follows the legs through running, sliding, jumping, and recovery instead of remaining a fixed silhouette. The Motion Viewer supports `?pose=impact` to inspect contact and flight poses directly.


The replay banner sits at the top of the playfield so it stays clear of both near-court players on small screens. The tennis dress keeps its original shaded silhouette while tapered thigh roots remain beneath the garment through running and jumping poses. Men’s shorts also retain the established Build 48 renderer and 2.5D lighting pass.


Serve contact now occurs at a forward, waist-height toss point 2.35 court feet above the surface. The serve stroke travels from a low load through upward contact to a high finish, and the serve is available as the 15th Motion Viewer comparison.


Development courts can force a repeatable special-shot look with `?scenario=erne` or `?scenario=atp`. The player moves into position while the ball approaches, then the actual shot animation and physics begin at contact. These URLs exercise the normal game renderer and court rather than the Motion Viewer.
