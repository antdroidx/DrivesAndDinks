import {test} from 'node:test';
import assert from 'node:assert/strict';
import {C,move,playerProfile} from '../src/core.js';
import {volleyMomentumFault} from '../src/player-feet.js';
import {volleyBrakeTarget,safeVolleyRecovery,separateTargets,forecastMovement} from '../src/tactics.js';

test('post-volley formation changes cannot restart a forward run before control is regained',()=>{
 for(const team of [0,1]){
  const p={...playerProfile(),team,x:9,y:team===0?29.9:14.1,vx:12,vy:team===0?-1:1,stamina:.7,swing:.95,swingDuration:.95,volleyMomentum:true};
  let previousSpeed=Math.hypot(p.vx,p.vy),ticks=0;
  while(p.volleyMomentum&&ticks++<120){
   p.swing=Math.max(0,p.swing-C.dt);
   const target=volleyBrakeTarget(p,{x:team===0?15:5,y:team===0?29:15});
   move(p,target.x,target.y,C.dt,target.brake);
   assert.ok(Math.hypot(p.vx,p.vy)<=previousSpeed+1e-10);previousSpeed=Math.hypot(p.vx,p.vy);
   assert.equal(volleyMomentumFault(p),false);
  }
  assert.ok(ticks<120);assert.equal(p.volleyMomentum,false);
  assert.equal(volleyBrakeTarget(p,{x:5,y:30}).brake,undefined);
 }
});

test('volley safety prediction agrees with live braking across fatigue and previous stroke durations',()=>{
 for(const team of [0,1])for(const stamina of [0,.5,1])for(const oldDuration of [.3,1.4])for(const speed of [2,8,14]){
  const p={...playerProfile(),team,x:10,y:team===0?30:14,vx:4,vy:team===0?-speed:speed,stamina,swingDuration:oldDuration};
  const before=structuredClone(p),duration=.9,predicted=safeVolleyRecovery(p,duration);
  const live={...p,stamina:Math.max(0,stamina-.075),swing:duration,swingDuration:duration,volleyMomentum:true};let safe=false;
  for(let tick=0;tick<120;tick++){
   live.swing=Math.max(0,live.swing-C.dt);
   const target=volleyBrakeTarget(live,{x:live.x,y:team===0?30:14});move(live,target.x,target.y,C.dt,target.brake);
   if(volleyMomentumFault(live))break;
   if(!live.volleyMomentum){safe=true;break}
  }
  assert.equal(predicted,safe);assert.deepEqual(p,before);
 }
});

test('a deep volley can recover laterally while its follow-through finishes',()=>{
 for(const team of [0,1]){
  const p={...playerProfile(),team,x:10,y:team===0?38:6,vx:3,vy:0,stamina:1,volleyMomentum:true,swing:.7,swingDuration:.9};
  const target=volleyBrakeTarget(p,{x:15,y:p.y});assert.equal(target.brake,undefined);assert.equal(target.x,15);
  move(p,target.x,target.y,C.dt,target.brake);assert.ok(p.vx>3);assert.equal(volleyMomentumFault(p),false);assert.equal(p.volleyMomentum,true);
 }
});

test('either outgoing hitter retains their recovery corridor while the partner gives way',()=>{
 for(const team of [0,1])for(const hitter of [0,1]){
  const players=[0,1].map(i=>({id:team*2+i,team,x:10+i*.5,y:team===0?30:14,lane:i?15:5}));
  const entries=players.map(player=>({player,target:{x:10,y:team===0?30:14}}));
  const original=structuredClone(entries[hitter].target);separateTargets(entries,team,players[hitter].id);
  assert.deepEqual(entries[hitter].target,original);assert.equal(entries[1-hitter].target.role,'cover-open-court');
  assert.ok(team===0?entries[1-hitter].target.y>original.y:entries[1-hitter].target.y<original.y);
 }
});

test('interception forecasts use the same changing stopping envelope as live volley approaches',()=>{
 for(const team of [0,1])for(const momentum of [false,true]){
  const p={...playerProfile(),team,x:9,y:team===0?32:12,vx:5,vy:team===0?-10:10,stamina:.4,volleyMomentum:momentum,swing:.6,swingDuration:.9,reactionWait:.05,airborneTimer:.08};
  const target={x:14,y:team===0?29:15},live={...p};
  for(let tick=0;tick<36;tick++){
   for(const key of ['reactionWait','recoveryTimer','splitStepTimer','swing','airborneTimer'])live[key]=Math.max(0,(live[key]||0)-C.dt);
   const destination=volleyBrakeTarget(live,target);
   move(live,live.reactionWait>0?live.x:destination.x,live.reactionWait>0?live.y:destination.y,C.dt,live.reactionWait>0?false:destination.brake);
   volleyMomentumFault(live);
  }
  const projected=forecastMovement(p,target,36*C.dt,{volley:true});
  for(const key of ['x','y','vx','vy','stamina'])assert.ok(Math.abs(projected[key]-live[key])<1e-9,key);
  assert.equal(projected.volleyMomentum,live.volleyMomentum);
 }
});
