# DUPR Level Calibration

Generated: 2026-11-10T05:38:48.771Z

## What can and cannot be back-calculated

DUPR's production algorithm is proprietary. Public DUPR material confirms that ratings, match outcomes and point margins all affect movement, and the DUPR Forecast can project specific matchups, but no universal public formula exposes exact win probabilities. We therefore use published score anchors as a gameplay calibration and label the inferred probabilities as a proxy.

- The public DUPR guide gives a **0.5 rating difference** an expected result around **11–5**.
- A full-point gap is much wider than that and is effectively decisive; the guide says gaps over 1.0 are too predictable for a rated result.
- The proxy win-rate curve below is `1 / (1 + 10^(1.5 × gap))`. It is not an official DUPR formula.

## Calibrated expected-score bridge

| Rating gap | Stronger expected score | Underdog win-rate proxy |
|---:|---:|---:|
| 0.00 | 9.00–9.00 | 50.0% |
| 0.25 | 11.00–6.86 | 29.7% |
| 0.50 | 11.00–5.00 | 15.1% |
| 0.75 | 11.00–3.39 | 7.0% |
| 1.00 | 11.00–2.00 | 3.1% |
| 1.50 | 11.00–1.00 | 0.6% |
| 2.00 | 11.00–1.00 | 0.1% |

This creates the intended nonlinear shape. A quarter point costs the underdog roughly two points, a half point leaves about five, a full point leaves about two, and a larger mismatch leaves only one. Match-level scatter can still produce a hot underdog game or a stronger-side shutout.

## Why the previous gameplay levels were too far apart

The previous physics profiles used **35 / 55 / 70 / 85**. Under the game's skill-to-rating conversion, those values represented **2.362 / 3.812 / 4.899 / 5.986**. The three level steps therefore spanned **1.45**, **1.09** and **1.09** rating points.

| Level | Raw skill | Previous skill-to-rating mapping |
|---|---:|---:|
| Beginner | 35 | 2.362 |
| Intermediate | 55 | 3.812 |
| Demo | 70 | 4.899 |
| Advanced | 85 | 5.986 |

Those are full-point or larger mismatches. Under the public DUPR anchors they should be near-certain wins with only a point or two of scatter, which explains why the original real-engine sweep produced 20–0 matches.

## Shipped physics-level mapping

The playable level profiles now use the validated **64 / 66 / 68 / 70** curve, with displayed levels assigned in half-point steps. This decouples the raw physics coordinate from the displayed career rating so the game does not compound every ability and then also claim a full DUPR point between levels.

| Level | Raw physics skill | Displayed level |
|---|---:|---:|
| Beginner | 64 | 3.0 |
| Intermediate | 66 | 3.5 |
| Demo | 68 | 4.0 |
| Advanced | 70 | 4.5 |

## Real-engine confirmation

The following results use actual CPU-versus-CPU `Game` matches, including movement, reaction, shot selection, paddle contact, ball physics and rally scoring. Court sides and initial service alternate.

| Physics curve | Level step | Stronger win rate | Range | Average points | Lower side at 2 or fewer | Lower shutouts |
|---|---:|---:|---:|---:|---:|---:|
| 64 / 66 / 68 / 70 | 0.5 rating | 77.9% | 67.5%–92.5% | 10.0–6.1 | 21.7% | 4.2% |
| 64 / 66 / 68 / 70 | 1.0 rating | 91.3% | 82.5%–100.0% | 10.6–4.4 | 34.4% | 8.8% |
| 67 / 68 / 69 / 70 | 0.25–0.5 rating | 60.0% | 50.0%–72.5% | 9.2–7.5 | n/a | n/a |

The **64 / 66 / 68 / 70** curve is the best current fit:

- Adjacent half-point levels average **77.9%** for the stronger side and give the underdog about **6.1 points per game**.
- A full rating point averages **91.3%** and leaves about **4.4 points**. The distribution is appropriately scattered: **34.4%** of underdogs finish on two or fewer points, while **8.8%** are shut out.
- The underdog still wins roughly one adjacent match in four or five, so upsets and partial scores remain available without making the stronger side's advantage meaningless.
- The one-point physics curve (**67 / 68 / 69 / 70**) produces a closer **60.0%** average with about **7.5 underdog points**, suitable if level labels are intended to be only a quarter DUPR point apart.

## Balance target

1. Treat adjacent displayed levels as **0.5 DUPR** apart.
2. Use an adjacent expected result of roughly **11–5 to 11–7**, with the stronger side winning about **80–85%**.
3. Treat two level steps (a full rating point) as effectively decisive: **11–2 or 11–3**, with a narrow upset window.
4. Add per-match form or execution variance so an underdog can occasionally reach 5–8 points and a very large mismatch can still finish 11–1 or 11–2.
5. Keep exact win probability and matchmaking separate: use the public rating gap for expected scoring, then apply a small confidence/form modifier rather than hiding all scatter in raw ability.

## Sources

- [DUPR: How the rating works](https://dupr.com/how-the-dupr-rating-works)
- [DUPR: What is DUPR](https://dupr.com/what-is-dupr)
- [Pickleball.com guide to the DUPR rating system](https://www.pickleball.com/blog/dupr-pickleball-rating-system)
