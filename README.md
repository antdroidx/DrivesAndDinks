# Drives & Dinks Pickleball

Browser doubles pickleball with original SNES-inspired pixel characters. No runtime dependencies; Node 18+ runs the local server and checks.

## Play and inspect

```sh
npm start
npm test
```

The server prints its local URL (normally `http://127.0.0.1:8768`). Both `/` and `/dev/` serve this **development checkout locally**. GitHub Pages publishes the current `main` source as the public release:

- Public release: `https://antdroidx.github.io/DrivesAndDinks/` — promoted from `main`.
- Dev mirror: `https://antdroidx.github.io/DrivesAndDinks/dev/` — the same current source with development diagnostics.
- Motion studio: `https://antdroidx.github.io/DrivesAndDinks/studio.html`.
- Build 48 prototype: `https://antdroidx.github.io/DrivesAndDinks/prototype/`.
- Build 15 archive: `https://antdroidx.github.io/DrivesAndDinks/archive/build-15/`.

The studio compares male T-shirt/shorts and female tennis-dress players for running, side-step, volley, forehand/backhand drives, forehand/backhand dinks, forehand/backhand drops, overhead smash, lob, and two-handed backhand drive. Select front/back view, change materials, slow playback, pause, scrub, or jump to impact at 52%. Use Ready pose to inspect the net-facing stance and Joints to show the shoulder/elbow/wrist chains. The Zoom control defaults to 75% so complete characters fit inside each comparison card. `studio.html?view=near&pose=ready` opens the back-facing ready comparison. A ball marker approaches and leaves toward the net for the selected court view. The studio uses the same renderer as matches.

## High-density character rendering

The character buffer rasterizes limb and clothing curves on a 3× grid instead of enlarging a 48 × 64 source grid directly. High-quality downsampling maps that detail back to the existing character proportions. The game court uses a 2× backing canvas (1920 × 1200); the studio and player preview use 2× too. This adds desktop detail without increasing the court-space size of the players. A headless desktop check held about 85 FPS at 1440 × 1000.

## Rebuilt character system

`src/pixel-character.js` draws an original 48 × 64 pixel rig using integer scan conversion. Two hip/knee/ankle chains and two shoulder/elbow/wrist chains are shared by all actions. Upper-body joints are solved in body-relative 3D space with fixed bone lengths and downward elbow poles, then projected for the selected court end. Arms and paddles are depth-sorted around the torso, so the near-side back covers forward-held equipment. The far-side view mirrors anatomical right and left; gameplay selects forehand/backhand relative to the player's facing, not the screen. The male wears a short-sleeve T-shirt and shorts; the female wears a sleeveless pleated tennis dress. Near-court players show their backs; far-court players show their faces.

Match receivers start a short anticipation from the incoming-ball forecast; drives retain a full stroke away from the kitchen. Follow-throughs last 0.5–0.9 seconds depending on the shot, with the paddle contact constraint releasing early enough to show the swing. Ball response remains immediate.

Authored stroke paths use continuous cubic Hermite interpolation through anticipation, impact, follow-through, and recovery. Velocity carries through impact. Locomotion runs from distance traveled, independently of frame rate; it continues underneath swings. A two-handed backhand joins both hands to the short paddle grip. Grip style follows archetype and contact situation; both bodies can demonstrate either grip in the studio.

Gameplay now applies the animated pixel 2.5D pass: the high-density silhouette is preserved, identity-specific hair and uniform accents add readable variety, wristbands and socks detail the limbs, and stroke poses shift stance and weight through loading, contact and recovery. A faint top-left warm highlight follows the arena lights, and cool shadow falls through the lower-right. Paddle guards use one solid selected edge color; any shading comes only from the character lighting pass.

At a real hit, the solid paddle face targets the recorded ball contact point and court depth, then releases smoothly into follow-through. Grips point back toward the shoulder in 3D; low contacts bend the torso and knees while the feet stay planted. Targets beyond anatomical reach are limited instead of stretching the forearm. Physics responds immediately; a queued human swing uses a preparation pose. These are procedural animations, not captured athletic motion. Extreme reaches can leave a small paddle-centre alignment offset; the nominal studio contact demonstration does not replace live rally playtesting. Ball height, player height and the net share a perspective scale. Ordinary contacts reach chest height; overhead selection starts at 5.2 court feet, with an overhead reach ceiling of 7.4 feet.

