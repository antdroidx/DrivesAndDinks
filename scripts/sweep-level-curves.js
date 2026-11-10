import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {CHARACTERS,RATING_KEYS,buildProfile} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {writeFileSync} from 'node:fs';

const candidates=[
  {id:'current',values:[35,55,70,85]},
  {id:'compressed-8',values:[50,58,66,74]},
  {id:'compressed-10',values:[45,55,65,75]},
  {id:'compressed-6',values:[52,58,64,70]},
  {id:'tight-2',values:[64,66,68,70]},
  {id:'tight-3',values:[61,64,67,70]},
  {id:'tight-1',values:[67,68,69,70]}
];
const wantedIndex=process.argv.indexOf('--candidates');
const wanted=wantedIndex>=0?new Set(process.argv[wantedIndex+1].split(',')):null;
const outputIndex=process.argv.indexOf('--output');
const output=outputIndex>=0?process.argv[outputIndex+1]:'validation/level-curve-sweep.json';
const pairings=[[0,1],[1,2],[2,3],[0,2],[1,3],[0,3]];
const gamesIndex=process.argv.indexOf('--games');
const games=gamesIndex>=0?Math.max(2,Math.min(100,Number(process.argv[gamesIndex+1])||10)):10;
function lineupFor(baseline,random){
  return ['avery','remy','jordan','selena'].map((character,index)=>{
    const source=CHARACTERS.find(entry=>entry.id===character);
    const attributes=Object.fromEntries(RATING_KEYS.map(key=>[key,Math.max(10,Math.min(95,baseline+(source.ratings[key]-70)*.45))]));
    return buildProfile({character,handedness:index%3===1?'left':'right',shirtColor:['green','white','orange','purple'][index],paddleColor:['mint','blue','yellow','coral'][index]},{attributes,random});
  });
}
const rows=[];
for(const candidate of candidates.filter(entry=>!wanted||wanted.has(entry.id)))for(const format of ['singles','doubles'])for(const [low,high] of pairings){
  const summary={candidate:candidate.id,values:candidate.values,format,levels:[low,high],gap:candidate.values[high]-candidate.values[low],games,completed:0,higherWins:0,lowerWins:0,higherPoints:0,lowerPoints:0};
  for(let seed=1;seed<=games;seed++){
    const rng=seededRandom(seed),lower=lineupFor(candidate.values[low],rng),higher=lineupFor(candidate.values[high],rng);
    const highTeam=((seed-1)%2)===0?1:0,lowTeam=1-highTeam;
    const team0=highTeam===0?higher:lower,team1=highTeam===1?higher:lower;
    const g=new Game({seed});g.configure({format},[team0[0],team0[1],team1[0],team1[1]]);g.mode='watch';g.recordReplay=()=>{};
    g.score.team=Math.floor((seed-1)/2)%2;g.score.serverPlayer=0;g.serveSetup();
    for(let tick=0;tick<120*2400&&g.phase!=='over';tick++)g.update(C.dt);
    if(g.phase!=='over')continue;
    summary.completed++;
    if(g.score.winner===highTeam)summary.higherWins++;else summary.lowerWins++;
    summary.higherPoints+=g.score.points[highTeam];summary.lowerPoints+=g.score.points[lowTeam];
  }
  summary.higherWinRate=summary.higherWins/summary.completed;
  rows.push(summary);console.log(JSON.stringify(summary));
}
const report={methodology:'Real engine mirrored CPU-vs-CPU matches; higher level swaps court sides and initial service alternates.',gamesPerPair:games,candidates,pairings,rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
