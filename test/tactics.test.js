import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planIncoming,formationTarget,forecastMovement,separatePartners,separateTargets,serveReturnTarget} from '../src/tactics.js';
import {playerProfile,launch,legalVolley,move,C,shotDepthTarget} from '../src/core.js';
import {kitchenEntryContact} from '../src/player-feet.js';
import {selectShot} from '../src/core.js';
import {Game} from '../src/game.js';
function pair(team=0){return [0,1].map((id)=>({...playerProfile(),id,team,x:id?13:5,y:id?30:40,lane:id?15:5,coverLane:id?15:5,vx:0,vy:0,reactionWait:0}))}
function incoming(){const b={x:9,y:12,z:2};launch(b,9,36,'drive');return b}
test('a front partner can poach a middle ball ahead of a deep receiver',()=>{const players=pair(),ball=incoming();const plan=planIncoming({players,team:0,ball,shots:4,bounces:0,clock:0});assert.equal(plan.receiverId,1);assert.equal(plan.poach,true);assert.equal(plan.point.bounces,0);assert.equal(legalVolley(0,plan.point.y,0,4),null)});
test('poaching never replaces the designated serve receiver',()=>{const players=pair(),ball=incoming();for(const shots of [1,2]){const plan=planIncoming({players,team:0,ball,shots,bounces:0,serveReceiver:players[0]});assert.equal(plan.receiverId,0);assert.equal(plan.poach,false)}});
test('players enter the kitchen to take reachable low balls after the bounce',()=>{
 for(const team of [0,1]){
  const players=[0,1].map(id=>({...playerProfile(),id,team,x:id?15:9.18,y:team===0?30:14,lane:id?15:5,coverLane:id?15:5,vx:0,vy:0,reactionWait:0,stamina:1}));
  const ball={x:10,y:team===0?27:17,z:.3,vx:0,vy:team===0?15:-15,vz:6,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius,shot:'dink'};
  const plan=planIncoming({players,team,ball,shots:6,bounces:1,clock:0}),receiver=players.find(player=>player.id===plan.receiverId);
  assert.equal(plan.point.bounces,1,`team ${team} should plan after the bounce`);
  assert.ok(plan.point.z<1.35,`team ${team} should take the low recovery ball`);
  assert.ok(team===0?plan.point.y<29:plan.point.y>15,`team ${team} contact should be inside the kitchen`);
  assert.equal(legalVolley(team,plan.point.y,1,6),null);
  const target=formationTarget(receiver,{ball,incoming:team,receiverId:receiver.id,point:plan.point,shots:6,servingTeam:1-team,lastShot:'dink',lastHitter:2,players});
  const projected=forecastMovement(receiver,target,plan.point.time);
  assert.ok(kitchenEntryContact(projected),`team ${team} should have a foot in the kitchen at contact`);
 }
});
test('net cord kitchen bounces also trigger step-in recovery',()=>{
 for(const team of [0,1]){
  const players=[0,1].map(id=>({...playerProfile(),id,team,x:id?15:9.18,y:team===0?30:14,lane:id?15:5,coverLane:id?15:5,vx:0,vy:0,reactionWait:0,stamina:1}));
  const ball={x:10,y:team===0?21.9:22.1,z:1,vx:0,vy:team===0?15:-15,vz:-4,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius,shot:'drive',netPlay:'cord',netContact:false,netCord:false};
  const plan=planIncoming({players,team,ball,shots:6,bounces:0,clock:0}),receiver=players.find(player=>player.id===plan.receiverId);
  assert.equal(plan.point.bounces,1,`team ${team} should wait for the cord-shot bounce`);
  assert.ok(plan.point.z<1.35,`team ${team} should take the low cord recovery`);
  assert.ok(team===0?plan.point.y<29:plan.point.y>15,`team ${team} cord contact should be inside the kitchen`);
  assert.equal(legalVolley(team,plan.point.y,1,6),null);
  const target=formationTarget(receiver,{ball,incoming:team,receiverId:receiver.id,point:plan.point,shots:6,servingTeam:1-team,lastShot:'drive',lastHitter:2,players});
  assert.ok(kitchenEntryContact(forecastMovement(receiver,target,plan.point.time)),`team ${team} should enter for the cord recovery`);
 }
});
test('off-ball partner shades laterally with the ball without changing service lane',()=>{const p=pair()[1],base={incoming:1,receiverId:3,point:{x:10,y:10},shots:5,servingTeam:1,lastShot:'drop',lastHitter:0};const left=formationTarget(p,{...base,ball:{x:2}}),right=formationTarget(p,{...base,ball:{x:18}});assert.ok(right.x-left.x>3);assert.equal(p.lane,15)});
test('support covers the middle behind a wide receiver and retreats against a lob',()=>{const p=pair()[1],base={ball:{x:1},incoming:0,receiverId:0,point:{x:1,y:40},shots:5,servingTeam:1,lastHitter:2};const cover=formationTarget(p,{...base,lastShot:'drop'});assert.equal(cover.role,'cover-middle');assert.equal(cover.x,13);const lob=formationTarget(p,{...base,lastShot:'lob'});assert.equal(lob.role,'lob-cover');assert.ok(lob.y>cover.y)});
test('support gives room to the hitter when partners converge',()=>{const players=pair();Object.assign(players[0],{x:10,y:30});Object.assign(players[1],{x:10.5,y:30});const before=Math.hypot(players[0].x-players[1].x,players[0].y-players[1].y);separatePartners(players,0,0);assert.equal(players[0].x,10);assert.equal(players[0].y,30);assert.ok(Math.hypot(players[0].x-players[1].x,players[0].y-players[1].y)>before)});
test('partner separation adjusts targets without teleporting players',()=>{
 const players=pair();Object.assign(players[0],{x:10,y:30});Object.assign(players[1],{x:10.5,y:30});
 const before=[players[0].x,players[1].x],targets=players.map(player=>({player,target:{x:player.x,y:player.y}}));
 separateTargets(targets,0,0);
 assert.deepEqual([players[0].x,players[1].x],before);
 assert.notDeepEqual(targets[1].target,{x:10.5,y:30});
});
test('planned receiver remains stable through successive physics ticks',()=>{const g=new Game();g.mode='watch';g.phase='rally';g.last=1;g.shots=4;g.bounces=0;g.ball=incoming();Object.assign(g.players[0],{x:5,y:40,coverLane:5});Object.assign(g.players[1],{x:11,y:30,coverLane:15});g.update(C.dt);const plan=g.teamPlan;assert.equal(plan.poach,true);for(let i=0;i<8;i++)g.update(C.dt);assert.equal(g.teamPlan,plan);assert.equal(g.players[0].coverLane,5);assert.equal(g.players[1].coverLane,15);assert.equal(g.score.rightPlayer[0],1)});

