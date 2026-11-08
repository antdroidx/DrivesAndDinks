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
| `src/career/geography.js` | Regions, areas, cities, citizenship, and the competition ladder of events and the brackets they field. |
| `src/career/rating.js` | The rating system: scale, bands, precision, brackets, the expectation calculation and the half life. |
| `src/career/tour.js` | The pro tour: the men's and women's boards, the tour floor and the rolling points window. |
| `src/career/world.js` | The world simulation: the population plays, ratings move, idle players drift back. |
| `src/career/population.js` | Deterministic club and athlete generation from a seed. |
| `src/career/save.js` | Versioned save schema, migrations, validation, corruption recovery. |
| `src/career/calendar.js` | Week arithmetic, event generation, bracket choice and entry eligibility. |
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

The career rating runs from **2.000 to 8.000**, displayed to three decimals and stored at full precision, so there are no bucketed steps.

The bands are the ones players already meet in published world rankings: **2.000–2.999 Novice**, **3.000–3.999 Intermediate**, **4.000–4.999 Advanced**, **5.000–8.000 Professional**. A **reliability** figure sits beside it, rising with the number of rated matches played: 0 % before the first match, about 63 % after twelve and 96 % after forty, labelled Low, Medium or High.

A rating measures skill, not wins. **It moves on performance measured against an expectation**, which is the defining idea of the system.

#### The expectation

Expected margin in match points = rating gap × 4.5, clamped to ±11. Expected score = 9 ± margin ÷ 2, each side clamped to 0–11.

| Pair | Expected |
|---|---|
| 4.5 against 3.0 | about 11–5.6, a comfortable win |
| 4.0 against 4.5 | about 7.9–10.1, a close game |
| 4.0 against 4.0 | 9–9 |

#### The performance

```
performance = ((actualMine − expectedMine) − (actualTheirs − expectedTheirs)) ÷ 11
            = (actual margin − expected margin) ÷ 11
```

| Situation | Performance | Rating |
|---|---|---|
| 3.0 beats 4.5 11–3 | +1.216 | jumps up |
| 3.0 beats 4.5 11–8 | +0.761 | still up |
| 4.0 loses 9–11 to 4.5 | +0.023 | up slightly |
| 5.5 beats 4.5 11–3 | +0.341 | up |

Beating good people moves you a great deal. Losing narrowly to someone better still nudges you **up**, because you came closer than the ratings said you would.

#### The change

```
delta = 0.35 × performance × typeWeight × recency × volumeDamping
```

| Weight | Rule |
|---|---|
| typeWeight | tournament 1.0, league 0.85, club 0.7, recreational 0.5 |
| recency | `exp(−weeksAgo ÷ 26)`, so a match from half a year ago has half the pull |
| volumeDamping | `1 ÷ √(1 + matches ÷ 10)`, so a thin history moves more per result |

The two teams move equal and opposite, and in doubles each pair splits its team's change in proportion to their own ratings. Total rating is conserved.

#### Where the actual score comes from

The expectation is computed from ratings, but the score that is actually played is computed from **underlying skill**: `margin = skillGap × 1.1 + noise(±6)`. That is the engine of the system. A player whose skill is ahead of their rating over-performs and climbs; one whose skill has slipped behind under-performs and slides.

#### Starting point and limits

A career starts at **3.500**, because a new player has no rating. It can fall to **2.000** over a losing streak and climb quickly by beating good players, and it can reach **8.000** at the very top of the scale.

#### The whole world is rated this way

The rest of the region is not scenery. Every week the rated population plays, their results move their ratings through the same calculation the player uses, and everyone who does not play drifts back toward the middle of the scale on a **half life of 52 weeks**. Standing still costs you.

Only ratings that have actually changed are stored. An athlete who has never played keeps their starting rating and the week it was set, so their current rating is that rating aged forward.

### Brackets, not gates

Events do not gate entry on a rating. They run **a bracket for each level of play**, and a bracket is named by the top of its range: the 3.5 bracket holds players rated 3.500 to 3.999. The player signs up for a bracket and is placed in it.

| Bracket | Holds |
|---|---|
| 2.0 | 2.000 – 2.499 |
| 2.5 | 2.500 – 2.999 |
| 3.0 | 3.000 – 3.499 |
| 3.5 | 3.500 – 3.999 |
| 4.0 | 4.000 – 4.499 |
| 4.5 | 4.500 – 4.999 |
| 5.0+ | 5.000 – 8.000 |

