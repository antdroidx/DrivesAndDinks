import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {C} from '../src/core.js';
function rally(shots=20){const g=new Game();g.phase='rally';g.shots=shots;for(let i=0;i<120;i++){g.clock=i/30;g.recordReplay();g.replayTick=0;}return g;}
test('long rally clip contains independent snapshots without changing the score',()=>{const g=rally();const recorded=g.replayFrames[0].players[0].x;g.players[0].x=19;assert.equal(g.replayFrames[0].players[0].x,recorded);g.fault(1,'Unreturned');assert.ok(g.replayClip.frames.length>15);assert.equal(g.replayClip.label,'20-SHOT RALLY');const score=[...g.score.points];for(const frame of g.replayClip.frames)assert.ok(frame.ball);assert.deepEqual(g.score.points,score);});
test('ordinary short rallies do not trigger replay and recording is bounded',()=>{const g=rally();g.shots=4;g.fault(1,'Out');assert.equal(g.replayClip,null);g.serveSetup();g.phase='rally';for(let i=0;i<2000;i++)g.recordReplay();assert.ok(g.replayFrames.length<=360);});
test('special-shot highlight selects its own replay window',()=>{const g=rally();g.shots=5;g.visualRandom=()=>0;g.replayHighlights.push({time:2,label:'AROUND THE POST',successful:true});g.fault(1,'Unreturned');assert.equal(g.replayClip.label,'AROUND THE POST');assert.ok(g.replayClip.frames.filter(f=>f.clock<=4).every(f=>f.clock<=4));assert.ok(g.replayClip.frames.at(-1).clock>4);g.serveSetup();assert.equal(g.replayClip,null);assert.equal(g.replayHighlights.length,0);});

test('automatic replays require at least twenty shots',()=>{
 const short=rally(19);short.fault(1,'Out');assert.equal(short.replayClip,null);assert.ok(short.pointReplay.frames.length>15);
 const qualifying=rally(20);qualifying.fault(1,'Out');assert.equal(qualifying.replayClip.label,'20-SHOT RALLY');
});

test('any completed point is available for a manual replay',()=>{
 const g=rally(3);g.fault(1,'Out');assert.equal(g.replayClip,null);assert.ok(g.pointReplay.frames.length>15);assert.match(g.pointReplay.label,/3-SHOT RALLY/);
});

test('a match-winning point is an automatic replay even when the rally is short',()=>{
 const g=rally(4);g.score.points=[10,9];g.fault(1,'Out');assert.equal(g.score.winner,0);assert.ok(g.replayClip);assert.match(g.replayClip.label,/MATCH POINT WIN/);
});
test('ATP and Erne highlights both qualify for automatic replay',()=>{
 for(const [shot,label] of [['atp','AROUND THE POST'],['erne','ERNE']]){
  const g=rally(5);g.replayHighlights.push({time:2,label,successful:true});g.fault(1,'Out');assert.ok(g.replayClip);assert.equal(g.replayClip.label,label);
 }
});

test('automatic replay leaves the point outcome visible for 1.5 seconds',()=>{
 for(const matchPoint of [false,true]){
  const g=rally(20);
  if(matchPoint)g.score.points=[10,9];
  Object.assign(g.ball,{x:-1,y:35,z:C.ballRadius});
  g.bounceMark={x:-1,y:35,time:.35};g.fault(1,'Out');
  const ball=structuredClone(g.ball),score=structuredClone(g.score);
  assert.equal(g.takeReplayClip(),null);
  g.update(1.49);assert.equal(g.takeReplayClip(),null);
  assert.deepEqual(g.ball,ball);assert.deepEqual(structuredClone(g.score),score);assert.ok(g.bounceMark.time>0);
  g.update(.02);assert.ok(g.takeReplayClip());assert.equal(g.takeReplayClip(),null);
 }
});

