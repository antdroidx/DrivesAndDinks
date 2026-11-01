# Drives & Dinks Pickleball

Browser doubles pickleball with original SNES-inspired pixel characters. No runtime dependencies; Node 18+ runs the local server and checks.

## Play and inspect

```sh
npm start
npm test
```

The server prints its local URL (normally `http://127.0.0.1:8768`). Both `/` and `/dev/` serve this **development checkout locally**. GitHub Pages keeps the public release separate:

- Public: `https://antdroidx.github.io/DrivesAndDinks/` — frozen build 15.
- Playtests: `https://antdroidx.github.io/DrivesAndDinks/dev/` — current main branch.
- Motion studio: `https://antdroidx.github.io/DrivesAndDinks/dev/studio.html`.

The studio compares male T-shirt/shorts and female tennis-dress players for running, side-step, volley, forehand/backhand drives, forehand/backhand dinks, forehand/backhand drops, overhead smash, lob, and two-handed backhand drive. Select front/back view, change materials, slow playback, pause, scrub, or jump to impact at 52%. Use Ready pose to inspect the net-facing stance and Joints to show the shoulder/elbow/wrist chains. `studio.html?view=near&pose=ready` opens the back-facing ready comparison. A ball marker approaches and leaves toward the net for the selected court view. The studio uses the same renderer as matches.

## Higher-density desktop experiment

Branch `codex/high-resolution-players` starts from the tagged good animation base `dev-build-40-good-base`. `/dev` remains on build 40 while this experiment is reviewed. The character buffer rasterizes limb and clothing curves on a 3× grid instead of enlarging a 48 × 64 source grid directly. High-quality downsampling maps that detail back to the existing character proportions. The game court uses a 2× backing canvas (1920 × 1200); the studio and player preview use 2× too. This adds desktop detail without increasing the court-space size of the players. A headless desktop check held about 85 FPS at 1440 × 1000.

## Rebuilt character system

`src/pixel-character.js` draws an original 48 × 64 pixel rig using integer scan conversion. Two hip/knee/ankle chains and two shoulder/elbow/wrist chains are shared by all actions. Upper-body joints are solved in body-relative 3D space with fixed bone lengths and downward elbow poles, then projected for the selected court end. Arms and paddles are depth-sorted around the torso, so the near-side back covers forward-held equipment. The far-side view mirrors anatomical right and left; gameplay selects forehand/backhand relative to the player's facing, not the screen. The male wears a short-sleeve T-shirt and shorts; the female wears a sleeveless pleated tennis dress. Near-court players show their backs; far-court players show their faces.

Match receivers start a short anticipation from the incoming-ball forecast; drives retain a full stroke away from the kitchen. Follow-throughs last 0.5–0.9 seconds depending on the shot, with the paddle contact constraint releasing early enough to show the swing. Ball response remains immediate.

Ten stroke paths use continuous cubic Hermite interpolation through anticipation, impact, follow-through, and recovery. Velocity carries through impact. Locomotion runs from distance traveled, independently of frame rate; it continues underneath swings. A two-handed backhand joins both hands to the short paddle grip. The match currently uses this grip for female backhand drives; both bodies can demonstrate it in the studio.

At a real hit, the solid paddle face targets the recorded ball contact point and court depth, then releases smoothly into follow-through. Grips point back toward the shoulder in 3D; low contacts bend the torso and knees while the feet stay planted. Targets beyond anatomical reach are limited instead of stretching the forearm. Physics responds immediately; a queued human swing uses a preparation pose. These are procedural animations, not captured athletic motion. Extreme reaches can leave a small paddle-centre alignment offset; the nominal studio contact demonstration does not replace live rally playtesting. Ball height, player height and the net share a perspective scale. Ordinary contacts reach chest height; overhead selection starts at 5.2 court feet, with an overhead reach ceiling of 7.4 feet.

Material palettes independently control clothing, hair, skin, and paddle edge guards. Twelve guards pair the chosen base color with a contrasting accent; all paddle faces stay black. No source-image hue replacement or generated atlases are used. Retired dev sprite sheets and one-off repair scripts have been removed; the frozen public release retains its own assets.

## Match setup and controls

The setup screen has one player selector, a preview, seven horizontal rating bars (0–100), and collapsed equipment/appearance sections. Eight original players and three paddles retain distinct abilities and tradeoffs. Clothing, hair, skin, paddle guard, and court choices affect appearance only. Submitted selections persist locally. This dev playtest uses a skilled roster: control ×1.42, serve ×1.30, speed ×1.18, acceleration ×1.15, and reaction delay ×0.72. These adjustments apply to all four players and appear in the rating bars. Mishit probability is rolled separately from hit quality, so a clean rolled contact is not automatically mislabeled a mishit; high control provides stronger mishit resistance.

Players move automatically. Aim with mouse, touch, or left/right arrows; hold Shift for fine arrow adjustments. Space swings. Keys 1–3 or the shot buttons select and immediately attempt Attack (drive/high ball), Soft (drop/dink), or Lob. Attack and Soft become hard/soft serves; Lob is unavailable during a serve. The ring turns white when contact is available. Early presses queue briefly; Easy widens the timing window. P or Escape pauses. Play/Watch toggles control or CPU demonstration. Sound unlocks on the first gesture.

## Deployment

`.github/workflows/pages.yml` tests main, copies public build 15 from immutable commit `2efbddc8f4b56546e0b2ef9a108db7e6f42ee3ab` into the site root, and packages current source plus the motion studio exclusively into `/dev`. Publishing replaces the generated site tree, removing obsolete dev assets. It does not rewrite Git history. All current modules and the studio entry points receive the deployment build number for cache invalidation. This checkout's root files are dev **source**, not the public GitHub Pages release.

## Verification and limitations

`node --test` covers game rules, movement, tactics, player/paddle abilities, palette isolation, every motion's continuity, fixed limb counts, two-handed grip, contact constraints, and build versioning. `node scripts/simulate.js 20` runs deterministic match checks. Browser QA should cover both views, all twelve motions at slow speed, extreme material combinations, live contacts, and desktop/phone layouts.

`src/core.js` handles physics and scoring; `src/game.js` manages matches; `src/tactics.js` plans doubles positioning; `src/main.js` renders and handles input. Simulation advances at 120 Hz. Ball flight, spin, AI positioning and reaction are simplified. Kitchen faults check the hitter at contact, not subsequent momentum; there is no player collision. Physical-device touch performance and the final athletic feel still require human playtests.
