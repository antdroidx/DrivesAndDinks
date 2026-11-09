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

**Contracts carry obligations.** A contracted player must play at least twenty-five events a year — fifteen on the tour, six in the league, four of their own choosing — and an event only counts toward that obligation if they compete in at least two of the three formats. This is the mechanism that forces complete players, and it is worth copying.

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

The game models twelve hundred players on each gender's board. The real tour does too, and it never puts them in one tournament.

**A tournament fields a main draw, per division.** An event runs up to five professional divisions: men's doubles, women's doubles, mixed doubles, men's singles and women's singles. A sixty-four spot event takes up to three hundred and twenty entries across those five, but each division is its own sixty-four team bracket. The rest of the ranked population is at home, at a different event, in a qualifier, or on the Challenger circuit.

| Tier | Main draw | Qualifier |
|---|---|---|
| World Championship 3000 | 64 | 8 |
| Major 2000 | 64 | 8 |
| Cup 1500 | 56 | 8 |
| Open 1000 | 48 | 8 |
| Challenger 500 and below | 16 to 32 | 4 to 8 |

**A spot is a team in doubles and a player in singles.** A fifty-six spot doubles draw is fifty-six teams, a hundred and twelve players.

### Who gets in

Main draw places are filled in this order, which is the real tour's:

| Priority | Who |
|---|---|
| 1 | the top ten in that division's ranking over the last fifty-two weeks |
| 2 | contracted players and teams containing a contracted player |
| 3 | everyone else, by ranking points in that division |
| 4 | wild cards and committee seeds |
| 5 | qualifier winners, filling whatever is left |

**The qualifier is open.** Anyone may register, it is single elimination, two of three games to eleven, and no points are awarded inside it. It is seeded by ranking. It is how a player outside the main draw earns their way in, and it is the reason a large ranked population does not need a large draw.

**Wild cards.** Two per event, drawn from the highest-ranked players who did not get in directly. Winning a Challenger professional event earns a wild card into a tour Open, with at most two Challenger winners per Open.

### Seeding and byes

The draw is seeded in bands, and only the first two places are fixed: one and two in place, then three to four randomised within their band, then five to eight, nine to twelve, thirteen to sixteen, seventeen to twenty-four, twenty-five to thirty-two, and finally the qualifiers.

Byes are awarded by **combined ranking** in doubles and by individual ranking in singles, which is the rule the real tour uses and the reason two good players are worth more than one.

| Draw | Byes |
|---|---|
| 64 | none |
| 56 | top eight into the round of sixteen, seeds nine to sixteen into the round of thirty-two |
| 48 | top eight into the round of sixteen, seeds nine to sixteen into the round of thirty-two |

### In the game

The ranked population is modelled, not enumerated: the field is drawn from the top of each division's ranking for the region the event is in, which is why a Seattle Open and a Miami Open are different fields. The player enters through the main draw if their ranking earns it and through the qualifier if it does not, so the twelve hundred are visible as a standings list and present in every draw without twelve hundred athletes ever being built.

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

A contracted player must play at least twenty-five events a year:

| | |
|---|---|
| Tour events | 15 |
| League events | 6 |
| Of the player's own choosing | 4 |

**And an event only counts if they play at least two of the three formats.** This is the single best rule in the real tour and the game should have it. It forces the complete player the ranking is built to reward, and it means a doubles specialist on a tour contract has to occasionally turn up and play singles.

### The season boundary

Contracts are evaluated once a year, at the end of the season. At that boundary a player is renewed, promoted, demoted or released.

---

## 8. Falling out

This is the mechanic the whole design turns on.

**A player is released** when the season ends and their contract is not renewed. The usual reason is that they did not hold their place: the season went badly, their rating fell, other players moved ahead of them, and their ranking no longer justifies the contract.

**What happens to them.** They keep their rating. Their ranking falls for two reasons that are both true to the real tour — their own points age out of the fifty-two week window, and the players above them have moved ahead. They lose their main draw spots, so they enter through the qualifier or on a wild card. They lose the prize money multiplier. They are no longer eligible for the league.

**They do not leave the game.** They are no longer a contracted pro, which is a different thing entirely. They can still enter the tour's events through the qualifier, they can still play Challengers, and their points still count toward their ranking. They can sign again.

**The ineligible period.** A player who had a contract and let it lapse is ineligible for the biggest events for twelve months. They can play Challengers and select international stops, and they work back in by playing eight of those smaller events inside a year and reapplying.

**Working back up.** Three routes, same as getting in the first time: finish at the top of the Challenger Tour, climb into the top fifty Overall, or be recommended. Winning a Challenger gets them a wild card into an Open main draw in the meantime, which is a place in the same draw as the contracted pros, earned on court.

**Where the player ends up is a state, not a script.** A released Gold player does not fall to the bottom. They are a strong player with no contract, competing for places, and the tour is full of them. That is the population the Challenger circuit exists to serve.

---

## 9. The team league

The MLP is a separate competition with its own calendar, its own points and its own standing, and it does not feed the tour ranking.

**Format.** A match is men's doubles, then women's doubles, then mixed doubles, each to twenty-one win by two. The team that wins two of the three wins the match. If it reaches one-one, a dreambreaker tiebreak decides it: singles, players rotating, first to twenty-one.

**Structure.** Twenty-two teams in two levels — sixteen in the premier division, six in the challenger division — with promotion and relegation between them. Rosters are assembled by a draft each season, where the top pick chooses a partner and the picks run down the rankings.

