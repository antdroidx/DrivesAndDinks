import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpuServePlan,serveReturnTarget,formationTarget,separateTargets} from '../src/tactics.js';
import {C,playerProfile,stepBall} from '../src/core.js';
import {Game} from '../src/game.js';
import {faultReplaySample} from '../src/fault-replay.js';

const athlete=(team=0,extra={})=>({...playerProfile(),id:team*2,team,x:5,y:team?5:39,vx:0,vy:0,stamina:1,lane:5,...extra});

test('CPU serve plans vary pace and placement with mirrored legal margins and ability',()=>{
 const plans=[];
 for(const team of [0,1])for(const x of [5,15])for(const skill of [.6,1,1.4])for(const random of [.05,.5,.9]){
  const p=athlete(team,{x});p.abilities.serve=skill;
  const plan=cpuServePlan(p,{x:20-x},random);plans.push(plan);
  assert.ok(x<10?plan.aim>10&&plan.aim<20:plan.aim>0&&plan.aim<10);
  const depth=team?44-plan.y:plan.y;assert.ok(depth>=4.5&&depth<=9);
  assert.ok(Math.abs(cpuServePlan({...p,team:1-team},{x:20-x},random).y+plan.y-44)<1e-10);
 }
 assert.deepEqual(new Set(plans.map(p=>p.type)),new Set(['hard','soft']));assert.ok(plans.every(p=>['body','wide','crosscourt','depth'].includes(p.style)&&p.intent==='serve-'+p.style&&Number.isFinite(p.curve)));assert.equal(cpuServePlan(athlete(),{x:15},.42).style,'wide');assert.equal(cpuServePlan(athlete(1),{x:5},.42).curve,-cpuServePlan(athlete(),{x:15},.42).curve);
 const p=athlete();p.abilities.serve=1.4;const strong=cpuServePlan(p,{x:15},.5);p.abilities.serve=.6;
 assert.ok(strong.y<cpuServePlan(p,{x:15},.5).y);
});

test('automatic serve targets reach the live diagonal service court on both ends',()=>{
 for(const team of [0,1])for(const random of [.05,.5,.9]){
  const g=new Game({seed:12});g.mode='watch';g.score.team=team;g.serveSetup();g.random=()=>random;
  assert.equal(g.serve(true),true);const plannedY=g.serveToss.targetY;g.releaseServe();
  assert.ok(Math.abs(g.ball.vy)>0);
  let bounced=false;
  for(let i=0;i<900;i++)if(stepBall(g.ball,C.dt)==='bounce'){bounced=true;break}
  assert.ok(bounced);assert.ok(g.serveX<10?g.ball.x>10&&g.ball.x<20:g.ball.x>0&&g.ball.x<10);
  assert.ok(team===0?g.ball.y>0&&g.ball.y<15:g.ball.y>29&&g.ball.y<44);
  assert.ok(Math.abs(g.ball.y-plannedY)<3);
 }
});

test('pressure buys return margin and high control permits deeper returns on both ends',()=>{
 for(const team of [0,1]){
  const p=athlete(team),opponents=[athlete(1-team,{x:4})];
  const safe=serveReturnTarget(p,opponents,'drive',{difficulty:.9});
  const clean=serveReturnTarget(p,opponents,'drive',{difficulty:0});
  const distance=t=>team?44-t.y:t.y;
  assert.ok(distance(safe)>distance(clean));assert.ok(safe.x>=3&&safe.x<=17);
  const strong={...p,abilities:{...p.abilities,control:1.4,courtIQ:1.3}};
  assert.ok(distance(serveReturnTarget(strong,opponents,'drive'))<=distance(clean));
 }
});

test('weak third and fifth shots hold teammates together while clean drops permit approach',()=>{
 for(const team of [0,1])for(const shots of [3,5,7]){
  const p=athlete(team,{y:team?9:35}),partner=athlete(team,{id:p.id+1,x:15,y:team?4:40,lastShotQuality:.6});
  const context={ball:{x:10},incoming:1-team,receiverId:4,point:{x:10,y:10},shots,servingTeam:team,lastShot:'drop',lastHitter:partner.id,players:[p,partner]};
  const held=formationTarget(p,context);assert.equal(held.role,'transition-hold');assert.equal(held.y,partner.y);
  partner.lastShotQuality=1;
  const approach=formationTarget(p,context);assert.equal(approach.role,'approach-together');
  assert.ok(team===0?approach.y<held.y:approach.y>held.y);
 }
});

