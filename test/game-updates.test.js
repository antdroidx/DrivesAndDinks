import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {backhandGrip,gripModifiers,chooseCpuShot,launch} from '../src/core.js';
import {buildProfile} from '../src/roster.js';
import {matchStrokeMode} from '../src/match-animation.js';
test('three timing modes retain Normal as the default',()=>{const g=new Game();assert.equal(g.difficulty,'normal');for(const [mode,early,late] of [['easy',.6,.2],['normal',.3,.08],['hard',.15,0]]){g.setDifficulty(mode);assert.deepEqual(g.timingWindow(),{early,late});}g.setDifficulty('invalid');assert.equal(g.difficulty,'normal');});
test('backhand grips depend on style and reach, independently of gender',()=>{const ball={x:9,y:35,z:2};for(const gender of ['male','female']){const p={...buildProfile({character:'jordan',gender}),team:0,x:10,y:35};assert.equal(backhandGrip(p,ball),'two');assert.equal(backhandGrip(p,{...ball,x:7}),'one');assert.equal(backhandGrip(p,ball,'slice'),'one');const two=gripModifiers(p,ball,'drive'),one=gripModifiers({...p,backhandStyle:'one'},ball,'drive');assert.ok(two.power>one.power&&two.control>one.control&&two.spin>one.spin&&one.reach>two.reach);assert.equal(matchStrokeMode({...p,stroke:'backhand',contactGrip:'two'},'dink'),'twoBackhandDink');}});
test('CPU attacks reachable overheads rather than choosing a drop',()=>{for(const random of [0,.5,.99])assert.equal(chooseCpuShot({shots:5,team:0,y:40,height:6,random}),'drive');});
test('weak overhead contact reduces pace',()=>{const a={x:10,y:30,z:6},b={...a};launch(a,12,6,'overhead',{power:1.2,spin:1},1);launch(b,12,6,'overhead',{power:1.2,spin:1},.5);assert.ok(Math.abs(a.vy)>Math.abs(b.vy));});

test('dev scenarios move into position and trigger real Erne and ATP shots',()=>{
 for(const type of ['erne','atp']){const g=new Game();assert.equal(g.startScenario(type),true);assert.equal(g.mode,'watch');for(let i=0;i<120&&g.scenario;i++)g.update(1/120);assert.equal(g.scenario,null);assert.equal(g.lastShot,type);assert.equal(g.players[0].animationShot,type);assert.equal(g.players[0].contactPoint.z,type==='erne'?3.8:1.55);assert.ok(Math.hypot(g.ball.vx,g.ball.vy)>0)};
});
