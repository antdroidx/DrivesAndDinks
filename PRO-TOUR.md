# The Pro Tour, and the End of a Career

A design document. No code has been written against it yet.

---

## 1. The premise

**The pro league is not the finish line. Retirement is.**

A career is not a ladder you climb to the top and then stop at. It has a shape: you start somewhere, you get better, you reach a peak, you come down, and you stop. The pro league is a stage in that shape, not the end of it. A player can be in the pro league and still be finished; a player can be outside it and still have years in front of them.

Two consequences follow, and they change the design:

**A career can go down as well as up.** If the top of the game is not the destination, then falling out of the pro league is a normal part of a career rather than a failure state. A player who stops qualifying is not broken; they are in a different part of their career, and there is a way back.

**The board is never still.** Ranking is relative. If a player holds a place, other players moving ahead takes it from them. Nobody's standing is a possession; it is a position that has to be defended, and it can be lost.

This is not an invention. It is how the real pro tour works, and the mechanics below are taken from the PPA rather than invented for the game. Where the game departs from reality it says so.

---

## 2. What the real tour does

The reference is the Carvana PPA Tour, and specifically the World Pickleball Rankings that debut with the 2026-27 season. The mechanics that matter here:

**One ranking system, several views.** A player holds four rankings: Overall, Singles, Doubles and Mixed. The discipline rankings come from the player's best fourteen results in that discipline over a trailing fifty-two weeks. The Overall ranking is a weighted composite of the three — gender doubles fifty percent, mixed doubles thirty-five percent, singles fifteen percent — because a complete player is one who shows up everywhere.

**One number has one job.** The Overall ranking decides entries, byes and qualification for the season finals. The discipline rankings seed the individual draws, and in doubles the two partners' rankings combine.

**Some results always count.** The four biggest events — the World Championships and the three other Majors — count whatever the result, so a player cannot skip the season's biggest stages and still rank.

**Events are tiered by the points on offer to the champion.** 125, 250, 500, 1000, 1500, 2000, 3000. The tier name is the points. A player is awarded points for the highest round they reached, and there are no bronze medal matches at a thousand points or above — both losing semifinalists are paid as fourth.

**Professional status is a contract, not a ranking.** There are three contract levels — Gold, Standard and Futures — and every new signing starts at Futures, re-evaluated after twelve months. A Futures player is promoted to Standard by reaching the top twenty-five in any discipline, or the top thirty overall, or by a committee decision.

**There are three routes to a contract.** Crack the top fifty of the Overall ranking. Finish at the top of the Challenger Tour. Or be recommended and approved. The first two are merit; the third is the discretionary route that every real tour has and every game should probably have.

**Contracts carry obligations.** The game asks for twelve PPA events in a contract year, with at least three appearances in two different disciplines. A multi-division event counts once toward the event total while every division played is recorded for the discipline requirement. This preserves the complete-player pressure while fitting a calendar that normally plays one tournament at a time.

**There is a development circuit that feeds the tour.** The PPA Challenger Series runs around twenty stops of amateur divisions alongside a professional division, with its own ranking that is kept separate: Challenger points count toward the tour ranking, but tour points do not count toward the Challenger standings. Winning a Challenger professional event earns a wild card into a tour event's main draw.

**And there is a season finale.** The top eight men and top eight women on the Overall ranking qualify for the PPA Finals. Everyone plays all three disciplines. The format is a round robin into knockout semifinals, so points accumulate match by match rather than being awarded for one finishing position.

**The part that matters most for this design:** a player who does not hold their place does not simply stop existing. A contracted player who lets a contract lapse becomes ineligible for the biggest events for twelve months, but can still play Challengers and select international stops, and works back in by competing in eight of those smaller events within a year and reapplying.

That is the shape the user described, and it exists in the real tour. The game should have it.

---

## 3. The ranking

### Four rankings

