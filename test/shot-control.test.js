import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {C,shotDepthTarget,stepBall,contactQuality,chooseCpuShot,playerProfile} from '../src/core.js';
import {padControl} from '../src/court-camera.js';
import {volleyMomentumFault} from '../src/player-feet.js';
import {safeVolleyRecovery,volleyBrakeTarget} from '../src/tactics.js';

const athlete=(extra={})=>({...playerProfile(),id:0,team:0,x:10,y:30,vx:0,vy:0,stamina:1,...extra});

test('depth is bounded, has fine keyboard steps, and resets for a new match',()=>{
 const g=new Game();assert.equal(g.depth,.5);g.nudgeDepth(1);assert.equal(g.depth,.6);g.nudgeDepth(-1,true);assert.equal(g.depth,.575);
 assert.equal(g.setDepth(5),1);assert.equal(g.setDepth(-5),0);assert.equal(g.setDepth(NaN),0);assert.equal(g.setDepth(Infinity),0);g.reset();assert.equal(g.depth,.5);
});

test('shot-specific depth ranges are monotonic, safe and mirrored',()=>{
 for(const shot of ['drive','slice','drop','dink','lob','tweener','overhead']){
  assert.ok(shotDepthTarget(0,shot,0)>shotDepthTarget(0,shot,.5));assert.ok(shotDepthTarget(0,shot,.5)>shotDepthTarget(0,shot,1));
  for(const depth of [0,.5,1]){const y=shotDepthTarget(0,shot,depth);assert.ok(y>0&&y<22);assert.equal(shotDepthTarget(1,shot,depth),44-y)}
 }
 assert.equal(shotDepthTarget(0,'drive'),4);assert.equal(shotDepthTarget(0,'drop'),12);assert.equal(shotDepthTarget(0,'dink'),14);
});

test('touch pad maps both axes and clamps drags outside its bounds',()=>{
 const rect={left:100,top:50,width:200,height:100};
 assert.deepEqual(padControl(200,100,rect),{aim:10,depth:.5});
 assert.deepEqual(padControl(0,0,rect),{aim:1,depth:1});assert.deepEqual(padControl(500,500,rect),{aim:19,depth:0});
});

function shot(depth,kind='drive'){
 const g=new Game({seed:9});g.phase='rally';g.shots=4;g.bounces=1;g.setDepth(depth);
 Object.assign(g.players[0],{x:10,y:35,vx:0,vy:0});g.ball={x:10.8,y:34.54,z:kind==='overhead'?6:2,vx:0,vy:0,vz:0};
 g.hit(g.players[0],kind,10,1);return g;
}

test('human depth input changes actual landing depth for attacks, soft shots and lobs',()=>{
 for(const kind of ['drive','drop','dink','slice','lob','overhead']){
  const land=depth=>{const b=shot(depth,kind).ball;for(let tick=0;tick<1200;tick++)if(stepBall(b,C.dt)==='bounce')return b.y;assert.fail(`${kind} did not bounce`)};
  assert.ok(land(1)<land(0),`${kind} deep input should land farther upcourt`);
 }
});

test('depth input does not change serves or override CPU placement',()=>{
 const a=new Game({seed:11}),b=new Game({seed:11});
 for(const [g,depth] of [[a,0],[b,1]]){g.score.serverPlayer=0;g.serveSetup();g.setDepth(depth);g.serve();g.releaseServe()}
 assert.deepEqual(a.ball,b.ball);
 const x=shot(0),y=shot(1);for(const g of [x,y]){g.bounces=1;g.ball={x:10,y:35,z:2,vx:0,vy:0,vz:0};g.hit(g.players[0],'drive',10,1,{y:14,intent:'feet'})}assert.deepEqual(x.ball,y.ball);
});

test('replays capture the chosen depth',()=>{const g=shot(.8);g.recordReplay(true);assert.equal(g.replayFrames.at(-1).depth,.8)});

