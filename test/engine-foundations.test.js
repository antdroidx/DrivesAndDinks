import {test} from 'node:test';
import assert from 'node:assert/strict';
import {C,move,playerProfile} from '../src/core.js';
import {forecastMovement,chooseCpuPlacement,formationTarget} from '../src/tactics.js';
import {Game} from '../src/game.js';

const athlete=(extra={})=>({...playerProfile(),id:0,team:0,x:10,y:35,vx:0,vy:0,stamina:1,...extra});

test('interception movement matches the live integrator without mutating an athlete',()=>{
 const p=athlete({vx:-8,reactionWait:.08,recoveryTimer:.15,swing:.24,stamina:.35}),before=structuredClone(p),target={x:16,y:31};
 const forecast=forecastMovement(p,target,.5),live=structuredClone(p);
 for(let i=0;i<60;i++){
  for(const key of ['reactionWait','recoveryTimer','splitStepTimer','swing'])live[key]=Math.max(0,(live[key]||0)-C.dt);
  move(live,live.reactionWait>0?live.x:target.x,live.reactionWait>0?live.y:target.y,C.dt);
 }
 for(const key of ['x','y','vx','vy','stamina'])assert.ok(Math.abs(forecast[key]-live[key])<1e-10,key);
 assert.deepEqual(p,before);
});

test('interception respects wrong-way momentum, reaction, fatigue and acceleration',()=>{
 const target={x:20,y:35},p=athlete();
 assert.ok(forecastMovement({...p,vx:8},target,.3).x>forecastMovement({...p,vx:-8},target,.3).x);
 assert.ok(forecastMovement(p,target,.3).x>forecastMovement({...p,reactionWait:.25},target,.3).x);
 assert.ok(forecastMovement(p,target,.7).x>forecastMovement({...p,stamina:0},target,.7).x);
 assert.ok(forecastMovement(p,target,.3).x>forecastMovement({...p,abilities:{...p.abilities,acceleration:10}},target,.3).x);
});

test('CPU placement attacks the open side and wrong-way recovery in singles',()=>{
 const p=athlete(),opponent={x:5,y:14,vx:0,vy:0};
 assert.ok(chooseCpuPlacement(p,[opponent],'drive').x>10);
 assert.ok(chooseCpuPlacement(p,[{...opponent,x:15}],'drive').x<10);
 assert.ok(chooseCpuPlacement(p,[{...opponent,x:10,vx:8}],'drive').x<10);
 assert.ok(chooseCpuPlacement(p,[{...opponent,x:10,vx:-8}],'drive').x>10);
});

test('CPU depth stays in the opposing court and mirrors at either end',()=>{
 const p=athlete(),opponents=[{x:5,y:14,vx:0,vy:0},{x:15,y:14,vx:0,vy:0}];
 for(const shot of ['drive','drop','dink','slice','overhead','lob','tweener','atp','erne']){
  const near=chooseCpuPlacement(p,opponents,shot),far=chooseCpuPlacement({...p,team:1,y:44-p.y},opponents.map(o=>({...o,y:44-o.y})),shot);
  assert.ok(near.x>=3&&near.x<=17);assert.ok(near.y>=4&&near.y<=17);
  assert.equal(far.x,near.x);assert.equal(far.y,44-near.y);
 }
});

test('a crowded transition defense can be attacked low at the feet',()=>{
 const target=chooseCpuPlacement(athlete({x:7,y:32}),[{x:7,y:20,vx:0},{x:10,y:20,vx:0}],'drive');
 assert.equal(target.intent,'feet');assert.equal(target.x,10);assert.equal(target.y,17);
});

test('doubles support advances alongside a deep partner after a drop',()=>{
 for(const team of [0,1]){
  const p=athlete({team,y:team===0?34:10}),mate=athlete({id:1,team,y:team===0?40:4});
  const target=formationTarget(p,{ball:{x:10},incoming:1-team,receiverId:2,point:{x:10,y:10},shots:3,servingTeam:team,lastShot:'drop',lastHitter:1,players:[p,mate]});
  assert.equal(target.role,'approach-together');assert.equal(target.y,team===0?37:7);
 }
});

test('singles baseline drive recovery retains depth rather than rushing the net',()=>{
 const target=formationTarget(athlete({y:40}),{ball:{x:15},incoming:1,receiverId:2,point:{x:15,y:4},shots:4,servingTeam:0,lastShot:'drive',lastHitter:0,singles:true});
 assert.equal(target.y,39);assert.ok(target.x>10&&target.x<15);
});

test('visual randomness and surface dust do not alter seeded rallies',()=>{
 for(const format of ['singles','doubles']){
  const a=new Game({seed:73}),b=new Game({seed:73});
  for(const g of [a,b]){g.configure({format});g.mode='watch';g.recordReplay=()=>{}}
  a.surfaceKind='outdoor';b.surfaceKind='indoor';
  for(let i=0;i<12000;i++){a.visualRandom();a.visualRandom();a.update(C.dt);b.update(C.dt)}
  assert.deepEqual(a.stats,b.stats);assert.ok(a.stats.rallies>0);
  assert.deepEqual(a.ball,b.ball);assert.deepEqual(a.score,b.score);
  assert.deepEqual(a.players.map(p=>[p.x,p.y,p.vx,p.vy,p.stamina]),b.players.map(p=>[p.x,p.y,p.vx,p.vy,p.stamina]));
  assert.equal(a.random.state(),b.random.state());
 }
});

test('CPU depth selection reaches the launch and manual shots keep their default depth',()=>{
 const a=new Game({seed:10}),b=new Game({seed:10});
 for(const g of [a,b]){g.phase='rally';g.shots=4;g.bounces=1;g.ball={x:10,y:32,z:2,vx:0,vy:0,vz:0};Object.assign(g.players[0],{x:10,y:33})}
 a.hit(a.players[0],'drive',10,1,{y:14,intent:'feet'});b.hit(b.players[0],'drive',10,1);
 assert.equal(a.players[0].placementIntent,'feet');assert.equal(b.players[0].placementIntent,'manual');
 assert.ok(a.ball.vy>b.ball.vy,'shorter CPU target changes the outgoing trajectory');
});