test('poaching contacts remain legal on the opposite court end',()=>{const players=pair(1);players[0].y=4;players[1].y=14;const ball=incoming();ball.y=44-ball.y;ball.vy=-ball.vy;const plan=planIncoming({players,team:1,ball,shots:4,bounces:0});assert.equal(plan.poach,true);assert.equal(plan.receiverId,1);assert.equal(legalVolley(1,plan.point.y,0,4),null)});

test('high balls can auto-select an overhead and wide sideline contacts choose ATP or Erne',()=>{const p=playerProfile();p.x=p.y=10;p.team=0;const high={x:10,y:10,z:5.8};assert.equal(selectShot(p,high,'drive'),'overhead');assert.equal(selectShot(p,{...high,z:5.8},'drive'),'overhead');const sideline={x:.6,y:10,z:1};p.x=.7;assert.equal(selectShot(p,sideline,'drive'),'drive');assert.equal(selectShot(p,{...sideline,x:-1},'drive'),'atp');p.y=29;const highSideline={...sideline,z:3.4};assert.equal(selectShot(p,highSideline,'drive'),'drive');p.x=-1;p.erneAirborne=true;assert.equal(selectShot(p,highSideline,'drive'),'erne')});
test('quick lateral movement creates a short slide',()=>{const p=playerProfile();p.x=10;p.y=30;p.team=0;p.vx=6.2;p.vy=1;for(let i=0;i<4&&p.motion!=='slide';i++)move(p,12,30,C.dt);assert.equal(p.motion,'slide');assert.ok(p.slideTimer>0)});
test('slide does not linger indefinitely',()=>{const p=playerProfile();p.x=p.y=10;p.team=0;p.vx=6.2;p.vy=1;p.slideTimer=.1;for(let i=0;i<30;i++)move(p,14,10,C.dt);assert.ok(p.slideTimer<=0);assert.notEqual(p.motion,'slide')});

