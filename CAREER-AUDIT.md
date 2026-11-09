# Career Mode Audit

Audit date: 2026-11-9  
Branch: `codex/career-mode`

## Verdict

The career foundation is substantial and the major correctness blockers are fixed. The revised amateur schedule now creates a meaningful career arc: a full schedule reaches a first pro event at a median 74 weeks, while a lighter schedule usually takes 230–238 weeks and succeeds in roughly 70–76% of casual-background careers.

The remaining problem is not simply pro timing. A full schedule still implies about 4,500 player-controlled matches in ten years, and age produces only modest differences once a player trains consistently. Before adding more systems, league cards and low-stakes match resolution need to reduce the manual workload.

## Prospect Model

`scripts/audit-career-prospects.js` runs repeatable ten-year cohorts using the real creation, aging, training, rating, ranking, contract and calendar functions. Matches and event placements use the same skill-gap model, not full engine rallies or human input skill.

Definitions:

- **Rating floor reached:** any discipline touches 4.950 at some point. This can be temporary and is not the primary pro metric.
- **Tour debut:** first accepted Pro League or MLP event. This requires a contract and the 4.950 rating floor.
- **Contract:** first Futures contract under the merit or sustained Challenger route.
- **Committed:** up to the age-allowed training limit, one strongest event or division weekly, one active league, and at most two distinct amateur tournaments per month.
- **Light:** training and doubles competition every fortnight.

### Casual background

Two hundred ten-year careers per age and policy.

| Start age | Tour debut, committed | Tour debut, light | Light contract | Median debut, light | Light matches / 10 years |
|---:|---:|---:|---:|---:|---:|
| 15 | 100% at week 74 | 68.5% | 71.0% | week 238 | 2,624 |
| 20 | 100% at week 74 | 75.5% | 78.0% | week 230 | 2,540 |
| 30 | 100% at week 74 | 71.5% | 73.5% | week 230 | 2,553 |
| 40 | 100% at week 74 | 75.0% | 77.5% | week 231 | 2,563 |
| 50 | 100% at week 74 | 69.5% | 70.5% | week 231 | 2,591 |

The committed schedule produces about 198–199 events and 4,538–4,571 matches in ten years. The lighter schedule produces about 132–134 events and 2,540–2,591 matches.

Competitive-background starters reach tour debut sooner on the light schedule: median week 183–232 with 70.5–77.5% success. The committed schedule still converges on week 74 because the professional calendar, not development, becomes the limiting factor.

### Interpretation

- A few-month professional debut has been removed. The full schedule is now roughly a 14-month route; the normal lighter route is multi-year.
- Starting experience still matters more than age on the lighter schedule.
- Age 50 is somewhat less likely to debut than ages 20–40, but the separation is too small.
- Every cohort eventually touches 4.950 under sustained play. Tour debut is the more meaningful measure because it requires contract and rating readiness together.
- The full schedule remains too match-heavy. League formats account for much of the 450 matches per year.

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

Current implementation only has prize money, a starting balance and sponsor purse bonuses. Entry fees, salary allowance, paddle purchases, coaching purchases and travel expenses are not implemented yet.

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

Regression coverage is in `test/career-audit.test.js` and the existing career suites.

## UI And UX Priorities

### P0 before more features

1. **Shorten league cards:** reduce each weekly league obligation and provide selective simulation for completed or irrelevant rounds.
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
- Add the basic finance limiter after the workload is controlled.
- Add expanded paddle shapes after the core career loop is stable.

## Recommended Order

1. Shorten league cards and add selective match simulation.
2. Tune age differentiation against explicit debut-rate targets.
3. Complete post-match, tournament and professional-status UX.
4. Add the simple finance limiter.
5. Add the expanded paddle catalog and shapes.
6. Re-run this audit and full engine playtests before broader world or career features.
