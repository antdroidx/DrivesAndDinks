# DUPR Level Calibration

Generated: 2026-11-10T06:13:55.875Z

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

## Public overall display

The raw physics average is not a percentage of mastery. The interface uses this separate display calibration, so a 4.5-rated player reads as about 75 overall instead of an unintuitive raw value near 64.

| Rating | Displayed overall |
|---:|---:|
| 2.0 | 30.0 |
| 2.5 | 40.0 |
| 3.0 | 50.0 |
| 3.5 | 60.0 |
| 4.0 | 68.0 |
| 4.5 | 75.0 |
| 5.0 | 81.0 |
| 5.5 | 86.0 |
| 6.0 | 90.0 |
| 6.5 | 94.0 |
| 7.0 | 97.0 |

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

The playable physics profiles use the validated **64 / 66 / 68 / 70** curve as internal tier coordinates. These values must not be shown as 3.0–4.5 DUPR bands. Under the current conversion they imply roughly 4.46–4.90 rating and display as roughly 74.5–79.8 overall. This keeps the tested physics behavior while keeping the interface honest.

| Internal tier | Raw physics skill | Implied rating | Displayed overall |
|---|---:|---:|---:|
| Physics tier 1 | 64 | 4.46 | 74.5 |
| Physics tier 2 | 66 | 4.61 | 76.3 |
| Physics tier 3 | 68 | 4.75 | 78.0 |
| Physics tier 4 | 70 | 4.90 | 79.8 |

## Real-engine confirmation

The following results use actual CPU-versus-CPU `Game` matches, including movement, reaction, shot selection, paddle contact, ball physics and rally scoring. Court sides and initial service alternate.

| Physics curve | Level step | Stronger win rate | Range | Average points | Lower side at 2 or fewer | Lower shutouts |
|---|---:|---:|---:|---:|---:|---:|
| 64 / 66 / 68 / 70 | one tier step | 77.9% | 67.5%–92.5% | 10.0–6.1 | 21.7% | 4.2% |
| 64 / 66 / 68 / 70 | two tier steps | 91.3% | 82.5%–100.0% | 10.6–4.4 | 34.4% | 8.8% |
| 67 / 68 / 69 / 70 | one micro-step | 60.0% | 50.0%–72.5% | 9.2–7.5 | n/a | n/a |

The **64 / 66 / 68 / 70** curve is the best current fit:

- Adjacent internal tier steps average **77.9%** for the stronger side and give the underdog about **6.1 points per game**.
- Two internal tier steps average **91.3%** and leave about **4.4 points**. The distribution is appropriately scattered: **34.4%** of underdogs finish on two or fewer points, while **8.8%** are shut out.
- The underdog still wins roughly one adjacent match in four or five, so upsets and partial scores remain available without making the stronger side's advantage meaningless.
- The micro-step curve (**67 / 68 / 69 / 70**) produces a closer **60.0%** average with about **7.5 underdog points**, useful for testing very small internal ability changes.

## Balance target

1. Keep the raw physics coordinate internal; use the display calibration so 4.5 reads as roughly **75 overall**.
2. Use the result-driven format rating for matchmaking and brackets; use displayed overall as the ability summary.
3. Treat 64 / 66 / 68 / 70 as internal physics tiers, not direct 3.0–4.5 DUPR bands.
4. Target adjacent tier outcomes around **11–5 to 11–7**, with the stronger side winning about **80–85%**.
5. Add per-match form or execution variance so an underdog can occasionally reach 5–8 points and a very large mismatch can still finish 11–1 or 11–2.
6. Keep exact win probability and matchmaking separate: use the public rating gap for expected scoring, then apply a small confidence/form modifier rather than hiding all scatter in raw ability.

## Sources

- [DUPR: How the rating works](https://dupr.com/how-the-dupr-rating-works)
- [DUPR: What is DUPR](https://dupr.com/what-is-dupr)
- [Pickleball.com guide to the DUPR rating system](https://www.pickleball.com/blog/dupr-pickleball-rating-system)
