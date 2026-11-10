# Career Ideas Gap Audit

Audit date: 2026-11-9
Source: [Pickleball Career Mode Ideas](https://chatgpt.com/share/6af1f3bd-302c-83e8-a0c5-d56aa5147235)
Implementation reference: `CAREER-MODE.md`, `PRO-TOUR.md`, `CAREER-AUDIT.md` and the `codex/career-mode` branch.

The shared chat is planning reference, not an implementation requirement. This document identifies where its ideas are already represented, where the current build has a real gap, and where the proposal may be too large for the intended game.

## Already Aligned

These source ideas are already present and should not become duplicate roadmap work:

- `/career-mode/` is a separate application entry point while `/` remains the gameplay prototype.
- Career mode reuses the shared match engine for playable career matches.
- North America and Asia are the two launch regions.
- Regions contain areas, cities, clubs and generated athletes.
- The game is offline-first and has no mandatory account or hosted backend.
- Career saves use a versioned schema with migrations, backup recovery and corruption quarantine.
- Population identities and careers are deterministic from a seed.
- Rating, results ranking and professional contract status are separate concepts.
- Local, regional, national, international, semi-pro, professional and MLP competition stages exist.
- CPU tournament matches are statistical simulations while player matches use the full engine.
- Match records are bounded while cumulative career analytics remain durable.
- The career service worker caches the application shell and shared modules.

## Current Measurements

These are Node measurements on the current development machine, not mobile or browser budgets:

| Operation | Current result |
|---|---:|
| Generated population | 10,000 athletes |
| North America build | 5,680 athletes in 102.7 ms |
| Asia build | 4,320 athletes in 66.9 ms |
| Weekly world rating simulation | 220 scheduled pairings per format; p50 13.8 ms, p95 19.1 ms |
| Generate 100 weekly calendars | 3.6 ms |
| Build 25-player world leaders | 19.1 ms |
| New-career save round trip | 0.16 ms, 4,229 bytes |

The lightweight generated population is fast enough today. The architectural gaps become material when persistent records, longer histories, richer teams, equipment and ten years of world events are added.

## Gap Register

### World architecture and performance

| ID | Shared-chat idea | Current state | Gap and recommendation | Disposition |
|---|---|---|---|---|
| G01 | Start with 10,000 persistent players and allow scaling to 50,000 | 10,000 deterministic athletes across two regions, with configurable regional targets | Launch target is implemented; 25k/50k scaling and target-device evidence remain under G05. | DONE — launch target; scaling tracked by G05 |
| G02 | SQLite or IndexedDB world database with linked tables | One versioned career JSON in localStorage; population is regenerated from seed; ratings are sparse deltas | Removed from active scope. Continue deterministic generation, sparse rating deltas and versioned JSON saves. | REMOVE — user decision |
| G03 | Three levels of simulation detail | All regional athletes use the same world-rating process; 660 scheduled matches per week across three formats | Add active, circuit and background detail levels so distant players update less often without losing stable IDs or histories. | KEEP |
| G04 | Background worker with resumable weekly advancement | advanceWeek runs synchronously and returns one new state object | Removed from active scope. Weekly advancement remains synchronous and returns one complete state transition. | REMOVE — user decision |
| G05 | Formal performance budgets and 1k–50k benchmarks | Node tests and several ad hoc timings exist; no browser/mobile world benchmark suite | Add a repeatable benchmark before expanding the world. Include load, query, week/month advance, save, memory and twenty-year stability. | KEEP |
| G06 | Dynamic population lifecycle and regional growth | Ages are generated once and never advance; `advanceCircuit` only increments churn counters | Add entrants, retirements, club formation, tournament creation and regional development rates. | KEEP |
| G07 | Regional templates for participation, formats, age and growth | Geography and name cultures exist; clubs use local skill levels | Add configurable regional behavior without tying nationality directly to ability. | KEEP |
| G08 | Active competitors separated from a broader recreational population | CPU matches and ratings advance, but ages are static and CPU athletes do not train, sign contracts or retire | Implement full individual CPU careers using the same broad progression rules as the user. A starting peer should be able to improve, reach the tour, decline and retire. | KEEP — user requested |
| G09 | Performance indexes, lazy loading and bounded caches | Directory builds a full region roster and caches it; leader lists rebuild both regions | Add query scopes and bounded caches as part of G05. Keep seeded generation rather than introducing a database. | KEEP conditionally |
| G10 | Historical aggregation and retention policies | Durable summaries and compact match evidence exist, but no twenty-year retention benchmark | Validate aggregation and retention at long-career scale before adding more stored event detail. | KEEP |

### World content and competition

| ID | Shared-chat idea | Current state | Gap and recommendation | Disposition |
|---|---|---|---|---|
| G11 | Country-specific national championships | One generic National Championship exists for the player country | Removed from active scope. Keep one national championship. | REMOVE — user decision |
| G12 | Amateur, semi-pro and professional franchise team leagues | MLP teams and background fixtures exist, but CPU ownership, annual player drafts and MiLP club events do not | Implement CPU-only professional MLP management and annual drafts. Add MiLP-style amateur club-versus-club events with CPU scheduling/results plus user invitations and event creation. | KEEP — minimal CPU scope |
| G13 | Separate team or league status from rating, ranking and contract | Player-facing rating, ranking and contract are separate; CPU team membership is temporary tournament state | Clarification: team membership can be internal CPU state for G12. Do not build a separate player-facing league-status screen or contract type. | ABSORB into G12 |
| G14 | Dynamic news and world storylines | History, event logs and coach feedback exist; there is no generated news system | Implement generated news and short stories from actual records: weekly digests, event recaps, record milestones, rising players, contracts, sponsorships, equipment releases and retirements. | KEEP — user requested |
| G15 | Relationship chemistry, scouting and richer rivalries | Users can select persistent club partners; CPU players never invite the user and events otherwise use automatic draws | Add bidirectional event or series partner invitations with context, expiry and accept/decline. Then layer in chemistry, scouting and richer rivalries. | KEEP — user requested invitations |
| G16 | Injuries and richer career events | Age, energy, fatigue carryover, maintenance and retirement exist; injuries are absent | Add sparing injuries with healing durations and return dates for users and CPU athletes. Injuries should affect availability temporarily without becoming frequent random blockers. | KEEP — user requested |
| G17 | Parallel local to professional opportunity ladder | Most stages exist, but qualification is relatively sequential | Preserve occasional wild cards, qualifiers and open jumps so strong amateurs are not forced through every stage. | KEEP |
| G29 | Unified inbox for career messages | Toasts, logs, coach feedback and event rows exist; there is no persistent inbox, unread state or actionable message center | Build one inbox for partner/club invites, contracts, sponsorships, product news, event registration and schedule notices, injury updates, records and miscellaneous messages. Separate content generation from delivery. | KEEP — user requested |
| G18 | Play, Watch and Quick Sim modes | Player matches must be played; CPU matches are simulated around them | Add Quick Sim or selective round simulation to solve the career match workload. | KEEP, high priority |

### Finance and equipment

| ID | Shared-chat idea | Current state | Gap and recommendation | Disposition |
|---|---|---|---|---|
| G19 | Persistent finances with earnings and expenses | Prize money, starting balance and sponsor purse bonuses exist | Implement salary and prizes in; entry fees, paddles, coaching and travel out. Couple finance to energy: money gates support and events, while age and injuries limit physical capacity. No taxes or insurance. | KEEP, narrow scope |
| G20 | Equipment and player-equipment tables | Three generic paddle families and three shapes exist; no product ownership | Connect equipment ownership to the planned seasonal brand catalog and simple finance. | KEEP |
| G21 | Fictional brands, product series, releases, discontinuations and sweet spots | Not implemented; now specified in `ROADMAP.md` | Build after career workload and finance are stable. | KEEP |
| G22 | Sponsor-designed and player-designed signature paddles | Sponsor purse bonuses exist; no sponsor relationship or design flow | Implement as a late reward, using the same bounded generation rules as retail products. | KEEP, late stage |

### Persistence and platforms

| ID | Shared-chat idea | Current state | Gap and recommendation | Disposition |
|---|---|---|---|---|
| G23 | Shared storage abstraction across browser and native apps | Career code uses `localStorage` directly through `save.js` | Introduce a small storage interface before IndexedDB, SQLite or packaged apps. | KEEP |
| G24 | Portable save export/import across devices | Backup and quarantine exist inside the same browser origin; no portable file export/import | Add versioned export/import before Android or desktop packaging. | KEEP, high priority |
| G25 | Incremental transactions and crash recovery for weekly simulation | Save backups exist; weekly simulation is one state transition with no resumable batch journal | Removed with G04 because weekly simulation is intentionally remaining a single state transition. | REMOVE with G04 |
| G26 | Android through Capacitor, Windows through Tauri, later iOS | Browser/PWA career only | Create minimal Android and Windows smoke builds after G23/G24. Keep one shared codebase. | KEEP |
| G27 | Fully offline installed applications | Browser service worker and local saves are offline-capable after caching | Preserve offline-first as a packaging acceptance test. No accounts or mandatory network. | KEEP |
| G28 | Relative assets and platform-safe local asset loading | Relative paths work for GitHub Pages and the local dev server | Add packaged-app path tests when platform shells exist. | KEEP conditionally |

## Recommended Removals Or Reductions

These are the items most likely to add complexity without improving the simple player-facing game:

1. **Removed:** `G02`, `G04`, `G11` and `G25`.
2. **Included:** `G08` full CPU careers, `G12` minimal CPU MLP management and annual drafts, `G14` generated news, `G16` sparing injuries, and `G29` the unified career inbox.
3. **Absorbed:** `G13` team membership becomes internal CPU state within `G12`, not a separate player-facing status system.

## Suggested Review Order

1. Define the shared CPU career progression rules used by `G08`.
2. Add minimal CPU MLP management, annual drafts and MiLP club events from `G12`, absorbing `G13` as internal roster state.
3. Add bidirectional partner invitations from `G15`.
4. Add sparing healing-based injuries from `G16`.
5. Define `G14` news generators and route their output through the `G29` inbox alongside contracts, sponsorships, invitations and event notices.
6. Confirm `G19`–`G22` against the simple finance and paddle roadmap.
7. Keep `G23`, `G24` and `G26`–`G28` as the minimum packaging path.
