import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courtCamera,courtAim,gameProjection,gameLift,gameGroundSpan,setCourtSideSwitched} from '../src/court-camera.js';
import {C} from '../src/core.js';

test('portrait camera enlarges the court while retaining both baselines',()=>{
 const c=courtCamera(true);assert.ok(c.width<960*.6);assert.ok(c.x<250&&c.x+c.width>710);assert.ok(c.y<130&&c.y+c.height>=600);
 assert.deepEqual(courtCamera(1),c);
});
test('pointer aim maps to the same court coordinate under either camera',()=>{
 for(const aspect of [1,1.8,2.5]){const c=courtCamera(aspect),rect={left:12,width:390};
 for(const world of [273,365,480,595,687]){const screen=rect.left+(world-c.x)/c.width*rect.width;assert.ok(Math.abs(courtAim(screen,rect,c)-(world-250)/460*C.width)<1e-10)}
 assert.equal(courtAim(rect.left-1000,rect,c),1);assert.equal(courtAim(rect.left+2000,rect,c),19);
 }
});

test('side switching rotates the court and mirrors aim input',()=>{
 const near={...gameProjection(0,0)},far={...gameProjection(20,44)},nearLift=gameLift(0),farLift=gameLift(44),camera=courtCamera(1),rect={left:0,width:960};
 try{
  setCourtSideSwitched(true);
  const switchedNear=gameProjection(0,0),switchedFar=gameProjection(20,44);
  assert.deepEqual(switchedNear,far);assert.deepEqual(switchedFar,near);
  assert.equal(gameLift(0),farLift);assert.equal(gameLift(44),nearLift);
  assert.equal(courtAim(480,rect,camera),10);
  assert.ok(courtAim(300,rect,camera)>10);
 }finally{setCourtSideSwitched(false)}
 assert.deepEqual(gameProjection(0,0),near);
});

test('wide cameras preserve player proportions and frame both baselines',()=>{
 for(const [w,h] of [[1208,700],[844,340]]){const c=courtCamera(w/h);assert.ok(Math.abs(w/c.width-h/c.height)<1e-10);assert.equal(c.x+c.width/2,480);assert.equal(c.y+c.height,600)}
});

test('a narrow court between thumb lanes stays fully visible without stretching players',()=>{
 const c=courtCamera(.8);assert.equal(c.width,520);assert.equal(c.height,650);assert.ok(c.x<=220&&c.x+c.width>=740);assert.equal(c.y+c.height,600);assert.ok(Math.abs(400/c.width-500/c.height)<1e-10);
});

test('game perspective makes the near court half longer than the far half',()=>{
 const far=gameProjection(10,0).y,net=gameProjection(10,C.net).y,near=gameProjection(10,C.length).y;
 const farHalf=net-far,nearHalf=near-net;
 assert.ok(farHalf>0&&nearHalf>farHalf*1.35,`far ${farHalf} near ${nearHalf}`);
 const farWidth=gameProjection(C.width,0).x-gameProjection(0,0).x;
 const nearWidth=gameProjection(C.width,C.length).x-gameProjection(0,C.length).x;
 assert.ok(nearWidth>farWidth*1.35);
 assert.ok(gameLift(C.length)>gameLift(0));
 assert.ok(gameGroundSpan(C.length)>gameGroundSpan(0));
 const kitchenFar=gameProjection(10,C.net-C.kitchen).y,kitchenNear=gameProjection(10,C.net+C.kitchen).y;
 assert.ok((kitchenNear-net)/(net-kitchenFar)>1.2);
});
