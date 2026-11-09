# Drives & Dinks — Career Mode

Career mode is a second game inside this project: a persistent player career that runs entirely on the device, with no account, no server and no network. It shares the match engine's ratings, abilities, names and archetypes, but it owns its own state, its own storage and its own interface.

It lives at its own entry point, **`/career-mode/`**. The gameplay prototype at the site root is untouched and keeps its own release, dev mirror, archives and frozen build.

| | |
|---|---|
| Branch | `codex/career-mode` (based on `origin/main`) |
| Entry point | `career-mode/index.html` → `https://antdroidx.github.io/DrivesAndDinks/career-mode/` |
| Engine modules | `src/career/` |
| Local run | `npm start` → `http://127.0.0.1:8768/career-mode/` |
| Current milestone | **M2 and M3 — in progress; the competition shapes are built** |
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
| `src/career/events.js` | The competition templates: the seven shapes of event and the rules they are played under. |
| `src/career/competition.js` | Turning a template into a real competition: the field, the rounds, and the simulation that plays it out. |
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

### Formats

A player is rated separately in each format, and each format has its own ranking:

- **Singles**
- **Doubles**, played on a men's or a women's board
- **Mixed Doubles**

The three diverge because the games reward different things. Doubles leans on the soft game and the net, singles on the serve and the feet, and mixed is a blend. Every athlete carries a bias toward one of them, so a 3.9 doubles player might be a 3.4 singles player.

The player's card shows all three ratings, the band each one sits in, and the tour standing each one earns.

### Brackets and gates

Events are organised by bracket first. Each one runs **a bracket for each level of play**, and a bracket is named by the top of its range: the 3.5 bracket holds players rated 3.500 to 3.999. The player signs up for a bracket and is placed in it.

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

**What the gate reads.** A gate reads the rating for the division being entered, and nothing else. A doubles gate reads the doubles rating, a mixed gate reads the mixed rating, and a singles gate reads the singles rating. **The mixed rating is never used to gate a doubles event.** It is carried for reference and for the mixed divisions.

An event also chooses how it reads a team:

- **Highest player**, the normal case. A 5.0 player may enter a 5.0 gate with a 3.0 partner, because the strongest player on the team is 5.0. This is what stops a strong player from dropping into a low gate with a weak partner.
- **Combined**, for events that want the teams level rather than the strongest player to set the bar. A combined 4.0 gate takes a 5.0 and a 3.0, and it takes a 4.2 and a 3.8.

A solo entry is gated on the player's own rating, where the two rules are the same thing. The highest-player rule becomes live when the player can choose or keep a partner; today a partner is drawn inside the bracket, so the rule cannot be violated.

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
| International Series | world | 5.0+ | Singles / Doubles | 52 | September to December |
| Pro League | the pro tour | open, by standing | Doubles | 64 | January to June |
| MLP | the pro tour | 5.0+ | Doubles | 58 | June to August |

**There are no seasons at amateur level.** Tournaments run all year at different clubs and locations. Leagues and the amateur MLP run for a month or three. At the top of the game the three world events run in turn rather than on top of each other: the pro league from January to June, the MLP as a summer circuit from June to August, and the international series through the autumn.

### The shapes of a competition

An event is not one thing. Every level of the game can host any of seven shapes of competition, and a competition is **generated from the career's seed rather than authored**, so the same career always draws the same field while a different career draws a different one.

| Template | Shape | How it is won |
|---|---|---|
| Round Robin League | fixed teams, every pair meets once | the top four go to a playoff |
| Round Robin, Open Partners | every player gets a new partner each round | the best record wins the league |
| Bracket Tournament | the field is split into brackets of eight, each a short round robin | the bracket winners go to a playoff |
| Double Elimination | nobody is out until they have lost twice, and the draw is made again each round | the last side standing |
| Ladder, Fixed Teams | teams ranked onto courts; win and you move up a rung, lose and you move down | the most points at the end |
| Ladder, Open Partners | players placed on courts by rating and given a random partner | the most points at the end |
| MLP | a team of four or five plays doubles and singles against combinations of the other side | the season |

