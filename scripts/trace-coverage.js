// Diagnostic snapshots around coverage and momentum faults; not used by the game.
import {Game} from '../src/game.js';
import {C,paddleContactDistance} from '../src/core.js';
import {applyPhysique,buildProfile} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {safeVolleyRecovery} from '../src/tactics.js';
import {strokeDuration} from '../src/match-animation.js';
import {writeFileSync} from 'node:fs';

const seed=Number(process.argv[2]??17),character=process.argv[3]??'remy',output=process.argv[4];
const rng=seededRandom(seed),lineup=Array.from({length:4},(_,id)=>applyPhysique(buildProfile({character},{random:rng}),{height:id<2?210:177,build:id<2?1.05:.5225}));
const g=new Game({seed});g.configure({format:'doubles'},lineup);g.mode='watch';g.recordReplay=()=>{};
g.score.team=seed%2;g.score.serverPlayer=g.score.team===0?1:0;g.serveSetup();
const contacts=new Map(),traces=[],hit=g.hit.bind(g),fault=g.fault.bind(g);let history=[];
const state=()=>({clock:g.clock,shots:g.shots,bounces:g.bounces,last:g.last,ball:{...g.ball},plan:structuredClone(g.teamPlan),players:g.players.map(p=>({id:p.id,team:p.team,x:p.x,y:p.y,vx:p.vx,vy:p.vy,stamina:p.stamina,stride:p.stride,swing:p.swing,swingDuration:p.swingDuration,volleyMomentum:p.volleyMomentum,role:p.tacticalRole,airborneTimer:p.airborneTimer,distance:paddleContactDistance(p,g.ball)}))});
g.hit=(p,shot,aim,quality=1,placement=null)=>{
 const before={clock:g.clock,bounces:g.bounces,shot,predictedSafe:safeVolleyRecovery(p,strokeDuration(p,shot)),state:state()};
 const ok=hit(p,shot,aim,quality,placement);if(ok)contacts.set(p.id,before);return ok;
};
g.fault=(team,reason,player=null)=>{
 if(g.phase!=='over'&&g.phase!=='pause'&&['Kitchen momentum fault','Unreturned','Double bounce'].includes(reason))traces.push({team,reason,playerId:player?.id,lastContact:player?contacts.get(player.id):null,state:state(),history:history.filter(s=>s.clock>=g.clock-.35)});
 return fault(team,reason,player);
};
for(let tick=0;tick<120*2400&&g.phase!=='over';tick++){
 if(g.phase==='serve')history=[];
 history.push(state());if(history.length>45)history.shift();g.update(C.dt);
}
const detailed=process.argv.includes('--full');
const savedTraces=detailed?traces:traces.filter(t=>t.reason==='Kitchen momentum fault').map(t=>({
 ...t,
 lastContact:t.lastContact?{clock:t.lastContact.clock,shot:t.lastContact.shot,predictedSafe:t.lastContact.predictedSafe,player:t.lastContact.state.players.find(p=>p.id===t.playerId)}:null,
 history:t.history.map(s=>({clock:s.clock,players:s.players.filter(p=>p.team===t.team).map(({id,x,y,vx,vy})=>({id,x,y,vx,vy}))}))
}));
const report={seed,character,completed:g.phase==='over',score:g.score.points,faults:g.stats.faults,scope:detailed?'All coverage histories':'Kitchen fault histories; add --full to retain unreturned-ball histories too',traces:savedTraces};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({seed,character,completed:report.completed,score:report.score,faults:report.faults,kitchen:traces.filter(t=>t.reason==='Kitchen momentum fault').map(t=>({team:t.team,playerId:t.playerId,clock:t.state.clock,sinceHit:t.state.clock-t.lastContact?.clock,predictedSafe:t.lastContact?.predictedSafe,hit:t.lastContact?.state.players.find(p=>p.id===t.playerId),fault:t.state.players.find(p=>p.id===t.playerId)}))},null,2));
