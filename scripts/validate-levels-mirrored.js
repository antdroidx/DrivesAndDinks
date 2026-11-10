import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {levelLineup,SKILL_LEVELS} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const count=Number(process.argv[2]||20);
if(!Number.isInteger(count)||count<2||count>100||count%2)throw new Error('Use an even number from 2–100 matches per pairing');
const outputIndex=process.argv.indexOf('--output');
const output=outputIndex>=0?process.argv[outputIndex+1]:'validation/gameplay-balance-mirrored.json';
if(!output||output.startsWith('--'))throw new Error('--output needs a path');
const levels=Object.keys(SKILL_LEVELS),pairings=[];
for(let a=0;a<levels.length;a++)for(let b=a;b<levels.length;b++)pairings.push([levels[a],levels[b]]);
const results=[];
for(const format of ['singles','doubles'])for(const [a,b] of pairings){
  const summary={format,levels:[a,b],games:count,completed:0,levelWins:[0,0],sideWins:[0,0],pointsByLevel:[0,0],pointsBySide:[0,0],rallies:0,shots:{},faults:{},maxRally:0,orientations:{aTeam0:0,aTeam1:0},initialServer:{team0:0,team1:0}};
  for(let seed=1;seed<=count;seed++){
    const rng=seededRandom(seed),lineupA=levelLineup(a,rng),lineupB=levelLineup(b,rng);
    const aTeam=((seed-1)%2)===0?0:1;
    const bTeam=1-aTeam;
    const team0=aTeam===0?lineupA:lineupB,team1=bTeam===1?lineupB:lineupA;
    const lineup=[team0[0],team0[1],team1[0],team1[1]];
    const g=new Game({seed});g.configure({format},lineup);g.mode='watch';g.recordReplay=()=>{};
    const serverTeam=Math.floor((seed-1)/2)%2;
    g.score.team=serverTeam;g.score.serverPlayer=0;g.serveSetup();
    const fault=g.fault.bind(g);g.fault=(...args)=>{summary.maxRally=Math.max(summary.maxRally,g.shots);return fault(...args)};
    for(let tick=0;tick<120*2400&&g.phase!=='over';tick++)g.update(C.dt);
    if(g.phase!=='over')continue;
    summary.completed++;
    const winner=g.score.winner,winnerLevel=winner===aTeam?0:1;
    summary.sideWins[winner]++;summary.levelWins[winnerLevel]++;
    summary.pointsBySide[0]+=g.score.points[0];summary.pointsBySide[1]+=g.score.points[1];
    summary.pointsByLevel[0]+=g.score.points[aTeam];summary.pointsByLevel[1]+=g.score.points[bTeam];
    summary.rallies+=g.stats.rallies;
    for(const key of ['shots','faults'])for(const [name,number] of Object.entries(g.stats[key]))summary[key][name]=(summary[key][name]??0)+number;
    if(aTeam===0)summary.orientations.aTeam0++;else summary.orientations.aTeam1++;
    summary.initialServer[`team${serverTeam}`]++;
  }
  summary.winRateB=summary.levelWins[1]/summary.completed;
  results.push(summary);console.log(JSON.stringify(summary));
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({methodology:'Real engine CPU watch matches; level assignments swapped across court sides and initial service alternated.',matchesPerPair:count,results},null,2)+'\n');
if(results.some(row=>row.completed!==count))process.exitCode=1;