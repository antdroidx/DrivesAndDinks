# DEV engine foundation pass

The normal demonstration roster remains at its existing approximately 70 baseline. Character artwork, clothing, palettes and rig proportions remain unchanged.

## Profiles and competition

`buildProfile` accepts independently bounded attributes and competitive rating metadata. Abilities derive only from attributes; match history updates only the competition record. The results-based rating helper is our own provisional estimator, not DUPR's calculation. Career progression and cloud saves are not introduced here.

`Game({seed})` owns its random generator. Roster generation, serves, contact errors and AI choices use it. Regression checks prove identical gameplay with different displayed competitive ratings. Match statistics survive event-queue consumption; serve counts are separate from successful rally contacts.

## Balance and contact

Internal profiles use 35/55/70/85 baselines, with archetype offsets. Reaction delay, perception precision, speed, control and technique change with attributes. Serve pace follows serve technique. CPU hitters can wait for an approaching sweet spot rather than always contacting at maximum reach. Soft replies can float under pressure; mishits can find the net. Blocks, counters, low attacks, slices and lobs retain distinct responses.

The previous shot-count error escalation is removed. Exertion follows running and stroke effort, modified by endurance; between-point recovery is partial. Fatigue affects reactions, contact risk and placement. This is a rally/match exertion model, not career condition.

Kitchen checks consider lateral foot clearance and airborne/landing state. ATP selection checks a feasible route outside the post. Erne flight has a finite timer with landing checks. These remain simplified collision/footprint models rather than a full skeletal rules simulation.

## Animation

The existing 18 motions remain. Added: defensive reset block, counter volley, half-volley scoop, wide forehand, wide backhand, backpedal, crossover recovery, and a rare contextual tweener. All are in the shared motion studio and selected from gameplay contact/movement context. Tweeners require a moving advanced lob player and a low ball behind the body; there is no always-available trick-shot button. Existing designs are rendered over the shared connected rig.

## Verification

Run `npm test`, `node scripts/validate-levels.js 12`, and `node scripts/simulate.js 20 --roster`.

The level harness runs mirrored archetypes and alternating starting service over nine equal/mismatched pairings, with a 40-minute simulation cap per match. It rejects incomplete matches and mismatches where the stronger team does not win a majority. Results are written to `engine-balance-results.json`. This is regression evidence, not proof of real-world rating calibration or a guarantee that human games feel identical.

DEV-only browser inspection: append `?level=beginner`, `?level=intermediate`, `?level=demo`, or `?level=advanced`, then start a match. The header labels the test profile. The setup preview remains the standard demo loadout; the test override is applied at match start. Omit the query for the ordinary demo.

The public Pages root continues to package main; DEV packages this development branch. Nothing in this pass promotes DEV to main.

## Interception and tactical placement

DEV interception candidates now run a private athlete copy through the live fixed-step movement integrator. Forecasts include current velocity, acceleration, braking, reaction delay, stroke recovery, stamina, and body-adjusted abilities. A cheap maximum-travel bound rejects impossible candidates first. Contact selection still uses a simplified reach envelope; actual paddle contact and kitchen rules remain authoritative, so a predicted interception never guarantees a hit.

CPU rally placement compares safe lateral lanes and selected low targets near opponents' feet. It considers defensive depth, available space, wrong-way movement, speed, and Court IQ anticipation. Drives also account for an opponent who can intercept the path before the intended landing point. The selected depth now reaches the launch model; manual shots retain their existing depth defaults, and serve returns retain their dedicated safe placement. This is a tactical approximation rather than a full opponent-response search.

Doubles support advances within three feet of a deeper partner behind a drop. Existing middle coverage, lane swaps, and automatic risk-based poaching remain active. Singles baseline drive recovery keeps depth instead of automatically charging the kitchen; recovery still shades toward the next hitting angle.

`Game.visualRandom` is independent from the match random stream. Outdoor dust and extra visual random draws cannot change seeded ball flight, player movement, contact outcomes, or scoring. Tests compare indoor/outdoor runs in both singles and doubles.

Validation: 236 automated tests; 20 mixed watch/play roster matches completed, including 1,056 human-controlled contacts; all 108 level-matrix matches completed and stronger profiles won each mismatched pairing. The roster sample averaged 17.3 shots per rally (95th percentile 38). These samples establish regression behavior, not human playtest quality or real-world rating calibration.

Next engine priorities are player-controlled shot depth, clearer explanations of contact errors, more varied opponent tendencies, and repeatable practice drills. Balance needs attention before career progression: the roster sample ended about 12% of rallies on kitchen momentum faults, while level mismatches strongly favored the higher profile. Movement forecasts also need testing on lower-powered mobile hardware. Backhand-specific targeting, deliberate opponent pattern memory, and full three-dimensional tactical search are not part of this pass.


## DEV shot control and CPU tendencies

Rally shots now support a normalized depth control. Drag horizontally and vertically on BALL CONTROL, or use left/right arrows for aim and up/down for depth; Shift makes either adjustment finer. The neutral depth retains existing targets, with shot-specific shallow/deep ranges. The target marker and replay snapshots retain depth. Serves keep automatic depth. Focused pad keyboard input is handled once, and keyboard use reveals numbered shot hints on hybrid devices.

Mishit feedback identifies the strongest measured contact pressure (reach, movement, fatigue, low/high contact, or incoming pace). It is a risk explanation rather than a claim that randomness had one physical cause. Human feedback is held independently of CPU shot messages for 0.9 seconds.

CPU archetypes now add distinct tactical preferences to their existing ratings: bangers attack more, soft specialists favor patient exchanges and crosscourt placement, net players favor volleys and feet, and runners favor wrong-way recovery. Return safety and difficult-ball defense retain priority. Court IQ also enables a conservative volley-recovery forecast. Movement leaves braking room before volleys and prioritizes braking during their follow-through. Grounded, controlled lateral/rearward recovery can release old volley momentum; actual kitchen contact is checked first and remains a fault. See the [official USA Pickleball rules](https://usapickleball.org/rules/).

Verification: 248 tests passed; all 20 mixed watch/play roster matches and 108 skill-matrix matches completed. The same 12 seeded watch matches completed on both Build 128 and this batch; kitchen momentum faults declined from 32 to 19 (344 versus 363 total rallies). That paired sample is limited evidence, not a guarantee for every matchup. Browser checks verified desktop keyboard input, numbered hints after keyboard use, and two-axis pad input at a 390-by-844 viewport. Additional gameplay work is paused at the user's request while this finished batch is published to DEV.
