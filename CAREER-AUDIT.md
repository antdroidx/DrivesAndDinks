# Career Mode Audit

Audit date: 2026-11-9  
Branch: `codex/career-mode`

## Verdict

The career foundation is healthy and the manual workload is now bounded. Career leagues use three or four one-opponent cards, Quick Sim preserves the normal career transition path, and Sim to End can finish the remaining competition. The corrected prospect harness now charges entries and travel while receiving salary and prizes, so its professional timing reflects the actual finance rules.

A committed casual career reaches a first professional event at a median week 74 in every sample. A light casual career succeeds in 93.5–96.75% of samples and reaches that event at a median week 178–231. Competitive-background committed careers reach the professional summer circuit much sooner, at median week 27; their light schedules take median week 127–131.

Age now separates most clearly on low-volume schedules. At age 40 and 50, light-career median best ratings fall to 4.978 and 4.919, compared with 5.231–5.246 at ages 20 and 30. Committed schedules compress those differences because every cohort trains at its cap. No sampled career reached the Overall top eight and PPA Finals, so finals qualification remains open.

## Prospect Model

`scripts/audit-career-prospects.js` runs repeatable ten-year cohorts using the real creation, aging, training, rating, ranking, contract, calendar and finance functions. Matches and event placements use the same skill-gap model, not full engine rallies or human input skill. Entry, travel, salary and prize transactions are applied during the run.

Definitions:

- **Rating floor reached:** any discipline touches 4.950 at some point. This can be temporary and is not the primary pro metric.
- **Tour debut:** first accepted Pro League or MLP event. This requires a contract, the 4.950 rating floor and enough money for entry and travel.
- **Contract:** first Futures contract under the merit or sustained Challenger route.
- **Committed:** up to the age-allowed training limit, one strongest event or division weekly, one active league, and at most two distinct amateur tournaments per month.
- **Light:** training and doubles competition every fortnight.

### Casual background

Four hundred ten-year careers per age and policy.

| Start age | Committed tour debut | Light tour debut | Light contract | Median light debut | Light matches / 10 years |
|---:|---:|---:|---:|---:|---:|
| 15 | 100% at week 74 | 94.0% | 94.5% | week 230 | 670 |
| 20 | 100% at week 74 | 96.5% | 96.75% | week 178 | 663 |
| 30 | 100% at week 74 | 96.75% | 97.0% | week 180 | 671 |
| 40 | 100% at week 74 | 95.5% | 96.25% | week 188 | 658 |
| 50 | 100% at week 74 | 93.5% | 94.0% | week 231 | 661 |

The committed schedule produces about 176–183 events and 849–870 games in ten years. The lighter schedule produces about 139–141 events and 658–671 games. These counts still assume every player game is manual; the new Quick Sim can resolve a match, a league series, or the remaining competition without bypassing rating and finance updates.

Competitive-background starters reach the first professional summer event at median week 27 on a committed schedule and week 127–131 on a light schedule. Their light-career debut rate is 96.75–98.25%.

### Interpretation

- The old 4,500-game ten-year workload is gone. Shortened league cards and Quick Sim together make the career practical to play.
- Casual debut timing is stable around 14 months for committed play and three to four years for light play.
- Experience still matters more than age on the lighter schedule.
- Age 50 is now visibly weaker under light play, while ages 20–30 retain the strongest ratings.
- Every cohort touches 4.950 under sustained play. Tour debut is still the more useful milestone because it also requires contract and financial access.
- PPA Finals qualification has not occurred in either prospect file and needs a separate ranking-cut review.

Raw summaries and twelve-career previews are in:

- `validation/career-prospects-casual.json`
- `validation/career-prospects.json`

Use `--include-samples` to retain every simulated career.
## Schedule Rules

- Amateur tournament starts are limited to two distinct events per calendar month.
- A multi-division tournament counts once against that limit.
- One league can be active at a time.
- Club ladders have a weekly lane rather than consuming the tournament allowance.
- Professional Pro League and MLP entry requires a signed contract and the 4.950 rating floor.
- Training costs 30–70 energy by level, so two sessions plus a tournament, or two sessions plus club and league play, fills most of a week.

The current state machine still stores one active competition at a time. True simultaneous league, club and tournament state would require a small multi-schedule model; the present implementation keeps the workload bounded rather than fully concurrent.

## Finance Scope

Finance should remain a simple event limiter, not an accounting simulation.

Income:

- Prize earnings.
- A simple salary allowance.

Expenditures:

