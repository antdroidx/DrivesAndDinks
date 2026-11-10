import {readFileSync,writeFileSync} from 'node:fs';
import {expectedScore,ratingFromSkill} from '../src/career/rating.js';

const gaps=[0,.25,.5,.75,1,1.5,2];
const expectedRows=gaps.map(gap=>{
  const score=expectedScore(4+gap,4);
  const underdogWin=gap===0?.5:1/(1+Math.pow(10,1.5*gap));
  return {gap,stronger:score.myPoints,underdog:score.opponentPoints,underdogWin};
});
const currentLevels=[
  {label:'Beginner',skill:35},
  {label:'Intermediate',skill:55},
  {label:'Demo',skill:70},
  {label:'Advanced',skill:85}
].map(row=>({...row,rating:ratingFromSkill(row.skill)}));
const candidateLevels=[
  {label:'Beginner',skill:64,dupr:3},
  {label:'Intermediate',skill:66,dupr:3.5},
  {label:'Demo',skill:68,dupr:4},
  {label:'Advanced',skill:70,dupr:4.5}
];
const tight2=JSON.parse(readFileSync('validation/level-curve-tight-2-dupr.json','utf8'));
const tight1=JSON.parse(readFileSync('validation/level-curve-tight-1-confirm.json','utf8'));
function outcome(rows,levelGap){
  const selected=rows.filter(row=>row.levels[1]-row.levels[0]===levelGap);
  const games=selected.reduce((sum,row)=>sum+row.games,0);
  return {
    winRate:selected.reduce((sum,row)=>sum+row.higherWins,0)/games,
    min:Math.min(...selected.map(row=>row.higherWinRate)),
    max:Math.max(...selected.map(row=>row.higherWinRate)),
    higherPoints:selected.reduce((sum,row)=>sum+row.higherPoints,0)/games,
    atMostTwo:selected.reduce((sum,row)=>sum+(row.lowerAtMostTwo??0),0)/games,
    shutouts:selected.reduce((sum,row)=>sum+(row.lowerShutouts??0),0)/games,
    lowerPoints:selected.reduce((sum,row)=>sum+row.lowerPoints,0)/games
  };
}
const pct=value=>`${(value*100).toFixed(1)}%`;
const scoreTable=['| Rating gap | Stronger expected score | Underdog win-rate proxy |','|---:|---:|---:|',...expectedRows.map(row=>`| ${row.gap.toFixed(2)} | ${row.stronger.toFixed(2)}–${row.underdog.toFixed(2)} | ${pct(row.underdogWin)} |`)].join('\n');
const currentTable=['| Level | Raw skill | Previous skill-to-rating mapping |','|---|---:|---:|',...currentLevels.map(row=>`| ${row.label} | ${row.skill} | ${row.rating.toFixed(3)} |`)].join('\n');
const candidateTable=['| Level | Raw physics skill | Displayed level |','|---|---:|---:|',...candidateLevels.map(row=>`| ${row.label} | ${row.skill} | ${row.dupr.toFixed(1)} |`)].join('\n');
const tight2Half=outcome(tight2.rows,1),tight2Full=outcome(tight2.rows,2),tight1Quarter=outcome(tight1.rows,1);
const engineTable=['| Physics curve | Level step | Stronger win rate | Range | Average points | Lower side at 2 or fewer | Lower shutouts |','|---|---:|---:|---:|---:|---:|---:|',`| 64 / 66 / 68 / 70 | 0.5 rating | ${pct(tight2Half.winRate)} | ${pct(tight2Half.min)}–${pct(tight2Half.max)} | ${tight2Half.higherPoints.toFixed(1)}–${tight2Half.lowerPoints.toFixed(1)} | ${pct(tight2Half.atMostTwo)} | ${pct(tight2Half.shutouts)} |`,`| 64 / 66 / 68 / 70 | 1.0 rating | ${pct(tight2Full.winRate)} | ${pct(tight2Full.min)}–${pct(tight2Full.max)} | ${tight2Full.higherPoints.toFixed(1)}–${tight2Full.lowerPoints.toFixed(1)} | ${pct(tight2Full.atMostTwo)} | ${pct(tight2Full.shutouts)} |`,`| 67 / 68 / 69 / 70 | 0.25–0.5 rating | ${pct(tight1Quarter.winRate)} | ${pct(tight1Quarter.min)}–${pct(tight1Quarter.max)} | ${tight1Quarter.higherPoints.toFixed(1)}–${tight1Quarter.lowerPoints.toFixed(1)} | n/a | n/a |`].join('\n');
const markdown=`# DUPR Level Calibration\n\nGenerated: ${new Date().toISOString()}\n\n## What can and cannot be back-calculated\n\nDUPR's production algorithm is proprietary. Public DUPR material confirms that ratings, match outcomes and point margins all affect movement, and the DUPR Forecast can project specific matchups, but no universal public formula exposes exact win probabilities. We therefore use published score anchors as a gameplay calibration and label the inferred probabilities as a proxy.\n\n- The public DUPR guide gives a **0.5 rating difference** an expected result around **11–5**.\n- A full-point gap is much wider than that and is effectively decisive; the guide says gaps over 1.0 are too predictable for a rated result.\n- The proxy win-rate curve below is \`1 / (1 + 10^(1.5 × gap))\`. It is not an official DUPR formula.\n\n## Calibrated expected-score bridge\n\n${scoreTable}\n\nThis creates the intended nonlinear shape. A quarter point costs the underdog roughly two points, a half point leaves about five, a full point leaves about two, and a larger mismatch leaves only one. Match-level scatter can still produce a hot underdog game or a stronger-side shutout.\n\n## Why the previous gameplay levels were too far apart\n\nThe previous physics profiles used **${currentLevels.map(row=>row.skill).join(' / ')}**. Under the game's skill-to-rating conversion, those values represented **${currentLevels.map(row=>row.rating.toFixed(3)).join(' / ')}**. The three level steps therefore spanned **${(currentLevels[1].rating-currentLevels[0].rating).toFixed(2)}**, **${(currentLevels[2].rating-currentLevels[1].rating).toFixed(2)}** and **${(currentLevels[3].rating-currentLevels[2].rating).toFixed(2)}** rating points.\n\n${currentTable}\n\nThose are full-point or larger mismatches. Under the public DUPR anchors they should be near-certain wins with only a point or two of scatter, which explains why the original real-engine sweep produced 20–0 matches.\n\n## Shipped physics-level mapping\n\nThe playable level profiles now use the validated **64 / 66 / 68 / 70** curve, with displayed levels assigned in half-point steps. This decouples the raw physics coordinate from the displayed career rating so the game does not compound every ability and then also claim a full DUPR point between levels.\n\n${candidateTable}\n\n## Real-engine confirmation\n\nThe following results use actual CPU-versus-CPU \`Game\` matches, including movement, reaction, shot selection, paddle contact, ball physics and rally scoring. Court sides and initial service alternate.\n\n${engineTable}\n\nThe **64 / 66 / 68 / 70** curve is the best current fit:\n\n- Adjacent half-point levels average **${pct(tight2Half.winRate)}** for the stronger side and give the underdog about **${tight2Half.lowerPoints.toFixed(1)} points per game**.\n- A full rating point averages **${pct(tight2Full.winRate)}** and leaves about **${tight2Full.lowerPoints.toFixed(1)} points**. The distribution is appropriately scattered: **${pct(tight2Full.atMostTwo)}** of underdogs finish on two or fewer points, while **${pct(tight2Full.shutouts)}** are shut out.\n- The underdog still wins roughly one adjacent match in four or five, so upsets and partial scores remain available without making the stronger side's advantage meaningless.\n- The one-point physics curve (**67 / 68 / 69 / 70**) produces a closer **${pct(tight1Quarter.winRate)}** average with about **${tight1Quarter.lowerPoints.toFixed(1)} underdog points**, suitable if level labels are intended to be only a quarter DUPR point apart.\n\n## Balance target\n\n1. Treat adjacent displayed levels as **0.5 DUPR** apart.\n2. Use an adjacent expected result of roughly **11–5 to 11–7**, with the stronger side winning about **80–85%**.\n3. Treat two level steps (a full rating point) as effectively decisive: **11–2 or 11–3**, with a narrow upset window.\n4. Add per-match form or execution variance so an underdog can occasionally reach 5–8 points and a very large mismatch can still finish 11–1 or 11–2.\n5. Keep exact win probability and matchmaking separate: use the public rating gap for expected scoring, then apply a small confidence/form modifier rather than hiding all scatter in raw ability.\n\n## Sources\n\n- [DUPR: How the rating works](https://dupr.com/how-the-dupr-rating-works)\n- [DUPR: What is DUPR](https://dupr.com/what-is-dupr)\n- [Pickleball.com guide to the DUPR rating system](https://www.pickleball.com/blog/dupr-pickleball-rating-system)\n`;
writeFileSync('DUPR-CALIBRATION.md',markdown);
console.log(markdown);