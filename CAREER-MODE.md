# Drives & Dinks — Career Mode

Career mode is a second game inside this project: a persistent player career that runs entirely on the device, with no account, no server and no network. It shares the match engine's ratings, abilities, names and archetypes, but it owns its own state, its own storage and its own interface.

It lives at its own entry point, **`/career-mode/`**. The gameplay prototype at the site root is untouched and keeps its own release, dev mirror, archives and frozen build.

| | |
|---|---|
| Branch | `codex/career-mode` (based on `origin/main`) |
| Entry point | `career-mode/index.html` → `https://antdroidx.github.io/DrivesAndDinks/career-mode/` |
| Engine modules | `src/career/` |
| Local run | `npm start` → `http://127.0.0.1:8768/career-mode/` |
| Current milestone | **M1 — offline career foundation: complete** |
| Last updated | 2026-11-08 |

---

## 1. Scope

**In scope now**

- A career that persists locally and survives a closed tab or a browser restart.
- A fixed world of two regions, their areas, cities, clubs and athletes.
- Browsing clubs, rosters and players.
- A weekly calendar with a competition ladder that opens up as the player improves.

**Deliberately not built yet**

- Match play inside a career. Career events schedule and gate today; they do not resolve a match. This is M2 and it needs the match engine.
- Cloud sync, accounts, leaderboards, monetisation.
- Anything that changes the match engine. Career mode is additive; it does not modify `src/game.js`, `src/core.js` or `src/tactics.js`.

### Relationship to `PRE-CAREER-AUDIT.md`

`PRE-CAREER-AUDIT.md` gates career work behind the match engine's P0 items (rules fidelity, match integrity, balance, device readiness). This milestone is deliberately scoped so it does not depend on any of them, because it never touches the match engine. One P0 item is satisfied directly rather than worked around:

> **P0 — "Define a versioned career save schema with migrations, corruption recovery and stable IDs for athletes, opponents, events and ratings."**

That item is implemented in `src/career/save.js` and is covered by `test/career-save.test.js`.

---

## 2. Architecture

### File map

| Path | Responsibility |
|---|---|
| `career-mode/index.html` | Entry point shell. Loads only career assets. |
| `career-mode/career.css` | Career styles, separate from `style.css`. |
| `career-mode/sw.js` | Service worker. Precaches the shell and the shared engine so the game opens with no network. |
| `src/career/geography.js` | Regions, areas, cities, the competition ladder, the career-rating curve. |
| `src/career/population.js` | Deterministic club and athlete generation from a seed. |
| `src/career/save.js` | Versioned save schema, migrations, validation, corruption recovery. |
| `src/career/calendar.js` | Week arithmetic, event generation, eligibility. |
| `src/career/state.js` | Career state and every action a player can take. |
| `src/career/main.js` | The user interface. |

### Shared engine pieces reused

| Engine module | What career mode takes from it |
|---|---|
| `src/roster.js` | The 14-key rating model (`RATING_KEYS`), the 8 archetypes, `NAME_CULTURES`, `generateIdentity`, `skillAverage`. |
| `src/competition.js` | `seededRandom` for deterministic generation, and the results-based rating model. |
| `src/core.js` | `DEFAULT_ABILITIES`, `playerProfile` — reachable through `roster.js`. |

Career ratings are the **same 14 values** the match engine simulates with, so a career athlete and a match athlete are the same kind of object.

### The seed rule

**Nothing about the population is stored.** A career save holds a seed; every club and athlete id is reproduced from `(seed, id)` on demand. Consequences:

- A save file stays a few kilobytes instead of holding a thousand athletes.
- Athlete ids are stable for the life of a career, because they are a function of the id, not of an enumeration order.
- Adding a club to a region cannot renumber another club's roster.

The cost is that the population must be regenerated on demand. A full region roster (1 007 athletes) rebuilds in about 11 ms, so browsing is live rather than paged.

### Data flow

```
seed ──► population.js ──► clubs, athletes ──┐
                                              ├──► state.js ──► save.js ──► localStorage
calendar.js ──► events ──────────────────────┘         │
                                                        └──► main.js ──► the screen
```

---

## 3. The world

### Geography

