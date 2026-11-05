// Paired full-match evidence for lane ownership and actual kitchen order changes.
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadEngine} from './validate-transitions.js';
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
const games=Number(args[0]??8),source=option('--source'),output=option('--output');
if(!Number.isInteger(games)||games<1||games>40)throw new Error('Use 1–40 matches');
const engine=await loadEngine(source?resolve(source):undefined),{Game,core,roster,competition}=engine;
const matches=[];
for(let seed=1;seed<=games;seed++){
 const g=new Game({seed});g.configure({format:'doubles'},roster.levelLineup('demo',competition.seededRandom(seed)));g.mode='watch';g.recordReplay=()=>{};
 if(seed%2===0){g.score.team=1;g.score.serverPlayer=0;g.serveSetup()}
 let previous=[null,null],orderChanges=0,kitchenPairSeconds=0;
 for(let tick=0;tick<120*2400&&g.phase!=='over';tick++){
  g.update(core.C.dt);
  if(g.phase!=='rally'||g.shots<=2){previous=[null,null];continue}
  for(const team of [0,1]){
   const pair=g.players.filter(p=>p.team===team),atNet=pair.every(p=>team===0?p.y<=33:p.y>=11);
   if(!atNet)continue;
   kitchenPairSeconds+=core.C.dt;
   if(Math.abs(pair[0].x-pair[1].x)<2.5)continue;
   const left=pair[0].x<pair[1].x?pair[0].id:pair[1].id;
   if(previous[team]!==null&&previous[team]!==left)orderChanges++;
   previous[team]=left;
  }
 }
 matches.push({seed,completed:g.phase==='over',points:[...g.score.points],rallies:g.stats.rallies,kitchenPairSeconds,orderChanges,poachAttempts:g.tacticalStats.poachAttempts,poachHits:g.tacticalStats.poachHits,coverSwaps:g.tacticalStats.coverSwaps,faults:g.stats.faults});
}
const sum=key=>matches.reduce((n,m)=>n+m[key],0),report={scope:'Identical seeded demo doubles rosters, alternating starting service; 40-minute match cap. Actual order changes count when both partners are at the kitchen and separated by 2.5 feet; poach and coverage counts are engine diagnostics. No stacking or forced outcomes.',source:source??'current',games,completed:matches.filter(m=>m.completed).length,rallies:sum('rallies'),kitchenPairSeconds:sum('kitchenPairSeconds'),orderChanges:sum('orderChanges'),poachAttempts:sum('poachAttempts'),poachHits:sum('poachHits'),coverSwaps:sum('coverSwaps'),matches};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,matches:undefined}));
if(report.completed!==games)process.exitCode=1;
