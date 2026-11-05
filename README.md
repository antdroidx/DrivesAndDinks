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

Body effects multiply archetype abilities, independently of clothing and gender. The neutral body is 177 cm (about 5 ft 10 in), build slider 45. Height ranges from 145 to 210 cm; the UI shows feet/inches. Taller bodies gain up to 9% horizontal/forward reach and 3% power potential, with up to 2.5% slower acceleration and greater low-ball difficulty when rushed. Stature does not separately reduce top speed, endurance or volley skill. Overhead and ordinary contact ceilings scale with height / 177. Shorter bodies reverse these tradeoffs. Broader bodies add up to 6% power potential while losing up to 3% acceleration; leaner bodies reverse those effects. Build does not directly change top speed, endurance or volley skill. Effects combine, so neither extreme is a free upgrade. These are tunable game balance rules, not claims about real athletes. Archetype rating bars stay as the skill foundation; exact body modifiers appear in the designer. Body edits apply immediately and persist into resets and new configured matches.

Low-contact difficulty also scales with stature and preparation: taller bodies need more preparation for ankle-height balls, while shorter bodies receive a modest low-contact advantage. Standing, rested players incur 35% of the stature-specific adjustment; movement and fatigue increase it. High balls just behind the shoulder can select a scorpion-style reflex overhead at a height-scaled threshold, with additional difficulty rather than guaranteed success. This reuses the overhead animation; a dedicated crouch-and-behind-head pose remains future work.


## Current release promotion and frozen Build 122

The current character/court renderer and gameplay now run at both the public root and `/dev/`. The prior public release is frozen under `/archive/build-122/`, copied verbatim from published-site commit `764e17c106be25cc4e75985246ce66fd6313efe0` (Main source `5d488a3187c6ef0857c11be44f47315a3c2a15ab`). The workflow preserves that snapshot on every deployment, including its original build label and cache keys. Build 15 and the Build 48 prototype remain available.


## Singles and doubles

Match setup offers Doubles (2 vs 2) and Singles (1 vs 1). Singles uses the full court, traditional side-out scoring to 11, win by two, a two-number score call and immediate side-out after the server loses a rally. The server starts on their right at an even score and left at an odd score. Both formats retain diagonal serves, mandatory return/third-shot bounces and kitchen rules. Singles has two active athletes in simulation/rendering/replays, center recovery and no partner poaching. Play and CPU demonstration support both formats. The active format survives rematches; select a different format in New Game to change it.


## DEV practice and reports

In New Game → Match mode, choose Deep return, Third-shot drop, or Kitchen reset under Practice. Each session supplies ten repeatable feeds and a visible target. Use the normal shot buttons and aim/depth controls; the two soft drills begin with a short depth setting. Repeat Drill repeats the feed sequence, while New Game returns to match setup.

Settings → Download Report exports the current session as JSON. The completion screen also offers a report and a short summary. Reports include contacts, rally/fault outcomes, player/body/paddle attributes, and practice attempts; they remain separate from the sound/UI queue and are bounded in memory. Nothing is uploaded automatically or retained after a page reload.


## DEV adaptive opponents and validation

CPU players gradually anticipate repeated placement and lobs using observed balls from the current match. Court IQ controls their small recovery-position adjustments. Changing direction can catch them leaning; serves and unseen aim inputs are excluded. Learning resets for a new match and is included in Download Report.

Run `npm run validate:matchups` for mirrored singles/doubles body and archetype checks, or `npm run profile:engine` for CPU update/replay/journal timing. Saved samples are in `validation/`. The CPU timings exclude rendering and real mobile hardware. Body extremes still need playtesting, particularly short/lean and tall/broad singles matchups.


## DEV sideline replays

Wide-screen ball replays now use a sideline camera with purpose-drawn anime profiles and 3D limb poses. ANGLE switches between Sideline and Overview during playback. Portrait screens and kitchen-foot faults begin in Overview. Pause/Resume (or P) freezes replay time; Space/Escape skips. Shot/aim controls are hidden during replays.

The sideline scene uses the selected two-tone court colors and a clean surround. Anime Pixel retains palette-quantized, crisp character edges. Impact cues distinguish clean, pressured, off-center, and mishit contacts; replay labels last briefly for readability.

On DEV, `?test=sideline-replay` opens a frozen, simulated replay inspector. `&at=2` selects another playback time; `&art=anime-pixel` checks the pixel treatment. Use the ordinary DEV URL for animated gameplay and replays.

Ordinary replays now run at normal speed. Only measured close line, kitchen-foot or net contacts slow briefly, with a CLOSE CALL / SLOW-MO indicator during that window. The camera remains stationary through the outcome. Add `&play=1` to the inspector to watch its simulated clip animate.