- Tournament and event entry.
- New paddles.
- Coaching.
- Travel.

Do not model taxes, insurance, investments, detailed budgets, or cash-flow statements. The useful decision is whether the player can afford the next event, paddle or coaching session.

Current implementation has a dated ledger for prizes, contract salary, entry fees, travel, coaching and equipment. Event entry and purchases are blocked when costs exceed the balance. The prospect harness applies the same entry and income transactions. Coaching improves focused training growth, and equipped paddles feed the shared engine.

The future finance model must share one balance contract with energy. Energy controls physical activity; money controls access to coaching, travel, entries and equipment. Coaching improves the effectiveness of energy spent but does not restore energy. Entry and travel consume both resources. Paddle purchases affect bounded match performance but do not reverse age decline. Age and injuries cap recovery and growth regardless of available money.

## Paddle Equipment Status

The game already has data-driven paddle performance and geometry.

Current performance families:

- `Allcourt` — balanced.
- `Ignite` — power.
- `Touch` — control and spin.

Current shapes:

- `Widebody` — broad forgiving face and faster hands.
- `Hybrid` — rounded top and balanced geometry.
- `Elongated` — longer face, more reach and leverage.

Shapes already change reach, power, control, hand speed, swing duration and sweet-spot behavior. Generated CPU players randomly receive these shapes.

There is no brand catalog, product generation, release or discontinuation cycle, model names, ownership, wear or purchase flow.

Missing from the proposed shape expansion:

- Hybrid with a flat top.
- Elongated with aero or rounded top.
- Cut-out grip throat shapes.
- Extended-grip elongated.
- Tennis outline.
- Ping-pong outline.
- Alternate tennis outline.
- Silent fabric-lined paddle with reduced impact sound.

The architecture can accept these as new shape records plus outlines and optional surface/audio traits. Brand generation should remain fictional and simple.

## Correctness Fixes In This Pass

- Ages 71-80 now save correctly.
- Future calendar weeks are preview-only.
- Multi-week competitions resume and cannot be overwritten silently.
- Double-elimination player byes terminate correctly.
- Qualifier promotion keeps unique teams.
- Long scores are normalized before rating changes.
- Match reports are compacted from about 392 KB to about 31 KB.
- Stale or untagged match results cannot score a later match.
- Career matches lock setup, restart, mode and difficulty controls.
- New Career confirms deletion.
- Hidden creation navigation is actually hidden.
- Retirement advice uses the athlete's unique development profile.
- Creation skill now matches the selected provisional rating.
- Pro events require a contract and rating floor.
- Amateur tournament frequency and training energy are enforced.
- Career leagues are bounded to three or four cards.
- Quick Sim routes through the same rating, world, record, analytics, finance and tournament transitions as manual play.
- The prospect harness charges entry and travel costs and credits salary and prizes.

Regression coverage is in `test/career-audit.test.js` and the existing career suites.

## UI And UX Priorities

### P0 before more features

1. **League cards and quick simulation:** complete. Career leagues use three or four rounds with one opponent per week. Quick Sim preserves the normal career transitions and Sim to End can resolve the remaining tournament or league in one action.
2. **Post-match result screen:** show score, rating change, tournament progress, next opponent and save confirmation.
3. **Tournament view:** show draw, seed, path, standings, rules, entry route and projected match count.
4. **Professional status:** show one qualification flow with contract, rating floor, entry cut and reasons.

### P1 product polish

- Replace the creation form with a short stepped flow and live athlete preview.
- Reduce dashboard density and the mobile status strip.
- Replace the mobile nav scroller with compact tabs or bottom navigation.
- Fix mobile sticky offsets.
- Separate club and player filters and paginate clubs.
- Add club sorting, current-club pinning and a visible Leave Club action.
- Add filter labels, navigation state, toggle state and button focus styles.
- Add rating/ranking trends and match-report drilldown.
- Add save export/import and preserve the all-time board outside the active save.
- Keep the selected rival stable.
- Extend equipment into the Phase 5 seasonal catalog and signature releases.
- Add expanded paddle shapes after the core career loop is stable.

## Recommended Order

1. Validate the shortened league cards and Quick Sim workload with human playtests.
2. Review PPA Finals qualification and explicit age-by-age targets.
3. Complete post-match, tournament and professional-status UX.
4. Validate injuries, coached training and equipment with human playtests.
5. Add the expanded paddle catalog and shapes.
6. Re-run this audit and full engine playtests before broader world or career features.
