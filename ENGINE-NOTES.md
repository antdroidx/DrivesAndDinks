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

Verification: 248 tests passed; all 20 mixed watch/play roster matches and 108 skill-matrix matches completed. The same 12 seeded watch matches completed on both Build 128 and this batch; kitchen momentum faults declined from 32 to 19 (344 versus 363 total rallies). That paired sample is limited evidence, not a guarantee for every matchup. Browser checks verified desktop keyboard input, numbered hints after keyboard use, and two-axis pad input at a 390-by-844 viewport. This batch was published as DEV Build 129; roadmap work subsequently resumed at the user's request.


## Practice sessions and match journal

New Game → Match mode now includes three ten-ball practice sessions: Deep return, Third-shot drop, and Kitchen reset. Each uses a fixed, repeatable feed sequence, a brief ready period, normal automatic movement, the existing contact/timing model, and shared launch/flight/bounce physics. Targets are drawn on court; success requires the prescribed shot and its first landing inside the target. Soft drills start with a shorter depth setting aimed into the actual kitchen, and the normal depth control remains available. Missed feeds advance, pause freezes the drill, and Repeat Drill restores the feed sequence. Contact randomness is still part of gameplay; repeating feeds does not force identical shot outcomes.

Practice has one athlete per side and its own attempt results. It does not award match points, fabricate a match winner, or update competitive ratings. The coach supplies ball feeds rather than competing for the next return. Ten attempts lead to a session summary and a report; New Game returns to regular singles/doubles or CPU demonstrations.

Every match now has a bounded journal independent from the short-lived sound/UI event queue. It retains up to 2,048 detailed events and 512 rally summaries, with explicit truncation counts and monotonically increasing sequence numbers. Contact entries include player, shot, quality, difficulty, contact position, and intended placement. Rally summaries include outcome, reason, duration, contact count, and mishits. Stats retain their existing full-match aggregation.

Download Report is available in Settings and on the completion screen. The versioned JSON contains build, initial match seed when supplied, format/mode/difficulty, roster attributes and body/paddle settings, stats, tactics, journal, and practice results when relevant. It is a local download; sessions are not stored across page reloads. Completed reports cap elapsed time at the final recorded outcome rather than adding time spent on the result screen. This is diagnostic history rather than a full state-replay or career-save format.

Verification: 258 automated tests passed; all 20 mixed watch/play roster matches completed. Practice tests cover reachable feeds for all three drills, ten-attempt completion with or without input, actual kitchen landing targets, mandatory-bounce faults, pause/restart/exit, deterministic feed sequences, legal net touches, report serialization, event-queue independence, and retention limits. Browser checks confirmed mode selection, the ready period, target overlay, completion screen, and a downloaded ten-attempt JSON report. Seeded comparison confirms journal recording/export does not alter match outcomes or random state.

At Build 130, the remaining roadmap before career included opponent pattern memory with imperfect Court IQ-based adaptation; rating/body matchup balance across singles and doubles; low-powered mobile performance checks; richer replay-facing character views and contact readability. Practice can later expand into moving targets, lob recovery, and multi-shot sequences. Persistent progression and career scheduling remain deferred until these foundations are playtested.


## Adaptive opponents, body balance and engine profiling

`OpponentMemory` records observed landings or interception positions once per shot. It ignores serves, invalid positions, and practice sessions. It never reads the opponent's aim or depth controls. Each player retains up to 16 observations, with recency weighting, a four-observation learning threshold, capped confidence, and separate lateral/lob estimates. Memory is match-local, persists across points, resets on a new match, and appears in exported reports.

CPU-controlled players use Court IQ to bias recovery before the next opponent contact. They still move under normal acceleration, braking, stamina and kitchen constraints. Maximum full-confidence offsets are 1.5 feet laterally in singles, 1 foot in doubles, and 1.5 feet of lob retreat; confidence and Court IQ reduce these in practice. Current-ball interception still uses live physics rather than the remembered prediction. A changed pattern can wrong-foot a learner, and recent observations gradually replace the old tendency. This is imperfect positioning adaptation, not a search over hidden future shots.

The simulation harness previously dropped the fifth `Game.hit` argument (CPU depth placement) and the optional faulting player. Its wrappers now preserve both, and output placement-intent counts. The final 20-match sample exercised 9,475 open-court placements and 47 feet targets, with 811 human-controlled contacts. It completed all matches and averaged 18.4 shots per rally. Earlier harness samples did not fully exercise CPU depth and should not be treated as directly comparable placement balance evidence.

The new mirrored matchup harness isolates body effects against a neutral body within all-rounder, soft-game and banger archetypes in both singles and doubles. Two seeds on each court side produce 96 matches. Before/after snapshots keep adaptive memory enabled in both passes, changing only body modifiers. Build-related movement penalties were reduced: height now contributes at most -2.5% speed, -4.5% acceleration, -2% endurance and -2% volley; broad build contributes at most -2.5%, -6%, -2.5% and -2%, respectively. Reach, power, contact-height scaling, and stature-related low-ball difficulty retain their earlier tradeoffs. Archetype ratings and neutral-body abilities are unchanged.

Across the pooled three-archetype sample, short/broad singles improved from 0/12 to 8/12 wins against neutral bodies, and short/broad doubles improved from 3/12 to 5/12. Tall/broad remains weak (1/12 singles, 2/12 doubles), while short/lean remains dominant in the singles sample (12/12). These small, correlated seeded samples justify further investigation, not a claim of finished balance. The artifacts expose completion counts and review flags instead of forcing outcomes or changing ratings to fit a win-rate target.

Validation artifacts: `validation/engine-matchups-before.json`, `validation/engine-matchups.json`, `validation/engine-levels.json`, and `validation/engine-profile.json`. All 96 final body/archetype matches and all 108 neutral-body skill-matrix matches completed. The stronger profile won each mismatched skill pairing. The final suite has 267 tests, including memory thresholds, recency changes, independent opponents, no learning from unseen aim, bounded offsets, mirrored lob recovery, match resets, deterministic matches, and extreme-body movement bounds.

The performance harness includes fixed-step updates, replay recording, journal work, and report serialization across singles, doubles and two practice drills. In the saved desktop Node sample, singles update p95 was about 0.050 ms and doubles about 0.076 ms; doubles p99 was about 0.165 ms against an 8.33 ms fixed-step budget. Rendering, GPU costs, browser scheduling, and actual low-powered mobile hardware are excluded. These results do not establish mobile frame rates and did not justify speculative physics simplification.

Next: validate the flagged body/format combinations with larger seed sets and human playtests; profile the rendered game on a real low-powered mobile browser; add replay-facing character views and improve contact readability. Additional practice patterns and career persistence remain later steps. The current public Main source is not promoted by this DEV batch.