Material palettes independently control clothing, hair, skin, and paddle edge guards. Twelve solid-color guards remain independently selectable; all paddle faces stay black. Six court combinations are available, including the added Black / Gray, Violet / Blue, and Gray / Red palettes. No source-image hue replacement or generated atlases are used. Retired dev sprite sheets and one-off repair scripts have been removed.

DEV uses automatic poaching weighted by Court IQ, volley ability and aggression. Character designer opens from setup; height/build sliders affect appearance and gameplay. Modern procedural venues fill wide screens without stretched image borders. Replays still use front/back characters with pan/zoom; true side profiles require additional rendering work.

## Match setup and controls

The setup screen has one archetype selector, a preview, fourteen horizontal rating bars (0–100), visible paddle-family choices, an independent paddle-shape selector, and a collapsible appearance section. Eight visual identities share five distinct playstyles. All playtest archetypes average about 70, with 70 as the neutral dev baseline; paddle power and control effects appear as separate bar deltas and do not alter the underlying archetype profile. A new match generates unique names and kits for the human player's partner and both opponents, and the four roster slots use different cultural name pools. Skin-tone choices overlap broadly within each pool so generated names and complexions stay coherent without mapping a group to one tone. The human player's clothing, hair, skin, paddle guard, and court choices persist locally. Dev abilities derive from the ratings, retaining skilled playtest movement, serve, control and reaction baselines. Mishit probability is rolled separately from hit quality, so a clean rolled contact is not automatically mislabeled a mishit; shot-specific ratings and control provide mishit resistance.

Players move automatically. Aim with mouse, touch, or left/right arrows; hold Shift for fine arrow adjustments. Space swings. Keys 1–3 or the shot buttons select and immediately attempt Attack (drive/high ball), Soft (drop/dink), or Lob. Attack and Soft become hard/soft serves; Lob is unavailable during a serve. The ring turns white when contact is available. Early presses queue briefly; Easy widens the timing window. P or Escape pauses. Play/Watch toggles control or CPU demonstration. Sound unlocks on the first gesture.

## Deployment

`.github/workflows/pages.yml` tests current `main`, promotes it to the public Pages root, and builds the same source into `/dev`. Build 48 remains available under `/prototype/`, while Build 15 remains under `/archive/build-15/`. Publishing removes the retired experimental preview without rewriting Git history. Release and dev modules and studio entry points receive the deployment build number for cache invalidation. A root-scoped service worker makes page navigations network-first and build-numbered modules continue to provide asset cache invalidation. Loading a URL with a fresh query, such as `?v=76`, also escapes a stale browser copy of the HTML. This checkout's root files are source, not the generated GitHub Pages site.

## Verification and limitations

`node --test` covers game rules, movement, tactics, player/paddle abilities, palette isolation, every motion's continuity, fixed limb counts, two-handed grip, contact constraints, and build versioning. `node scripts/simulate.js 20` runs deterministic match checks. Browser QA should cover both views, all eighteen motions at slow speed, extreme material combinations, live contacts, and desktop/phone layouts.

`src/core.js` handles physics and scoring; `src/game.js` manages matches; `src/tactics.js` plans doubles positioning; `src/main.js` renders and handles input. Simulation advances at 120 Hz. Ball flight now includes velocity-squared drag, Magnus curve, spin decay, radius-aware net contact, and speed-dependent bounce restitution. CPU shot selection uses aggression, Court IQ and relative attack/soft skill. Kitchen faults check the hitter at contact, not subsequent momentum; player collision separation is active. Physical-device touch performance and the final athletic feel still require human playtests.


## Public prototype and future development

`main` is the public release source at the Pages root and is mirrored under `/dev/`. `/prototype/` preserves Playable Prototype Build 48 from commit `dd6eae74fc3ae3a32c2d2a15cb27a27e4629124e`, including its Motion Viewer. Build 15 is preserved at `/archive/build-15/` from its original frozen commit. The Pages workflow builds current source for both the root and `/dev/` while pinning the two historical versions.