| Ranking | Built from | Decides |
|---|---|---|
| Overall | the three discipline rankings, weighted | entries, byes, contracts, finals qualification |
| Doubles | best 14 doubles results in 52 weeks | seeding in doubles draws |
| Mixed | best 14 mixed results in 52 weeks | seeding in mixed draws |
| Singles | best 14 singles results in 52 weeks | seeding in singles draws |

**The composite.** Overall = doubles x 0.50 + mixed x 0.35 + singles x 0.15.

**Best fourteen, over fifty-two weeks.** A bad week does not sink a season, and a player cannot bank an early season indefinitely.

**Four mandatory results.** The World Championship and the three Majors always count, whatever the result. A player who skips the biggest stages cannot rank as though they had played them.

**The Challenger ranking is separate.** Best sixteen Challenger results, on both a rolling fifty-two-week and a calendar-year basis, kept per discipline. Challenger points count toward the tour ranking; tour points do not count toward the Challenger standings. A player can be good on the tour and still be outside the top of the Challengers, and the two boards tell different stories on purpose.

### Tie-breaking

In the order the real tour uses it: fewest events played in the window, then the highest single result, then the second highest, and so on. In doubles, the team with the stronger player.

### What changes in the game

The current `tour.js` places a player on the board **by rating alone**, and treats tour points as one undifferentiated pool. Both go. The board becomes a points ranking with a rating floor, and the rating is what the game uses to *simulate* the matches, not what it uses to *rank* them.

That separation is important. A rating is a skill measurement; a ranking is a results measurement. The real tour ranks on results because that is what a fan means by "number one". The game has been ranking on skill, which is defensible for an amateur ladder and wrong for a professional tour.

**The composite is for standing, not for entry.** The Overall ranking decides the board, the contracts, the byes and the finals. It does not decide whether a player may enter an event: an event's rating gate reads the rating for the division being entered, and section 6 covers that.

---

## 4. The tiers

Points are awarded for the highest round reached. A tier is named by the points its champion receives, so a Major is a 2000 and an Open is a 1000.

| Tier | Champion | Finalist | Third | Fourth | QF | R16 | R32 | R64 |
|---|---|---|---|---|---|---|---|---|
| World Championship 3000 | 3000 | 2400 | 1500 | 1200 | 600 | 300 | 150 | 75 |
| Major 2000 | 2000 | 1600 | 1200 | 800 | 400 | 200 | 100 | 50 |
| Cup 1500 | 1500 | 1200 | 900 | 600 | 300 | 150 | 75 | 38 |
| Open 1000 | 1000 | 800 | 600 | 400 | 200 | 100 | 50 | 25 |
| Challenger 500 | 500 | 400 | 300 | 200 | 100 | 50 | 25 | 13 |
| Challenger 250 | 250 | 200 | 150 | 100 | 50 | 25 | 13 | 6 |
| Challenger 125 | 125 | 100 | 75 | 50 | 25 | 12 | 6 | 3 |

**A bronze match is a property of the event, not the tier.** The real tour has gone both ways. The older tables paid third and fourth separately. The World Pickleball Rankings removed the bronze match at a thousand points and above, and the 2026 Florida Open brought it back. When an event runs no bronze match, both losing semifinalists take the fourth-place points.

### The game's ladder, mapped

| Career event | Tier | Champion points | Scope | When |
|---|---|---|---|---|
| Club Night | none | 0 | your club | weekly, all year |
| Local League | Challenger 125 | 125 | your city | all year |
| City Open | Challenger 250 | 250 | your city | all year |
| Regional Open | Challenger 500 | 500 | your area | all year |
| Amateur MLP | Challenger 500 | 500 | your region | all year |
| Semi-Pro Circuit | Open 1000 | 1000 | your region | all year |
| National Championship | Cup 1500 | 1500 | your nation | all year |
| International Series | Cup 1500 | 1500 | world | autumn |
| Pro League | Major 2000 | 2000 | world | January to June |
| World Championship | 3000 | 3000 | world | once a year |
| PPA Finals | up to 2000 | 2000 | top 8 | end of season |

