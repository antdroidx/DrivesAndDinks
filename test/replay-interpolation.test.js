import {test} from 'node:test';
import assert from 'node:assert/strict';
import {faultReplaySample,replayTiming} from '../src/fault-replay.js';
import {sampleMatchAnimation} from '../src/match-animation.js';
import {playerFeet} from '../src/player-feet.js';
import {replayContactAt} from '../src/contact-cues.js';
import {C,stepBall} from '../src/core.js';

function clip({nextShots=0,nextBounces=0}={}) {
 const first={clock:0,ball:{x:0,y:0,z:0},players:[{x:0,y:0}],shots:0,bounces:0};
 const next={...first,clock:.1,ball:{x:1,y:1,z:1},players:[{x:2,y:2}],shots:nextShots,bounces:nextBounces};
 return {frames:[first,next]};
}

test('replay sampling can interpolate ball and player motion between adjacent frames',()=>{
 const sample=faultReplaySample(clip(),.05,true);
 assert.ok(sample.ball.x>0&&sample.ball.x<1);assert.ok(sample.ball.y>0&&sample.ball.y<1);assert.ok(sample.ball.z>0&&sample.ball.z<1);
 assert.ok(sample.players[0].x>0&&sample.players[0].x<2);assert.ok(sample.players[0].y>0&&sample.players[0].y<2);
 assert.equal(sample.clock,.05);
});

test('interpolation does not cross a new hit or bounce and defaults to exact frames',()=>{
 for(const [nextShots,nextBounces] of [[1,0],[0,1]]){
  const sample=faultReplaySample(clip({nextShots,nextBounces}),.05,true);
  assert.equal(sample.clock,.05);assert.equal(sample.ball.x,0);assert.equal(sample.players[0].x,0);
  const impact=faultReplaySample(clip({nextShots,nextBounces}),.1,true);
  assert.equal(impact.shots,nextShots);assert.equal(impact.bounces,nextBounces);assert.equal(impact.ball.x,1);
 }
 const exact=faultReplaySample(clip(),.05,false);
 assert.equal(exact.clock,0);assert.equal(exact.ball.x,0);
});

test('rendered swing, preparation, feet and travel direction advance between snapshots',()=>{
 const recording=clip(),[a,b]=recording.frames;
 Object.assign(a.players[0],{id:0,team:0,vx:2,vy:0,fx:0,fy:-1,stride:0,swing:.6,swingDuration:.8,animationShot:'drive',stroke:'forehand',windup:.1,airborneTimer:.08,splitStepTimer:0,recoveryTimer:.1,stamina:1,preparation:{shotNumber:0,shot:'drive',stroke:'forehand',phase:.1}});
 Object.assign(b.players[0],{...structuredClone(a.players[0]),x:2,y:2,vx:4,vy:2,fx:1,fy:0,stride:.4,swing:.5,windup:0,airborneTimer:0,recoveryTimer:0,stamina:.9,preparation:{...a.players[0].preparation,phase:.3}});
 a.timer=0;b.timer=.1;
 const sample=faultReplaySample(recording,.05,true),p=sample.players[0];
 for(const [key,value] of Object.entries({x:1,y:1,vx:3,vy:1,fx:.5,fy:-.5,stride:.2,swing:.55,windup:.05,airborneTimer:.04,recoveryTimer:.05,stamina:.95}))assert.ok(Math.abs(p[key]-value)<1e-12,key);
 assert.equal(sample.timer,.05);assert.equal(p.preparation.phase,.2);
 const before=sampleMatchAnimation(a.players[0],a),after=sampleMatchAnimation(b.players[0],b),rendered=sampleMatchAnimation(p,sample);
 assert.ok(rendered.phase>before.phase&&rendered.phase<after.phase);
 assert.notDeepEqual(playerFeet(p),playerFeet(a.players[0]));
 // Direction derives from velocity; a turn must not remain stuck on the low frame.
 a.players[0].vx=-2;b.players[0].vx=4;
 assert.equal(Math.sign(faultReplaySample(recording,.075,true).players[0].vx),1);
});

test('animation countdown resets and new preparation modes do not start early',()=>{
 const recording=clip(),[a,b]=recording.frames;
 Object.assign(a.players[0],{swing:0,windup:0,splitStepTimer:0,airborneTimer:0,preparation:{shotNumber:0,shot:'drive',stroke:'forehand',phase:.2}});
 Object.assign(b.players[0],{swing:.8,windup:.2,splitStepTimer:.18,airborneTimer:.3,stroke:'backhand',preparation:{shotNumber:1,shot:'drop',stroke:'backhand',phase:.4}});
 const sample=faultReplaySample(recording,.05,true).players[0];
 for(const key of ['swing','windup','splitStepTimer','airborneTimer'])assert.equal(sample[key],0);
 assert.deepEqual(sample.preparation,a.players[0].preparation);assert.equal(sample.stroke,undefined);
 assert.equal(faultReplaySample(recording,.1,true).players[0].stroke,'backhand');
});

