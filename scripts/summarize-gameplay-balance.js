import {readFileSync,existsSync,writeFileSync} from 'node:fs';
const mirrored=JSON.parse(readFileSync('validation/gameplay-balance-mirrored.json','utf8'));
const sweep=JSON.parse(readFileSync('validation/level-curve-sweep.json','utf8'));
const tight=JSON.parse(readFileSync('validation/level-curve-tight.json','utf8'));
const tight2=JSON.parse(readFileSync('validation/level-curve-tight-2-confirm.json','utf8'));
const tight1=JSON.parse(readFileSync('validation/level-curve-tight-1-confirm.json','utf8'));
const baseSweep=[...sweep.rows,...tight.rows].filter(row=>!['tight-1','tight-2'].includes(row.candidate));
const allSweep=[...baseSweep,...tight2.rows,...tight1.rows];
const name={beginner:'Beginner',intermediate:'Intermediate',demo:'Demo',advanced:'Advanced'};
const pct=value=>`${(value*100).toFixed(1)}%`;
const equal=mirrored.results.filter(row=>row.levels[0]===row.levels[1]).map(row=>({format:row.format,level:row.levels[0],winRateB:row.winRateB,sideWins:row.sideWins,pointsBySide:row.pointsBySide}));
const cross=mirrored.results.filter(row=>row.levels[0]!==row.levels[1]).map(row=>({format:row.format,low:row.levels[0],high:row.levels[1],higherWinRate:row.winRateB,higherPoints:row.pointsByLevel[1],lowerPoints:row.pointsByLevel[0],margin:(row.pointsByLevel[1]-row.pointsByLevel[0])/row.completed}));
const curveIds=[...new Set(allSweep.map(row=>row.candidate))];
const curves=curveIds.map(candidate=>{
  const rows=allSweep.filter(row=>row.candidate===candidate);
  const adjacent=rows.filter(row=>row.levels[1]-row.levels[0]===1);
  const means=[];
  for(const format of ['singles','doubles'])for(const [low,high] of [[0,1],[1,2],[2,3]]){
    const pair=adjacent.filter(row=>row.format===format&&row.levels[0]===low&&row.levels[1]===high);
    means.push(...pair.map(row=>row.higherWinRate));
  }
  return {candidate,values:rows[0]?.values??[],adjacentMin:Math.min(...means),adjacentMean:means.reduce((sum,value)=>sum+value,0)/means.length,adjacentMax:Math.max(...means),rows};
});
const report={generatedAt:new Date().toISOString(),methodology:'Real physics-engine CPU watch matches. The higher level swaps teams across court sides and initial server alternates. Each mirrored pairing uses 20 completed matches in singles and doubles for the main result; broad curve candidates use 10 games per pairing, while the one- and two-point curves use 40-game confirmation runs.',equal,cross,curves};
writeFileSync('validation/gameplay-balance-summary.json',JSON.stringify(report,null,2)+'\n');
const equalTable=['| Format | Equal level | Left/right wins | Point total |','|---|---|---:|---:|',...equal.map(row=>`| ${row.format} | ${name[row.level]} | ${row.sideWins[0]}/${row.sideWins[1]} | ${row.pointsBySide[0]}-${row.pointsBySide[1]} |`)].join('\n');
const crossTable=['| Format | Matchup | Higher win rate | Average point margin |','|---|---|---:|---:|',...cross.map(row=>`| ${row.format} | ${name[row.low]} vs ${name[row.high]} | ${pct(row.higherWinRate)} | +${row.margin.toFixed(1)} |`)].join('\n');
const curveTable=['| Level curve | Values | Adjacent win-rate range | Average |','|---|---|---:|---:|',...curves.map(row=>`| ${row.candidate} | ${row.values.join('/')} | ${pct(row.adjacentMin)}–${pct(row.adjacentMax)} | ${pct(row.adjacentMean)} |`)].join('\n');
const markdown=`# Gameplay Engine Balance Report\n\nGenerated: ${report.generatedAt}\n\n## Method\n\nThis is a real physics-engine test. Each Game object runs in CPU watch mode through movement, reaction, shot selection, contact quality, ball physics, faults, rallies and scoring. Higher levels are swapped between court sides, and initial service alternates.\n\n## Equal-level fairness\n\n20 matches per equal-level pairing per format.\n\n${equalTable}\n\nEqual-level results remain inside a playable 40–60% side range. There is no evidence that one court side is systematically dominant.\n\n## Cross-level outcomes — current settings\n\n20 matches per matchup per format.\n\n${crossTable}\n\nEvery higher level won all 20 cross-level matches in both formats. Several lower-level teams scored fewer than two points across the entire sample. The current level difference is not competitive.\n\n## Candidate level curves\n\n${curveTable}\n\n- **6–10 point adjacent gaps** still produce 90–100% win rates in most adjacent matchups.\n- **2 point gaps** still produce a mostly decisive advantage: about 70–92.5% across the 40-game confirmation.\n- **1 point gaps** produce the most usable adjacent range: 50–72.5%, averaging 60%.\n- A two-level gap in the one-point curve ranges from 55% to 95%, while a three-level gap is 95–100%.\n\n## Verdict\n\n**The gameplay engine itself is stable, but the level curve and rating-to-ability conversion are over-steep.**\n\nThe problem is not one level label. Multiple movement, reaction, control and shot abilities scale together, causing differences to compound. A two-point rating gap already changes match outcomes substantially, so the current 15–20 point gaps cannot support competitive cross-level play.\n\n## Recommended direction\n\n1. With the current engine conversion, map the four internal levels to **67 / 68 / 69 / 70** as the safest tested starting point.\n2. If the labels need a wider numeric spread, first reduce compounding in the rating-to-ability conversion rather than stretching the level values.\n3. Target adjacent win rates around 55–70%, two-level gaps around 80–90%, and three-level gaps around 95–100%.\n4. Separate archetype differences from level differences so players remain stylistically distinct instead of every ability scaling together.\n5. Re-run node scripts/validate-levels-mirrored.js 40 --output validation/gameplay-balance-mirrored.json after tuning.\n`;
writeFileSync('GAMEPLAY-BALANCE-REPORT.md',markdown);
console.log(JSON.stringify({equal,cross,curves:curves.map(row=>({candidate:row.candidate,values:row.values,adjacentMin:row.adjacentMin,adjacentMean:row.adjacentMean,adjacentMax:row.adjacentMax}))},null,2));
