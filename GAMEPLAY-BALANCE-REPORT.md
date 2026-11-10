# Gameplay Engine Balance Report

Generated: 2026-11-10T05:38:21.136Z

## Method

This is a real physics-engine test. Each Game object runs in CPU watch mode through movement, reaction, shot selection, contact quality, ball physics, faults, rallies and scoring. Higher levels are swapped between court sides, and initial service alternates.

## Equal-level fairness

40 matches per equal-level pairing per format.

| Format | Equal level | Left/right wins | Point total |
|---|---|---:|---:|
| singles | Beginner | 18/22 | 337-324 |
| singles | Intermediate | 18/22 | 333-345 |
| singles | Demo | 20/20 | 364-352 |
| singles | Advanced | 22/18 | 327-320 |
| doubles | Beginner | 19/21 | 338-352 |
| doubles | Intermediate | 21/19 | 329-329 |
| doubles | Demo | 17/23 | 314-351 |
| doubles | Advanced | 20/20 | 351-328 |

Equal-level results remain inside a playable 40–60% side range. There is no evidence that one court side is systematically dominant.

## Cross-level outcomes — applied half-point settings

40 matches per matchup per format.

| Format | Matchup | Higher win rate | Average point margin |
|---|---|---:|---:|
| singles | Beginner vs Intermediate | 92.5% | +6.3 |
| singles | Beginner vs Demo | 100.0% | +6.9 |
| singles | Beginner vs Advanced | 100.0% | +8.9 |
| singles | Intermediate vs Demo | 70.0% | +2.9 |
| singles | Intermediate vs Advanced | 97.5% | +7.9 |
| singles | Demo vs Advanced | 85.0% | +5.2 |
| doubles | Beginner vs Intermediate | 67.5% | +2.2 |
| doubles | Beginner vs Demo | 82.5% | +5.3 |
| doubles | Beginner vs Advanced | 95.0% | +6.8 |
| doubles | Intermediate vs Demo | 77.5% | +3.6 |
| doubles | Intermediate vs Advanced | 85.0% | +4.9 |
| doubles | Demo vs Advanced | 75.0% | +3.4 |

The shipped 64 / 66 / 68 / 70 profiles now produce a competitive adjacent ladder. One-step half-point matchups leave the lower level 67.5–92.5% wins against, while two steps are mostly decisive and three steps are near-certain.

## Candidate level curves

| Level curve | Values | Adjacent win-rate range | Average |
|---|---|---:|---:|
| previous | 35/55/70/85 | 100.0%–100.0% | 100.0% |
| compressed-8 | 50/58/66/74 | 70.0%–100.0% | 95.0% |
| compressed-10 | 45/55/65/75 | 100.0%–100.0% | 100.0% |
| compressed-6 | 52/58/64/70 | 90.0%–100.0% | 96.7% |
| tight-3 | 61/64/67/70 | 80.0%–100.0% | 93.3% |
| tight-2 | 64/66/68/70 | 67.5%–92.5% | 77.9% |
| tight-1 | 67/68/69/70 | 50.0%–72.5% | 60.0% |

- **3–10 point adjacent gaps** produce 80–100% win rates in most adjacent matchups.
- **1 point gaps** average 60% and are suitable when adjacent labels represent only a quarter DUPR point.
- **2 point gaps** average 77.9% in the 40-game confirmation and leave the lower side about 6.1 points, making them the best fit for half-DUPR level steps.
- A two-level gap in the two-point curve averages 91.3%, close to the decisive full-DUPR target.

## Verdict

**The gameplay engine is stable and the shipped half-point level curve is competitive.**

The previous 35 / 55 / 70 / 85 profiles corresponded to 1.09–1.45 rating steps under the game's skill conversion and produced total cross-level sweeps. The new profiles separate raw physics ability from displayed rating, preventing a claimed half-DUPR step from compounding every movement, reaction, control and shot attribute.

## Recommended direction

1. The shipped curve uses **64 / 66 / 68 / 70** when adjacent gameplay labels are 0.5 DUPR apart.
2. Separate the raw physics coordinate from the displayed career rating; the same one-point skill change is not a constant DUPR change.
3. Target adjacent win rates around 80–85%, a typical 11–5 to 11–7 score, and a full-rating-point gap around 11–2 or 11–3.
4. Keep controlled match-to-match form variance so the lower side can still reach 5–8 points in a good game, or be nearly shut out in a poor one.
5. Separate archetype differences from level differences so players remain stylistically distinct instead of every ability scaling together.
6. Re-run this audit and `npm run audit:dupr` after tuning. See DUPR-CALIBRATION.md for the public anchors, proxy curve and scatter results.