| Region | Areas | Cities | Clubs | Athletes |
|---|---|---|---|---|
| North America | 8 | 42 | 128 | 1 007 |
| Asia | 6 | 32 | 100 | 791 |

North America: Pacific Coast, Mountain & Desert, Southwest, Midwest, Great Lakes, Southeast, Northeast Corridor, Canada.

Asia: East Asia, Northeast Asia, Southeast Asia, South Asia, Central Asia, West Asia.

North American and Asian regions carry different name-culture weightings, so a Tokyo club roster is Asian-named and a Miami club roster is not.

### The career rating

The career rating follows the **DUPR** convention: a scale from **2.00 to 8.00**.

- The number is **precise**, not bucketed. It is stored at full precision and rounded to two decimals only for display, so a single point of skill moves it by a small but visible amount. There are no quarter-point steps.
- Bands label the number for the player: Beginner (2.00–2.99), Novice (3.00–3.49), Intermediate (3.50–3.99), Intermediate + (4.00–4.49), Advanced (4.50–5.49), Expert (5.50–6.99), Pro (7.00–8.00).
- A **reliability** percentage accompanies the rating, exactly as DUPR publishes it. Reliability rises with matches played: 0 % before a player has any matches, around 63 % after twelve and 96 % after forty.

Today the rating is derived from the 14 skill ratings, which is the only honest source available before career matches exist. From milestone 2 it should be driven by **results**, with the skill ratings acting as the starting prior — the same way DUPR itself works.

| Skill average | DUPR | Band |
|---|---|---|
| 30 | 2.00 | Beginner |
| 43 | 3.13 | Novice |
| 52 | 3.91 | Intermediate |
| 63 | 4.87 | Advanced |
| 74 | 5.83 | Expert |
| 95 | 7.65 | Pro |
| 99 | 8.00 | Pro |

### The competition ladder

Each tier has a DUPR entry rating. The gates are placed so that the whole 2.00–8.00 range is used and no tier is skipped over.

| Tier | Scope | Entry DUPR | Energy | Focus |
|---|---|---|---|---|
| Club Night | your club | 2.00 | 20 | control |
| Local League | your city | 3.50 | 15 | serve |
| City Open | your city | 4.00 | 15 | drive |
| Regional Open | your area | 4.50 | 20 | volley |
| Semi-Pro Circuit | your region | 5.00 | 25 | defense |
| National Championship | your nation | 5.75 | 30 | courtIQ |
| International Series | world | 7.00 | 35 | aggression |
| Pro League | world | 7.75 | 40 | reach |

A new career starts near DUPR 3.10, so the local league is the first visible goal and the pro league is a long climb. Locked tiers stay visible on the calendar with the reason they are locked, so the shape of the ladder is legible from week one.

### The weekly loop

One action per week. Either practise a focus rating or enter an event. Advancing the week restores 35 energy (cap 100) and rolls a fresh calendar.

Training gains taper with level — roughly +3 early, +1 near 90 — so the early career moves quickly and the late career does not grind flat.

---

## 4. Roadmap

Checkboxes are updated as work lands on this branch.

### M1 — Offline career foundation ✅ complete

The milestone this branch delivers.

- [x] Isolated `/career-mode/` entry point; root prototype untouched and still publishing unchanged
- [x] Versioned save schema with a migration chain (`CAREER_SAVE_VERSION = 3`, two migrations in place)
- [x] Corruption recovery: a damaged file falls back to the last verified save, and an unreadable file with no backup is quarantined rather than silently reset
- [x] Stable ids for athletes, clubs and events, guaranteed by seed derivation
- [x] North America and Asia, split into 14 areas and 74 cities
- [x] Generated population: clubs, rosters, names, archetypes, ratings, 13 % left-handed rate
- [x] Browse clubs, expand a roster, join a club, browse and search players
- [x] Weekly calendar with the 8-tier ladder, eligibility gates and calendar advance
- [x] Energy, one-action-per-week rule, training curve, travel and club membership
- [x] DUPR career rating: precise 2.00–8.00 scale, bands, and a reliability percentage
- [x] Offline: service worker precaches the shell and the shared engine modules
- [x] Local persistence with immediate write-through on every action
- [x] 54 automated tests (`test/career-*.test.js`)
- [x] Verified in the built-in browser: create, train, advance, browse, roster, search, reload-persistence

