# Drives & Dinks Career Coding Plan

Current source: **DEV Build 143**, promoted to `main` at `94445f9b7cb3f5b85578174df7762b2def498b54` on 2026-11-05. The generated Pages release label is 144. Career work is on `codex/career-mode`.

This roadmap is a dependency-ordered implementation plan. Gap IDs refer to [`CAREER-IDEAS-GAP-AUDIT.md`](CAREER-IDEAS-GAP-AUDIT.md). Items can still be removed, but new work should enter through a phase rather than as an isolated feature.

## Planning Principles

- Keep `/` as the shared gameplay prototype and `/career-mode/` as the career application.
- Keep one authoritative shared match engine and one versioned career state.
- Keep the game offline-first with no mandatory account or hosted backend.
- Let CPU-owned MLP and MiLP management run in the background; the user is a player, not an owner.
- Give every persistent athlete a real career arc, including the people who begin alongside the user.
- Keep finance simple: income and spending should create meaningful choices, not accounting work.
- Keep energy as physical capacity and money as access to support. Do not let one replace the other.
- Preserve deterministic seeds, stable athlete IDs and resumable save boundaries.
- Reduce player-controlled match volume before adding more competition content.

## Current Baseline

Completed:

- Isolated career entry point and offline shell.
- Two-region world with areas, cities, clubs and generated athletes.
- Player creation, age development and decline.
- Weekly energy, training, travel and competition scheduling.
- Seven competition shapes and playable player matches through the shared engine.
- Rating, ranking, qualifiers, contracts, release and re-entry.
- Retirement, records, club partners, opponent memory and coaching feedback.
- Versioned saves with migrations, backup recovery and corruption quarantine.

Current release blockers:

- Human match playtests and real-device performance evidence.
- Human pacing validation for quick simulation and shortened league cards.
- Age differentiation under the revised schedule.
- Persistent CPU careers and believable world turnover.
- Portable saves before packaged applications.

## Implementation Status · 2026-11-09

- **Phase 0 automated baseline:** complete. All 683 tests pass, the ten-year career prospect audit reruns successfully, and desktop plus 400-by-807 browser layouts were checked.
- **Phase 0 external evidence:** open. Human match scorecards and real low-powered Android timing, heat, battery and touch measurements still require people and physical devices.
- **Phase 1 finance, planning and workload:** in progress. A versioned dated ledger tracks salary, prizes, entry fees and travel. Event entry shows projected energy, money, recovery and player match workload before commitment. Quick Sim preserves real rating, world, record, analytics and tournament transitions; Sim to End can complete a tournament or advance through a shortened league. Career leagues now use three or four one-opponent cards instead of a full seven-round draw.
- **Phase 1 remaining:** injury generation and healing, coached-training choices, equipment purchases, selective tournament-round policy and age-by-age balance targets.
- **Phase 2 CPU world:** core complete. Generated athletes now age and develop from stable identities; active, circuit and background tiers share lifecycle rules; CPU records track matches, tour points, pro invites, contracts and retirement; entrants, promotions, demotions and club/tournament outlooks advance with the weekly world.
- **Phase 2 age cohort evidence:** 240 samples per age and detail tier over ten years. Active median pro-invite timing is week 27 for ages 25/30, week 30 for 35, week 33 for 20, week 41 for 40 and week 80 for 15. Circuit timing is week 54 for 25/30, week 60 for 35, week 66 for 20, week 78 for 15 and week 82 for 40. Year-10 professional share is 49% for active ages 25/30 and 40% for age 40; age 15 remains mostly challenger.
- **Phase 2 remaining:** repeatable 1k/5k/10k/25k/50k browser and Android benchmarks, twenty-year regional growth checks and long-history retention measurements.

## Dependency Map

1. **Phase 0** establishes trustworthy baselines.
2. **Phase 1** controls workload through energy, finance, injuries and Quick Sim.
3. **Phase 2** gives every CPU athlete a full career using the Phase 1 rules.
4. **Phase 3** adds MLP/MiLP organization and partner invitations on top of CPU careers.
5. **Phase 4** turns simulation events into news and inbox actions.
6. **Phase 5** adds the equipment economy and signature paddles.
7. **Phase 6** adds portable persistence and packaged platforms.
8. **Phase 7** scales, benchmarks and releases.