**The World Championship and the PPA Finals are new.** One is a single world-scale event a year. The other is the season's climax, and it belongs to nobody but the eight players who earn it.

**The MLP sits outside the tour ranking.** It pays into its own pool, exactly as the real league does, and points earned there never count towards the tour.

**The point scale changes.** The existing ladder awards flat points for entering an event, fifteen for a city open and a hundred and fifty for the pro league, and the ranking is a tally of those. The new system awards points for the round reached, so winning a Major is worth two hundred times entering one. Existing qualification thresholds are replaced by ranking, not rescaled.

---

## 5. How a field is built

The game has two nested populations. The PPA ranking universe is roughly twelve hundred players across both genders; beneath it, each region generates about two thousand to twenty-nine hundred rated athletes. The regional roster supplies every division with a deep, gender-correct field while the twelve hundred ranked players remain the competitive board the career is measured against.

**A tournament fields a main draw, per division.** An event runs up to five professional divisions: men's doubles, women's doubles, mixed doubles, men's singles and women's singles. A sixty-four spot event takes up to three hundred and twenty entries across those five, but each division is its own sixty-four team bracket. The rest of the ranked population is at home, at a different event, in a qualifier, or on the Challenger circuit.

| Tier | Main draw |
|---|---:|
| World Championship 3000 | 64 |
| Major 2000 | 64 |
| Cup 1500 | 32 |
| Open 1000 | 32 |
| Challenger 500 and below | 16 |
| PPA Finals | 8 |

The game uses clean power-of-two draws because they are easier to read, faster to simulate and simpler to balance than the PPA's occasional 44 or 56-team fields. Tier still matters: a higher event pays more points and draws a stronger field, even when the bracket is the same size.

**A spot is a team in doubles and a player in singles.** A thirty-two spot doubles draw is thirty-two teams and sixty-four players.

### What the rating does

Rating is the player's current strength. Ranking is the player's accumulated results record. They both matter and are allowed to disagree.

- The simulated match uses rating to estimate the player's strength against each opponent.
- The rating changes after every game, including games inside league series.
- Division ratings enforce amateur and gated Challenger brackets.
- Doubles gates read the doubles rating, mixed gates read the mixed rating, and singles gates read the singles rating.
- The highest-player or combined-team rule decides which value a gated event uses.
- Rating determines how competitive a player is once they enter a professional tournament, even though it does not choose the professional main-draw cut.
- A rising rating is an early signal that the player is ready for stronger competition. The ranking points must still follow from actual results before they become eligible for the professional field.

Professional entry and contract reviews use ranking because the tour ranks competitors by what they have earned. Rating can explain poor form, expose a mismatch between skill and results, and break close decisions, but it does not replace ranking. A highly rated newcomer still needs results; an established player keeps their ranking until the results in the fifty-two week window age out.

### Three separate checks

A place in a professional event is decided in three separate steps. A rating gate answers “may this entry compete at this level?” A draw cut answers “did this entry earn one of this week's places?” Mixing the two would turn every field into a single rating leaderboard, which is neither how amateur events nor the PPA work.

**1. Event access.** This is a status and eligibility check. It decides whether the player may register at all: contracted players focus on the tour, released players can use the Challenger route, and an ineligible player cannot enter the biggest events. It does not consider whether the player will make the cutoff.

**2. Division gate.** This applies to amateur and gated Challenger events. It reads the rating for the division being entered: doubles rating for doubles, mixed rating for mixed and singles rating for singles. The mixed rating is never used for a doubles gate.

For doubles, the default is the **highest player's division rating**. Some events use the **combined rating**, the average of the two players' division ratings. The gate is a yes or no. A player who passes it can register even if they will not make the field.

**3. Ranking cut.** This applies to the professional main draw. Each division has its own cap, and entry is selected from that division's ranking. For doubles and mixed doubles, selection uses the pair's combined ranking; for singles, it uses the individual ranking. The relevant ranking is the one for that division, not the Overall board.

