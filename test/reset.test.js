import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
function hit({y=30,bounces=1,incoming='drive',shot='dink',quality=1}={}){const g=new Game();g.phase='rally';g.shots=5;g.last=1;g.bounces=bounces;const p=g.players[0];p.x=10;p.y=y;Object.assign(g.ball,{x:10.7,y:y-.3,z:2,vx:0,vy:30,vz:0,shot:incoming});g.hit(p,shot,10,quality);return g;}
test('soft replies to attacks near the kitchen are resets',()=>{for(const incoming of ['drive','overhead'])assert.equal(hit({incoming}).message,'RESET');});
test('volley resets can be made from deeper court positions',()=>{assert.equal(hit({y:36,bounces:0,shot:'drop',incoming:'overhead'}).message,'RESET');});
test('deep bounced drops, ordinary dinks and mishits retain their labels',()=>{assert.equal(hit({y:40,shot:'drop'}).message,'DROP');assert.equal(hit({incoming:'dink'}).message,'DINK');assert.equal(hit({quality:.5}).message,'MISHIT · DINK');});
