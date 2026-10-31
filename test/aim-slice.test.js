import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aimStep,playerProfile,launch,stepBall,C,inBounds} from '../src/core.js';
import {Game} from '../src/game.js';
test('keyboard aiming is faster with smaller precision steps for better control',()=>{const p=playerProfile();assert.equal(aimStep(p),2.5);assert.equal(aimStep(p,true),.625);p.abilities.control=1.1;p.paddle.control=1.08;assert.ok(aimStep(p)<2.5);assert.ok(aimStep(p)>1.5)});
test('aim nudges clamp to playable target range and support fine correction',()=>{const g=new Game();g.nudgeAim(1);assert.equal(g.aim,12.5);g.nudgeAim(-1,true);assert.equal(g.aim,11.875);for(let n=0;n<20;n++)g.nudgeAim(1);assert.equal(g.aim,19);for(let n=0;n<20;n++)g.nudgeAim(-1);assert.equal(g.aim,1)});
test('slice is a distinct backspin trajectory that lands on the far court',()=>{const b={x:10,y:40,z:2};launch(b,10,6,'slice',{power:1,spin:1.1});assert.equal(b.shot,'slice');assert.ok(b.spin< -1.8);let event;for(let n=0;n<240&&!event;n++)event=stepBall(b,C.dt);assert.equal(event,'bounce');assert.ok(inBounds(b.x,b.y));assert.ok(b.y<15)});
test('slice rebounds lower and loses modest speed at the bounce',()=>{const ordinary={x:10,y:6,z:.001,vx:4,vy:-15,vz:-5,spin:0},slice={...ordinary,shot:'slice'};assert.equal(stepBall(ordinary),'bounce');assert.equal(stepBall(slice),'bounce');assert.ok(slice.vz<ordinary.vz);assert.ok(Math.abs(slice.vy)<Math.abs(ordinary.vy))});
