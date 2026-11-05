import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {C,launch,stepBall,chooseCpuShot,playerProfile} from '../src/core.js';

function flight(shot,options={},quality=1){
 const ball={x:10,y:30,z:1.6,vx:0,vy:0,vz:0,radius:C.ballRadius};
 launch(ball,10,14,'dink',{power:1,control:1,spin:1,skill:1},quality,options);
 let apex=ball.z,event=null;
 for(let tick=0;tick<720&&!event;tick++){event=stepBall(ball,C.dt);apex=Math.max(apex,ball.z)}
 return {apex,event,landing:ball.y};
}

test('bad dink contact creates a visibly higher floating ball',()=>{
 const clean=flight('dink',{},1),floated=flight('dink',{loftBonus:2.1},.55);
 assert.equal(clean.event,'bounce');assert.equal(floated.event,'bounce');
 assert.ok(floated.apex>clean.apex+.75);
 assert.notEqual(floated.landing,clean.landing);
});

test('live dink contact quality changes the rendered trajectory height',()=>{
 const make=quality=>{
  const game=new Game({seed:19});game.phase='rally';game.shots=4;game.bounces=1;game.random=()=>.5;
  const player=game.players[0];Object.assign(player,{x:10,y:30,vx:0,vy:0,stamina:1});
  Object.assign(game.ball,{x:10.7,y:29.5,z:1.2,vx:0,vy:5,vz:0,shot:'dink'});
  game.hit(player,'dink',10,quality);
  let apex=game.ball.z;for(let tick=0;tick<720;tick++){if(stepBall(game.ball,C.dt)==='bounce')break;apex=Math.max(apex,game.ball.z)}
  return {apex,shape:game.ball.shotShape};
 };
 const clean=make(.98),poor=make(.58);
 assert.ok(poor.apex>clean.apex+.5);
 assert.equal(poor.shape,'dink-float');
});

test('CPU speeds up high dinks only with a safe attacking opportunity',()=>{
 const base={incomingShot:'dink',shots:6,team:0,y:31,height:3.2,opponentsAtKitchen:true,partnerReady:true,balanced:true,opponentsDeep:false,difficulty:.3,random:0};
 assert.equal(chooseCpuShot(base),'drive');
 assert.notEqual(chooseCpuShot({...base,difficulty:.95,height:2.8}),'drive');
 assert.equal(chooseCpuShot({...base,partnerReady:false}),'dink');
 assert.equal(chooseCpuShot({...base,balanced:false}),'dink');
});

test('a live high-dink drive records the speed-up pattern without a special control state',()=>{
 const game=new Game({seed:23});game.phase='rally';game.shots=6;game.bounces=1;game.last=1;game.mode='watch';
 const player=game.players[0];Object.assign(player,{x:10,y:31,vx:0,vy:0,stamina:1});
 Object.assign(game.ball,{x:10.6,y:30.5,z:3.1,vx:0,vy:4,vz:0,shot:'dink'});
 assert.equal(game.hit(player,'drive',14,1),true);
 assert.equal(player.shotLabel,'SPEED-UP');
 assert.equal(game.stats.patterns['speed-up'],1);
});