test('bounce and contact markers prevent interpolation even without recorded counters',()=>{
 for(const key of ['bounceMark','contact'])for(const previous of [null,{x:3,y:4,z:1,time:0}]){
  const recording=clip(),[a,b]=recording.frames;
  delete a.bounces;delete b.bounces;
  a[key]=previous;b[key]={x:3,y:4,z:1,time:.12};
  const sample=faultReplaySample(recording,.05,true);
  assert.equal(sample.clock,.05);assert.equal(sample.ball.x,0);assert.equal(sample.players[0].x,0);assert.deepEqual(sample[key],previous);
  assert.deepEqual(faultReplaySample(recording,.1,true)[key],b[key]);
 }
});

test('existing cues age continuously without blending event positions or metadata',()=>{
 const recording=clip(),[a,b]=recording.frames;
 a.contact={x:3,y:4,z:1,time:.12,shot:'drive',quality:.8};b.contact={...a.contact,time:.02};
 a.bounceMark={x:8,y:9,time:.35};b.bounceMark={...a.bounceMark,time:.25};
 a.shot='attack';b.shot='soft';a.message='BEFORE';b.message='AFTER';
 const sample=faultReplaySample(recording,.05,true);
 assert.ok(Math.abs(sample.contact.time-.07)<1e-12);assert.equal(sample.bounceMark.time,.3);
 assert.equal(sample.contact.x,3);assert.equal(sample.contact.shot,'drive');assert.equal(sample.contact.quality,.8);
 assert.equal(sample.bounceMark.x,8);assert.equal(sample.shot,'attack');assert.equal(sample.message,'BEFORE');
 assert.ok(replayContactAt(recording,sample.clock).time<replayContactAt(recording,a.clock).time);
});

test('render samples own nested data at midpoints, exact frames and final holds',()=>{
 const recording=clip();
 for(const frame of recording.frames){frame.players[0].appearance={colors:['red']};frame.players[0].preparation={phase:.2};frame.trail=[{x:1}];frame.score={points:[0,0]};frame.contact={x:1,time:.12};}
 const before=structuredClone(recording);
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}}
 freeze(recording);
 for(const time of [0,.05,.1,replayTiming(recording).duration]){
  const sample=faultReplaySample(recording,time,true);
  sample.ball.x=99;sample.players[0].appearance.colors[0]='blue';sample.players[0].preparation.phase=9;sample.trail[0].x=8;sample.score.points[0]=7;sample.contact.time=6;
 }
 assert.deepEqual(recording,before);
 assert.equal(faultReplaySample(recording,.05),recording.frames[0]);
});

test('continuous clock follows irregular frames, slow review, clamping and final hold',()=>{
 const recording={frames:[{clock:2},{clock:2.08},{clock:2.3},{clock:3}],review:{time:2.5,kind:'line'}};
 const timing=replayTiming(recording);
 for(const [elapsed,expected] of [[-1,2],[.1,2.1],[timing.lead+.2,2.25+.2*.35],[timing.lead+timing.slow+.1,2.85],[timing.duration,3]])assert.ok(Math.abs(faultReplaySample(recording,elapsed,true).clock-expected)<1e-12);
 assert.equal(faultReplaySample(recording,timing.duration+.01,true),null);
 assert.equal(faultReplaySample({frames:[]},0,true),null);
});

test('players are matched by identity and absent numeric endpoints stay finite',()=>{
 const recording=clip(),[a,b]=recording.frames;
 a.players=[{id:0,x:0,y:0},{id:2,x:10,y:10}];b.players=[{id:2,x:12,y:12},{id:0,x:2,y:2,vx:3}];
 a.ball={x:0};b.ball={x:2,y:3,z:NaN};
 const sample=faultReplaySample(recording,.05,true);
 assert.deepEqual(sample.players,[{id:0,x:1,y:1},{id:2,x:11,y:11}]);assert.deepEqual(sample.ball,{x:1});
});

test('live net and post impacts hold the incoming frame until the impact snapshot',()=>{
 for(const direction of [-1,1])for(const impact of ['net','post']){
  const recording=clip(),[a,b]=recording.frames;
  a.ball={x:impact==='net'?10:C.netPostLeft,y:C.net-direction*.05,z:2,vx:0,vy:direction*20,vz:0};
  b.ball=structuredClone(a.ball);b.clock=C.dt;
  assert.equal(stepBall(b.ball,C.dt),impact);
  const before=structuredClone(recording),sample=faultReplaySample(recording,C.dt/2,true);
  assert.deepEqual(sample.ball,a.ball);assert.equal(sample.clock,C.dt/2);
  assert.deepEqual(faultReplaySample(recording,C.dt,true).ball,b.ball);
  assert.deepEqual(recording,before);
 }
});

test('stable net-contact state and harmless post-height crossings still interpolate',()=>{
 const recording=clip(),[a,b]=recording.frames;
 a.ball={x:10,y:21,z:4,vx:0,vy:10,vz:0,netContact:true};b.ball={...a.ball,y:21.5};
 assert.equal(faultReplaySample(recording,.05,true).ball.y,21.25);
 // Missing and false flags represent the same pre-contact state.
 delete a.ball.netContact;b.ball.netContact=false;
 assert.equal(faultReplaySample(recording,.05,true).ball.y,21.25);
 a.ball={x:C.netPostLeft,y:21.9,z:10,vy:1};b.ball={...a.ball,y:22.1,vy:-1};
 assert.equal(faultReplaySample(recording,.05,true).ball.y,22);
});
