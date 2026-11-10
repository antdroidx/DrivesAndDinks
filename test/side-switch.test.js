import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/game.js';

test('an eleven-point game switches sides once either score reaches six',()=>{
 const g=new Game({seed:5});g.score.points=[5,2];g.score.team=0;g.serveSetup();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;
 g.fault(1,'Out');
 assert.equal(g.sideSwitched,true);
 assert.equal(g.sideSwitchCount,1);
 assert.deepEqual(g.score.points,[6,2]);
 assert.ok(g.events.some(event=>event.type==='side-switch'&&event.at===6));
 assert.equal(g.message,'SWITCH SIDES');
 assert.equal(g.matchReport().sideSwitched,true);
});

test('side-switched scene depth sorting follows visible camera depth',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert.match(source,/sort\(\(a,b\)=>visibleCourtY\(a\.y\)-visibleCourtY\(b\.y\)\)/);
});

test('side-switched sprites use visible foot order and travel direction',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(source,/playerFeetForRig\(playerFeet\(p\)\)/);
 assert.match(source,/travelSide:visibleTravelSide\(p\)/);
});

test('a fifteen-point game switches sides once either score reaches eight',()=>{
 const g=new Game({seed:9});g.configure({rules:{targetScore:15}});g.score.points=[7,4];g.score.team=0;g.serveSetup();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;
 g.fault(1,'Out');
 assert.equal(g.sideSwitched,true);assert.equal(g.sideSwitchThreshold,8);assert.deepEqual(g.score.points,[8,4]);assert.ok(g.events.some(event=>event.type==='side-switch'&&event.at===8));
});

test('side switching happens once and resets with the match',()=>{
 const g=new Game({seed:7});g.score.points=[5,5];g.score.team=0;g.serveSetup();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;
 g.fault(1,'Out');assert.equal(g.sideSwitched,true);
 g.serveSetup();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;g.fault(1,'Out');
 assert.equal(g.sideSwitchCount,1);
 g.reset();assert.equal(g.sideSwitched,false);assert.equal(g.sideSwitchCount,0);
});