test('attack and soft controls choose the right shot from ball height and court position',()=>{
 const p=playerProfile();p.x=10;p.team=0;p.y=40;
 assert.equal(selectShot(p,{x:10,y:35,z:1},'attack'),'drive');
 assert.equal(selectShot(p,{x:10,y:35,z:5.8},'attack'),'overhead');
 assert.equal(selectShot(p,{x:10,y:30,z:1},'soft'),'drop');
 p.y=28;assert.equal(selectShot(p,{x:10,y:30,z:1},'soft'),'dink');
 assert.equal(selectShot(p,{x:.5,y:30,z:3.4},'lob'),'lob')
});
test('a serve return keeps controlled shot-specific depth while using the open court',()=>{
 const p={...playerProfile(),id:0,team:0,x:15,y:-1,lane:15},opponents=[{id:2,team:1,x:4,y:18}];
 const drive=serveReturnTarget(p,opponents,'drive'),drop=serveReturnTarget(p,opponents,'drop');
 assert.equal(drive.intent,'serve-return');assert.ok(drive.y>=4&&drive.y<=17.5);
 assert.equal(drive.x,drop.x);assert.ok(drop.y>drive.y);
 assert.ok(shotDepthTarget(0,'drive',.5)<shotDepthTarget(0,'drop',.5));
});
test('serve return depth mirrors across court ends for every supported return shot',()=>{
 for(const shot of ['drive','drop','slice']){
  const near={...playerProfile(),id:0,team:0,x:15,y:41,lane:15};
  const far={...near,team:1,y:3};
  const a=serveReturnTarget(near,[{id:2,team:1,x:4,y:9}],shot);
  const b=serveReturnTarget(far,[{id:2,team:0,x:4,y:35}],shot);
  assert.equal(a.y+b.y,44,`${shot} return depths should mirror`);
  assert.equal(b.y,shotDepthTarget(1,shot,.5));
 }
});

test('ATP opens up for reachable low side bounces farther behind the net but stays selective',()=>{
 const p={...playerProfile(),team:0,x:.8,y:33.5,vx:0,vy:0};
 const ball={x:-.7,y:31,z:.8,vx:0,vy:0};
 assert.equal(selectShot(p,ball,'drive'),'atp');
 assert.equal(selectShot({...p,x:6},ball,'drive'),'drive');
 assert.equal(selectShot({...p,vx:12},ball,'drive'),'drive');
 assert.equal(selectShot(p,{...ball,z:3.5},'drive'),'drive');
 assert.equal(selectShot(p,{...ball,x:-.2},'drive'),'drive');
});


test('deep lob defense reaches the backcourt and counter-lobs or tweeners',()=>{
 const game=new Game({seed:1});game.mode='watch';game.recordReplay=()=>{};game.phase='rally';game.shots=4;game.last=1;game.bounces=0;
 game.ball={x:10,y:15,z:1.2,vx:0,vy:0,vz:0,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius};
 launch(game.ball,10,43,'lob',{power:1,control:1,spin:1,skill:1},1,{shape:'open-court'});
 Object.assign(game.players[0],{x:5,y:30});Object.assign(game.players[1],{x:15,y:30});
 let response=null,maxReceiverY=30;const hit=game.hit.bind(game);game.hit=(player,shot,...args)=>{if(!response&&game.shots>=4)response={playerId:player.id,shot};return hit(player,shot,...args)};
 for(let tick=0;tick<600&&game.phase==='rally';tick++){game.update(C.dt);const receiver=game.players.find(player=>player.id===game.teamPlan?.receiverId);if(receiver)maxReceiverY=Math.max(maxReceiverY,receiver.y)}
 assert.ok(maxReceiverY>38);assert.ok(response);assert.ok(['lob','tweener'].includes(response.shot));
});