import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courtCamera,courtAim} from '../src/court-camera.js';
test('portrait camera enlarges the court while retaining both baselines',()=>{
 const c=courtCamera(true);assert.ok(c.width<960*.6);assert.ok(c.x<250&&c.x+c.width>710);assert.ok(c.y<130&&c.y+c.height>=600);
 assert.deepEqual(courtCamera(1),c);
});
test('pointer aim maps to the same court coordinate under either camera',()=>{
 for(const aspect of [1,1.8,2.5]){const c=courtCamera(aspect),rect={left:12,width:390};
 for(const world of [273,365,480,595,687]){const screen=rect.left+(world-c.x)/c.width*rect.width;assert.ok(Math.abs(courtAim(screen,rect,c)-(world-250)/460*20)<1e-10)}
 assert.equal(courtAim(rect.left-1000,rect,c),1);assert.equal(courtAim(rect.left+2000,rect,c),19);
 }
});

test('wide cameras preserve player proportions and frame both baselines',()=>{
 for(const [w,h] of [[1208,700],[844,340]]){const c=courtCamera(w/h);assert.ok(Math.abs(w/c.width-h/c.height)<1e-10);assert.equal(c.x+c.width/2,480);assert.equal(c.y+c.height,600)}
});

test('a narrow court between thumb lanes stays fully visible without stretching players',()=>{
 const c=courtCamera(.8);assert.equal(c.width,520);assert.equal(c.height,650);assert.ok(c.x<=220&&c.x+c.width>=740);assert.equal(c.y+c.height,600);assert.ok(Math.abs(400/c.width-500/c.height)<1e-10);
});