A player may enter their own bracket, one above it, or one below it. **Playing up is the fastest way to move a rating**, because the bar to beat is lower. Playing down risks a drop, because a narrow win is an underperformance.

### Formats

A player is rated separately in each format, and each format has its own ranking:

- **Singles**
- **Doubles**, played on a men's or a women's board
- **Mixed Doubles**

The three diverge because the games reward different things. Doubles leans on the soft game and the net, singles on the serve and the feet, and mixed is a blend. Every athlete carries a bias toward one of them, so a 3.9 doubles player might be a 3.4 singles player.

The player's card shows all three ratings, the band each one sits in, and the tour standing each one earns.

### Brackets, not gates

Events do not gate entry on a rating. They run **a bracket for each level of play**, and a bracket is named by the top of its range: the 3.5 bracket holds players rated 3.500 to 3.999. The player signs up for a bracket and is placed in it.

| Bracket | Holds |
|---|---|
| 2.0 | 2.000 – 2.499 |
| 2.5 | 2.500 – 2.999 |
| 3.0 | 3.000 – 3.499 |
| 3.5 | 3.500 – 3.999 |
| 4.0 | 4.000 – 4.499 |
| 4.5 | 4.500 – 4.999 |
| 5.0+ | 5.000 – 8.000 |

**Some events are completely open**, with no rating gates at all. Ladder events are the usual case, and an open tournament works just as well. An open event takes any bracket it runs, which is what lets a player who feels underrated go and play better company — and lets anyone drop into a lower bracket to grind.

A **gated** event only takes players whose rating sits in the bracket, with one allowance: a bracket half a step above their own is always open to them. A 3.3 player can enter a 3.5 tournament.

### The competition ladder

| Event | Scope | Brackets | Formats | Energy | Length |
|---|---|---|---|---|---|
| Club Night | your club | 2.0 – 3.5, open | Doubles | 12 | weekly |
| Local League | your city | 2.5 – 4.0, open | Doubles | 18 | a month or three |
| City Open | your city | 3.0 – 4.5, open | Singles / Doubles / Mixed | 24 | a tournament |
| Regional Open | your area | 3.5 – 5.0+ | Singles / Doubles | 30 | a tournament |
| Amateur MLP | your region | 3.5 – 4.5 | Doubles | 30 | a month or three |
| Semi-Pro Circuit | your region | 4.5 – 5.0+ | Doubles | 36 | a season |
| National Championship | your nation | 5.0+ | Singles / Doubles / Mixed | 44 | a tournament |
| International Series | world | 5.0+ | Singles / Doubles | 52 | nine months |
| Pro League | the pro tour | open, by standing | Doubles | 64 | nine months |
| MLP | the pro tour | 5.0+ | Doubles | 58 | a summer circuit |

**There are no seasons at amateur level.** Tournaments run all year at different clubs and locations. Leagues and the amateur MLP run for a month or three. The pro tour runs about nine months and the MLP is a summer circuit for pros.

### The pro tour

The pro league works differently from a rating system. Its world ranking is a composite of tour points earned over the last 52 weeks, weighted 50 percent doubles, 35 percent mixed doubles and 15 percent singles, and the men's and women's boards are ranked separately.

In the published rankings the men's board had 1471 players with its last place at 4.89 and the women's had 829 with its last place at 3.89, which is low enough to look wrong next to the men's floor. It is a points cut, not a rating cut, and the rating only has to clear the bar.

The game uses **one symmetric floor for both boards**: a top slice of the world population rather than a fixed number.

| | Men | Women |
|---|---|---|
| Players on the tour | 1 200 | 1 200 |
| Pro floor | 4.95 rating | 4.95 rating |
| Top of the board | 7.047 | 6.999 |

A player earns tour points from events, and points age out on the rolling 52 week window. Playing up a bracket is worth more than staying in their own, because the board rewards beating stronger opposition.

### The weekly loop

One action per week. Either train for 8 energy, or enter a rated event, which costs far more: 12 for club night, 18 for a local league, and up to 64 for the pro league. Advancing the week restores 35 energy (cap 100), rolls a fresh calendar and advances the world.

**Training moves attributes only.** It is a single point to the attribute you focus on, and it never moves your rating. **Playing an event moves both**: the rating in the format you entered, and one attribute you rely on. Which attribute grows is weighted by the skill the event rewards, what you are strongest at, and what the format asks for, so a soft player gets better at the soft game and a server gets better at serving.