| Tier | Main draw | Qualifier field | Qualifier places | Wild cards |
|---|---:|---:|---:|---:|
| World Championship 3000 | 64 | 16 | 8 | 2 |
| Major 2000 | 64 | 16 | 8 | 2 |
| Cup 1500 | 32 | 8 | 4 | 2 |
| Open 1000 | 32 | 8 | 4 | 2 |
| Challenger 500 and below | 16 | 8 | 2 | 0 |
| PPA Finals | 8 | — | — | — |

These are the game's defaults; an event may override its qualifier field or wild-card count. Qualifier sizes count teams in doubles and players in singles. A qualifier entrant plays one qualification match; a winner takes one of the reserved main-draw places. The main draw and qualifier are different fields, which is what prevents the larger regional population from turning into an unlimited bracket.

The remaining main-draw places are filled by the division ranking:

| Priority | Who |
|---|---|
| 1 | registered players or teams, by ranking in that division |
| 2 | committee wild cards inside the reserved places |
| 3 | qualifier winners inside the reserved places |

The qualifier places and wild cards are reserved before the direct-entry cut. A 32-place Open with four qualifier places and two wild cards therefore has 26 direct places. Contract status decides whether a player may enter the tour; ranking decides whether they make a particular division.

**The qualifier has its own cut.** Any eligible player outside the direct draw may apply, but the qualifier fields only its configured number of entrants, selected by the division ranking. A player beyond both the main-draw and qualifier cuts is declined for that event and can enter another event or the lower circuit. This is the realistic answer to a large ranked population: open registration does not mean an unlimited draw.

**What the player sees.** Entry reports should state the exact outcome and reason: accepted directly with the ranking that earned the place, accepted into the qualifier, first alternate, declined at the qualifier cut, below the rating gate, or ineligible because of status. CPU fields use the same selection function, so the player is never subject to a rule the rest of the tour ignores.

### Seeding and byes

The draw is seeded in bands. Seeds one and two are fixed, seeds three to four are randomised within their band, then five to eight, nine to sixteen, and the rest of the field. In doubles and mixed doubles, the seed is based on the pair's combined ranking; in singles it is the individual ranking.

The standard game events use 8, 16, 32 or 64 entries, so they need no byes. If content later defines an irregular draw, byes go to the best entries by combined ranking in doubles or individual ranking in singles.

### In the game

The regional population is derived deterministically from each club. Every division draws from a rating-appropriate slice of an eligible gender pool: gender doubles and singles stay within the player's gender, while every mixed team has one man and one woman. Selection adds seeded jitter around the target rating and advances the random stream by event, division and week, so a later field is competitive without repeating the same twenty names. CPU and human entrants use the same field construction.

---

## 6. Rating gates

An event's rating gate decides whether an entry is allowed. It is a different question from tour entry, which is about ranking and contracts. A gate belongs to the amateur and Challenger levels, and it is applied per division.

**The rating that counts is the division's own.** A doubles gate reads the doubles rating. A mixed gate reads the mixed rating. A singles gate reads the singles rating.

**The mixed rating is never used to gate a doubles event.** It is carried for reference, and for the mixed divisions, and for nothing else. A player's mixed rating does not make them eligible for a doubles bracket and does not keep them out of one.

An event also chooses how it reads a team:

| Rule | How it works | Where it belongs |
|---|---|---|
| Highest player | the gate reads the strongest player on the team | the normal case |
| Combined | the gate reads the team's combined rating | events that want the field level rather than the strongest player to set the bar |

**Highest player, in practice.** A 5.0 player can enter a 5.0 gate with a 3.0 partner. The team enters at 5.0 because the strongest player is 5.0. This is how real gated doubles events work, and it is what stops a strong player from dropping into a low gate with a weak partner.

**Combined, in practice.** A combined 4.0 gate takes a 5.0 and a 3.0, because the average is 4.0, and it takes a 4.2 and a 3.8. It is the rule some tournaments use when they want the teams to be level.

**For a solo entry the two rules are the same thing**, because the team is one player.

