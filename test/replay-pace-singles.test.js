import {test} from 'node:test';
import assert from 'node:assert/strict';
import {faultReplaySample,replayTiming,replayRateAt,lineReplayReview,footReplayReview,netReplayReview} from '../src/fault-replay.js';
import {singlesRecoveryTarget,formationTarget,waitForRisingContact,planIncoming,forecastMovement} from '../src/tactics.js';
import {Game} from '../src/game.js';
import {buildProfile,applyPhysique} from '../src/roster.js';
import {chooseCpuShot,C,stepBall,paddleContactAvailable} from '../src/core.js';

const frames=()=>Array.from({length:121},(_,i)=>({clock:i/30,ball:{x:10,y:5,z:1}}));
test('ordinary highlights play at real time despite contact, ATP or match-point focus',()=>{
 for(const reason of ['CONTACT','AROUND THE POST','ERNE','MATCH POINT WIN']){
  const clip={frames:frames(),focus:{x:10,y:5,time:3.5,reason}},t=replayTiming(clip);
  assert.equal(t.rate,1);assert.equal(t.duration,4.18);assert.equal(faultReplaySample(clip,2).clock,2);assert.equal(replayRateAt(clip,3.8),1);assert.equal(faultReplaySample(clip,4.3),null);
 }
});
test('only a brief close-call window slows, with normal-speed continuation to the outcome',()=>{
 const clip={frames:frames(),review:{kind:'line',time:2,margin:.1}},t=replayTiming(clip);
 assert.equal(t.slowStart,1.75);assert.equal(t.slowEnd,2.25);assert.equal(replayRateAt(clip,1),1);assert.equal(replayRateAt(clip,t.lead+.2),.35);assert.equal(replayRateAt(clip,t.lead+t.slow+.2),1);
 assert.equal(faultReplaySample(clip,t.duration-.1),clip.frames.at(-1));assert.equal(faultReplaySample(clip,t.duration+.1),null);
});
test('line review excludes obvious outs, including outs far past a second boundary',()=>{
 assert.equal(lineReplayReview({x:-2,y:44.01},1),null);assert.equal(lineReplayReview({x:10,y:20},1),null);
 assert.equal(lineReplayReview({x:-.1,y:20},1).kind,'line');assert.equal(lineReplayReview({x:.1,y:20},1).kind,'line');
 assert.equal(lineReplayReview({x:5,y:15.1},1,{serve:true,receiverTeam:1,serveX:15}).kind,'line');
 assert.equal(lineReplayReview({x:5,y:20},1,{serve:true,receiverTeam:1,serveX:15}),null);
});
test('obvious kitchen/net contacts stay normal speed while near-edge contacts qualify',()=>{
 assert.equal(footReplayReview({boundary:29,team:0,y:29.3,time:2}).kind,'foot');assert.equal(footReplayReview({boundary:29,team:0,y:28,time:2}),null);
 assert.equal(netReplayReview({x:10,z:2.95,radius:.125},2).kind,'net');assert.equal(netReplayReview({x:10,z:1,radius:.125},2),null);
 assert.equal(replayTiming({frames:frames(),focus:{boundary:29,team:0,y:28,time:3}}).rate,1);
});
test('replay sampling respects irregular snapshot timestamps and empty clips',()=>{
 const clip={frames:[{clock:2},{clock:2.08},{clock:2.3},{clock:3}]};assert.equal(faultReplaySample(clip,.1).clock,2.08);assert.equal(faultReplaySample({frames:[]},0),null);
 assert.equal(replayTiming({frames:frames(),review:{time:100}}).review,null);
});

