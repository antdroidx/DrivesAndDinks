import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {C,netHeightAt} from '../src/core.js';
import {drawNetContact} from '../src/court-net.js';
import {faultReplaySample,replayTiming} from '../src/fault-replay.js';

function netBall(netPlay){
 return {x:10,y:21.99,z:netHeightAt(10)+(netPlay==='cord'?.02:-.05),vx:2,vy:12,vz:0,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius,netPlay};
}

test('live cord and mesh contacts create a timed visual net marker',()=>{
 for(const kind of ['cord','mesh']){
  const game=new Game({seed:7});game.mode='watch';game.recordReplay=()=>{};game.phase='rally';game.shots=3;game.last=0;game.bounces=0;game.ball=netBall(kind);
  game.update(C.dt);
  assert.equal(game.netMark.kind,kind);assert.ok(game.netMark.time>.5);assert.equal(game.netMark.y,C.net);assert.ok(Number.isFinite(game.netMark.vx));
 }
});

test('net contact drawing labels the impact and shows the redirected ball path',()=>{
 const calls=[];const c={save(){calls.push('save')},restore(){calls.push('restore')},beginPath(){},moveTo(){},quadraticCurveTo(){},lineTo(){},stroke(){calls.push('stroke')},ellipse(){},fillRect(){},fillText(text){calls.push(text)},closePath(){}};
 const project=(x,y,z)=>({x:80+x*2,y:60+y+z});
 drawNetContact(c,{x:10,y:C.net,z:3,time:.5,kind:'cord',vx:2,vy:12,vz:0},project,{scale:1,labels:true});
 drawNetContact(c,{x:10,y:C.net,z:3,time:.5,kind:'mesh',vx:2,vy:-12,vz:0},project,{scale:1,labels:true});
 assert.ok(calls.includes('NET CORD'));assert.ok(calls.includes('NET TOUCH'));assert.ok(calls.filter(call=>call==='stroke').length>=8);
});

test('replay interpolation holds the incoming frame before a renewed net marker',()=>{
 const base={clock:0,ball:{x:10,y:21.8,z:3,vx:0,vy:20,vz:0},players:[],shots:3,bounces:1,contact:null,bounceMark:null,netMark:null};
 const mark={x:10,y:C.net,z:3,time:.55,kind:'cord',vx:2,vy:12,vz:0};
 const recording={frames:[structuredClone(base),{...structuredClone(base),clock:.1,ball:{...base.ball,y:22.1},netMark:mark}],review:{kind:'net',x:10,y:C.net,z:3,time:.1,margin:0,label:'NET CORD'}};
 assert.equal(faultReplaySample(recording,.05,true).netMark,null);
 assert.deepEqual(faultReplaySample(recording,replayTiming(recording).duration,true).netMark,mark);
});