**Where the code stands.** `enterableBrackets` reads `state.athlete.formats[format]`, so a doubles event already gates on the doubles rating and ignores mixed. That is correct for a solo entry. The highest-player rule becomes live when the player can choose or keep a partner, and each event needs to carry which rule it uses.

---

## 7. Contracts

| Level | What it is |
|---|---|
| Futures | where every new signing starts, re-evaluated after twelve months |
| Standard | a Futures player who reaches the top 25 in a discipline or the top 30 overall |
| Gold | the top level, with the best prize money and the best terms |

### Getting signed

1. **Crack the top fifty** of the Overall ranking.
2. **Finish at the top of the Challenger Tour.**
3. **Be recommended** — by a league team or a committee — and approved.

The third route is discretionary on purpose. Real tours have it, and a game that only ever rewards performance has no room for politics, injuries, luck or reputation.

### The obligations

A contracted player must complete twelve PPA events in each contract year:

| Requirement | Game rule |
|---|---|
| Event total | 12 PPA events |
| Discipline spread | at least 3 appearances in each of 2 different disciplines |
| MLP | does not count toward the PPA obligation |

A single event can supply all three divisions. It counts once toward the event total, while each division played is added to that event's record. This keeps the complete-player requirement attainable with the game's one-tournament-at-a-time interface.

### The season boundary

Contracts are reviewed on their fifty-two week anniversary. At that review a player is renewed, promoted, demoted or released. Futures can move to Standard by reaching the top twenty-five in a discipline or the top thirty Overall; Standard can move to Gold through a top-twenty-five Overall place; Gold moves down to Standard outside that place.

---

## 8. Falling out

This is the mechanic the whole design turns on.

**A player is released** when the contract review finds either an Overall place outside the top fifty or an unmet event obligation. Results, not reputation, hold the contract.

**What happens to them.** They keep their rating. Their ranking falls for two reasons that are both true to the real tour — their own points age out of the fifty-two week window, and the players above them have moved ahead. They lose their main draw spots, so they enter through the qualifier or on a wild card. They lose the prize money multiplier. They are no longer eligible for the league.

**They do not leave the game.** They are no longer a contracted pro, which is a different thing entirely. They can still enter the tour's events through the qualifier, they can still play Challengers, and their points still count toward their ranking. They can sign again.

**The ineligible period.** A released player is blocked from Major and World events for fifty-two weeks. Smaller events remain open, and eight completed starts create a new Futures offer. Stale ranking points cannot bypass the period, so the route back is played rather than inherited.

**Working back up.** Three routes, same as getting in the first time: finish at the top of the Challenger Tour, climb into the top fifty Overall, or be recommended. Winning a Challenger gets them a wild card into an Open main draw in the meantime, which is a place in the same draw as the contracted pros, earned on court.

**Where the player ends up is a state, not a script.** A released Gold player does not fall to the bottom. They are a strong player with no contract, competing for places, and the tour is full of them. That is the population the Challenger circuit exists to serve.

---

## 9. The team league

The MLP is a separate competition with its own calendar, its own points and its own standing, and it does not feed the tour ranking.

**Format.** The playable prototype uses an eight-team round robin. Each team carries a four-player roster with two men and two women. The player is assigned automatically and sees the team, roster and standings; the draft and management happen in the background.

**Structure.** The summer schedule runs one series per night across seven weeks. CPU teams play out their fixtures as the calendar advances, while the player plays their own matches on the engine. Promotion and roster churn are background state rather than owner controls.

**What the player controls.** The player is a player. The team is assembled, managed and traded in the background: the draft, the roster decisions, the promotion and relegation are simulated, and the player is assigned to a team. The games themselves are played in full. A career game where you are also the owner is a different game, and this one is about the player.

**In the career.** A player on the tour's top board is drafted into a team. The team's season runs in the background. The player is assigned their matches, plays them, and sees how their team did. If the player declines, the background process moves them to a lower team or releases them, exactly as the tour's own market would.

---

## 10. Retirement