The rules travel with the template and an organiser can vary any of them: **games to 11**, playoff games to **15**, the last four of a tournament **best of three**, a round robin round kept to about **seven games**. Games are won by two, exactly as they are on court.

Some shapes cannot be arranged up front, so they are resolved as they are played. Who reaches the playoff of a round robin depends on the results, who is still alive in a double elimination depends on the results, and a ladder's courts are re-formed every round. The player's own matches are never decided by the simulation: they are left for the player to play, and the rest of the field is played out around them.

### Scoring

A game is defined by three things: **the points it plays to**, **the margin it must win by**, and **whether only the serving side can score**.

| Rule | What it means |
|---|---|
| Points | 11 in league play, 15 in the last four of a tournament, and up to 21 in a league format |
| Win by | two, in every format the game runs |
| Scoring | side-out or rally |

**Side-out** is the traditional game. A rally only scores for the serving side, and losing a rally hands the serve over. It is the default and it is what the match engine has always played.

**Rally scoring** awards a point to whoever wins the rally, and the winner serves next. It is faster, and it is what the MLP and the Amateur MLP use, so a league night feels different from a sanctioned tournament.

The rules travel with the match. The career writes them into the pending match, the engine builds its scoreboard with them, and the tournament simulation plays by the same rules. A playoff game really is to fifteen; before this, the engine always played to eleven however the tournament was configured.

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

A week is a budget of **100 energy**, and the player spends it however they like.

- **Training is repeatable**, up to four sessions a week.
- **One event a week.** A league that runs for a season is an event every week of it; a tournament is one event.
- **Travel** costs 10 energy inside a region and 20 across regions, on top of everything else.

Both the cost of a training session and the weekly recovery scale with the level the player competes at, so the shape of a week changes as a career climbs. A stronger player trains harder and takes more back.

| Rating | A training session | Recovery | A week that fits inside it |
|---|---|---|---|
| 3.5, where a career starts | 10 | 69 | three sessions and a club night, 42 |
| 4.5 | 14 | 75 | three sessions and a regional open, 72 |
| 5.5 | 18 | 81 | two sessions and a national round, 80 |
| 6.5 | 22 | 87 | one session and a pro league event, 86 |

Spending more than the weekly recovery carries the rest into the next week as fatigue, so a heavy week is felt the week after. The consequence is that **early careers are training-heavy and late careers are not**: a 3.5 player can afford four sessions and still compete, while a pro's week is almost entirely the tour.

Advancing the week restores the recovery, rolls a fresh calendar and advances the world.

**Training moves attributes only.** It is a single point to the attribute you focus on, and it never moves your rating. **Playing an event moves both**: the rating in the format you entered, and one attribute you rely on. Which attribute grows is weighted by the skill the event rewards, what you are strongest at, and what the format asks for, so a soft player gets better at the soft game and a server gets better at serving.

---

## 4. Roadmap

Checkboxes are updated as work lands on this branch.

