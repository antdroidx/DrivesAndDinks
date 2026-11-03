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