function incomingGame(team,shots){
 const g=new Game({seed:18});g.mode='watch';g.phase='rally';g.score.team=shots===1?1-team:team;g.shots=shots;g.bounces=1;g.last=1-team;g.lastShot=shots===1?'serve-hard':'drive';g.random=()=>.5;
 const p=g.players.find(p=>p.team===team),partner=g.players.find(other=>other.team===team&&other!==p);
 Object.assign(p,{x:10,y:team?6:38,vx:0,vy:0,stamina:1,reactionWait:0});
 Object.assign(partner,{x:17,y:p.y,stamina:.1});
 for(const opponent of g.players.filter(other=>other.team!==team))Object.assign(opponent,{y:team?30:14});
 g.serveReceiver=p;
 g.ball={x:10.82,y:p.y+(team?.46:-.46),z:1.4,vx:0,vy:0,vz:0,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius};
 g.teamPlan={shot:shots,receiverId:p.id,point:{x:p.x,y:p.y,z:1.4,bounces:1,time:.1},created:g.clock,expires:g.clock+1};
 return {g,p};
}

test('live CPU returns use mirrored safe depth and launch into the opposing court',()=>{
 for(const team of [0,1]){
  const {g,p}=incomingGame(team,1);g.update(C.dt);
  assert.equal(g.shots,2);assert.equal(p.placementIntent,'serve-return');
  assert.equal(p.animationShot,'drive');assert.ok(team?g.ball.vy>0:g.ball.vy<0);
  const depth=team?44-p.lastShotPlacement.y:p.lastShotPlacement.y;
  assert.ok(depth>=4&&depth<9);
  let bounced=false;for(let tick=0;tick<900;tick++)if(stepBall(g.ball,C.dt)==='bounce'){bounced=true;break}
  assert.ok(bounced);assert.ok(team?g.ball.y>29&&g.ball.y<44:g.ball.y>0&&g.ball.y<15);
 }
});

test('live fifth and later transition contacts reset while a partner is unready',()=>{
 for(const team of [0,1])for(const shots of [4,6,8]){
  const {g,p}=incomingGame(team,shots);g.update(C.dt);
  assert.equal(g.shots,shots+1);assert.equal(p.animationShot,'drop');
  assert.ok(team?g.ball.vy>0:g.ball.vy<0);
 }
});

test('live contacts retain exact incoming and outgoing replay frames at the impact clock',()=>{
 const {g}=incomingGame(0,1);g.update(C.dt);
 const incoming=g.replayFrames.find(frame=>frame.clock===g.clock&&frame.shots===1);
 const outgoing=g.replayFrames.find(frame=>frame.clock===g.clock&&frame.shots===2);
 assert.ok(incoming);assert.ok(outgoing);assert.equal(incoming.bounces,1);assert.equal(outgoing.bounces,0);
 const clip={frames:g.replayFrames},before=structuredClone(clip);
 assert.equal(faultReplaySample(clip,C.dt/2,true).shots,1);
 const impact=faultReplaySample(clip,C.dt,true);assert.equal(impact.shots,2);assert.equal(impact.contact.playerId,0);
 assert.equal(impact.players[0].swing,outgoing.players[0].swing);assert.deepEqual(clip,before);
});

test('outgoing doubles prepare for opponent contact and leave the active target reserved',()=>{
 for(const team of [0,1]){
  const p=athlete(team,{vx:8}),partner=athlete(team,{id:p.id+1,x:15});
  const target=formationTarget(p,{ball:{x:10},incoming:1-team,receiverId:4,point:{x:10,y:10},shots:6,servingTeam:team,lastShot:'drive',lastHitter:p.id,players:[p,partner],opponentContactIn:.03});
  assert.equal(target.brake,true);assert.equal(target.role,'doubles-set');
  const entries=[{player:p,target},{player:partner,target:{x:p.x,y:p.y}}],before=structuredClone(target);
  separateTargets(entries,team,p.id);assert.deepEqual(entries[0].target,before);
 }
});