The order is a dependency chain. A ranking measures the rounds a player reached, so competitions come before ranking. A contract is granted on a ranking, so ranking comes before contracts. Retirement is the end of a career, so it comes after the things a career passes through. The design behind the tour, the contracts and the career arc is in [`PRO-TOUR.md`](PRO-TOUR.md).

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
- [x] Energy as a weekly budget: repeatable training, one event a week, and costs and recovery scaled to the level of play
- [x] Career rating: a precise 2.000–8.000 scale, the published bands, and a reliability percentage
- [x] The rating calculation itself: expected score, performance against expectation, match type, recency and volume
- [x] A career starts at a provisional 3.500 and the first rated match sets it
- [x] The whole population is dynamically rated, with a 52 week half life back to the middle
- [x] Brackets instead of rating gates, with play up and play down
- [x] Singles, doubles and mixed doubles rated and ranked separately
- [x] Open events with no rating gates, and a gated event always accepting a bracket half a step up
- [x] No seasons: tournaments all year, leagues and the amateur MLP one to three months, and at the top of the game the pro league, the MLP and the international series running in turn
- [x] Training moves attributes only; playing an event moves the rating and grows one attribute
- [x] A career can move to the other region
- [x] The pro tour: separate men's and women's boards, one symmetric floor, and a rolling points window
- [x] Citizenship and city in place of ethnicity
- [x] Offline: service worker precaches the shell and the shared engine modules
- [x] Local persistence with immediate write-through on every action
- [x] 147 career tests across eleven files (`test/career-*.test.js`), 597 in the suite overall
- [x] Verified in the built-in browser: create, train, pick a format and bracket, play a rated match, advance, browse, roster, search, move region, reload-persistence

### M2 — Match play inside a career ✅ complete

A career event is played by the real engine, rated on the real result, and recorded against the event.

- [x] Launch the real match from a career event, with the opponents drawn from the bracket
- [x] Carry the career athlete's own attributes into the match lineup
- [x] Use the real result in place of the simulated one when rating the match
- [x] Record the result as an immutable career record against the same event id
- [x] Keep the engine's own match report attached to that record
- [x] Award tour points from the result
- [x] Let the opponents the player faced move through the world rating state
- [x] Take the difficulty from the career: club and league nights are easy, opens normal, national and pro events hard
- [x] Carry opponent memory from one career match into the next

The handoff is a settled decision. The career writes a pending match, the engine plays it, and the report comes back. Playing inside the career page is not planned, because the match needs the whole screen.

### M3 — Competitions that are real 🔶 in progress

An event now fields a tournament rather than a single match.

- [x] Entering an event fields a tournament, and the player plays their path through it one round at a time
- [x] Draw sizes per tier: eight teams for leagues, sixteen to sixty-four for tournaments
- [x] Seeded single elimination with byes, and a round robin for leagues
- [x] A division fields its own rating band, even when the event is open
- [x] The gate basis is recorded per event, as the highest player or the combined team
- [x] The tournament is saved between rounds, so a handoff to the engine survives a reload
- [x] Points follow the real tour proportions by place, from champion down to the first round
- [x] Points and prize are paid for the placing when the tournament ends
- [x] Qualifier draws: a player outside the main-draw cut plays one match to get in
- [x] A secondary bracket: a first round knockout loss opens one more match
- [x] Seeding in bands, with the top two fixed, and byes by combined ranking in doubles
- [x] All seven shapes wired in: bracket, round robin, double elimination, fixed and open ladders, and the team league
- [ ] Multi-week events that occupy consecutive weeks
- [x] A way to skip weeks with nothing on the calendar
- [ ] Events that share a week: the single event slot and the energy budget decide which one, and a league match can be missed for a tournament at a cost to the league standing
- [ ] Travel conflicts: two events in different regions in the same week cannot both be played

**Why it is here.** A ranking is a measurement of rounds reached, and rounds do not exist until an event fields a tournament. This is the foundation the tour is expressed in.

**Where it stands.** Every event names the shapes it may run, and the calendar picks one from that set. Knockouts take one loss, a double elimination takes two, a ladder swaps the winner up and the loser down a rung, an open draw gives the player a new partner each round, and a team league plays sides of four.

### M4 — The ranking and the pro tour ✅ complete

- [x] Four rankings: Overall, Doubles, Mixed and Singles
- [x] Best fourteen results in a fifty-two week window, with the biggest events always counting
- [x] The composite: doubles 50, mixed 35, singles 15
- [x] Points by round reached, per tier, replacing points for entry
- [x] The board is placed on points, not on the rating
- [x] Entry selection: the top of the board is accepted directly, a wild card gets an unranked player in, and everyone else qualifies
- [x] Wild cards, earned by winning a Challenger event, and the Challenger route into an Open main draw
- [x] The Challenger ranking, kept separate from the tour
- [x] The PPA Finals: top eight Overall, and an eight-team round robin as the event
- [x] The World Championship as a once-a-year anchor, worth 3000

