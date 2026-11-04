import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courtCamera,courtAim} from '../src/court-camera.js';
test('portrait camera enlarges the court while retaining both baselines',()=>{
 const c=courtCamera(true);assert.ok(c.width<960*.6);assert.ok(c.x<250&&c.x+c.width>710);assert.ok(c.y<130&&c.y+c.height>=600);
 assert.deepEqual(courtCamera(false),c);
});
test('pointer aim maps to the same court coordinate under either camera',()=>{
 for(const portrait of [true,false]){const c=courtCamera(portrait),rect={left:12,width:390};
 for(const world of [273,365,480,595,687]){const screen=rect.left+(world-c.x)/c.width*rect.width;assert.ok(Math.abs(courtAim(screen,rect,c)-(world-250)/460*20)<1e-10)}
 assert.equal(courtAim(rect.left-1000,rect,c),1);assert.equal(courtAim(rect.left+2000,rect,c),19);
 }
});