Do not start Phase 2 before Phase 1 defines the shared growth and decline rules. Do not build Phase 4 content generators before Phase 3 can produce meaningful team, partner and roster events.

---

## Phase 0 — Close The Current Baseline

**Goal:** trust the existing gameplay and career loop before changing world scale.

Work:

- Run the human scorecard across singles and doubles, beginner through advanced.
- Record serve/return, rally length, faults, doubles positioning, recovery and touch-control issues.
- Measure the career UI on representative Android and desktop browsers.
- Record current dashboard, player search, calendar, save and week-advance timings.
- Keep all 659 current tests green and retain the career prospect model as a balance harness.

Exit condition:

- The team can identify one or two remaining match feel issues with reproducible evidence.
- Browser and phone measurements exist for the current 5,113-athlete world.
- No correctness or persistence blocker remains in the current loop.

---

## Phase 1 — Activity, Energy, Finance And Injuries

**Goal:** make every week a meaningful resource decision and establish the rules used by both the user and CPU athletes.

Scope:

- `G18` Quick Sim and selective round simulation.
- `G19` simple finance ledger.
- `G16` sparing injuries with healing time.
- Revised energy, training and recovery balance.
- Projected workload shown before event entry.

### Energy And Finance Balance Contract

Energy and money have separate jobs:

| Resource | What it controls | What it must not control |
|---|---|---|
| Energy | Physical ability to train, travel and compete this week | Purchasing power or permanent skill |
| Money | Entry access, travel, coaching, paddles and financial survival | Direct energy restoration or guaranteed attribute gains |
| Age | Development, physical ceiling, recovery and training response | Entry eligibility by itself |
| Injury | Temporary availability, recovery and energy ceiling | Permanent rating loss |
| Equipment | Match performance within bounded rules | Training capacity or age decline |

Use these relationships:

```text
effective training gain
  = base gain
  × age development or maintenance
  × player learning rate
  × coaching effectiveness
  × fatigue response

weekly recovery
  = base recovery
  × age recovery factor
  × injury recovery factor
  × workload carryover

weekly net income
  = salary allowance
  + prize earnings
  - event entry fees
  - travel
  - coaching
  - paddle purchases
```

Activity costs:

| Activity | Energy | Money | Career effect |
|---|---:|---:|---|
| Training session | 30–70 by level | Optional coaching fee | Attribute growth or maintenance |
| Club ladder | Event energy | Small or no entry fee | Rating, form, club reputation |
| League match | Event energy | Entry and travel | Rating, league record, team status |
| Tournament | Event energy | Entry and travel | Rating, ranking, prize |
| Travel | 10 regional / 20 international | Distance-based simple cost | Enables away events |
| Paddle purchase | None | One-time cost | Bounded match-performance change |
| Injury recovery | Reduces capacity | Optional coaching support | Temporary availability and return date |

### Growth And Decline Targets

| Starting age | Expected arc |
|---:|---|
| 15 | Strong learning and recovery, limited income, expensive travel and coaching |
| 20 | Fast technical growth, rising competition, financial pressure remains high |
| 30 | Peak physical performance and earning power, highest tour workload |
| 40 | Reduced movement and recovery, strong technical maintenance with coaching |
| 50 | Lower weekly capacity, selective scheduling, technique and tactics carry performance |

Balance rules:

- Money can improve training quality and schedule access, but cannot reverse age decline indefinitely.
- Coaching is most valuable for maintenance and adaptation after physical peak.
- Expensive paddles create bounded tradeoffs, not straight upgrades.
- Injuries are sparing and temporary, with a visible cause, severity and return date.
- Amateur tournament starts remain limited to two distinct events per month.
- One league can be active at a time; club ladders retain their weekly lane.

Implementation:

