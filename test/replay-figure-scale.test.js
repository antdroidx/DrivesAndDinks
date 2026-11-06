import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sideReplayCamera,sideReplayFigureHeight,MAX_REPLAY_Z} from '../src/side-replay.js';
import {C} from '../src/core.js';
import {PROFILE_CANONICAL_BODY_UNITS,PROFILE_VISUAL_BODY_UNITS,playerHeightFeet} from '../src/court-scale.js';

const near=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} != ${b}`);

test('sideline figures and net use real court feet at every stature',()=>{
 const camera=sideReplayCamera(1920,1080,{frames:[]},null),projectedHeight=z=>Math.abs(camera.project(10,22,z).y-camera.project(10,22,0).y);
 for(const heightCm of [158,177,210]){
  const box=sideReplayFigureHeight(camera,10,22,heightCm);
  const visible=box*PROFILE_VISUAL_BODY_UNITS/PROFILE_CANONICAL_BODY_UNITS;
  near(visible,projectedHeight(playerHeightFeet(heightCm)));
 }
 const postPixels=Math.abs(camera.project(C.netPostLeft,22,C.netPostHeight).y-camera.project(C.netPostLeft,22,0).y);
 const centerPixels=Math.abs(camera.project(10,22,C.netCenterHeight).y-camera.project(10,22,0).y);
 near(postPixels/Math.abs(camera.project(C.netPostLeft,22,1).y-camera.project(C.netPostLeft,22,0).y),C.netPostHeight,0.08);
 near(centerPixels/Math.abs(camera.project(10,22,1).y-camera.project(10,22,0).y),C.netCenterHeight,0.08);
 const figureVisible=sideReplayFigureHeight(camera,C.netPostLeft,22,177)*PROFILE_VISUAL_BODY_UNITS/PROFILE_CANONICAL_BODY_UNITS;
 near(postPixels/figureVisible,C.netPostHeight/playerHeightFeet(177),0.02);
});

test('court dimensions stay 20 by 44 with 7-foot kitchens and 15-foot service areas',()=>{
 near(C.width,20);near(C.length,44);near(C.kitchen,7);near(C.net,22);
 near(C.net-C.kitchen,15);near(C.length-C.net-C.kitchen,15);
 const camera=sideReplayCamera(1920,1080,{frames:[]},null);
 const farNear=camera.project(0,0),farEnd=camera.project(0,C.length),nearNear=camera.project(C.width,0),nearEnd=camera.project(C.width,C.length);
 assert.ok(Math.hypot(farEnd.x-farNear.x,farEnd.y-farNear.y)>0);
 assert.ok(Math.hypot(nearEnd.x-nearNear.x,nearEnd.y-nearNear.y)>0);
 assert.ok(camera.span(10,22)>0);
});
