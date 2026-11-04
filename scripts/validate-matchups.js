import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {buildProfile,applyPhysique} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {summarizeBodies} from './matchup-metrics.js';

const count=Number(process.argv[2]??2);
if(!Number.isInteger(count)||count<1||count>20)throw new Error('Use 1–20 seeds per matchup');
const outputIndex=process.argv.indexOf('--output'),output=outputIndex>=0?process.argv[outputIndex+1]:null;
if(outputIndex>=0&&!output)throw new Error('--output needs a path');
const bodies=[{id:'short-lean',height:145,build:.1},{id:'short-strong',height:145,build:1.05},{id:'tall-lean',height:210,build:.1},{id:'tall-strong',height:210,build:1.05}];
const neutral={height:177,build:.5225},results=[];
for(const format of ['singles','doubles'])for(const character of ['avery','morgan','jordan'])for(const body of bodies){
 const row={format,character,body:body.id,games:count*2,completed:0,subjectWins:0,points:[0,0],faults:{},patternReads:0};
 for(let seed=1;seed<=count;seed++)for(const subjectTeam of [0,1]){
  const rng=seededRandom(seed),lineup=Array.from({length:4},(_,id)=>{
   const profile=buildProfile({character},{random:rng}),shape=(id<2)===(subjectTeam===0)?body:neutral;
   return applyPhysique(profile,{...profile.appearance,...shape});
  });
  const g=new Game({seed});g.configure({format},lineup);g.mode='watch';g.recordReplay=()=>{};
  g.score.team=seed%2;g.score.serverPlayer=g.score.team===0?1:0;g.serveSetup();
  for(let tick=0;tick<120*2400&&g.phase!=='over';tick++){
   g.update(C.dt);
   if(tick%120===0&&!g.players.every(p=>[p.x,p.y,p.vx,p.vy,p.stamina].every(Number.isFinite)))throw new Error(`Nonfinite athlete in ${format}/${character}/${body.id}`);
  }
  if(g.phase==='over'){row.completed++;if(g.score.winner===subjectTeam)row.subjectWins++}
  row.points[0]+=g.score.points[subjectTeam];row.points[1]+=g.score.points[1-subjectTeam];row.patternReads+=g.tacticalStats.patternReads;
  for(const [reason,n] of Object.entries(g.stats.faults))row.faults[reason]=(row.faults[reason]??0)+n;
 }
 row.subjectWinRate=row.subjectWins/row.games;
 row.review=row.games>=8&&(row.subjectWinRate>=.875||row.subjectWinRate<=.125)?'larger sample recommended':'sample only';
 results.push(row);console.log(JSON.stringify(row));
}
const report={seedsPerSide:count,neutral,bodies,results,bodySummary:summarizeBodies(results)};
if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n')}
if(results.some(row=>row.completed!==row.games))process.exitCode=1;