---

## 4. Roadmap

Checkboxes are updated as work lands on this branch.

### M1 — Offline career foundation ✅ complete

The milestone this branch delivers.

- [x] Isolated `/career-mode/` entry point; root prototype untouched and still publishing unchanged
- [x] Versioned save schema with a migration chain (`CAREER_SAVE_VERSION = 7`, six migrations in place)
- [x] Corruption recovery: a damaged file falls back to the last verified save, and an unreadable file with no backup is quarantined rather than silently reset
- [x] Stable ids for athletes, clubs and events, guaranteed by seed derivation
- [x] North America and Asia, split into 14 areas and 74 cities
- [x] Generated population: clubs, rosters, names, archetypes, ratings, 13 % left-handed rate
- [x] Browse clubs, expand a roster, join a club, browse and search players
- [x] Weekly calendar with the 10-event ladder, bracket choice and calendar advance
- [x] Energy, one-action-per-week rule, training curve, travel and club membership
- [x] Career rating: a precise 2.000–8.000 scale, the published bands, and a reliability percentage
- [x] The rating calculation itself: expected score, performance against expectation, match type, recency and volume
- [x] A career starts at a provisional 3.500 and the first rated match sets it
- [x] The whole population is dynamically rated, with a 52 week half life back to the middle
- [x] Brackets instead of rating gates, with play up and play down
- [x] Singles, doubles and mixed doubles rated and ranked separately
- [x] Open events with no rating gates, and a gated event always accepting a bracket half a step up
- [x] No seasons: tournaments all year, leagues and the amateur MLP one to three months, the pro tour nine months, the MLP a summer circuit
- [x] Training moves attributes only; playing an event moves the rating and grows one attribute
- [x] A career can move to the other region
- [x] The pro tour: separate men's and women's boards, one symmetric floor, and a rolling points window
- [x] Citizenship and city in place of ethnicity
- [x] Offline: service worker precaches the shell and the shared engine modules
- [x] Local persistence with immediate write-through on every action
- [x] 92 automated tests across seven files (`test/career-*.test.js`), 533 in the suite overall
- [x] Verified in the built-in browser: create, train, pick a format and bracket, play a rated match, advance, browse, roster, search, move region, reload-persistence

### M2 — Match play inside a career 🔶 in progress

A career event is now played by the real engine.

- [x] Launch the real match from a career event, with the opponents drawn from the bracket
- [x] Carry the career athlete's own attributes into the match lineup
- [x] Use the real result in place of the simulated one when rating the match
- [x] Record the result as an immutable career record against the same event id
- [x] Keep the engine's own match report attached to that record
- [x] Award tour points from the result, with the points weighting the tour uses
- [x] Let the opponents the player faced move through the world rating state
- [ ] Play the match inside the career page rather than handing off to the engine page
- [ ] Take the difficulty from the career rather than always playing normal
- [ ] Carry opponent memory from one career match into the next

The handoff is a shared handshake: the career writes a pending match, the
engine plays it with the lineup already built, and the engine's own match
report comes back to be scored. `src/career/handshake.js` is the only thing
the two pages share, so the handoff works either way round.

Depends on: `PRE-CAREER-AUDIT.md` P0 rules fidelity and match integrity items.

### M3 — Ladder progression 🔶 in progress

There are no seasons to model, so this milestone is about moving up the ladder
rather than surviving a schedule.

- [x] The world board and your place on it, for each format
- [x] A form summary: recent matches, the record and the streak
- [x] Qualification for the national rounds and above, earned with tour points
- [x] A rival, the player nearest to you on the board, who moves as they do
- [x] Prize money, and sponsors that arrive with a standing and pay into every purse
- [ ] The composite world ranking, weighted across doubles, mixed and singles
- [ ] Moving up the board as the thing the career is about

### M4 — Club life and opponents ⬜ planned

- [ ] Opponent AI that remembers results, per the match engine's existing opponent memory
- [ ] Teammates and doubles partners drawn from the club roster
- [ ] Coach feedback that points at a specific rating
- [ ] Club reputation that gates entry to better clubs

### M5 — Calendar depth ⬜ planned

Travel between cities is done. What is left is making the calendar bite.

- [ ] Multi-week tournaments that occupy consecutive weeks
- [ ] Team leagues and MLPs that run for a season with a playoff
- [ ] Fatigue, recovery and scheduling conflicts
- [ ] Rest and injury risk
- [ ] Travel costs that matter, and a home city worth defending

