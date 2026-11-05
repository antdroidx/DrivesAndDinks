# DEV audit after Build 143

Audit date: 2026-11-05

## Promotion baseline

- Source checkpoint: `94445f9b7cb3f5b85578174df7762b2def498b54` (`DEV Build 143`; engine fix committed at `e3e4fb1`).
- `94445f9` is now the tip of `main` and `origin/main`.
- GitHub Actions run [41998072636](https://github.com/antdroidx/DrivesAndDinks/actions/runs/41998072636) deployed successfully.
- Pages labels the deployment **release 144** because the workflow uses the run number. The deployed source is still Build 143.
- A clean checkout passed all **357 tests**.
- The original audit branch is `codex/post-143-engine-audit`; the stacking implementation is on `codex/doubles-stacking`.

## Branch disposition

Every feature branch below was fully contained in the Build 143 source before deletion. No open pull requests were found and none had commits that would have been lost by removing the branch.

| Branch | Unique work outside Build 143 | Disposition |
| --- | ---: | --- |
| `codex/character-design-viewer` | 0 commits | Remote and local branch deleted |
| `codex/dev-gameplay-polish` | 0 commits | Remote and local branch deleted |
| `codex/high-resolution-players` | 0 commits | Remote and local branch deleted |
| `codex/multitouch-test` | 0 commits | Remote and local branch deleted |
| `codex/teamwork-serve-replay` | 0 commits | Remote and local branch deleted |
| `feature/v0.1-playable` | 0 commits | Remote and local branch deleted |
| local-only `codex/physics-engine` | 0 commits | Local branch deleted |
| `gh-pages` | Deployment artifacts | Retained |
| `main` | Promotion target | Retained |
| `codex/post-143-engine-audit` | New audit work | Retained |

The older checkout had staged tracked changes. Those were preserved in local stash `Archive pre-Build143 old checkout tracked changes` before detaching it; Build 143 already contains the completed work represented by that checkout.

## Roadmap status

| Work area | Implemented | Evidence | Remaining |
| --- | --- | --- | --- |
| Doubles recovery and outgoing-hitter separation | Yes | Movement and recovery tests; paired validation reports | Human playtest of recovery feel and teammate coordination |
| Stable kitchen ownership | Yes | `validation/kitchen-sides-*`; eight paired matches | Human playtest; net-fault rate still needs calibration |
| Automatic poaching | Yes | Contextual poach/lob/rescue tests | Human balance and frequency tuning |
| Serve and return variation | Yes | Ability-based serve placement, conditional hard/soft serves, mirrored return tests | Human serve/return balance; long advanced match pacing |
| Third-shot and fifth/later transition decisions | Yes | Feasibility gates and transition tests; paired and held-out simulations | Human decision-quality review and long-match tuning |
| Replay interpolation and stationary cameras | Yes | Exact-impact interpolation tests, camera regression tests | Optional future camera work must be opt-in |
| Opponent pattern memory | Yes | Match-local bounded memory and wrong-footing tests | Evaluate whether human opponents notice it and whether more tactical memory is useful |
| Singles braking and approach decisions | Yes | Readiness, passing, interception-priority and bounce tests | Human playtests across body types and skill levels |
| Body and physique tradeoffs | Yes | 96-match body matrix and 40 separate-seed doubles matches | Tall/broad singles calibration remains open; do not force parity without human evidence |
| Repeatable practice drills | Yes | Six deterministic drills, including moving target and two-contact transition sequences | Human teaching-quality review |
| Replay presentation and contact readability | Yes | Sideline profiles, contact labels, close-call review tests | Physical-device review |
| Rendered mobile performance and touch ergonomics | Harness ready | Browser frame/render/input probe and responsive input tests | Real low-powered phone/browser measurements |
| Layout and CSS consolidation | Yes for current scope | Zoom-safe dialog tests, responsive geometry tests and invalid override removal | Physical-device visual review |
| Career progression and persistence | No | Intentionally deferred; see `PRE-CAREER-AUDIT.md` | Close P0 rule, persistence, balance and device gates |
| Varied shot trajectories and tactical patterns | Yes for current scope | Curve-aware serves and rally shots, pattern labels, high-dink speed-ups and bounded late-rally attacks | Human-calibrated tactical variety |
| Optional doubles stacking | Yes on `codex/doubles-stacking` | `test/stacking.test.js`; score identity, cross/stay, adaptive, fallback, report and replay coverage | Human tuning of stack frequency, preferred sides and safety thresholds |

## Current validation evidence

- **20/20** mixed watch/play roster matches completed with 716 rallies and 12,169 contacts.
- The roster sample used 9,377 dinks, 1,657 drives, 769 drops, 240 lobs and 126 overheads. Dinks were roughly 77% of contacts.
- Roster outcomes included 302 net faults, 314 unreturned balls, 31 double bounces, 27 outs and 42 kitchen-momentum faults.
- All 96 small body-matrix matches completed. Tall/broad doubles won 11/12 in this small matrix and 29/40 on separate seeds; these are correlated CPU samples.
- The standard skill matrix completed 107/108 matches inside 40 minutes. The remaining equal-advanced deuce game completed naturally at 47.9 minutes. A held-out transition sample completed 15/16 inside 40 minutes.
- Desktop Node update p95 was about 0.047 ms for singles and 0.081 ms for doubles. Rendering, GPU scheduling and physical mobile hardware are excluded.
- The transition comparison shows longer rallies and deeper serving/return placement than its reconstructed baseline, while kitchen-momentum faults fell. The source fingerprints differ, so this is integration evidence rather than proof that one change caused every difference.

## Highest-value next work

1. Build a repeatable human playtest scorecard and run it before another large engine balance pass.
2. Diagnose advanced-match duration and dink dominance, including net faults by shot, contact quality, depth and side.
3. Measure rendered frame time, input latency and touch ergonomics on representative low-powered devices.
4. Expand shot shape and tactical choice only after the playtest data identifies which decisions feel repetitive.
5. Add multi-shot practice and layout cleanup after the core match loop stops raising pacing or control concerns.

See `ROADMAP.md` for sequencing and acceptance criteria.
## Post-143 roadmap implementation

The actionable roadmap work is implemented on `codex/post-143-engine-audit`.

- Match reports now include a derived playtest summary, and `PLAYTEST.md` provides the human/device scorecard.
- `scripts/diagnose-pacing.js` measures rally duration, shot share, contact quality, net margin, kitchen time, transition decisions and unreturned context without consuming gameplay randomness.
- Dink height now varies with poor or rushed contact. High dinks can float visibly and become speed-up opportunities only when balance, pressure and partner readiness permit. Ordinary attackable high balls remain independent of that heuristic.
- Serve and rally shots use bounded lateral curve and named patterns. Opponent-memory confidence affects placement and CPU choice.
- Practice adds Lob recovery, Moving target and a two-contact Transition sequence alongside the original drills.
- Live and replay characters show focused, effort, fatigue, surprise, aggression and happiness states. Sweat intensity follows stamina, effort and rally load.
- `?test=performance` displays frame/render timing and exposes `window.__DRIVES_DINKS_PERFORMANCE__()` for frame, render, input, long-task and canvas-cost measurements.
- Browser zoom remains available, dialogs retain scrolling, and the invalid nested media selector is removed.
- Players are right- or left-handed, and optional doubles stacking is available per team with Off, Stack + cross, Stack + stay and Adaptive modes. The score-selected server and receiver remain locked to their legal service courts; partners stage outside the sideline only when the starting roles are off their hand-preferred lanes, then cross after a legal serve or return; aligned formations remain standard. Unsafe lobs, poor contact, fatigue, volley momentum and collision risk fall back to holding formation. Reports and replays retain the stack plan and decision events.

Paired pacing evidence uses seeds 31–34 at Beginner, Intermediate, Demo and Advanced in doubles:

| Metric | Before | After |
| --- | ---: | ---: |
| Completed within 40 minutes | 16/16 | 16/16 |
| Dink share | 73.4% | 56.2% |
| Dink net faults | 251 | 6 |
| Rally duration p95 | 27.0 s | 20.2 s |
| Longest rally | 41.6 s | 23.8 s |
| Rally shots p95 | 31.8 | 25.8 |

These are correlated CPU samples. The remaining gates are human playtests from `PLAYTEST.md`, real low-powered phone measurements, broader independent body/archetype samples, and visual review of the new facial states. Career progression and persistence remain the later product expansion.
