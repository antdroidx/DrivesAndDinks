import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyPhysique,buildProfile} from '../src/roster.js';
import {Game} from '../src/game.js';
import {move,paddleContactAvailable,paddleContactTarget,launch} from '../src/core.js';
const athlete=(height=177,build=.5225)=>({...applyPhysique(buildProfile({character:'avery'}),{height,build}),x:10,y:35,team:0,vx:0,vy:0});
test('height and build trade reach and power against acceleration without changing archetype ratings',()=>{
 const small=athlete(155,.15),large=athlete(200,.95);
 assert.ok(large.abilities.reach>small.abilities.reach);assert.ok(large.abilities.power>small.abilities.power);assert.ok(large.abilities.acceleration<small.abilities.acceleration);assert.deepEqual(large.ratings,small.ratings);
 const neutral=athlete();assert.deepEqual(neutral.abilities,neutral.baseAbilities);
});
test('body modifiers change actual movement and overhead coverage',()=>{
 const short=athlete(155),tall=athlete(205);for(let i=0;i<30;i++){move(short,18,35,1/120);move(tall,18,35,1/120)}assert.ok(short.x>tall.x);
 const ball={x:10.5,y:34.75,z:8};Object.assign(tall,{x:10,y:35});const target=paddleContactTarget(tall,ball,'overhead');Object.assign(ball,{x:target.x,y:target.y});assert.equal(paddleContactAvailable(tall,ball,'overhead'),true);assert.equal(paddleContactAvailable(short,ball,'overhead'),false);
});
test('broader bodies retain strength but trade first-step acceleration instead of fitness or hands',()=>{
 const lean=athlete(177,.05),broad=athlete(177,1.1),a={x:10,y:35,z:2},b={...a};launch(a,10,6,'drive',{power:lean.abilities.power,spin:1},1);launch(b,10,6,'drive',{power:broad.abilities.power,spin:1},1);assert.ok(Math.abs(b.vy)>Math.abs(a.vy));
 assert.equal(broad.abilities.speed,lean.abilities.speed);assert.equal(broad.abilities.endurance,lean.abilities.endurance);assert.equal(broad.abilities.volley,lean.abilities.volley);
 for(let i=0;i<8;i++){move(lean,19,35,1/120);move(broad,19,35,1/120)}assert.ok(broad.x<lean.x);
});
test('edits and match resets preserve body effects without stacking multipliers',()=>{
 const g=new Game({seed:5});g.configure({});g.setPhysique({height:200,build:.9});const once=structuredClone(g.players[0].abilities);g.setPhysique({height:200,build:.9});assert.deepEqual(g.players[0].abilities,once);g.reset();assert.deepEqual(g.players[0].abilities,once);assert.equal(g.players[0].appearance.height,200);assert.ok(g.players.every(p=>p.physique));
});

test('extreme height and broad build retain bounded movement penalties',()=>{
 const neutral=athlete(),broad=athlete(210,1.1);
 assert.ok(broad.abilities.speed>=neutral.abilities.speed*.95);
 assert.ok(broad.abilities.acceleration>=neutral.abilities.acceleration*.89);
 assert.ok(broad.abilities.endurance>=neutral.abilities.endurance*.95);
 assert.ok(broad.abilities.volley>=neutral.abilities.volley*.95);
 assert.ok(broad.abilities.power>neutral.abilities.power);
 assert.ok(broad.abilities.reach>neutral.abilities.reach);
});

import {bodyContactDifficulty,scorpionOpportunity,selectShot} from '../src/core.js';
test('taller bodies pay a low-ball penalty while short players access lower behind-shoulder blocks',()=>{
 const short=athlete(155),tall=athlete(205),low={x:10.5,y:34.5,z:.4};assert.ok(bodyContactDifficulty(tall,low,'dink')>bodyContactDifficulty(short,low,'dink'));
 const behind={x:10.5,y:35.5,z:4.1};assert.equal(scorpionOpportunity(short,behind),true);assert.equal(scorpionOpportunity(tall,behind),false);assert.equal(selectShot(short,behind,'attack'),'overhead');assert.equal(selectShot(tall,behind,'attack'),'drive');
 const opposite={...short,team:1,y:9};assert.equal(scorpionOpportunity(opposite,{...behind,y:8.5}),true);
});
