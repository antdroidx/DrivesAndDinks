import {test} from 'node:test';
import assert from 'node:assert/strict';
import {kitchenFootContact,chooseCpuTarget,selectShot,playerProfile} from '../src/core.js';
import {separateTargets} from '../src/tactics.js';
test('DEV coverage reserves the approach before partners overlap',()=>{const a={id:0,team:0,x:5,y:40,lane:5},b={id:1,team:0,x:15,y:30,lane:15};const entries=[{player:a,target:{x:13,y:30}},{player:b,target:{x:13,y:30}}];separateTargets(entries,0,0);assert.ok(Math.hypot(entries[1].target.x-13,entries[1].target.y-30)>=3.6);assert.equal(b.x,15)});
test('DEV kitchen footprint works at both court ends',()=>{assert.equal(kitchenFootContact({team:0,y:29.2}),true);assert.equal(kitchenFootContact({team:0,y:30}),false);assert.equal(kitchenFootContact({team:1,y:14.8}),true);assert.equal(kitchenFootContact({team:1,y:14}),false)});
test('DEV targets open court and does not invent special shots inside sidelines',()=>{assert.ok(chooseCpuTarget({},[{x:3,vx:0},{x:8,vx:0}],'drive')>14);const p={...playerProfile(),x:.7,y:30,team:0};assert.equal(selectShot(p,{x:.6,y:29,z:3.4},'attack'),'drive')});