The contracted-player tier of entry selection arrives with M5, because there are no contracts yet.

### M5 — Contracts, obligations and the drop ⬜ planned

- [ ] Contract levels: Futures, Standard and Gold
- [ ] The three routes in: top fifty Overall, top of the Challenger Tour, or recommendation
- [ ] The obligation: twenty-five events a year, and an event only counts with two of three formats
- [ ] The season boundary: renew, promote or release
- [ ] Release without leaving the game: no main draw spot, no prize multiplier, no league
- [ ] The ineligible period: twelve months out of the biggest events, and eight smaller events to reapply
- [ ] Working back: a Challenger win, the top fifty, or a recommendation
- [ ] The team league: playable games, with the draft, roster and promotion running in the background
- [ ] The player is the player, not the owner: assignments and team decisions are simulated

### M6 — A career with an end ⬜ planned

Retirement is the endpoint of a career. Everything above is a stage a career passes through on the way to it.

- [ ] The age curve and the ceiling rule: a rating can fall below a player's age-adjusted peak but never rise above it
- [ ] Recovery that declines with age
- [ ] A starting age chosen at creation, so a career can begin at ten or at thirty
- [ ] No fixed career length: the player plays until they retire
- [ ] Voluntary retirement at any point
- [ ] Forced retirement, offered plainly when the ceiling falls below the level the player is attempting
- [ ] The all-time board, and the career record as a final artifact
- [ ] The epilogue

### M7 — Club life and opponents ⬜ planned

- [ ] Opponent AI that remembers results, per the match engine's existing opponent memory
- [ ] Persistent doubles partners drawn from the club roster, gated on the highest player by default
- [ ] Coach feedback that points at a specific rating
- [ ] Club reputation that gates entry to better clubs

### M8 — World expansion ⬜ planned

- [ ] Regions beyond North America and Asia, if the two-region model holds up
- [ ] International stops with real venues
- [ ] A world calendar that spreads the five divisions across concurrent events