### M2 — Match play inside a career ⬜ next

Turns scheduled events into real matches using the existing engine.

- [ ] Launch a match from a career event with a generated opponent drawn from the club roster
- [ ] Carry the career athlete's ratings into the match lineup
- [ ] Write the result back as an immutable career record
- [ ] Feed the result into `recordResult` so the DUPR rating moves from results rather than from skill ratings
- [ ] Record match reports and replays against the same event id
- [ ] Retire the "match play arrives in the next milestone" placeholder

Depends on: `PRE-CAREER-AUDIT.md` P0 rules fidelity and match integrity items.

### M3 — Seasons and ladder progression ⬜ planned

- [ ] Season boundaries, standings and a season summary
- [ ] Promotion and relegation between ladder tiers
- [ ] Qualification for the national rounds
- [ ] A rival who also moves through the ladder
- [ ] Sponsor and prize money as a career resource

### M4 — Club life and opponents ⬜ planned

- [ ] Opponent AI that remembers results, per the match engine's existing opponent memory
- [ ] Teammates and doubles partners drawn from the club roster
- [ ] Coach feedback that points at a specific rating
- [ ] Club reputation that gates entry to better clubs

### M5 — Calendar depth ⬜ planned

- [ ] Travel between cities and regions
- [ ] Multi-week tournaments
- [ ] Fatigue, recovery and scheduling conflicts
- [ ] Rest and injury risk

### M6 — World expansion ⬜ planned

- [ ] Regions beyond North America and Asia, if the two-region model holds up
- [ ] International series with real venues
- [ ] The pro league as a career endpoint

### M7 — Packaging ⬜ planned

- [ ] Android, PC and iOS builds of the same career save
- [ ] Save import and export between devices
- [ ] Offline parity check on a low-powered phone

---

## 5. Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-08 | Career mode branches from `origin/main`, not from the in-flight venue branch | Keeps the career work reviewable on its own and leaves `codex/weather-venue-dev` deployable to DEV without change. |
| 2026-11-08 | The population is derived from a seed and never stored | Keeps saves tiny and makes ids stable by construction. |
| 2026-11-08 | `src/career/` holds the engine, `career-mode/` holds the shell | The engine lives with the rest of the engine; the entry point stays a separate, deployable folder. |
| 2026-11-08 | The service worker is network-first with a cache fallback | A cache-first worker masked code changes. Offline still works; stale code cannot. |
| 2026-11-08 | One action per week | Makes the calendar the pacing device, and leaves the energy cost of a real match meaningful. |
| 2026-11-08 | Save schema version 2, with a v1 migration that repairs the culture label | The first migration was needed in practice, so the chain is proven rather than theoretical. |
| 2026-11-08 | The career rating follows DUPR: a precise 2.00 to 8.00 scale with bands and a reliability percentage | Matches the rating convention pickleball players already know. Precise rather than bucketed, so progress is always visible. |
| 2026-11-08 | The rating is derived from the 14 skill ratings for now, and switches to result-driven in milestone 2 | DUPR is a results system. Deriving it from skills is a starting prior, not the final model. |

---

## 6. Open questions

1. **Ranking inside a region.** Is a career rating one number for the player, or a separate rating per tournament class? One number is simpler; per-class ratings would stop a doubles specialist being punished at singles events.
2. **Season length.** A season is currently 52 weeks. Should a season be shorter, with an off-season, so careers have a rhythm rather than a continuous grind?
3. **Practice as a separate verb.** Right now practice and event entry are the same action. Should training be something the player does *between* weeks for free, so the weekly action is only ever a match?
4. **Region transfer.** Can a player move permanently to the other region mid-career, or is a career tied to its starting region?

---

## 7. Verification

```sh
npm test                                   # whole suite, including the career tests
node --test test/career-geography.test.js \
                 test/career-population.test.js \
                 test/career-save.test.js \
                 test/career-state.test.js \
                 test/career-mode-packaging.test.js
npm start                                  # then open /career-mode/
```

The career tests assert behaviour, not implementation: that the ladder ascends, that a career round-trips through the save file, that a corrupt file recovers, that ids stay stable across rebuilds, that one action is allowed per week, and that the root prototype still does not reference career mode.