## Development gameplay tuning

Automatic replays use a larger centered banner and play at 75% speed. They trigger only for rallies of 20 or more shots, ATPs, Ernes, and match-winning points. Every completed point also creates a manual replay clip exposed by the between-point WATCH REPLAY control; automatic replay preferences do not block that button. Timing windows (early / late seconds) are Easy 0.60 / 0.20, Normal 0.30 / 0.08, Hard 0.15 / 0.00; Normal is the default, with explicit difficulty choices saved locally. CPU planning includes descending head-height contacts and prioritizes legal overhead attacks. Lobs vary in height and depth; overhead pace and depth depend on technique and contact quality.

Backhand style is independent of gender: bangers use two hands; speed and net styles use one; balanced and soft styles mix grips. Two hands receive power ×1.07, control ×1.08 and topspin ×1.15 with reach ×0.94. One hand receives reach ×1.10 and slice spin ×1.20. Stretched contacts and slices release to one hand. The 13th studio motion, two-handed backhand dink, temporarily shares the drive path. The 14th adds an Erne approach with lateral root travel, an airborne side volley, landing, and recovery. Men’s shorts use a connected bridge beneath the shirt so thigh panels cannot separate during motion.


Shorts and skirt hems are generated from the animated thigh positions, so the lower garment follows the legs through running, sliding, jumping, and recovery instead of remaining a fixed silhouette. The Motion Viewer supports `?pose=impact` to inspect contact and flight poses directly.


The replay banner sits at the top of the playfield so it stays clear of both near-court players on small screens. The tennis dress keeps its original shaded silhouette while tapered thigh roots remain beneath the garment through running and jumping poses. Men’s shorts also retain the established Build 48 renderer and 2.5D lighting pass.


Serve contact now occurs at a forward, waist-height toss point 2.35 court feet above the surface. The serve stroke travels from a low load through upward contact to a high finish, and the serve is available as the 15th Motion Viewer comparison.


Development courts can force a repeatable special-shot look with `?scenario=erne` or `?scenario=atp`. The Erne approaches from inside the court toward the outside sideline and holds outside during its recovery pause. The ATP scenario includes an in-court bounce, an outside-sideline chase, a low contact, and a return whose ball crosses the net plane outside the post before landing near the far sideline. Scenarios default to 65% simulation speed; add `&speed=1` for real time. The visual apron is wider than the court to show legal outside-sideline movement. In both cases the actual shot animation and physics begin at contact. These URLs exercise the normal game renderer and court rather than the Motion Viewer.


CPU planning now receives a contact-difficulty estimate based on reach, movement, and contact height. Difficult returns reduce attack preference and can choose a defensive lob. Deep lobs continue to use the shared physics forecast, so recovery speed and reaction delay determine whether a player can reach them.


The ATP demo’s incoming path is scripted separately from live-game physics, but its net crossing is checked to remain above the center/post net profile before the ball bounces and travels outside the sideline.


Movement now integrates acceleration-limited velocity and braking rather than directly snapping to a target velocity. Fast direction changes retain momentum, and partner collision separation prevents sprites from occupying the same court space. Contact difficulty is applied to every return through mishit pressure and CPU attack bias; ATP and Erne returns carry an additional difficulty penalty. Dedicated poach-lunge and sliding-return motions join the Motion Viewer, and shoe/sock geometry ends lower on the ankle.


Serve returns use a dedicated safe target and lower pressure scaling. They remain drives under high return difficulty, with placement constrained away from the sidelines. In a 30-match regression sample this reduced shot-two rally endings from 122 to 4, all of which were unreachable rather than out.


Serve receivers start one foot behind the baseline, remain behind the line during the initial serve presentation, and then move forward under the normal momentum model. A short serve-hold plus the deeper-start allowance prevents players from snapping back inbounds before the return.


Deep receivers avoid the lowest post-bounce contact through contact-quality penalties rather than a hard wait that could strand them. Deep drives struck while the ball is still rising from a bounce carry extra mishit risk and lower pace. Dinks, drops, and resets remain available early. A visual split-step state is triggered near contact when the receiver is close enough, but movement physics continues so preparation cannot make the ball unreachable. The 18th Motion Viewer card demonstrates the split-step.


