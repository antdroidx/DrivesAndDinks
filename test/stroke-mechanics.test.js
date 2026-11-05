import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playerProfile,strokePower,paddleContactTarget,paddleContactDistance,paddleContactAvailable,contactQuality,contactDifficulty,bodyContactDifficulty} from '../src/core.js';
import {applyPhysique} from '../src/roster.js';
import {strokeDuration} from '../src/match-animation.js';
import {Game} from '../src/game.js';
const athlete=(height=177,build=.5225)=>({...applyPhysique(playerProfile(),{height,build}),id:0,team:0,x:10,y:35,vx:0,vy:0,stamina:1});

test('neutral clean mechanics preserve unit power and swing speed',()=>{
 const m=strokePower(athlete());assert.equal(m.power,1);assert.equal(m.swingSpeed,1);assert.equal(m.fluidity,1);
});
test('technique and swing speed can outweigh raw strength',()=>{
 const skilled=athlete(),strong=athlete();Object.assign(skilled.abilities,{power:.8,drive:1.25});Object.assign(strong.abilities,{power:1.2,drive:.8});
 assert.ok(strokePower(skilled).power>strokePower(strong).power);assert.ok(strokeDuration(skilled,'drive')<strokeDuration(strong,'drive'));
 const same=structuredClone(skilled);same.abilities.power=1.2;assert.ok(strokePower(same).power>strokePower(skilled).power);
});
test('fatigue, rushed contact and poor timing reduce swing efficiency',()=>{
 const p=athlete(),clean=strokePower(p);for(const m of [strokePower({...p,stamina:0}),strokePower(p,'drive',.5),strokePower(p,'drive',1,.9)]){assert.ok(m.fluidity<clean.fluidity);assert.ok(m.swingSpeed<clean.swingSpeed);assert.ok(m.power<clean.power)}
 assert.ok(strokeDuration(p,'drive',{quality:.5,difficulty:.9})>strokeDuration(p,'drive'));
});
test('paddle hands influence generated swing speed without doubling equipment power',()=>{
 const p=athlete(),fast={...p,paddle:{...p.paddle,shapeHandSpeed:1.1}},slow={...p,paddle:{...p.paddle,shapeHandSpeed:.9}};
 assert.ok(strokePower(fast).power>strokePower(slow).power);assert.equal(strokePower({...p,paddle:{...p.paddle,power:1.2,shapePower:1.1}}).power,strokePower(p).power);
 assert.equal(strokeDuration({...p,abilities:{...p.abilities,drive:1.2}},'dink'),strokeDuration(p,'dink'));
});
test('forward reach expands with stature at both court ends without extending contact height indefinitely',()=>{
 for(const team of [0,1]){
  const tall={...athlete(210),team,y:team===0?35:9},short={...athlete(145),team,y:tall.y},ball={x:team===0?10.84:9.16,y:team===0?33.58:10.42,z:2.5};
  assert.equal(paddleContactAvailable(tall,ball),true);assert.equal(paddleContactAvailable(short,ball),false);
  assert.equal(paddleContactAvailable(tall,{...ball,z:20}),false);
 }
});
test('contact detection, difficulty and mishits share the same grip-aware distance',()=>{
 const p=athlete();p.backhandStyle='two';
 for(const x of [8.8,9.3,10.8]){
  const b={x,y:34.4,z:1.6},distance=paddleContactDistance(p,b);assert.equal(paddleContactAvailable(p,b),distance<=1);
  const q=contactQuality(p,b,'drive',false,.99),d=contactDifficulty(p,b);assert.ok(Number.isFinite(q.chance)&&Number.isFinite(d));
 }
 const center=paddleContactTarget(p,{x:11,z:1.6}),edge={...center,y:center.y-.8};
 assert.ok(contactQuality(p,edge,'drive',false,.99).chance>contactQuality(p,center,'drive',false,.99).chance);
 assert.ok(contactDifficulty(p,edge)>contactDifficulty(p,center));
});
test('a prepared tall player keeps a smaller low-ball cost than a rushed or exhausted one',()=>{
 const p=athlete(210),b={z:.4};assert.ok(bodyContactDifficulty(p,b,'drive')>0);
 assert.ok(bodyContactDifficulty(p,b,'drive')<bodyContactDifficulty({...p,vx:12},b,'drive'));
 assert.ok(bodyContactDifficulty(p,b,'drive')<bodyContactDifficulty({...p,stamina:0},b,'drive'));
 assert.equal(bodyContactDifficulty(p,{z:2.5},'drive'),0);
});
function hitWith({power,drive},shot='drive'){
 const g=new Game({seed:3});g.configure({format:'singles'});g.setPhysique({height:177,build:.5225});g.mode='watch';g.phase='rally';g.last=1;g.shots=4;g.bounces=1;
 const p=g.players[0];Object.assign(p,{x:10,y:35,vx:0,vy:0,swing:0,stamina:1});Object.assign(p.abilities,{power,drive});g.ball={x:10.85,y:34.54,z:5,vx:0,vy:0,vz:0,spin:0};
 assert.equal(g.hit(p,shot,10,1,{x:10,y:4}),true);return g;
}
test('live attacks use mechanics once and retain their measured components in reports',()=>{
 const skilled=hitWith({power:.8,drive:1.25}),strong=hitWith({power:1.2,drive:.8});
 assert.ok(Math.hypot(skilled.ball.vx,skilled.ball.vy)>Math.hypot(strong.ball.vx,strong.ball.vy));
 const event=skilled.matchReport().journal.events.find(e=>e.type==='hit');assert.ok(event.mechanics.swingSpeed>1);assert.equal(event.mechanics.power,skilled.players[0].contactMechanics.power);assert.ok(event.pace>0);
});
test('raw strength does not turn soft shots into powered drives',()=>{
 const a=hitWith({power:.8,drive:1},'dink'),b=hitWith({power:1.2,drive:1},'dink');
 assert.equal(a.players[0].contactMechanics,null);assert.equal(b.players[0].contactMechanics,null);assert.equal(a.ball.vy,b.ball.vy);assert.equal(a.ball.vz,b.ball.vz);
});
