# DEV engine audit

Current branch: `codex/teamwork-serve-replay`. This combines the previously separate recovery and replay/transition work. Historical results remain in `ENGINE-NOTES.md` and `validation/previous-volley-pass/`; they are not results of the combined source.

Implemented in this cycle:
- Receiver ownership and automatic poaching retain normal movement and manual human shot timing.
- Recent hitters retain their recovery corridor. Partners cover the opening, weak transitions hold together, and off-ball players prepare to brake for opponent contact.
- Volley forecasts use live stopping envelopes and momentum checks. Deep volleys retain lateral recovery.
- CPU serves vary pace, body/wide placement and depth with ability. Returns use mirrored targets and increase margin under pressure.
- Third-shot choices assess drive/drop feasibility; fifth and later serving-team transitions can reset until teammates can advance safely.
- Replay position, velocity, stride, preparation and swing timing interpolate on a continuous rendering clock. Exact impact frames and discrete hit/bounce/net/post boundaries preserve outcomes. Both replay cameras stay stationary.
- Diagnostics now retain per-side contact/fault evidence and live transition, return-depth and support-role measurements.

Validation artifacts for the combined source use `validation/combined-*`. The standard pass completed all 20 mixed watch/play roster matches, 108 skill-pairing matches, 96 body-matrix matches and 40 separate-seed tall/broad doubles matches. Stronger profiles won all mismatched skill pairings. Browser checks exercised doubles, sideline/overview switching and replay pause/resume without console errors.

Remaining engine work after this batch:
1. Human playtests for serve/return balance, rally pacing and transition choices. Some equal advanced CPU matches exceed the diagnostic 20-minute cap. Two remained in deuce at 40 minutes and finished naturally after about 41 and 45 minutes; preserve those cap results and follow-up evidence. No winner was forced.
2. Broader body/archetype samples: tall/broad doubles won 11/12 in the small matrix and 29/40 on separate seeds. These correlated CPU samples do not establish human balance. Tall/broad singles need not be artificially brought to parity.
3. Rendered performance and touch ergonomics on actual low-powered phones. Desktop Node update timings exclude browser/GPU costs.
4. More varied attack patterns and shot trajectories, calibrated against real play. This cycle does not introduce a full multi-shot opponent-response search or physically measured biomechanics.
5. Optional expanded practice sequences and layout cleanup. Existing drills remain useful for repeatable contact checks; they do not block engine development.

Career progression and persistence remain a later expansion. Main gameplay is not promoted by this DEV batch.