## Physics contact and collision pass

Paddle contact now responds to sweet-spot offset, incoming pace, paddle velocity, shot direction, Power, Control, Spin, and contact quality. Center contact preserves more pace and control; edge contact introduces twist, aim error, and spin variation before the ball enters flight.

The serve has a physical toss phase, with the ball rising and falling under gravity before the stroke launches it near waist height. The net now absorbs and deflects balls during live play instead of deleting them immediately; a net touch becomes a fault only if the ball subsequently lands on the hitter’s side. Net posts have separate collision geometry, while balls crossing outside the posts remain legal.

Court bounces include surface friction, speed-dependent restitution, and spin decay. Topspin carries speed into the bounce, while backspin and slice check the ball. Player stamina falls during sustained sprinting, reduces speed and contact accuracy, and recovers when the player slows; Agility improves both fatigue resistance and recovery. Stamina partially recovers between points.

Paddle shape is independent from paddle family and archetype. Wide paddles shorten reach slightly while improving hand speed, control, and the side-to-side sweet spot. Elongated paddles increase reach and leverage but slow the swing and narrow the side-to-side sweet spot. Hybrid remains neutral. CPU players receive a random family and shape each match.

Physics regression checks cover paddle sweet-spot behavior, physical serve toss, net deflection, post faults, net-fall faults, outside-post ATP clearance, bounce spin transfer, player momentum, player collision separation, and fatigue recovery.

Fatigue remains part of gameplay, but stamina bars are not displayed.

## DEV level and animation foundation

See [ENGINE-NOTES.md](ENGINE-NOTES.md) for independent competitive ratings, attribute profiles, seeded validation, exertion/contact changes, and the expanded 26-motion studio. Run `npm run validate:levels` for the beginner-through-advanced matrix. The ordinary playable demo retains its approximately 70 baseline; optional DEV test profiles are documented in the notes.


## DEV height and build tradeoffs

Body effects multiply archetype abilities, independently of clothing and gender. The neutral body is 177 cm (about 5 ft 10 in), build slider 45. Height ranges from 145 to 210 cm; the UI shows feet/inches. Taller bodies gain up to 9% horizontal reach and 4% power while losing up to 4% speed, 7% acceleration, 4% endurance and 3% volley skill. Overhead and ordinary contact ceilings scale with height / 177. Shorter bodies reverse these tradeoffs. Broader bodies add up to 10% power while losing up to 6% speed, 12% acceleration, 8% endurance and 4% volley skill; leaner bodies reverse them. Effects combine, so neither extreme is a free upgrade. These are tunable game balance rules, not claims about real athletes. Archetype rating bars stay as the skill foundation; exact body modifiers appear in the designer. Body edits apply immediately and persist into resets and new configured matches.

Low-contact difficulty also scales with stature: taller bodies need more preparation for ankle-height balls, while shorter bodies receive a modest low-contact advantage. High balls just behind the shoulder can select a scorpion-style reflex overhead at a height-scaled threshold, with additional difficulty rather than guaranteed success. This reuses the overhead animation; a dedicated crouch-and-behind-head pose remains future work.


## Current release promotion and frozen Build 122

The current character/court renderer and gameplay now run at both the public root and `/dev/`. The prior public release is frozen under `/archive/build-122/`, copied verbatim from published-site commit `764e17c106be25cc4e75985246ce66fd6313efe0` (Main source `5d488a3187c6ef0857c11be44f47315a3c2a15ab`). The workflow preserves that snapshot on every deployment, including its original build label and cache keys. Build 15 and the Build 48 prototype remain available.


## Singles and doubles

Match setup offers Doubles (2 vs 2) and Singles (1 vs 1). Singles uses the full court, traditional side-out scoring to 11, win by two, a two-number score call and immediate side-out after the server loses a rally. The server starts on their right at an even score and left at an odd score. Both formats retain diagonal serves, mandatory return/third-shot bounces and kitchen rules. Singles has two active athletes in simulation/rendering/replays, center recovery and no partner poaching. Play and CPU demonstration support both formats. The active format survives rematches; select a different format in New Game to change it.
