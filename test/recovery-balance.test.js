import {test} from 'node:test';
import assert from 'node:assert/strict';
import {C,move,playerProfile,paddleContactTarget,bodyContactDifficulty,paddleContactAvailable} from '../src/core.js';
import {applyPhysique,buildProfile} from '../src/roster.js';
import {singlesRecoveryTarget,formationTarget} from '../src/tactics.js';
import {Game} from '../src/game.js';

const athlete=(extra={})=>({...playerProfile(),id:0,team:0,x:10,y:37,vx:10,vy:0,stamina:1,...extra});
const context={ball:{x:15},shots:4,servingTeam:1,lastShot:'drive',lastHitter:0,opponentContactIn:.15};
test('singles recovery brakes ahead of the next contact from either end',()=>{
 for(const team of [0,1]){
  const p=athlete({team,y:team===0?37:7}),before=structuredClone(p),target=singlesRecoveryTarget(p,context);
  assert.equal(target.role,'singles-set');assert.equal(target.brake,true);assert.deepEqual(p,before);
  const moving={...p};move(moving,target.x,target.y,C.dt,target.brake);
  assert.ok(moving.vx>0&&moving.vx<p.vx);assert.ok(moving.x>p.x);assert.ok(moving.x-p.x<=p.vx*C.dt);
 }
});
test('settling uses current braking ability and fatigue rather than body labels',()=>{
 const p=athlete(),eta={...context,opponentContactIn:.30};
 assert.notEqual(singlesRecoveryTarget(p,eta).role,'singles-set');
 assert.equal(singlesRecoveryTarget({...p,abilities:{...p.abilities,acceleration:20}},eta).role,'singles-set');
 assert.equal(singlesRecoveryTarget({...p,stamina:0},{...context,opponentContactIn:.29}).role,'singles-set');
});
test('recovery does not halt early, on an unknown estimate, or after the expected contact',()=>{
 for(const opponentContactIn of [Infinity,2,-.2])assert.notEqual(singlesRecoveryTarget(athlete(),{...context,opponentContactIn}).role,'singles-set');
 assert.notEqual(singlesRecoveryTarget(athlete({abilities:{...playerProfile().abilities,courtIQ:.7}}),context).role,'singles-set');
 assert.equal(singlesRecoveryTarget(athlete(),{...context,shots:2,servingTeam:0}).role,'hold');
});
test('incoming interception and doubles formation retain priority over singles settling',()=>{
 const p=athlete(),point={x:4,y:35},base={...context,point,receiverId:0,incoming:0};
 assert.deepEqual(formationTarget(p,{...base,singles:true}),{x:4,y:35,role:'receive'});
 assert.notEqual(formationTarget(p,{...base,incoming:1,receiverId:2,singles:false}).role,'singles-set');
});
test('braking cannot instantly cancel momentum and slower bodies still take longer to stop',()=>{
 const fast=athlete(),slow=athlete({abilities:{...playerProfile().abilities,acceleration:25}});
 const starts=[fast,slow].map(p=>p.x);
 for(let i=0;i<12;i++)for(const p of [fast,slow])move(p,20,37,C.dt,true);
 assert.ok(slow.vx>fast.vx);assert.ok(slow.x-starts[1]>fast.x-starts[0]);
 for(let i=0;i<120;i++)move(slow,20,37,C.dt,true);assert.equal(slow.vx,0);assert.ok(slow.x<20);
});
test('stature preserves reach, power and low-ball tradeoffs without taxing every movement skill',()=>{
 const base=buildProfile({character:'avery'}),short=applyPhysique(base,{height:145,build:.5225}),tall=applyPhysique(base,{height:210,build:.5225}),broad=applyPhysique(base,{height:210,build:1.05});
 assert.equal(tall.abilities.speed,short.abilities.speed);assert.equal(tall.abilities.endurance,short.abilities.endurance);assert.equal(tall.abilities.volley,short.abilities.volley);
 assert.ok(tall.abilities.acceleration<short.abilities.acceleration);assert.ok(tall.abilities.reach>short.abilities.reach);assert.ok(tall.abilities.power>short.abilities.power);
 assert.ok(broad.abilities.power>tall.abilities.power);assert.equal(broad.abilities.speed,tall.abilities.speed);assert.ok(broad.abilities.acceleration<tall.abilities.acceleration);
 assert.ok(bodyContactDifficulty(tall,{z:.4},'drive')>bodyContactDifficulty(short,{z:.4},'drive'));
});
test('a net-height singles attack uses court height for short and tall CPU players',()=>{
 for(const height of [145,177,210]){
  const g=new Game({seed:3});g.configure({format:'singles'});g.setPhysique({height,build:.5225});g.mode='watch';g.phase='rally';g.shots=4;g.last=1;g.bounces=1;g.random=()=>.99;
  const p=g.players[0];Object.assign(p,{x:10,y:31.5,vx:0,vy:0,swing:0,stamina:1});
  const center=paddleContactTarget(p,{x:11,z:3.4},'drive');g.ball={...center,z:3.4,vx:0,vy:0,vz:0,spin:0};
  assert.ok(paddleContactAvailable(p,g.ball,'drive'));
  g.teamPlan={shot:4,receiverId:0,point:{x:p.x,y:p.y,z:3.4,time:.1,bounces:1},created:0,expires:10};
  let chosen=null;const hit=g.hit.bind(g);g.hit=(player,shot,...args)=>{chosen=shot;return hit(player,shot,...args)};
  g.update(C.dt);assert.equal(chosen,'drive',`height ${height}`);
 }
});
test('singles readiness decisions are counted once per player and shot and reset for a new match',()=>{
 const g=new Game({seed:37});g.configure({format:'singles'});g.mode='watch';g.recordReplay=()=>{};
 for(let tick=0;tick<120*30;tick++)g.update(C.dt);
 const decisions=g.matchReport().journal.events.filter(e=>e.type==='recovery-set');
 assert.ok(g.tacticalStats.recoverySets>0);assert.equal(decisions.length,g.tacticalStats.recoverySets);
 assert.ok(decisions.every(e=>Number.isFinite(e.speed)&&e.speed>=0));
 g.reset();assert.equal(g.tacticalStats.recoverySets,0);
});