1. Add a simple dated finance ledger with salary, prizes, entry fees, travel, coaching and equipment.
2. Add weekly activity planning with projected energy and money cost. **Complete.**
3. Add Quick Sim and selective round simulation for low-stakes or completed matches. **Core complete:** current-match quick simulation and simulation through the remaining competition.
4. Add injury generation, healing duration, availability and return notifications.
5. Connect coaching and equipment to the training and match formulas above.
6. Show projected matches, energy, money and recovery before registration.

Exit condition:

- Ages 15, 20, 30, 40 and 50 produce distinct growth, income, recovery and decline patterns.
- A normal player can afford a believable schedule without grinding every match manually.
- Money improves choices but cannot erase age or injury effects.
- Event entry always shows total energy, financial cost and expected player matches.

---

## Phase 2 — Full CPU Careers And Dynamic World

**Goal:** every persistent athlete has a believable career and can become a rival, partner, professional or retirement story.

Scope:

- `G08` full individual CPU careers.
- `G03` active, circuit and background simulation detail.
- `G06` entrants, retirements, club creation and regional growth.
- `G07` configurable regional templates.
- Cross-cutting `G01`, `G05`, `G09` and `G10` validation.

Implementation:

1. Define one shared career-development policy for user and CPU athletes.
2. Give CPU athletes weekly training/maintenance, match load, form, fatigue, injuries and recovery.
3. Track CPU ratings, rankings, contracts, sponsorships, equipment and team status through compact deltas.
4. Advance age, potential, decline and retirement for every athlete.
5. Introduce new competitors, late starters, returning players and retiring athletes.
6. Grow or contract clubs, tournaments and regional participation from actual activity.
7. Use three simulation levels:
   - Active: partners, rivals, opponents and nearby athletes receive full weekly detail.
   - Circuit: ranked and notable athletes receive medium detail.
   - Background: the rest receives simplified but persistent progression.
8. Generate stories from milestone events such as a starting peer turning professional.
9. Add query scopes, bounded caches and long-history aggregation without introducing a database unless benchmarks require it.
10. Benchmark 1k, 5k, 10k, 25k and 50k athletes on browser and Android targets.

Exit condition:

- A peer created in the same week can improve, reach the professional tour and retire.
- CPU athletes no longer remain permanently 18–54.
- Regional strength, club depth and tournament opportunity evolve over twenty in-game years.
- The configurable world remains responsive on target devices.

---

## Phase 3 — MLP, MiLP, Partner Invitations And Open Opportunities

**Goal:** create player-focused team competition with CPU organization and meaningful relationships.

Scope:

- `G12` CPU-managed MLP franchises, annual drafts and MiLP club events.
- `G13` absorbed as internal CPU roster state.
- `G15` bidirectional partner invitations and relationship development.
- `G17` wild cards, qualifiers and open jumps.

Implementation:

1. Let CPU MLP franchises own teams, draft players annually and manage rosters in the background.
2. Keep the user as a roster player with no ownership or trading UI.
3. Add MiLP-style amateur club-versus-club events and series.
4. Let CPU clubs schedule MiLP opponents and resolve background fixtures.
5. Let users accept club/MiLP invitations or create an event/series for their club.
6. Let users invite eligible club mates to an event or series.
7. Let CPU partners send event-specific invitations based on rating fit, availability and relationship.
8. Add invitation context, expiry, accept/decline, withdrawal and replacement flows.
9. Preserve wild-card, qualifier and open-entry paths between amateur and professional stages.

Exit condition:

- MLP and MiLP seasons complete without user management.
- Users can play as roster athletes and receive meaningful team/partner invitations.
- Annual CPU drafts create roster turnover and new stories.
- Strong amateurs can reach higher stages without a rigid sequence.

---

## Phase 4 — News And Unified Inbox

**Goal:** surface simulation events as persistent, actionable communication.

Scope:

- `G14` generated news and short stories.
- `G29` unified career inbox.

Content sources:

