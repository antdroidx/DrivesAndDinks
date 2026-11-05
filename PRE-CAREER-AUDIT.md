# Pre-career engine audit

Career scheduling, progression and persistence should wait until the current match engine passes the gates below. The existing seeded simulations are regression evidence, not substitutes for rule review or human playtesting.

## P0: close before career development

### Rules fidelity

- Enforce the score-selected server and designated returner on every hit path, including manual test hooks and CPU contacts.
- Complete serve delivery rules: server foot position at contact, underhand direction and contact-height checks, and the correct diagonal landing rules.
- Expand the non-volley-zone check from a contact-point approximation to the full grounded foot/landing state needed for kitchen faults.
- Decide and document the game treatment of referee-only rules such as the 10-second server routine, verbal warnings and replay challenges.

### Match integrity and persistence

- Define a versioned career save schema with migrations, corruption recovery and stable IDs for athletes, opponents, events and ratings.
- Keep match reports, replays and career records on the same immutable event/rating model so a resumed career cannot disagree with its match history.
- Establish deterministic replay/report snapshots before career records depend on them.

### Balance and playtest gates

- Run the human scorecard in `PLAYTEST.md` across singles and doubles before adding progression incentives.
- Resolve the tall/broad singles imbalance with a larger paired and held-out sample; do not tune career difficulty around the current outliers.
- Re-check long advanced matches, dink share, net faults and kitchen-momentum faults after the stacking and handedness changes. The latest 20-match roster run completed 19/20; seed 16 reached 10-6 at the cap with a 150-shot rally, and the sample p95 rally was 51 shots.
- Calibrate difficulty and opponent generation against the new 13% generated left-handed rate.

### Device readiness

- Measure frame time, touch latency, heat and battery behavior on representative low-powered phones.
- Verify portrait/landscape controls and dialog scrolling with the expanded setup and future career screens.

## P1: engine improvements worth doing with career work

- Replace the 2D circular player collision with a bounded body/footprint model when player density and formations increase.
- Extend paddle contact from the reach envelope toward paddle-face geometry for edge hits, frame collisions and more realistic mishit causes.
- Add versioned telemetry for shot quality, line margins, recovery time, team formation and stacking decisions so career analytics use the same data as playtests.
- Model fatigue recovery across games and tournament days before career schedules create multi-match consequences.

## Deliberately deferred

Wind, ball wear, full skeletal mesh collisions, a referee voice, real-time line-call appeals and a complete 3D stadium are presentation or simulation depth choices, not prerequisites for the first career loop.

## Career exit criteria

- All P0 items complete or explicitly accepted as documented simplifications.
- Human playtests identify one or two remaining feel issues, not systemic scoring/rules failures.
- A versioned save can resume a multi-match season without losing athletes, ratings, schedules or match evidence.
- Mobile performance is measured on real devices rather than inferred from Node timings.
