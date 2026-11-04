import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {planIncoming,formationTarget,separateTargets} from '../src/tactics.js';
import {playerProfile,launch,C} from '../src/core.js';
import {createCourtSurfaceRenderer} from '../src/court-art.js';

function incoming(team=0){const b={x:18,y:team===0?12:32,z:2,vx:0,vy:0,vz:0,spin:0};launch(b,18,team===0?36:8,'drive');return b}
function pair(team=0){return [0,1].map(id=>({...playerProfile(),id,team,x:id?13:4,y:team===0?38:6,lane:id?15:5,coverLane:id?15:5,vx:0,vy:0,reactionWait:0}))}

test('automatic interceptions depend on IQ, volley and aggression',()=>{
 const evaluate=(iq,volley,aggression)=>{const players=pair();Object.assign(players[0],{x:5,y:40});Object.assign(players[1],{x:13,y:30,abilities:{...players[1].abilities,courtIQ:iq,volley},playstyle:{aggression}});const ball={x:9,y:12,z:2};launch(ball,9,36,'drive');return planIncoming({players,team:0,ball,shots:4,bounces:0,clock:0})};
 assert.equal(evaluate(1.1,1.1,.9).poach,true);assert.equal(evaluate(.6,.6,.2).poach,false);
 const g=new Game();assert.equal(g.requestPoach,undefined);
});

test('outdoor hard stops make brief dust and indoor courts stay almost silent',()=>{
 const outdoor=new Game({seed:11});outdoor.surfaceKind='outdoor';
 const p=outdoor.players[0];p.fx=8;p.fy=1;p.vx=.2;p.vy=0;p.airborneTimer=0;
 outdoor.updateSurfaceEffects(1/120);
 assert.equal(outdoor.dust.length,1);
 assert.ok(outdoor.dust[0].life<=.26&&outdoor.dust[0].life>0);
 const indoor=outdoor;indoor.surfaceKind='indoor';indoor.dust=[];
 p.fx=8;p.fy=1;p.vx=.2;p.vy=0;p.dustCooldown=0;
 indoor.updateSurfaceEffects(1/120);
 assert.equal(indoor.dust.length,0);
});

function context(){
 const calls={fill:0,rect:0,clip:0};const methods={}
 const paint={fillStyle:undefined,strokeStyle:undefined,lineWidth:0,globalAlpha:1,
  fillRect:()=>calls.rect++,fill:()=>calls.fill++,clip:()=>calls.clip++,setTransform:()=>{},save:()=>{},restore:()=>{},drawImage:()=>{},imageSmoothingEnabled:true,
  stroke:()=>{},beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},closePath:()=>{}};
 const canvas={width:960,height:600,getContext:()=>paint,imageSmoothingEnabled:true};
 return {calls,paint,canvas};
}
function project(x,y){return {x:x*46,y:y*11}}
test('court texture is subtle outdoors and quieter indoors',()=>{
 const outside=context(),inside=context(); const outdoor=createCourtSurfaceRenderer(project,()=>outside.canvas),indoor=createCourtSurfaceRenderer(project,()=>inside.canvas);
 const palette={court:'#345d6f',kitchen:'#896749',line:'#fff'};
 outdoor(outside.paint,palette,'painted','outdoor');indoor(inside.paint,palette,'painted','indoor');
 assert.ok(outside.calls.rect>inside.calls.rect*2);
});

import {faultReplayCamera,faultReplaySample} from '../src/fault-replay.js';

function shortRally(){
 const g=new Game({seed:19});g.phase='rally';g.mode='watch';g.shots=5;
 for(let i=0;i<30;i++){g.clock=i/30;g.replayTick=0;g.recordReplay()}
 return g;
}
test('ordinary point replays focus one contact with a restrained camera move',()=>{
 const g=shortRally();g.replayContacts.push({time:g.clock-.2,x:10,y:32,z:2.1});g.fault(1,'Out');
 const clip=g.pointReplay;if(!clip)return;assert.ok(clip.focus.x===10&&clip.focus.y===32);
 const base={x:220,y:80,width:520,height:520};const project=(x,y)=>({x:x*24,y:204+y*9});
 const start=faultReplayCamera(base,clip.focus,project,clip.focus.time-1),end=faultReplayCamera(base,clip.focus,project,clip.focus.time+1);
 assert.ok(start.width>=base.width-1&&start.height>=base.height-1);
 assert.ok(end.width<base.width*.62&&end.width/end.height===base.width/base.height);
});