test('pausing holds the automatic replay delay and disabling or restarting cancels it',()=>{
 const g=rally(20);g.fault(1,'Out');g.update(.75);
 g.setPaused(true);g.update(10);assert.equal(g.takeReplayClip(),null);
 g.setPaused(false);g.update(.76);assert.ok(g.takeReplayClip());
 const disabled=rally(20);disabled.fault(1,'Out');assert.equal(disabled.takeReplayClip(false),null);disabled.update(1.6);assert.equal(disabled.takeReplayClip(),null);
 const restarted=rally(20);restarted.fault(1,'Out');restarted.serveSetup();restarted.update(1.6);assert.equal(restarted.takeReplayClip(),null);
});

function atpAttempt(){
 const g=rally(5),player=g.players[0];
 Object.assign(player,{x:-2,y:35});Object.assign(g.ball,{x:-2,y:35,z:1});g.last=1;
 assert.equal(g.hit(player,'atp',2,1),true);
 assert.equal(g.replayHighlights.at(-1).successful,false);
 return g;
}

test('an ATP only becomes a highlight after landing legally or being legally returned',()=>{
 const landed=atpAttempt();
 Object.assign(landed.ball,{x:10,y:5,z:C.ballRadius+.001,vx:0,vy:0,vz:-1});
 landed.update(C.dt);assert.equal(landed.replayHighlights.at(-1).successful,true);
 landed.fault(1,'Unreturned');assert.match(landed.replayClip.label,/AROUND THE POST/);
 const returned=atpAttempt();
 assert.equal(returned.hit(returned.players[2],'drive',10,1),true);
 assert.equal(returned.replayHighlights.at(-1).successful,true);
 returned.fault(0,'Out');assert.match(returned.replayClip.label,/AROUND THE POST/);
});

test('out, net, post and wrong-side ATP attempts do not trigger ATP replays',()=>{
 for(const [reason,changes] of [
  ['Out',{x:-.5,y:5}],['Net fault',{x:10,y:35,netContact:true}],['Wrong side',{x:10,y:35}]
 ]){
  const g=atpAttempt();Object.assign(g.ball,{z:C.ballRadius+.001,vx:0,vy:0,vz:-1,...changes});
  g.update(C.dt);assert.equal(g.phase,'pause');assert.equal(g.stats.faults[reason],1);
  assert.equal(g.replayHighlights.at(-1).successful,false);assert.equal(g.replayClip,null);assert.ok(g.pointReplay);
 }
 const post=atpAttempt();post.fault(0,'Post fault');assert.equal(post.replayClip,null);
 const illegalReturn=atpAttempt();illegalReturn.players[2].y=20;
 assert.equal(illegalReturn.hit(illegalReturn.players[2],'drive',10,1),false);
 assert.equal(illegalReturn.replayHighlights.at(-1).successful,false);
});

test('a failed ATP may still be replayed for an independent long-rally or match-point reason',()=>{
 for(const matchPoint of [false,true]){
  const g=atpAttempt();if(matchPoint){g.score.points=[9,10];g.score.team=1;}else g.shots=20;
  g.fault(0,'Out');assert.ok(g.replayClip);assert.doesNotMatch(g.replayClip.label,/AROUND THE POST/);
  assert.match(g.replayClip.label,matchPoint?/MATCH POINT WIN/:/20-SHOT RALLY/);
 }
});
import {highlightReplayCamera} from '../src/fault-replay.js';
test('highlight replay keeps one stationary framed view through the outcome',()=>{
 const base={x:0,y:0,width:960,height:600},project=(x,y,z=0)=>({x:x*40,y:y*12-z*12});
 const frames=Array.from({length:91},(_,i)=>({clock:i/30,ball:{x:2+i/6,y:10+i/4,z:Math.max(0,4-i/20)}}));
 const clip={frames,focus:{x:2,y:10,time:0,reason:'ERNE'}};
 for(const snapshot of frames){
  const camera=highlightReplayCamera(base,clip,project,snapshot);assert.deepEqual(camera,base);const ball=project(snapshot.ball.x,snapshot.ball.y,snapshot.ball.z);assert.ok(ball.x>camera.x&&ball.x<camera.x+camera.width);assert.ok(ball.y>camera.y&&ball.y<camera.y+camera.height)}
});