The endpoint of a career, and the only true one. The player can retire at any point; the game does not impose a fixed season count.

**Voluntary.** The player retires when they choose. No more events. The career is over and the record is final.

**Recommended.** Age and condition eventually make it impossible to hold a standing. The record screen says plainly when the age-adjusted ceiling has fallen below the level the player is pursuing. The player can drop to a level they can win or retire.

**There is no fixed career length.** A career lasts as long as the player wants it to. The starting age is a character creation choice, so a player beginning at ten has sixty possible years and a player beginning at thirty has a much shorter one. The age curve sets what is possible at each age, and the player decides when to stop. Nothing in the game forces a retirement at a set number of seasons.

**After.** Retirement freezes the career, writes the epilogue and adds a local all-time entry with age span, games, wins, titles, medals, earnings and peak ratings. The retired player no longer appears in the active calendar.

---

## 11. The career record

The detailed engine report is retained for recent matches, but the permanent record is cumulative. It survives the rolling match archive and covers:

| Layer | What is recorded |
|---|---|
| Ratings | Current, starting and peak values for singles, gender doubles and mixed doubles |
| Game record | W-L, points scored and allowed, win rate, point differential, averages, current streak and best streak |
| Competition record | Tournaments, leagues, MLP and club play independently |
| Format record | Singles, gender doubles, mixed doubles and all doubles together |
| Event history | Week, event, division, placing, medal, games, games W-L, points, series record, prize and ranking points |
| Career artifact | Titles, finals, gold/silver/bronze medals, earnings, retirement age and the epilogue |

Knockout semifinalists share bronze because the game has no third-place match. League medals go to the top three. A multi-division event records one result for each division.

## 12. The age curve

Retirement needs a curve under it. The model: every athlete has a **peak age** and a **peak skill**, and skill is multiplied by an age factor.

| Age | Factor | Note |
|---|---|---|
| up to 34 | 1.00 | development plateau and prime |
| 35 to 39 | 0.99 down to 0.966 | the first slide |
| 40 to 44 | 0.96 down to 0.928 | |
| 45 to 49 | 0.92 down to 0.888 | |
| 50 to 54 | 0.88 down to 0.848 | |
| 55 to 59 | 0.84 down to 0.792 | experienced players remain highly competitive |
| 60 to 64 | 0.78 down to 0.732 | |
| 65 to 69 | 0.72 down to 0.664 | |
| 70 to 74 | 0.65 down to 0.586 | |
| 75 to 79 | 0.57 down to 0.498 | |
| 80 and over | 0.48 declining by 0.025 a year | |

**The ceiling rule.** A player's rating can fall below their age-adjusted ceiling but never rise above it. The ceiling represents physical aging while preserving the reality that high-level players remain competitive well into their fifties and sixties.

What a peak-6.0 player looks like:

| Age | 30 | 35 | 40 | 45 | 50 | 55 | 60 | 65 | 70 |
|---|---|---|---|---|---|---|---|---|---|
| Rating ceiling | 6.00 | 5.94 | 5.76 | 5.52 | 5.28 | 5.04 | 4.68 | 4.32 | 3.90 |

A peak-6.5 player retains a 5.46 ceiling at 55 and 5.07 at 60. The game does not impose a hard 3.00 ceiling on experienced players.

**The window is however long the player wants it to be.** There is no fixed career length, because there is no fixed starting age and no fixed retirement. A player who starts at ten can play for fifty years if their body and their appetite allow it, and a player who starts at thirty has a shorter window. The age curve decides what a player is capable of at each age; the player decides when to stop.

**Recovery.** Rest and recovery already scale with the level of play. Age should scale it too — a forty-year-old gets less out of a week than a twenty-five-year-old does, which is the other half of why the curve bites.

---

## 13. What this means for the code

Not written yet. This is the shape it should take.

### New state on the career

