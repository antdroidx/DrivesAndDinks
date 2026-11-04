import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {Score,C} from '../src/core.js';
function singles(seed=17){const g=new Game({seed});g.configure({format:'singles'});return g}
test('singles has one active player per side and correct diagonal serve parity',()=>{
 const g=singles();assert.deepEqual(g.players.map(p=>p.id),[0,2]);
 for(const team of [0,1])for(const points of [0,1,2,3]){g.score.team=team;g.score.points[team]=points;g.serveSetup();assert.equal(g.server.team,team);assert.equal(g.serveReceiver.team,1-team);assert.equal(g.server.x,(team===0?(points%2===0):(points%2!==0))?15:5);assert.equal(g.serveReceiver.x,20-g.server.x);assert.equal(g.score.call.split(' - ').length,2)}
});
test('singles changes server immediately after a receiving win and only serving wins score',()=>{
 const score=new Score('singles');score.point(1);assert.equal(score.team,1);assert.deepEqual(score.points,[0,0]);score.point(1);assert.deepEqual(score.points,[0,1]);score.point(0);assert.equal(score.team,0);score.points=[10,10];score.point(0);assert.equal(score.winner,null);score.point(0);assert.equal(score.winner,0);
});
test('singles preserves format through resets and supports switching back to doubles',()=>{
 const g=singles();g.reset();assert.equal(g.players.length,2);g.configure({format:'doubles'});assert.equal(g.players.length,4);assert.equal(g.score.format,'doubles');
});
test('seeded singles watch matches complete with no doubles poaches or phantom players',()=>{
 for(const seed of [17,29,42]){const g=singles(seed);g.mode='watch';g.recordReplay=()=>{};for(let i=0;i<120*60*30&&g.score.winner===null;i++){g.update(C.dt);assert.equal(g.players.length,2)}assert.notEqual(g.score.winner,null,`seed ${seed} did not finish`);assert.equal(g.tacticalStats.poachAttempts,0);assert.ok(Math.max(...g.score.points)>=11)}
});
test('singles snapshots contain only the two active athletes',()=>{const g=singles();g.phase='rally';g.recordReplay(true);assert.equal(g.replayFrames[0].players.length,2);assert.equal(g.replayFrames[0].format,'singles')});
