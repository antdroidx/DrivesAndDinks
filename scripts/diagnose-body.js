// Controlled ablations for diagnosis only. Never imported by the playable game.
import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {buildProfile,applyPhysique} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

const count=Number(process.argv[2]??2),option=name=>{const i=process.argv.indexOf(name);if(i<0)return null;if(!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw new Error(`${name} needs a value`);return process.argv[i+1]};
const start=Number(option('--seed-start')??1),output=option('--output');
if(!Number.isInteger(count)||count<1||count>20||!Number.isInteger(start)||start<1)throw new Error('Use 1–20 seeds and a positive seed start');
const results=[];
for(const mode of ['current','speed','acceleration','endurance','volley','movement']){
 const row={mode,games:0,completed:0,wins:0,points:[0,0],faults:[{},{}],contacts:[0,0],meanQuality:[0,0],meanStamina:[0,0]};
 for(const character of ['avery','morgan','jordan'])for(let seed=start;seed<start+count;seed++)for(const subjectTeam of [0,1]){
  const random=seededRandom(seed),lineup=Array.from({length:4},(_,id)=>applyPhysique(buildProfile({character},{random}),{height:(id<2)===(subjectTeam===0)?210:177,build:(id<2)===(subjectTeam===0)?1.05:.5225}));
  const g=new Game({seed});g.configure({format:'singles'},lineup);
  // Configure reapplies physique; neutralize selected abilities AFTER configuring.
  for(const p of g.players.filter(p=>p.team===subjectTeam))for(const key of mode==='current'?[]:mode==='movement'?['speed','acceleration','endurance','volley']:[mode])p.abilities[key]=p.baseAbilities[key]??1;
  g.mode='watch';g.recordReplay=()=>{};g.score.team=seed%2;g.serveSetup();
  const hit=g.hit.bind(g),fault=g.fault.bind(g);
  g.hit=(p,shot,aim,quality=1,placement=null)=>{
   const stamina=p.stamina??1,ok=hit(p,shot,aim,quality,placement);if(ok){const i=p.team===subjectTeam?0:1;row.contacts[i]++;row.meanQuality[i]+=quality;row.meanStamina[i]+=stamina}return ok;
  };
  g.fault=(team,reason,player=null)=>{if(g.phase!=='pause'&&g.phase!=='over'){const i=team===subjectTeam?0:1;row.faults[i][reason]=(row.faults[i][reason]??0)+1}return fault(team,reason,player)};
  for(let tick=0;tick<120*2400&&g.phase!=='over';tick++)g.update(C.dt);
  row.games++;if(g.phase==='over'){row.completed++;if(g.score.winner===subjectTeam)row.wins++}
  row.points[0]+=g.score.points[subjectTeam];row.points[1]+=g.score.points[1-subjectTeam];
 }
 for(let i=0;i<2;i++){row.meanQuality[i]/=row.contacts[i]||1;row.meanStamina[i]/=row.contacts[i]||1}
 results.push(row);console.log(JSON.stringify(row));
}
if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({scope:'Diagnostic ability ablations, not production balance coefficients',seedsPerSide:count,seedStart:start,results},null,2)+'\n')}
if(results.some(r=>r.completed!==r.games))process.exitCode=1;
