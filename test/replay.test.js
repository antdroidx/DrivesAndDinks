import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
function rally(shots=20){const g=new Game();g.phase='rally';g.shots=shots;for(let i=0;i<120;i++){g.clock=i/30;g.recordReplay();g.replayTick=0;}return g;}
test('long rally clip contains independent snapshots without changing the score',()=>{const g=rally();const recorded=g.replayFrames[0].players[0].x;g.players[0].x=19;assert.equal(g.replayFrames[0].players[0].x,recorded);g.fault(1,'Unreturned');assert.ok(g.replayClip.frames.length>15);assert.equal(g.replayClip.label,'20-SHOT RALLY');const score=[...g.score.points];for(const frame of g.replayClip.frames)assert.ok(frame.ball);assert.deepEqual(g.score.points,score);});
test('ordinary short rallies do not trigger replay and recording is bounded',()=>{const g=rally();g.shots=4;g.fault(1,'Out');assert.equal(g.replayClip,null);g.serveSetup();g.phase='rally';for(let i=0;i<2000;i++)g.recordReplay();assert.ok(g.replayFrames.length<=360);});
test('special-shot highlight selects its own replay window',()=>{const g=rally();g.shots=5;g.replayHighlights.push({time:2,label:'AROUND THE POST'});g.fault(1,'Unreturned');assert.equal(g.replayClip.label,'AROUND THE POST');assert.ok(g.replayClip.frames.every(f=>f.clock<=4));g.serveSetup();assert.equal(g.replayClip,null);assert.equal(g.replayHighlights.length,0);});

test('automatic replays require at least twenty shots',()=>{
 const short=rally(19);short.fault(1,'Out');assert.equal(short.replayClip,null);assert.ok(short.pointReplay.frames.length>15);
 const qualifying=rally(20);qualifying.fault(1,'Out');assert.equal(qualifying.replayClip.label,'20-SHOT RALLY');
});

test('any completed point is available for a manual replay',()=>{
 const g=rally(3);g.fault(1,'Out');assert.equal(g.replayClip,null);assert.ok(g.pointReplay.frames.length>15);assert.match(g.pointReplay.label,/3-SHOT RALLY/);
});

test('a match-winning point is an automatic replay even when the rally is short',()=>{
 const g=rally(4);g.score.points=[10,9];g.fault(1,'Out');assert.equal(g.score.winner,0);assert.ok(g.replayClip);assert.match(g.replayClip.label,/MATCH POINT WIN/);
});
test('ATP and Erne highlights both qualify for automatic replay',()=>{
 for(const [shot,label] of [['atp','AROUND THE POST'],['erne','ERNE']]){
  const g=rally(5);g.replayHighlights.push({time:2,label});g.fault(1,'Out');assert.ok(g.replayClip);assert.equal(g.replayClip.label,label);
 }
});