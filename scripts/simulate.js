import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {CHARACTERS,PADDLES} from '../src/roster.js';
const useRoster=process.argv.includes('--roster');

const games=Number(process.argv[2]||20);
if(!Number.isInteger(games)||games<1||games>1000)throw new Error('Match count must be an integer from 1 to 1000');
const originalRandom=Math.random;
const summary={games,roster:useRoster,completed:0,rallies:0,shots:0,maxRally:0,humanHits:0,results:{},shotTypes:{},tactics:{poachAttempts:0,poachHits:0,coverSwaps:0,offBallDistance:0},elapsedMs:0};
const lengths=[];const start=performance.now();
try{
 for(let seed=1;seed<=games;seed++){
  let state=seed;Math.random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296};
  const game=new Game();if(useRoster){game.configure({character:CHARACTERS[(seed-1)%4].id,paddle:PADDLES[Math.floor((seed-1)/4)%3].id,jersey:(seed-1)%4});game.mode=Math.floor((seed-1)/12)%2?'play':'watch'}else game.mode=seed%2?'watch':'play';
  const hit=game.hit.bind(game),fault=game.fault.bind(game);
  game.hit=(player,shot,aim)=>{summary.shots++;summary.shotTypes[shot]=(summary.shotTypes[shot]||0)+1;if(game.mode==='play'&&player.id===0)summary.humanHits++;return hit(player,shot,aim)};
  game.fault=(team,reason)=>{if(game.phase!=='pause'&&game.phase!=='over'){summary.rallies++;lengths.push(game.shots);summary.maxRally=Math.max(summary.maxRally,game.shots);summary.results[reason]=(summary.results[reason]||0)+1}return fault(team,reason)};
  for(let tick=0;tick<120*1800&&game.phase!=='over';tick++){
   if(game.mode==='play'){
    if(game.phase==='serve'&&game.server.id===0&&game.timer>.25)game.swing();
    if(game.canHumanHit()){game.shot=game.players[0].y<33?'dink':game.shots===1?'drive':'drop';game.aim=game.players[0].x<10?6:14;game.swing()}
   }
   game.update(C.dt);
  }
  for(const key of Object.keys(summary.tactics))summary.tactics[key]+=game.tacticalStats[key];
  if(game.phase==='over'&&Math.max(...game.score.points)>=11&&Math.abs(game.score.points[0]-game.score.points[1])>=2)summary.completed++;
 }
}finally{Math.random=originalRandom}
lengths.sort((a,b)=>a-b);summary.averageRally=Number((lengths.reduce((a,b)=>a+b,0)/lengths.length).toFixed(1));summary.p95Rally=lengths[Math.floor((lengths.length-1)*.95)];
summary.elapsedMs=Math.round(performance.now()-start);
console.log(JSON.stringify(summary,null,2));
if(summary.completed!==games||!summary.humanHits)process.exitCode=1;

if(games>=20&&summary.tactics.poachHits===0)process.exitCode=1;
