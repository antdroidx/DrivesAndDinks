# Engine status and next work

## Combined implementation checkpoint — 2026-11-05

Latest verified source: **DEV Build 143**, engine commit `e3e4fb1eff23b0639bfd7542581bf1f406d03bcb`, promoted through documentation commit `94445f9b7cb3f5b85578174df7762b2def498b54`. The doubles-side fix preserves ordinary kitchen lanes, requires a real crossing before reassigning coverage, and retains contextual poach/lob/rescue switches. Optional stacking is implemented on `codex/doubles-stacking` with per-team Off, Stack + cross, Stack + stay and Adaptive modes; score/service identity remains unchanged. All 379 tests pass; eight paired demo matches reduced measured kitchen order reversals from 2,107 to 0 while retaining 36 poach attempts. All 20 roster matches completed. The skill matrix completed 107/108 within 40 minutes; the remaining equal-advanced deuce game finished naturally at 47.9 minutes. Stronger profiles won every mismatched pairing. Evidence is in `validation/kitchen-sides-*`.

The original Build 143 DEV deployment succeeded in runs [41996221354](https://github.com/antdroidx/DrivesAndDinks/actions/runs/41996221354) and [41996286605](https://github.com/antdroidx/DrivesAndDinks/actions/runs/41996286605). The source was then fast-forwarded to `main` and deployed successfully in run [41998072636](https://github.com/antdroidx/DrivesAndDinks/actions/runs/41998072636). Pages labels that deployment **release 144** because it uses the workflow run number. The Build 142 checkpoint below is historical.

Build 143 is consolidated on `main`. Its superseded feature branches were deleted after ancestry checks and successful deployment. The pre-promotion checkout is preserved in local stash `Archive pre-Build143 old checkout tracked changes`.

The five requested work areas are implemented: doubles teamwork/recovery; continuous rendering-only replay interpolation; ability-based serve/return choices; contextual third/fifth/later transition decisions; and combined validation plus DEV deployment preparation. The earlier audit below is historical and describes the starting state, not outstanding implementation.

Current implementation and validation status is tracked in `DEV-AUDIT.md`; sequencing and acceptance criteria are in `ROADMAP.md`. New results use `validation/combined-*`; old evidence is kept under `validation/previous-volley-pass/`.

**Published and verified: DEV Build 142**, from `05195ee5086f1c6d759a10ecd214a174713171bb`, at https://antdroidx.github.io/DrivesAndDinks/dev/. The source workflow https://github.com/antdroidx/DrivesAndDinks/actions/runs/41993739114 and Pages deployment https://github.com/antdroidx/DrivesAndDinks/actions/runs/41993795120 both succeeded. Live assets contain the combined serve, transition, replay and recovery changes; browser verification displayed Build 142 and working replay pause/resume without console errors. All 351 tests pass.

The Build 142 notes below are historical. Future engine work starts from `main` at the Build 143 source; do not reapply the archived recovery patch.

## Original audit

Audit date: 2026-11-04 (local). This file distinguishes inspected code from reports in another chat.

## Where work diverged

- This worktree is detached at `f8b8fb1` (stroke mechanics and body reach), with unfinished local changes. Do not discard them.
- The locally recorded `codex/character-design-viewer` branch reaches `530288f`, six commits beyond this worktree's HEAD. Those commits implement stationary cameras and their tests; much of that work is also present in this worktree's uncommitted diff. Reconcile rather than apply it twice.
- The other pickleball chat, `01a1a9e1-7978-7802-b76f-cedc9a58a955`, worked in `D:/AppProjects/Codex/Pickleball`. Its last response reports staged, uncommitted volley recovery and teammate-spacing changes, 314 passing tests, and 624 completed simulations. It explicitly says those changes were not deployed. This audit could read the chat but filesystem access to that checkout was denied, so its latest code and results have not been independently verified here.
- Neither a local remote-tracking ref nor a note saying a batch publishes proves that GitHub Pages has deployed it. Verify the actual workflow and served assets before claiming publication.

## Inspected local implementation

- Stationary sideline, overview and fault replay cameras are implemented and tested.
- Replay position interpolation is wired into playback. It interpolates ball/player positions, preserves the lower snapshot clock, and skips intervals containing hit/bounce count changes. Animation clocks still advance at snapshot cadence; this is partial interpolation rather than a completed animation smoothing pass.
- Doubles changes increase support clearance and label the support role `cover-open-court`. Existing coordinated drop approaches and automatic poaching predate this batch. The current changes are not a full teamwork/recovery redesign.
- Returns choose an open lateral target with shot-specific default depth. This audit corrected a double coordinate flip for team 1 and added a mirrored-depth regression test for drive/drop/slice.
- The third-shot change is a small opponent-kitchen bias on the existing drive/drop probability. It does not yet evaluate a full third/fifth-shot transition sequence.
- No serve-generation improvement is included in the current uncommitted batch.
- Practice drills already exist. They are optional gameplay and repeatable contact checks, not a prerequisite for the next engine pass.

## Ordered completion plan

1. Reconcile the other checkout's staged volley-braking/spacing fixes with this worktree's return and interpolation changes. Review its tests and saved paired/held-out results. Preserve stationary replay framing and existing body/rating tradeoffs.
2. Finish doubles recovery: agree on the receiver, reserve the hitter's braking/contact path, cover the exposed lane, and recover together after a weak third or fifth shot. Test both court ends, automatic poaches, wide balls, lobs and kitchen momentum.
3. Finish rendering-only interpolation: separate playback time from discrete event metadata, interpolate animation timing/orientation safely, and retain exact collision events and source snapshot immutability. Keep cameras fixed.
4. Improve serve/return decisions: legal serve variation and risk tied to ability; deep safe returns with margin, recovery time and opponent positioning; mirrored tests and live launch checks. Current return unit coverage alone does not establish balance.
5. Improve third-shot decisions using contact height, balance/pressure, opponent depth, partner readiness, drive/drop feasibility and the next recovery opportunity. Include fifth-shot resets when the team cannot safely advance.
6. Run the reconciled suite, paired and held-out singles/doubles simulations, and browser playtests. Compare kitchen faults, return depth/errors, approach success, coverage losses and rally lengths. Old matrix files predate this audit's return correction and must not be labeled validation of it.
7. Commit on a development branch supported by `.github/workflows/pages.yml`, publish DEV, and verify the workflow plus live DEV assets. Keep Main gameplay unchanged.

## Audit verification

All 311 local automated tests passed after the mirrored-return fix. No browser validation, merged cross-checkout validation, commit, push, or DEV deployment was performed in this audit. Career expansion remains deferred until this batch is integrated and playtested.