function athlete(extra={}){return {...applyPhysique(buildProfile({character:'avery'}),{height:210,build:1.05}),id:0,team:0,x:10,y:39,vx:0,vy:0,stamina:1,lastShotQuality:1,lastShotPlacement:{x:10,y:4},...extra}}
const recovery={ball:{x:10},shots:4,servingTeam:1,lastShot:'drive',lastHitter:0};
test('a clean deep singles return creates an approach opportunity at either court end',()=>{
 for(const team of [0,1]){const p=athlete({team,y:team===0?41:3,lastShotPlacement:{x:10,y:team===0?4:40}}),r=singlesRecoveryTarget(p,{...recovery,shots:2,servingTeam:1-team});assert.equal(r.role,'singles-approach');assert.equal(r.y,team===0?38:6)}
});
test('singles approaches use net strengths and opponent depth rather than a height exemption',()=>{
 const p=athlete(),deep={id:2,team:1,x:10,y:4};
 assert.equal(singlesRecoveryTarget(p,{...recovery,players:[p,deep]}).role,'singles-approach');
 assert.equal(singlesRecoveryTarget({...p,abilities:{...p.abilities,reach:.7,volley:.7}},{...recovery,players:[p,deep]}).role,'singles-recover');
 assert.equal(singlesRecoveryTarget(p,{...recovery,players:[p,{...deep,y:14}]}).role,'singles-recover');
});
test('mishits, fatigue and lobs stop a planned rush; serving holds and current-ball interception retain priority',()=>{
 const p=athlete(),context={...recovery,players:[p,{id:2,team:1,y:4}]};
 for(const change of [{mishit:true},{stamina:.1},{lastShotQuality:.6}])assert.equal(singlesRecoveryTarget({...p,...change},context).role,'singles-recover');
 assert.equal(singlesRecoveryTarget(p,{...context,lastShot:'lob'}).y,39);
 assert.equal(singlesRecoveryTarget(p,{...context,shots:2,servingTeam:0}).role,'hold');
 assert.deepEqual(formationTarget(p,{...context,singles:true,incoming:0,receiverId:0,point:{x:4,y:34}}),{x:4,y:34,role:'receive'});
});
test('singles passing drives remain conditional on height and pressure',()=>{
 const args={shots:2,team:0,y:38,height:2,random:.5};assert.equal(chooseCpuShot(args),'drop');assert.equal(chooseCpuShot({...args,singles:true}),'drive');
 assert.equal(chooseCpuShot({...args,singles:true,height:.6}),'drop');assert.equal(chooseCpuShot({...args,singles:true,difficulty:.8}),'drop');
 assert.equal(chooseCpuShot({...args,singles:true,shots:1}),'drive');
});
test('contact waiting only selects a physically reachable improvement on a rising bounce',()=>{
 const p=athlete({x:10,y:35}),ball={x:10.85,y:34,z:.35,vx:0,vy:9,vz:11,spin:0},before=structuredClone(p);
 assert.equal(waitForRisingContact(p,ball,{x:10,y:35}),true);assert.deepEqual(p,before);
 assert.equal(waitForRisingContact(p,{...ball,vz:-1},{x:10,y:35}),false);
 assert.equal(waitForRisingContact(p,{...ball,vx:80,vy:80},{x:10,y:35}),false);
});
test('mid-height forehand volleys are included in the movement forecast',()=>{
 const p=athlete({x:10,y:31}),ball={x:10,y:27,z:4.7,vx:0,vy:10,vz:-1,spin:0};
 const plan=planIncoming({players:[p],team:0,ball,shots:4,bounces:0});assert.equal(plan.point.bounces,0);assert.ok(plan.point.z>3.4);
});
test('forecast volley destinations actually reach the live paddle envelope from either end',()=>{
 for(const team of [0,1]){
  const p=athlete({team,x:10,y:team===0?31:13}),ball={x:10,y:team===0?27:17,z:4.7,vx:0,vy:team===0?10:-10,vz:-1,spin:0};
  const before=structuredClone(p),plan=planIncoming({players:[p],team,ball,shots:4,bounces:0});
  assert.equal(plan.point.bounces,0);const future={...ball};
  for(let tick=0;tick<Math.round(plan.point.time/C.dt);tick++)stepBall(future,C.dt);
  const projected=forecastMovement(p,plan.point,plan.point.time);
  assert.ok(paddleContactAvailable(projected,future,'drive'));assert.deepEqual(p,before);
 }
});
test('a close bounce is attached to its point replay without changing the winner',()=>{
 const g=new Game({seed:3});g.phase='rally';g.shots=4;g.last=1;for(let i=0;i<40;i++){g.clock=i/30;g.recordReplay(true)}g.ball={x:-.1,y:35,z:.126,vx:0,vy:0,vz:-1};g.update(C.dt);
 assert.equal(g.phase,'pause');assert.equal(g.pointReplay.review.kind,'line');assert.equal(g.score.points[0],1);
});