| Field | Meaning |
|---|---|
| `contract` | none, futures, standard, gold |
| `contractSince` | the week the current contract began |
| `contractEvents`, `contractFormats`, `contractEventLog` | event and discipline progress for the current contract year |
| `ineligibleUntil` | the week before which the player may not enter the biggest events |
| `ranking` | the four rankings, each a points total |
| `rankingHistory` | enough history to age results out of the fifty-two week window |
| `season` | the current season number |
| `peakAge`, `peakRatings`, `peakFormats` | the age curve and personal ceilings, fixed as the career records its bests |
| `retired` | whether the career is over |

### New modules

- `src/career/ranking.js` — the four rankings, the composite, the window, the tie-breaks
- `src/career/contracts.js` — the levels, the obligations, the season boundary, promotion and release
- `src/career/season.js` — the calendar, the finals qualification, the end-of-season evaluation
- `src/career/age.js` — the age curve and the ceiling rule

### What changes and what does not

**Changes.** `tour.js` stops ranking by rating. `calendar.js` gains qualifier draws, field sizes, seeding bands and byes. Each event gains a gate rule: which division rating it reads, and whether it reads the highest player or the combined team. `standings.js` shows four rankings instead of one board. `state.js` gains the contract and the retirement states.

**Does not change.** The rating system, which is a skill measurement and does its job. The world simulation. The seven competition shapes. The energy model. The geography. None of it needs to move for this to work, which is the point — the tour is a layer on top of the machinery that already exists.

### The order it should be built in

The competition first, because a ranking is a measurement of rounds reached and rounds do not exist until an event fields a tournament. The ranking second, because contracts, entry and the finals are all expressed in terms of it. Entry third, because a tour where everyone gets in is not a tour. Contracts fourth, because that is what makes the pro league a career stage rather than a prize. The age curve and retirement fifth, because they are the shape the whole thing sits inside. The team league last, because it is the most separable.

---

## 14. Open questions

1. **How long is a season?** The real tour runs September to May for the tour and May to August for the league, so a season is a calendar year and a career is twenty of them. At one action a week that is over a thousand actions in a player's working life. The calendar view already shows ten weeks ahead, so the game knows how to compress time, but a career needs a way to skip the empty weeks. Recommendation: keep the fifty-two week year and add an advance-to-next-event control, so the player only ever looks at weeks that matter, and expect a career to run fifteen to twenty seasons.

2. **Should the player be able to decline the pro league?** A player who reaches the top fifty is offered a contract with obligations and an exclusivity clause. A career game where the only choice is to accept or not enter the game is not offering a choice.

3. **How does the age curve interact with the rating's half-life?** Ratings already drift back toward the middle over fifty-two weeks of not playing. A declining player is, in effect, not playing at their peak any more. The two drifts should not double-count.

4. **Does the recommendation route exist in the game?** It is the route by which reputation, results and relationships substitute for ranking. It is the least mechanical part of the tour and the most human.

5. **How much of the league is the player's?** The games are playable and the management runs in the background. What still needs deciding is whether the player sees the team's roster and standing in detail, or only their own matches and a line about the team.

6. **How much of the ranked population is simulated?** The board is twelve hundred and a division draw is normally sixteen, thirty-two or sixty-four. The world simulation already plays two hundred and twenty matches a week across the region. The rest of the board could be a statistical stand-in, which is cheap and adequate, or a rival could be simulated in enough detail that their season is legible.

---

## 15. Sources

- Carvana PPA Tour, *How Pro Pickleball Works* — rankings, tiers, contracts, entry, byes, the finals
- Carvana PPA Tour, *Player Handbook* — points tables, seeding, withdrawals, the participation rule
- Carvana PPA Tour, *PPA Challenger Series* — the development circuit, wild cards, the showdown
- PPA Tour Asia, *World Pickleball Rankings Explained* — the composite, the four rankings, the finals scoring
- The Kitchen Pickleball, *PPA Tour, MLP will begin renegotiating player contracts* — the contract levels, the renewal windows, the event obligations
- PPA Tour Australia and PPA Tour Europe calendar pages — the tier convention and the international spread