test('mishit feedback identifies measured contact pressure without extra random draws',()=>{
 const p=athlete(),ball={x:10.82,y:29.54,z:1.4,vx:0,vy:0};
 assert.equal(contactQuality({...p,stamina:0},ball,'drive',false,0).reason,'FATIGUED');
 assert.equal(contactQuality({...p,vx:12},ball,'drive',false,0).reason,'ON THE MOVE');
 assert.equal(contactQuality(p,{...ball,z:.1},'drive',false,0).reason,'LOW CONTACT');
 assert.equal(contactQuality(p,{...ball,x:12},'drive',false,0).reason,'REACHING');
 assert.equal(contactQuality(p,{...ball,vy:50},'drive',false,0).reason,'UNDER PACE');
});

test('human feedback persists separately from subsequent CPU shot messages',()=>{
 const g=shot(.5);g.last=1;g.bounces=1;g.ball={x:g.players[0].x+.82,y:g.players[0].y-.46,z:1.4,vx:0,vy:0,vz:0};g.random=()=>0;
 assert.equal(g.tryHumanHit(),true);assert.match(g.humanFeedback,/MISHIT/);const feedback=g.humanFeedback;
 g.message='DINK';assert.equal(g.humanFeedback,feedback);assert.equal(g.feedbackTime,.9);g.serveSetup();assert.equal(g.humanFeedback,'');
});

test('CPU tendencies alter attack frequency while respecting return and pressure constraints',()=>{
 const frequency=tendency=>Array.from({length:1000},(_,i)=>chooseCpuShot({shots:5,team:0,y:31,height:1.8,tendency,random:i/1000})).filter(s=>s==='drive').length;
 assert.ok(frequency('banger')>frequency('balanced'));assert.ok(frequency('balanced')>frequency('soft'));assert.ok(frequency('net')>frequency('speed'));
 for(const tendency of ['balanced','banger','soft','net','speed']){
  assert.equal(chooseCpuShot({shots:1,team:0,y:40,height:.8,tendency,difficulty:1,random:0}),'drive');
  assert.equal(chooseCpuShot({shots:5,team:0,y:31,height:1,tendency,difficulty:1,random:0}),'dink');
  assert.equal(chooseCpuShot({shots:5,team:0,y:31,height:1,tendency,difficulty:.9,incomingShot:'lob',random:0}),'drive');
 }
});

test('volley recovery forecast rejects a dangerous rush and leaves live players untouched',()=>{
 for(const team of [0,1]){
  const p=athlete({team,y:team===0?29.6:14.4,vy:team===0?-9:9}),before=structuredClone(p);
  assert.equal(safeVolleyRecovery(p,.6),false);assert.deepEqual(p,before);
  assert.equal(safeVolleyRecovery({...p,y:team===0?31:13,vy:0},.6),true);
  const target=volleyBrakeTarget(p,{x:12,y:team===0?29:15});assert.ok(team===0?target.y>30:target.y<14);
 }
});

test('kitchen contact remains a fault before momentum can clear',()=>{
 for(const team of [0,1]){
  const p=athlete({team,y:team===0?29.2:14.8,volleyMomentum:true});assert.equal(volleyMomentumFault(p),true);assert.equal(p.volleyMomentum,true);
 }
});

test('controlled lateral recovery clears old momentum, while follow-through and flight retain it',()=>{
 const p=athlete({volleyMomentum:true,vx:8,vy:0,swing:0});assert.equal(volleyMomentumFault(p),false);assert.equal(p.volleyMomentum,false);
 const follow=athlete({volleyMomentum:true,vx:8,vy:0,swing:.3,swingDuration:.4});volleyMomentumFault(follow);assert.equal(follow.volleyMomentum,true);
 const airborne=athlete({volleyMomentum:true,airborneTimer:.2});volleyMomentumFault(airborne);assert.equal(airborne.volleyMomentum,true);
 const forward=athlete({volleyMomentum:true,vy:-3});volleyMomentumFault(forward);assert.equal(forward.volleyMomentum,true);
});