**What the player controls.** The player is a player. The team is assembled, managed and traded in the background: the draft, the roster decisions, the promotion and relegation are simulated, and the player is assigned to a team. The games themselves are played in full. A career game where you are also the owner is a different game, and this one is about the player.

**In the career.** A player on the tour's top board is drafted into a team. The team's season runs in the background. The player is assigned their matches, plays them, and sees how their team did. If the player declines, the background process moves them to a lower team or releases them, exactly as the tour's own market would.

---

## 10. Retirement

The endpoint of a career, and the only true one.

**Voluntary.** The player retires when they choose. No more events. The career is over and the record is final.

**Forced.** Age and condition eventually make it impossible to hold a standing, and the game should say so plainly rather than letting a player drift into irrelevance. A player whose age-adjusted ceiling has fallen below the level they are trying to compete at has two choices: drop to a level they can win, or retire.

**There is no fixed career length.** A career lasts as long as the player wants it to. The starting age is a character creation choice, so a player beginning at ten has sixty possible years and a player beginning at thirty has a much shorter one. The age curve sets what is possible at each age, and the player decides when to stop. Nothing in the game forces a retirement at a set number of seasons.

**After.** A retired player keeps their record and their place on the all-time board. They do not appear on the current board, because the current board is about who is playing now.

---

## 11. The age curve

Retirement needs a curve under it. The model: every athlete has a **peak age** and a **peak skill**, and skill is multiplied by an age factor.

| Age | Factor | Note |
|---|---|---|
| up to 29 | 1.00 | |
| 30 to 34 | 1.00 | the plateau |
| 35 to 39 | 0.98 down to 0.95 | the first slide |
| 40 to 44 | 0.95 down to 0.875 | |
| 45 to 49 | 0.875 down to 0.70 | |
| 50 to 54 | 0.70 down to 0.50 | |
| 55 and over | 0.50 down by 0.04 a year | |

**The ceiling rule.** A player's rating can fall below their age-adjusted ceiling but never rise above it. A fifty-year-old with a magnificent career cannot suddenly be the best player on the tour again, however well they play, because their body no longer allows it.

What a peak-6.0 player looks like:

| Age | 30 | 35 | 40 | 45 | 50 | 55 |
|---|---|---|---|---|---|---|
| Rating ceiling | 6.00 | 5.94 | 5.85 | 5.25 | 4.20 | 3.00 |

**The window is however long the player wants it to be.** There is no fixed career length, because there is no fixed starting age and no fixed retirement. A player who starts at ten can play for fifty years if their body and their appetite allow it, and a player who starts at thirty has a shorter window. The age curve decides what a player is capable of at each age; the player decides when to stop.

**Recovery.** Rest and recovery already scale with the level of play. Age should scale it too — a forty-year-old gets less out of a week than a twenty-five-year-old does, which is the other half of why the curve bites.

---

## 12. What this means for the code

Not written yet. This is the shape it should take.

### New state on the career

| Field | Meaning |
|---|---|
| `contract` | none, futures, standard, gold |
| `contractSince` | the week the current contract began |
| `contractObligation` | events played this season against the events required |
| `ineligibleUntil` | the week before which the player may not enter the biggest events |
| `ranking` | the four rankings, each a points total |
| `rankingHistory` | enough history to age results out of the fifty-two week window |
| `season` | the current season number |
| `peakAge`, `peakSkill` | the age curve, fixed at creation |
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

## 13. Open questions

1. **How long is a season?** The real tour runs September to May for the tour and May to August for the league, so a season is a calendar year and a career is twenty of them. At one action a week that is over a thousand actions in a player's working life. The calendar view already shows ten weeks ahead, so the game knows how to compress time, but a career needs a way to skip the empty weeks. Recommendation: keep the fifty-two week year and add an advance-to-next-event control, so the player only ever looks at weeks that matter, and expect a career to run fifteen to twenty seasons.

2. **Should the player be able to decline the pro league?** A player who reaches the top fifty is offered a contract with obligations and an exclusivity clause. A career game where the only choice is to accept or not enter the game is not offering a choice.

3. **How does the age curve interact with the rating's half-life?** Ratings already drift back toward the middle over fifty-two weeks of not playing. A declining player is, in effect, not playing at their peak any more. The two drifts should not double-count.

4. **Does the recommendation route exist in the game?** It is the route by which reputation, results and relationships substitute for ranking. It is the least mechanical part of the tour and the most human.

5. **How much of the league is the player's?** The games are playable and the management runs in the background. What still needs deciding is whether the player sees the team's roster and standing in detail, or only their own matches and a line about the team.

6. **How much of the ranked population is simulated?** The board is twelve hundred and a draw is sixty-four. The world simulation already plays two hundred and twenty matches a week across the region. The rest of the board could be a statistical stand-in, which is cheap and adequate, or a rival could be simulated in enough detail that their season is legible.

---

## 14. Sources

- Carvana PPA Tour, *How Pro Pickleball Works* — rankings, tiers, contracts, entry, byes, the finals
- Carvana PPA Tour, *Player Handbook* — points tables, seeding, withdrawals, the participation rule
- Carvana PPA Tour, *PPA Challenger Series* — the development circuit, wild cards, the showdown
- PPA Tour Asia, *World Pickleball Rankings Explained* — the composite, the four rankings, the finals scoring
- The Kitchen Pickleball, *PPA Tour, MLP will begin renegotiating player contracts* — the contract levels, the renewal windows, the event obligations
- PPA Tour Australia and PPA Tour Europe calendar pages — the tier convention and the international spread
