# Gameplay Engine Balance Report

Generated: 2026-11-10T05:32:25.505Z

## Method

This is a real physics-engine test. Each Game object runs in CPU watch mode through movement, reaction, shot selection, contact quality, ball physics, faults, rallies and scoring. Higher levels are swapped between court sides, and initial service alternates.

## Equal-level fairness

20 matches per equal-level pairing per format.

| Format | Equal level | Left/right wins | Point total |
|---|---|---:|---:|
| singles | Beginner | 11/9 | 176-155 |
| singles | Intermediate | 10/10 | 170-179 |
| singles | Demo | 14/6 | 186-133 |
| singles | Advanced | 7/13 | 156-189 |
| doubles | Beginner | 8/12 | 162-183 |
| doubles | Intermediate | 10/10 | 176-200 |
| doubles | Demo | 12/8 | 192-163 |
| doubles | Advanced | 14/6 | 196-152 |

Equal-level results remain inside a playable 40–60% side range. There is no evidence that one court side is systematically dominant.

## Cross-level outcomes — current settings

20 matches per matchup per format.

| Format | Matchup | Higher win rate | Average point margin |
|---|---|---:|---:|
| singles | Beginner vs Intermediate | 100.0% | +10.8 |
| singles | Beginner vs Demo | 100.0% | +11.0 |
| singles | Beginner vs Advanced | 100.0% | +11.0 |
| singles | Intermediate vs Demo | 100.0% | +10.4 |
| singles | Intermediate vs Advanced | 100.0% | +10.7 |
| singles | Demo vs Advanced | 100.0% | +9.9 |
| doubles | Beginner vs Intermediate | 100.0% | +10.8 |
| doubles | Beginner vs Demo | 100.0% | +11.0 |
| doubles | Beginner vs Advanced | 100.0% | +11.0 |
| doubles | Intermediate vs Demo | 100.0% | +10.1 |
| doubles | Intermediate vs Advanced | 100.0% | +9.4 |
| doubles | Demo vs Advanced | 100.0% | +7.0 |

Every higher level won all 20 cross-level matches in both formats. Several lower-level teams scored fewer than two points across the entire sample. The current level difference is not competitive.

## Candidate level curves

| Level curve | Values | Adjacent win-rate range | Average |
|---|---|---:|---:|
| current | 35/55/70/85 | 100.0%–100.0% | 100.0% |
| compressed-8 | 50/58/66/74 | 70.0%–100.0% | 95.0% |
| compressed-10 | 45/55/65/75 | 100.0%–100.0% | 100.0% |
| compressed-6 | 52/58/64/70 | 90.0%–100.0% | 96.7% |
| tight-3 | 61/64/67/70 | 80.0%–100.0% | 93.3% |
| tight-2 | 64/66/68/70 | 67.5%–92.5% | 77.9% |
| tight-1 | 67/68/69/70 | 50.0%–72.5% | 60.0% |

- **6–10 point adjacent gaps** still produce 90–100% win rates in most adjacent matchups.
- **2 point gaps** still produce a mostly decisive advantage: about 70–92.5% across the 40-game confirmation.
- **1 point gaps** average 60% and are suitable when adjacent labels represent only a quarter DUPR point.
- **2 point gaps** average 77.9% in the 40-game confirmation and leave the lower side about 6.1 points, making them the best fit for half-DUPR level steps.
- A two-level gap in the two-point curve averages 91.3%, close to the decisive full-DUPR target.

## Verdict

**The gameplay engine itself is stable, but the level curve and rating-to-ability conversion are over-steep.**

The problem is not one level label. Multiple movement, reaction, control and shot abilities scale together, causing differences to compound. The current 35 / 55 / 70 / 85 profile values correspond to 1.09–1.45 rating steps under the game's skill conversion, which is full-point-or-wider separation in DUPR terms. That conversion explains the shutout sweep.

## Recommended direction

1. Use **64 / 66 / 68 / 70** as the current best physics curve when adjacent gameplay labels are 0.5 DUPR apart.
2. Separate the raw physics coordinate from the displayed career rating; the same one-point skill change is not a constant DUPR change.
3. Target adjacent win rates around 80–85%, a typical 11–5 to 11–7 score, and a full-rating-point gap around 11–2 or 11–3.
4. Keep controlled match-to-match form variance so the lower side can still reach 5–8 points in a good game, or be nearly shut out in a poor one.
5. Separate archetype differences from level differences so players remain stylistically distinct instead of every ability scaling together.
6. Re-run this audit and `npm run audit:dupr` after tuning. See DUPR-CALIBRATION.md for the public anchors, proxy curve and scatter results.