Singles players can approach behind a clean deep return or a suitable deep pressure drive. Decisions use Court IQ, stamina, reach, volley ability, paddle shape and the opponent's position. CPU singles returns can select passing drives, and a reachable rising bounce can be given a brief preparation window. Interception forecasts now check the live paddle contact volume and grounded kitchen clearance, including mid-height forehand volleys.

The saved `validation/singles-tactics-*.json` samples compare tall/broad singles against neutral bodies and include separate validation seeds. Scoring improved in the paired sample, but tall/broad singles remains substantially disadvantaged. Those samples precede the recovery balance pass below. Actual mobile rendering performance and human balance testing remain outstanding.

## DEV recovery balance

Aware singles players brake their recovery run shortly before an expected opponent contact, using their actual speed, acceleration and stamina. They retain momentum while braking and still react to the next shot under normal movement rules. Current-ball interception and serving bounce requirements keep priority. Download Report includes `recoverySets` and matching journal events.

CPU attack selection now measures ball height above the court, while overhead reach, scorpion opportunities and low-contact difficulty still scale with stature. Taller players retain reach/power gains and slower first steps, with fewer stacked movement penalties. Exact modifiers remain visible in the character designer.

Tall/broad singles improved from 3/48 to 9/48 wins in the paired seeds, and from 3/48 to 11/48 in separate validation seeds. This remains an open balance issue. See `validation/recovery-*.json` for body/skill matrices, contact diagnostics and CPU profiling. `node scripts/diagnose-body.js 2 --output validation/body-diagnostic.json` isolates movement abilities for investigation; its temporary ability overrides are confined to that diagnostic script.

## DEV swing mechanics and body tradeoffs

Attacking shot power now combines strength potential with generated paddle speed. Shot-specific technique contributes to swing speed; equipment hand speed has a smaller effect. Fatigue, contact pressure and poor timing reduce fluidity. A skilled player with less raw strength can out-hit a stronger player with weaker mechanics. The model also sets attacking stroke duration and paddle velocity; it does not read animation frames to create physics. Dinks, drops and serves retain their existing launch paths.

Longer reach now helps forward interception as well as lateral coverage. Hit detection, contact difficulty and mishit calculations share one grip-aware contact volume. Kitchen and bounce rules still apply. Height/build chiefly trade reach and strength potential against acceleration/braking, with stature-related low-ball difficulty reduced by preparation. Fitness and hand skill remain rating-driven.

Reports include attacking `mechanics` components and horizontal `pace` on hit events. These are normalized game factors, not measured biomechanics. Tall/broad singles improved from 9/48 to 16/48 wins in the paired sample and 11/48 to 14/48 in separate seeds. Further samples show 27/48 short/broad singles wins and 29/48 tall/broad doubles wins; body/archetype balance still needs human playtesting. Saved results and intermediate comparisons are in `validation/mechanics-*.json`.


## DEV stationary replay framing

Automatic and point replays now use one stable full-court view. Sideline and Overview remain selectable, but neither angle zooms toward the ball. Fault and contact markers appear in place, while close calls retain their brief normal slow-motion window. This is an accessibility/motion-comfort change; replay timing and scoring are unchanged.

## DEV teamwork, serves, returns and replay motion

CPU serves vary hard/soft pace, body/wide placement and depth with serve ability, Court IQ and aggression. Human serve buttons and aim retain manual control. CPU returns use shot-specific depth and open-court placement, adding depth margin under pressure. Both court ends use mirrored targets.

Doubles third shots evaluate height, balance, pressure, opponent depth, partner readiness and attack/soft skills. Fifth and later serving-team transition shots can reset until both players can advance. Weak approaches hold teammates level with the deeper player; players prepare to brake before opponent contact. The recent hitter retains their recovery corridor, and the volley predictor uses the live braking/momentum rules.

Replay playback interpolates positions, velocity, stride, swing/preparation and animation time between recorded frames. Contacts and ball events retain additional exact-time frames; hits, bounces, net and post impacts remain discrete. Render samples cannot mutate recordings or consume match randomness. Automatic and point replays remain stationary; Sideline/Overview stays selectable.

`node scripts/validate-transitions.js` collects live serve/return landing depth, third/fifth decisions, support roles and rally outcomes. See `ENGINE-HANDOFF.md` for integration status and `validation/combined-*.json` for this batch's results. Prior recovery-pass evidence is preserved separately in `validation/previous-volley-pass/`.

## Doubles side ownership

Partners hold their assigned sides through ordinary kitchen exchanges. A middle reach no longer automatically switches coverage. Poaches require a useful interception advantage and attacking opportunity, and actual side changes require a genuine crossing during a poach, lob recovery or emergency rescue. Recent switches discourage an immediate poach back. Each point restores the normal serving/receiving sides; stacking is not implemented. `node scripts/validate-doubles-sides.js 8` measures actual kitchen order changes separately from poach attempts.
