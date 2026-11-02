import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {backhandGrip,gripModifiers,chooseCpuShot,launch,C,netHeightAt,move,resolvePlayerCollisions,contactQuality,playerProfile} from '../src/core.js';
import {buildProfile} from '../src/roster.js';
import {matchStrokeMode} from '../src/match-animation.js';
import {staminaOverlayEnabled,staminaPercent} from '../src/player-facing.js';
test('three timing modes retain Normal as the default',()=>{const g=new Game();assert.equal(g.difficulty,'normal');for(const [mode,early,late] of [['easy',.6,.2],['normal',.3,.08],['hard',.15,0]]){g.setDifficulty(mode);assert.deepEqual(g.timingWindow(),{early,late});}g.setDifficulty('invalid');assert.equal(g.difficulty,'normal');});
test('backhand grips depend on style and reach, independently of gender',()=>{const ball={x:9,y:35,z:2};for(const gender of ['male','female']){const p={...buildProfile({character:'jordan',gender}),team:0,x:10,y:35};assert.equal(backhandGrip(p,ball),'two');assert.equal(backhandGrip(p,{...ball,x:7}),'one');assert.equal(backhandGrip(p,ball,'slice'),'one');const two=gripModifiers(p,ball,'drive'),one=gripModifiers({...p,backhandStyle:'one'},ball,'drive');assert.ok(two.power>one.power&&two.control>one.control&&two.spin>one.spin&&one.reach>two.reach);assert.equal(matchStrokeMode({...p,stroke:'backhand',contactGrip:'two'},'dink'),'twoBackhandDink');}});
test('CPU attacks reachable overheads rather than choosing a drop',()=>{for(const random of [0,.5,.99])assert.equal(chooseCpuShot({shots:5,team:0,y:40,height:6,random}),'drive');});
test('weak overhead contact reduces pace',()=>{const a={x:10,y:30,z:6},b={...a};launch(a,12,6,'overhead',{power:1.2,spin:1},1);launch(b,12,6,'overhead',{power:1.2,spin:1},.5);assert.ok(Math.abs(a.vy)>Math.abs(b.vy));});

test('dev scenarios move into position and trigger real Erne and ATP shots',()=>{
 for(const type of ['erne','atp']){const g=new Game();assert.equal(g.startScenario(type),true);assert.equal(g.mode,'watch');for(let i=0;i<140&&g.scenario;i++)g.update(1/120);assert.equal(g.scenario,null);assert.equal(g.lastShot,type);assert.equal(g.players[0].animationShot,type);assert.equal(g.players[0].contactPoint.z,type==='erne'?3.8:1.35);if(type==='atp'){assert.equal(g.players[0].contactType,'groundstroke');assert.ok(g.players[0].contactPoint.x<-1);assert.ok(g.ball.vx>0)}assert.ok(Math.hypot(g.ball.vx,g.ball.vy)>0)};
});

test('ATP scenario approach clears the net before bouncing',()=>{
 const g=new Game();g.startScenario('atp');let crossed=false;
 for(let i=0;i<140&&g.scenario;i++){const beforeY=g.ball.y;g.update(1/120);if(beforeY<22&&g.ball.y>=22){crossed=true;assert.ok(g.ball.z>C.ballRadius+netHeightAt(g.ball.x),`ball center ${g.ball.z} below net at x ${g.ball.x}`)}}
 assert.equal(crossed,true);
});

test('players retain momentum and cannot overlap through collision',()=>{
 const p={...playerProfile(),team:0,x:10,y:35,vx:0,vy:0};
 for(let i=0;i<40;i++)move(p,18,35,1/120);assert.ok(p.vx>5);
 p.vx=8;move(p,2,35,1/120);assert.ok(p.vx>7.5);
 const players=[{...playerProfile(),x:10,y:35,vx:4,vy:0},{...playerProfile(),x:10.3,y:35,vx:-4,vy:0}];resolvePlayerCollisions(players);assert.ok(Math.hypot(players[1].x-players[0].x,players[1].y-players[0].y)>=1.239);assert.ok(players[0].vx<players[1].vx);
});
test('special-shot returns carry extra mishit difficulty',()=>{
 const p={...playerProfile(),team:0,x:10,y:35,vx:0,vy:0},ball={x:10.6,y:35.2,z:1.5,shot:'drive'};assert.ok(contactQuality(p,{...ball,shot:'atp'},'drive',false,.5).chance>contactQuality(p,ball,'drive',false,.5).chance);
});

test('DEV stamina diagnostics activate only in development or through the query override',()=>{
 assert.equal(staminaOverlayEnabled({pathname:'/DrivesAndDinks/dev/',hostname:'antdroidx.github.io'}),true);
 assert.equal(staminaOverlayEnabled({pathname:'/DrivesAndDinks/',hostname:'antdroidx.github.io'}),false);
 assert.equal(staminaOverlayEnabled({pathname:'/',hostname:'localhost'}),true);
 assert.equal(staminaOverlayEnabled({pathname:'/',hostname:'antdroidx.github.io',search:'?stamina=1'}),true);
 assert.equal(staminaOverlayEnabled({pathname:'/dev/',hostname:'antdroidx.github.io',search:'?stamina=0'}),false);
});
test('stamina percentages are clamped and rounded for the DEV overlay',()=>{
 assert.equal(staminaPercent(1),100);
 assert.equal(staminaPercent(.876),88);
 assert.equal(staminaPercent(-1),0);
 assert.equal(staminaPercent(2),100);
 assert.equal(staminaPercent(undefined),100);
});