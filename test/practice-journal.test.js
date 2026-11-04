import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {MatchJournal} from '../src/match-journal.js';
import {PracticeSession,PRACTICE_DRILLS,finishPracticeFeed} from '../src/practice.js';

function practice(id='return',seed=17){const g=new Game({seed});g.configure({});g.startPractice(id);g.recordReplay=()=>{};return g}
function complete(g,respond=false){
 g.shot=g.practice.id==='return'?'attack':'soft';
 for(let tick=0;tick<24000&&g.phase!=='over';tick++){if(respond&&g.canHumanHit())g.swing();g.update(C.dt)}
 assert.equal(g.phase,'over');assert.equal(g.practice.results.length,10);return g;
}

test('every drill finishes ten missed feeds without awarding match points',()=>{
 for(const id of Object.keys(PRACTICE_DRILLS)){
  const g=complete(practice(id));assert.equal(g.practice.successes,0);assert.deepEqual(g.score.points,[0,0]);assert.equal(g.score.winner,null);assert.equal(g.journal.rallies.length,10);
 }
});

test('practice feeds are reachable through normal movement and paddle contact',()=>{
 for(const id of Object.keys(PRACTICE_DRILLS)){
  const g=complete(practice(id),true);assert.ok(g.practice.successes>=7,`${id}: ${g.practice.successes}`);
  assert.equal(g.stats.shots[g.practice.drill.shot],10);assert.ok(g.practice.results.every(r=>r.landing));
  if(id!=='return')for(const result of g.practice.results.filter(r=>r.success))assert.ok(result.landing.y>15&&result.landing.y<22);
 }
});

test('feed sequences repeat exactly and use a random stream independent from contact errors',()=>{
 const a=new PracticeSession('drop',21),b=new PracticeSession('drop',21),c=new PracticeSession('drop',22);
 const first=a.nextBall();assert.deepEqual(first,b.nextBall());assert.notDeepEqual(first,c.nextBall());
 const g=practice('drop');const ball=structuredClone(g.ball);g.random();g.startPractice('drop');assert.deepEqual(g.ball,ball);
});

test('pause freezes practice and restarting or leaving does not retain old attempts',()=>{
 const g=practice('reset');g.setPaused(true);const ball={...g.ball},time=g.clock;g.update(1);assert.deepEqual(g.ball,ball);assert.equal(g.clock,time);
 g.setPaused(false);g.practice.state='feed';finishPracticeFeed(g,'miss');assert.equal(g.practice.results.length,1);g.startPractice('reset');assert.equal(g.practice.results.length,0);
 g.configure({format:'doubles'});assert.equal(g.practice,null);assert.equal(g.players.length,4);assert.equal(g.phase,'serve');assert.equal(g.journal.rallies.length,0);
});

test('practice enforces mandatory bounces and scores faults outside the match scoreboard',()=>{
 const g=practice('return');assert.equal(g.canHumanHit(),false);g.practice.state='feed';g.phase='rally';g.ball={x:10,y:40,z:2,vx:0,vy:0,vz:0};
 assert.equal(g.hit(g.players[0],'drive',10,1),false);assert.equal(g.practice.results[0].reason,'Two-bounce fault');assert.deepEqual(g.score.points,[0,0]);
 finishPracticeFeed(g,'duplicate');assert.equal(g.practice.results.length,1);
});

test('target scoring requires the drill shot, counts first landing and accepts a legal net touch',()=>{
 for(const [shot,x,y,net,success] of [['drive',10,5,false,true],['lob',10,5,false,false],['drive',1,5,false,false],['drive',10,5,true,true]]){
  const g=practice();g.phase='rally';g.practice.state='feed';g.last=0;g.practice.returnedShot=shot;g.ball={x,y,z:.126,vx:0,vy:0,vz:-1,netContact:net};g.update(C.dt);
  assert.equal(g.practice.results[0].success,success);g.update(C.dt);assert.equal(g.practice.results.length,1);
 }
});

test('journal keeps records after the transient event queue has been consumed',()=>{
 const g=new Game({seed:3});g.emit('hit',{playerId:0,shot:'drive',quality:.6});g.events.splice(0);
 assert.equal(g.events.length,0);assert.equal(g.journal.events.length,1);assert.equal(g.matchReport().journal.events[0].shot,'drive');
 const exported=g.matchReport();exported.journal.events[0].shot='changed';exported.players[0].paddle.power=999;assert.equal(g.journal.events[0].shot,'drive');assert.notEqual(g.players[0].paddle.power,999);
});

test('journal bounds memory, numbers rallies monotonically and reports truncation',()=>{
 const j=new MatchJournal(3);for(let i=0;i<515;i++){j.record('rally-start',i*2);j.record('hit',i*2+.2,{quality:.5});j.record('rally-end',i*2+1,{winner:i%2,shots:3})}
 const report=j.snapshot();assert.equal(report.events.length,3);assert.equal(report.rallies.length,512);assert.equal(report.rallies.at(-1).number,515);assert.equal(report.droppedRallies,3);assert.equal(report.droppedEvents,1542);assert.equal(report.rallies[0].contacts,1);assert.equal(report.rallies[0].mishits,1);assert.equal(report.rallies[0].duration,1);
});

test('recording and exporting reports do not change seeded physics or match results',()=>{
 const a=new Game({seed:51}),b=new Game({seed:51});for(const g of [a,b]){g.configure({format:'singles'});g.mode='watch';g.recordReplay=()=>{}}
 b.journal.record=()=>{};
 for(let i=0;i<12000;i++){a.update(C.dt);b.update(C.dt);if(i%300===0)a.matchReport();a.events.splice(0);b.events.splice(0)}
 assert.deepEqual(a.stats,b.stats);assert.deepEqual(a.ball,b.ball);assert.deepEqual(a.score,b.score);assert.equal(a.random.state(),b.random.state());
});

test('finished practice report is serializable and includes each attempt without a fabricated winner',()=>{
 const g=complete(practice('reset'),true),report=JSON.parse(JSON.stringify(g.matchReport()));g.update(5);assert.equal(g.matchReport().elapsed,report.elapsed);
 assert.equal(report.schemaVersion,1);assert.equal(report.mode,'practice');assert.equal(report.complete,true);assert.equal(report.practice.completed,10);assert.equal(report.score.winner,null);assert.deepEqual(report.players.map(p=>p.id),[0,2]);assert.equal(report.journal.rallies.length,10);
 assert.ok(report.journal.events.some(e=>e.type==='hit'&&e.placement&&e.position));
});
