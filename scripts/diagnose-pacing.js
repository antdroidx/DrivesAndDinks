import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {Game} from '../src/game.js';
import {C,stepBall,netHeightAt,netCrossingX,inBounds,side} from '../src/core.js';
import {levelLineup,SKILL_LEVELS} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {createPacingDiagnostics,summarizePacing} from '../src/pacing-diagnostics.js';

const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){
 if(!args[i].startsWith('--')||!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Invalid option/value: ${args[i]}`);
 options[args[i]]=args[i+1];
}
const games=Number(options['--games']??8),seedStart=Number(options['--seed-start']??1),maxSeconds=Number(options['--max-seconds']??2400);
const format=['singles','doubles'].includes(options['--format'])?options['--format']:'doubles';
const levels=(options['--levels']??'beginner,intermediate,demo,advanced').split(',');
const output=resolve(options['--output']??'validation/pacing-diagnostic.json');
if(!Number.isInteger(games)||games<1||games>100)throw new Error('--games must be an integer from 1 to 100');
if(!Number.isInteger(seedStart)||seedStart<1)throw new Error('--seed-start must be positive');
if(!Number.isFinite(maxSeconds)||maxSeconds<30||maxSeconds>2400)throw new Error('--max-seconds must be 30–2400');
for(const level of levels)if(!Object.hasOwn(SKILL_LEVELS,level))throw new Error(`Unknown level: ${level}`);

const results=[];
for(const level of levels){
 for(let offset=0;offset<games;offset++){
  const seed=seedStart+offset,rng=seededRandom(seed),lineup=levelLineup(level,rng);
  const game=new Game({seed});
  game.configure({format},format==='singles'?[lineup[0],lineup[2]]:lineup);
  game.mode='watch';game.recordReplay=()=>{};
  if(seed%2===0){game.score.team=1;game.score.serverPlayer=0;game.serveSetup()}
  const tracker=createPacingDiagnostics(game,{C,stepBall,netHeightAt,netCrossingX,inBounds,side});
  for(let tick=0;tick<maxSeconds*120&&game.phase!=='over';tick++){game.update(C.dt);tracker.sample(C.dt)}
  const summary=tracker.finish();
  results.push({level,seed,completed:game.phase==='over',points:[...game.score.points],winner:game.score.winner,simulatedSeconds:game.clock,summary});
  console.log(JSON.stringify({level,seed,completed:results.at(-1).completed,points:results.at(-1).points,seconds:results.at(-1).simulatedSeconds,rallies:summary.rallyCount}));
 }
}

const aggregate={
 matches:results.length,
 completed:results.filter(row=>row.completed).length,
 rallyDurations:{},
 rallyShots:{},
 shotsByType:{},
 qualityByType:{},
 faultsByReason:{},
 faultsByShot:{},
 transitionByShot:{},
 rallyCount:0,
 kitchenSeconds:0,
 bothTeamsKitchenSeconds:0,
 transitionSeconds:0
};
const addMap=(target,source)=>{for(const [key,value] of Object.entries(source??{}))target[key]=(target[key]??0)+value};
for(const row of results){
 addMap(aggregate.shotsByType,row.summary.shotsByType);
 addMap(aggregate.faultsByReason,row.summary.faultsByReason);
 addMap(aggregate.faultsByShot,row.summary.faultsByShot);
 addMap(aggregate.transitionByShot,row.summary.transitionByShot);
 aggregate.rallyCount+=row.summary.rallyCount;
 aggregate.kitchenSeconds+=row.summary.kitchenSeconds;
 aggregate.bothTeamsKitchenSeconds+=row.summary.bothTeamsKitchenSeconds;
 aggregate.transitionSeconds+=row.summary.transitionSeconds;
}
const qualityTotals={};
for(const row of results)for(const [shot,values] of Object.entries(row.summary.qualityByType)){
 const item=qualityTotals[shot]??={contacts:0,qualitySum:0,difficultySum:0,netMarginSum:0,netMargins:0};
 item.contacts+=values.contacts;item.qualitySum+=(values.meanQuality??0)*values.contacts;item.difficultySum+=(values.meanDifficulty??0)*values.contacts;
 const netContacts=values.meanNetMargin===null?0:values.contacts;item.netMarginSum+=(values.meanNetMargin??0)*netContacts;item.netMargins+=netContacts;
}
for(const [shot,values] of Object.entries(qualityTotals)){
 aggregate.qualityByType[shot]={contacts:values.contacts,meanQuality:values.qualitySum/values.contacts,meanDifficulty:values.difficultySum/values.contacts,meanNetMargin:values.netMargins?values.netMarginSum/values.netMargins:null};
}
const rallyDurations=results.map(row=>row.summary.rallyDurations),rallyShots=results.map(row=>row.summary.rallyShots);
for(const key of ['mean','median','p95','max']){
 aggregate.rallyDurations[key]=rallyDurations.map(row=>row[key]).filter(Number.isFinite).reduce((a,b)=>a+b,0)/rallyDurations.filter(row=>Number.isFinite(row[key])).length||null;
 aggregate.rallyShots[key]=rallyShots.map(row=>row[key]).filter(Number.isFinite).reduce((a,b)=>a+b,0)/rallyShots.filter(row=>Number.isFinite(row[key])).length||null;
}
const report={schemaVersion:1,generatedAt:new Date().toISOString(),methodology:{format,levels,gamesPerLevel:games,seedStart,maxSimulatedSecondsPerMatch:maxSeconds,scope:'Seeded CPU watch matches with deterministic pacing instrumentation; no extra random draws.'},aggregate,results};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,completed:`${aggregate.completed}/${aggregate.matches}`,shotsByType:aggregate.shotsByType,faultsByReason:aggregate.faultsByReason}));
if(aggregate.completed!==aggregate.matches)process.exitCode=1;
