import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {levelLineup,SKILL_LEVELS} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {writeFileSync} from 'node:fs';
const count=Number(process.argv[2]||8),results=[];
if(!Number.isInteger(count)||count<1||count>100)throw new Error('Use 1–100 matches per skill pairing');
const outputIndex=process.argv.indexOf('--output'),output=outputIndex<0?'engine-balance-results.json':process.argv[outputIndex+1];
if(!output||output.startsWith('--'))throw new Error('--output needs a path');
for(const [a,b] of [...Object.keys(SKILL_LEVELS).map(l=>[l,l]),['beginner','advanced'],['intermediate','advanced'],['beginner','intermediate'],['intermediate','demo'],['demo','advanced']]){
 const summary={levels:[a,b],games:count,completed:0,wins:[0,0],points:[0,0],rallies:0,shots:{},faults:{},maxRally:0};
 for(let seed=1;seed<=count;seed++){
  const rng=seededRandom(seed),left=levelLineup(a,rng),right=levelLineup(b,rng),g=new Game({seed});g.configure({},[...left.slice(0,2),...right.slice(0,2).reverse()]);g.mode='watch';g.recordReplay=()=>{};
  // Alternate starting service advantage across deterministic match pairs.
  if(seed%2===0){g.score.team=1;g.score.serverPlayer=0;g.serveSetup()}
  const fault=g.fault.bind(g);g.fault=(...args)=>{summary.maxRally=Math.max(summary.maxRally,g.shots);return fault(...args)};
  for(let tick=0;tick<120*2400&&g.phase!=='over';tick++)g.update(C.dt);
  if(g.phase==='over'){summary.completed++;summary.wins[g.score.winner]++}
  g.score.points.forEach((v,i)=>summary.points[i]+=v);summary.rallies+=g.stats.rallies;
  for(const key of ['shots','faults'])for(const [name,n] of Object.entries(g.stats[key]))summary[key][name]=(summary[key][name]||0)+n;
 }
 results.push(summary);console.log(JSON.stringify(summary));
}
writeFileSync(output,JSON.stringify({matchesPerPair:count,results},null,2));
if(results.some(r=>r.completed!==count)||results.filter(r=>r.levels[0]!==r.levels[1]).some(r=>r.wins[1]<=r.wins[0]))process.exitCode=1;
