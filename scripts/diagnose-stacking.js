import {writeFileSync} from 'node:fs';
import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {CHARACTERS,createLineup} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';

const args=process.argv.slice(2),option=name=>{const index=args.indexOf(name);return index<0?null:args[index+1]};
const games=Number(args[0]??8),team0=option('--team0')??'adaptive',team1=option('--team1')??'adaptive',output=option('--output')??'validation/stacking-adaptive.json';
const valid=new Set(['off','cross','stay','adaptive']);
if(!Number.isInteger(games)||games<1||games>40)throw new Error('Use 1–40 matches');
if(!valid.has(team0)||!valid.has(team1))throw new Error('Stacking modes must be off, cross, stay or adaptive');

const byTeamType={},byHandPair={},matches=[];
const add=(target,source)=>{for(const [name,row] of Object.entries(source??{})){const total=target[name]??={decisions:0,selected:0,probabilitySum:0};total.decisions+=row.decisions??0;total.selected+=row.selected??0;total.probabilitySum+=row.probabilitySum??0}};
const start=performance.now();
for(let seed=1;seed<=games;seed++){
 const random=seededRandom(seed),lineup=createLineup({character:CHARACTERS[(seed-1)%CHARACTERS.length].id},{random});
 const game=new Game({seed});game.configure({format:'doubles',stacking:{teams:[{mode:team0,preferredSide:seed%2?'left':'right'},{mode:team1,preferredSide:seed%2?'right':'left'}]}},lineup);
 game.mode='watch';game.recordReplay=()=>{};
 if(seed%2===0){game.score.team=1;game.score.serverPlayer=0;game.serveSetup()}
 let maxRally=0;const fault=game.fault.bind(game);
 game.fault=(...values)=>{maxRally=Math.max(maxRally,game.shots);return fault(...values)};
 for(let tick=0;tick<120*2400&&game.phase!=='over';tick++)game.update(C.dt);
 add(byTeamType,game.tacticalStats.stackByTeamType);
 add(byHandPair,game.tacticalStats.stackByHandPair);
 matches.push({seed,completed:game.phase==='over',points:[...game.score.points],rallies:game.stats.rallies,maxRally,teamTypes:game.stackPlans.map(plan=>plan.teamType),decisions:game.tacticalStats.stackDecisions,selected:game.tacticalStats.stackSelected,crossPlanned:game.tacticalStats.stackCrossPlanned,crossed:game.tacticalStats.stackCrossings,stays:game.tacticalStats.stackStays,fallbacks:game.tacticalStats.stackFallbacks});
}

const rates=source=>Object.fromEntries(Object.entries(source).map(([name,row])=>[name,{decisions:row.decisions,selected:row.selected,selectedRate:row.decisions?row.selected/row.decisions:0,averageProbability:row.decisions?row.probabilitySum/row.decisions:0}]));
const selectionByTeamType=rates(byTeamType),selectionByHandPair=rates(byHandPair);
const sum=key=>matches.reduce((total,match)=>total+match[key],0);
const report={scope:'Adaptive stacking frequency by generated doubles team type and hand pair. Preferred sides alternate deterministically; no forced outcomes.',games,teamModes:{team0,team1},completed:matches.filter(match=>match.completed).length,decisions:sum('decisions'),selected:sum('selected'),selectedRate:sum('decisions')?sum('selected')/sum('decisions'):0,selectionByTeamType,selectionByHandPair,execution:{crossPlanned:sum('crossPlanned'),crossed:sum('crossed'),stays:sum('stays'),fallbacks:sum('fallbacks')},rallies:sum('rallies'),maxRally:Math.max(0,...matches.map(match=>match.maxRally)),elapsedMs:Math.round(performance.now()-start),matches};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,matches:undefined},null,2));
if(report.completed!==games)process.exitCode=1;
