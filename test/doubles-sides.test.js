import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {playerProfile,launch,C} from '../src/core.js';
import {planIncoming,commitDoublesCoverage} from '../src/tactics.js';

const pair=team=>[0,1].map(i=>({...playerProfile(),id:team*2+i,team,x:i?15:5,y:team?14:30,lane:i?15:5,coverLane:i?15:5,vx:0,vy:0,stamina:1}));
test('routine low middle volleys keep their lane owner on both court ends',()=>{
 for(const team of [0,1])for(const x of [8,9.8,10.2,12]){
  const players=pair(team);players[0].x=8;players[1].x=12;
  const ball={x,y:team?14.7:29.3,z:1.6,vx:0,vy:team?-5:5,vz:1,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius,shot:'dink'};
  const plan=planIncoming({players,team,ball,shots:8,bounces:0,clock:10});
  assert.equal(plan.poach,false);assert.equal(plan.receiverId,players[x<10?0:1].id);
  assert.equal(plan.point.bounces,0);
 }
});
test('planned poaches and center reaches do not change coverage',()=>{
 for(const team of [0,1]){
  const players=pair(team),p=players[1],plan={shot:4,receiverId:p.id,poach:true,point:{x:8,y:p.y}};
  for(const x of [15,10.1,9.7,8.6]){p.x=x;assert.equal(commitDoublesCoverage(players,plan,'drive',2),false);assert.deepEqual(players.map(p=>p.coverLane),[5,15]);}
 }
});
test('diagonal volleys belong to the approaching kitchen lane rather than the landing lane',()=>{
 for(const team of [0,1]){
  const players=pair(team);players[0].x=8;players[1].x=12;
  const ball={x:5,y:team?31:13,z:2,vx:5,vy:team?-20:20,vz:17,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius,shot:'drive'};
  const plan=planIncoming({players,team,ball,shots:8,bounces:0,clock:10});
  assert.equal(plan.receiverId,players[0].id);assert.equal(plan.poach,false);assert.equal(plan.point.bounces,0);
 }
});
test('an actual poach crossing switches once without altering service order or position',()=>{
 for(const team of [0,1]){
  const players=pair(team),p=players[1];p.x=8.4;const before=players.map(p=>({x:p.x,y:p.y,lane:p.lane}));
  const plan={shot:6,receiverId:p.id,poach:true};
  assert.equal(commitDoublesCoverage(players,plan,'drive',3),true);
  assert.deepEqual(players.map(p=>p.coverLane),[15,5]);assert.deepEqual(players.map(p=>({x:p.x,y:p.y,lane:p.lane})),before);
  assert.equal(commitDoublesCoverage(players,plan,'drive',3.1),false);
 }
});
test('lob and unreachable-ball recovery permit real side changes; ordinary shots and serves do not',()=>{
 for(const team of [0,1])for(const reason of ['lob','rescue','ordinary','serve']){
  const players=pair(team);players[0].x=12;
  const changed=commitDoublesCoverage(players,{shot:reason==='serve'?1:6,receiverId:players[0].id,rescue:reason==='rescue'},reason==='lob'?'lob':'dink',5);
  assert.equal(changed,reason==='lob'||reason==='rescue');
 }
});
test('a recent side change discourages an immediate poach back, and new points restore service sides',()=>{
 const players=pair(0);Object.assign(players[0],{y:40});Object.assign(players[1],{x:12,coverChangedAt:4});
 const ball={x:9,y:12,z:2};launch(ball,9,36,'drive');
 assert.equal(planIncoming({players,team:0,ball,shots:4,bounces:0,clock:5}).poach,false);
 const g=new Game({seed:2});g.players[0].coverLane=15;g.players[0].coverChangedAt=g.clock;g.serveSetup();
 for(const p of g.players){assert.equal(p.coverLane,p.lane);assert.equal(p.coverChangedAt,-Infinity)}
 assert.deepEqual(g.score.rightPlayer,[1,0]);
});
