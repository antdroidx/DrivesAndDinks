# Drives & Dinks roadmap

Current source: **DEV Build 143**, promoted to `main` at `94445f9b7cb3f5b85578174df7762b2def498b54` on 2026-11-05. The generated Pages release label is 144. See `DEV-AUDIT.md` for the branch disposition and evidence audit.

## 1. Validate the current core loop

Run a human playtest pass before another broad balance rewrite.

Capture a scorecard for each participant and session:

- serve pace, placement and depth;
- return depth, recovery time and unreturned returns;
- rally length and point duration;
- third-shot, fifth-shot and later transition choices;
- poach frequency and teammate collisions;
- net faults, outs and kitchen-momentum faults;
- whether recovery and auto-movement feel intentional;
- touch-control reach, missed inputs and accidental gestures on phones.

Compare Beginner, Intermediate, Demo and Advanced profiles on both singles and doubles. Use the downloaded match journal report and the existing transition and body harnesses as supporting evidence, not as substitutes for human testing.

**Exit condition:** the team can name which one or two match behaviors feel wrong, with reproducible build, mode, athlete, device and seed or video evidence.

## 2. Diagnose advanced pacing and dink economy

The latest 20-match roster sample was roughly 77% dinks. The standard skill matrix completed 107/108 games inside 40 simulated minutes, and the remaining equal-advanced deuce game naturally completed at 47.9 minutes.

Add a focused diagnostic that groups:

- points and rallies by duration percentile;
- shot type by contact quality and net clearance;
- net faults by shot and contact pressure;
- time spent in kitchen exchanges;
- third/fifth-shot transitions versus established kitchen play;
- unreturned balls by distance and movement state.

Tune from that evidence. Candidate changes include dink arc/clearance, contact-error pressure, attack willingness and bounded rally incentives. Preserve deterministic seeded simulations and add before/after paired samples.

**Exit condition:** advanced CPU matches usually finish within the diagnostic cap, dink share and net faults have explicit targets, and seeded comparisons show no silent scoring or determinism regression.

## 3. Measure the rendered game on real phones

Extend performance evidence beyond the Node engine profile:

- browser frame timing and long tasks during singles, doubles and replay;
- canvas backing-store cost at each device pixel ratio;
- setup and match-start latency;
- touch event latency, missed buttons and accidental court gestures;
- sustained heat/battery behavior during a full match;
- portrait and landscape control reachability.

**Exit condition:** supported devices have measured budgets, documented failure cases and a tuned DPR/canvas fallback where needed.

## 4. Broaden shot shape and tactical choice

The current launch model uses a fixed target-time arc per shot type. Gameplay populates vertical spin, while side-spin axes exist in physics but are effectively zero for normal shots. CPU placement also chooses from a small set of lateral candidates and shot probabilities.

Candidate engine work:

- side-spin and curve profiles for serves, drives, slices and angles;
- distinct short-angle, crosscourt, body and inside-out targets;
- more serve styles with legal placement and ability-based risk;
- speed-ups, counter-lobs and transition attacks tied to contact conditions;
- bounded multi-shot planning for setup and opponent-response patterns;
- opponent tendency adaptation that affects shot selection as well as recovery.

Keep every random draw inside the seeded gameplay stream and verify that presentation work cannot alter outcomes.

**Exit condition:** CPU matches show multiple recognizable tactical patterns without increasing unexplained net faults or non-deterministic tests.

## 5. Extend practice and clean up presentation

- Add moving-target, lob-recovery and multi-shot transition drills.
- Preserve fixed-repeat feeds and report compatibility.
- Consolidate accumulated CSS overrides into layout components.
- Add visual regression coverage for phone portrait, phone landscape, short landscape, desktop and ultrawide.
- Audit browser zoom, touch gestures, focus order and readable contrast without blocking dialog scrolling.

**Exit condition:** drills teach decisions rather than only single contacts, and responsive layouts have fewer overrides with stable visual evidence.

## Later expansion

Career scheduling, long-term progression, seasons and cloud persistence remain later product work. They should start only after human playtests establish that the core singles/doubles loop is stable and understandable.
## Implementation status after the post-143 pass

1. **Core-loop validation:** reporting and scorecard tooling are complete. Human execution remains the release gate.
2. **Pacing and dink economy:** diagnostic, high-dink float, safe speed-ups and late-rally commitment are complete. Paired CPU evidence meets the 40-minute completion target.
3. **Rendered mobile measurement:** the browser probe is complete. Physical low-end phone measurements remain external.
4. **Shot shape and tactics:** curve, pattern labels, opponent-aware placement, high-dink speed-ups and bounded rally escalation are complete for this pass.
5. **Practice and presentation:** moving, lob and transition drills are complete; responsive and zoom cleanup is complete for the current layout.
6. **Doubles stacking:** right/left handed players and optional per-team Off, Stack + cross, Stack + stay and Adaptive modes are implemented. Score-controlled service identity remains unchanged; crossings happen only after legal serve/return triggers and unsafe situations fall back to hold. Reports and replays expose selection, crossing and fallback decisions. Human tuning of stacking frequency and safety thresholds remains.

## Recommended engine iteration after human playtests

- Tune serve/return and transition choices from human journals rather than adding more decision branches first.
- Add compact two- or three-shot tactical plans for speed-up, counter-lob and poach traps, with observable plan IDs in reports.
- Expand shot signatures with paddle-face angle and contact offset driving controlled side curve, while keeping seeded outcomes deterministic.
- Add practice sequences for counter-lobs, ATP/Erne recovery and cross-pattern movement.
- Build career progression only after the core match loop passes the human scorecard.