- Invitations and withdrawals.
- Contracts and re-entry.
- Sponsorships and salary changes.
- Event registration, schedule changes and results.
- Injury, recovery and retirement.
- Product announcements, releases and discontinuations.
- Records, awards and notable CPU careers.

Implementation:

1. Create deterministic news generators from real state changes.
2. Generate weekly digests and short event stories without inventing contradictory facts.
3. Build one persistent inbox with unread counts and categories.
4. Add expiry and accept/decline actions for invitations and offers.
5. Add archive, search and a clear route back to the relevant career screen.
6. Keep news generation separate from inbox delivery and action state.

Exit condition:

- Every major simulation change can create a useful message.
- Invitations and offers can be answered directly from the inbox.
- The inbox remains readable after long careers and does not duplicate identical events.

---

## Phase 5 — Equipment Economy And Signature Paddles

**Goal:** make equipment a small but meaningful part of career identity and finance.

Scope:

- `G20` equipment ownership and equipped paddle state.
- `G21` seasonal brands, product series, releases, discontinuations and sweet spots.
- `G22` sponsor and player signature paddles.

Implementation:

1. Generate fictional brands, product names and product series from deterministic seeds.
2. Add seasonal announcement, release, availability, low-stock, discontinuation and legacy states.
3. Generate shape, face, throat, grip, core, surface, edge and sweet-spot characteristics.
4. Keep cosmetic identity independent from performance.
5. Add purchase, ownership, equipping and one-time financial cost.
6. Add CPU and professional signature releases through sponsors.
7. Unlock player signature design after sponsorship.
8. Publish product news through the Phase 4 inbox.
9. Keep signature models inside the same bounded performance rules as retail products.

Exit condition:

- A game year produces a varied catalog with believable release and discontinuation dates.
- Purchasing and equipping a paddle changes performance within controlled bounds.
- Sponsored pros and career players can create dated signature series without creating dominant equipment.

---

## Phase 6 — Portable Persistence And Packaged Platforms

**Goal:** preserve careers across devices and ship the same offline game.

Scope:

- `G23` shared storage abstraction.
- `G24` versioned save export/import.
- `G26` Android and Windows smoke builds; iOS later.
- `G27` offline-first packaged applications.
- `G28` platform-safe asset paths.

Implementation:

1. Introduce a storage adapter without replacing deterministic world generation.
2. Add versioned, compressed career export and import with validation.
3. Preserve the all-time board and inbox across new careers.
4. Add minimal Android and Windows shells.
5. Test local save, assets and offline startup in packaged apps.
6. Add packaged-path tests and one shared platform acceptance suite.

Exit condition:

- A career can move from browser to Android and Windows without corruption.
- Packaged apps start and play with no network or account.
- The same save schema and shared engine work on every platform.

---

## Phase 7 — Scale, Balance And Release

**Goal:** prove the whole career arc before adding further content.

Work:

- Run 10- and 20-year CPU world simulations.
- Compare user and CPU progression across ages 15, 20, 30, 40 and 50.
- Measure injury frequency, recovery, finance pressure and schedule load.
- Validate MLP/MiLP drafts, partner invitations, inbox volume and equipment releases.
- Run browser and Android performance budgets.
- Conduct final human career playtests.

Exit condition:

- Pro debut, contracts, earnings, injuries and retirement form believable distributions.
- A decade-long career is playable without thousands of mandatory manual matches.
- CPU peers create recognizable stories without making the world unstable.
- The game remains offline, responsive and recoverable on supported devices.

---

## Explicitly Removed From Scope

- `G02` SQLite/IndexedDB world database.
- `G04` background/resumable weekly worker.
- `G11` country-specific national championships.
- `G25` incremental weekly-simulation transactions.

`G13` is not a separate player-facing system. Team membership is internal CPU state within the MLP/MiLP implementation.

## Legacy Engine Follow-Up

Retain these as supporting work rather than separate career phases:

- Human gameplay scorecards and one or two final match feel fixes.
- Real-device frame, touch, heat and battery measurements.
- Low-risk tactical and practice improvements from human journals.
- Visual regression and accessibility cleanup during the phase that touches the relevant UI.