### M6 — World expansion ⬜ planned

- [ ] Regions beyond North America and Asia, if the two-region model holds up
- [ ] International series with real venues
- [ ] The pro league as a career endpoint, reachable through tour points

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
| 2026-11-08 | The career rating is a precise 2.000 to 8.000 scale with the published bands and a reliability percentage | Matches the rating convention pickleball players already know. Precise rather than bucketed, so progress is always visible. |
| 2026-11-08 | The rating calculation is implemented in full, including the cases where a win lowers a rating | A rating that only moves on wins is a points system, not a rating system. The calculation is the point. |
| 2026-11-08 | A career starts at a provisional 3.500 and the first rated match sets it | A new player has no rating. The number they start on is a placeholder until real results arrive. |
| 2026-11-08 | The whole population is rated dynamically, with a 52 week half life back to the middle | The world has to move, or a career is a museum. Standing still has to cost something. |
| 2026-11-08 | The rating constants are hand tuned to reproduce published behaviour, not fitted to a proprietary algorithm | The real algorithm is not published. The behaviour is what matters and that is documented and tested. |
| 2026-11-08 | Events carry brackets instead of rating gates | Real tournaments do not gate entry on a rating. They run a bracket per level and the player picks one. |
| 2026-11-08 | The pro league is entered on a tour standing, with one symmetric 4.95 floor for both boards | The published floors are a points cut and differ oddly between the boards. One floor keeps a rating meaning the same thing on each. |
| 2026-11-08 | Players are identified by city and citizenship, not ethnicity | Citizenship and city say where a player is from and what they play for, without labelling them. |
| 2026-11-08 | Training costs 8 energy against 12 for the cheapest rated match | The calendar should make a player choose to compete rather than to grind. |
| 2026-11-08 | Training moves attributes only, by a single point, and never the rating | Anything that gives you a rating is an event. Drilling is for the attributes and is deliberately small so a player cannot over-boost. |
| 2026-11-08 | Playing an event moves the rating and grows one attribute the player relies on | Attributes should follow what a player actually does, so growth is weighted by the event's focus, their strongest skills and the format. |
| 2026-11-08 | Singles, doubles and mixed doubles are rated and ranked separately | The games reward different things, and a player should be rated on what they do in the game they are playing. |
| 2026-11-08 | Some events are completely open, and a gated event always accepts a bracket half a step above the player's own | Real events do not gate entry on a rating. Open events let an underrated player find stronger company; the half step up is how a player plays up. |
| 2026-11-08 | There are no seasons. Tournaments run all year, leagues and the amateur MLP run one to three months, the pro tour runs nine months and the MLP is a summer circuit | That is how amateur and professional pickleball actually run. |
| 2026-11-08 | A career can move to the other region, at a higher energy cost | The pro circuit is international. The question was never whether a player can go, only what it costs. |
| 2026-11-08 | A career match is played by the real engine and rated on the real result | The rating has always been about performance against expectation. It is only honest if the performance is a real match. |
| 2026-11-08 | The career and the engine share a handshake in local storage | One small module is all the two pages share, so the handoff can be a page change or a frame without either side knowing the difference. |
| 2026-11-08 | The national rounds and above are qualified for with tour points | Ratings are not gates. What earns a place in a national field is a season of results. |
| 2026-11-08 | Prize money and sponsors | A career needs a reason to keep going that is not a number on a board. Sponsors arrive with a standing and pay into every purse. |
| 2026-11-08 | The rating is derived from the 14 skill ratings for now, and switches to result-driven in milestone 2 | DUPR is a results system. Deriving it from skills is a starting prior, not the final model. |

---

## 6. Open questions

1. **Ranking inside a region.** Is a career rating one number for the player, or a separate rating per tournament class? One number is simpler; per-class ratings would stop a doubles specialist being punished at singles events.
2. **Season length.** A season is currently 52 weeks. Should a season be shorter, with an off-season, so careers have a rhythm rather than a continuous grind?
3. **Practice as a separate verb.** Right now practice and event entry are the same action. Should training be something the player does *between* weeks for free, so the weekly action is only ever a match?
4. **Region transfer.** Can a player move permanently to the other region mid-career, or is a career tied to its starting region?
5. **Singles and doubles on one rating.** DUPR is a doubles rating and the PPA board blends doubles, mixed and singles. Should a career carry one rating across both formats, or a rating per format?

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