### M9 — Packaging ⬜ planned

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
| 2026-11-08 | A week is a budget of 100 energy, not a single action | The one-action rule contradicted how players actually train. A week now holds several training sessions and one event, and energy decides how they are spent. |
| 2026-11-08 | Save schema version 2, with a v1 migration that repairs the culture label | The first migration was needed in practice, so the chain is proven rather than theoretical. |
| 2026-11-08 | The career rating is a precise 2.000 to 8.000 scale with the published bands and a reliability percentage | Matches the rating convention pickleball players already know. Precise rather than bucketed, so progress is always visible. |
| 2026-11-08 | The rating calculation is implemented in full, including the cases where a win lowers a rating | A rating that only moves on wins is a points system, not a rating system. The calculation is the point. |
| 2026-11-08 | A career starts at a provisional 3.500 and the first rated match sets it | A new player has no rating. The number they start on is a placeholder until real results arrive. |
| 2026-11-08 | The whole population is rated dynamically, with a 52 week half life back to the middle | The world has to move, or a career is a museum. Standing still has to cost something. |
| 2026-11-08 | The rating constants are hand tuned to reproduce published behaviour, not fitted to a proprietary algorithm | The real algorithm is not published. The behaviour is what matters and that is documented and tested. |
| 2026-11-08 | Events carry brackets instead of rating gates | Real tournaments do not gate entry on a rating. They run a bracket per level and the player picks one. |
| 2026-11-08 | The pro league is entered on a tour standing, with one symmetric 4.95 floor for both boards | The published floors are a points cut and differ oddly between the boards. One floor keeps a rating meaning the same thing on each. |
| 2026-11-08 | Players are identified by city and citizenship, not ethnicity | Citizenship and city say where a player is from and what they play for, without labelling them. |
| 2026-11-08 | Training and recovery scale with the level of play, and a week carries fatigue | The first version left energy decorative: with one action a week and a fixed recovery of 35, a real career started every week at full energy and the meter never changed a decision. Scaling both costs and recovery makes the meter bite, and makes training-heavy weeks a property of an early career rather than a special case. |
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
| 2026-11-08 | The rating is derived from the 14 skill ratings only until the first rated match, then moves on results | DUPR is a results system. Deriving it from skills is a starting prior, not the final model, and the prior expires the moment there is a result. |
| 2026-11-08 | The seven competition shapes are templates, and a competition is generated rather than authored | A tournament's shape is a set of rules, not a piece of content. Encoding them as data means an organiser can vary the points and the format, and the same seed always produces the same field. |
| 2026-11-08 | A game's rules are points, win by, and scoring, and they travel with the match | The engine played to eleven in every game while the tournament said playoffs were to fifteen. A rule the simulation and the match disagree about is not a rule. |
| 2026-11-08 | The pro league is a career stage, not the endpoint. Retirement is the endpoint | A career that stops at the top is a ladder climb. A career that can decline and end is a career, and it makes falling out of the pro league a normal part of one. |
| 2026-11-08 | The pro tour is modelled on the real PPA rather than invented | Rankings, tiers, contracts, the obligation rule and the route back in are all taken from the published tour. Inventing them would have produced something that felt like a generic sports game. |
| 2026-11-08 | A tournament fields 44 to 64 spots per division, not the whole ranked population | The ranked board is 1,200 and a draw is 64. The rest of the population sits at other events, in qualifiers, or on the Challenger circuit. |
| 2026-11-08 | A rating gate reads the division's own rating, and the mixed rating is reference only | A doubles gate that read mixed would let a mixed specialist into a doubles bracket they cannot play. |
| 2026-11-08 | Gated doubles default to the highest player, and some events use the combined rating | The highest-player rule is how real gated events work: a 5.0 can partner with a 3.0 at a 5.0 gate. Combined gating is the variant for events that want the teams level. |
| 2026-11-08 | A playoff, a double elimination and a ladder resolve during play rather than up front | Who reaches a playoff depends on the results, who is still alive in a double elimination depends on the results, and a ladder's courts are re-formed every round. The structure and the simulation have to live together. |

---

## 6. Open questions

1. **Regional against world standing.** Ratings are per format and rankings will be per division. What is still open is whether a player's place in a regional board is their world place or a local one. A local board lets a mid-level player be competitive at home while still far down the world board.
2. **Season rhythm.** A season is 52 weeks. Should it be shorter, with an off-season, so careers have a rhythm rather than one continuous grind?
3. **Practice as a separate verb.** Training is repeatable inside a week and costs energy, so it competes with competing for the budget. Should any training be free?
4. **Region transfer.** Can a player move permanently to the other region mid-career, or is a career tied to its starting region?
5. **Career length.** How many seasons should a career last before the age curve makes retirement the right choice? The tour design suggests fifteen to twenty. A shorter career is easier to finish and easier to replay.

The tour and career-arc questions — season length, declining a contract, the age curve against the rating's half-life, the recommendation route, the league and how much of the ranked population is simulated — are in [`PRO-TOUR.md`](PRO-TOUR.md).

---

## 7. Verification

```sh
npm test                                   # whole suite, including the career tests
node --test test/career-competition.test.js \
                 test/career-geography.test.js \
                 test/career-population.test.js \
                 test/career-save.test.js \
                 test/career-state.test.js \
                 test/career-mode-packaging.test.js
npm start                                  # then open /career-mode/
```

The career tests assert behaviour, not implementation: that the ladder ascends, that a career round-trips through the save file, that a corrupt file recovers, that ids stay stable across rebuilds, that a week holds several training sessions and one event, that every competition shape plays out to a champion, and that the root prototype still does not reference career mode.
