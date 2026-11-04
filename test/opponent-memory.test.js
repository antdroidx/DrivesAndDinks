import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OpponentMemory,anticipateReturn} from '../src/opponent-memory.js';
import {Game} from '../src/game.js';
import {C} from '../src/core.js';

const repeated=(memory,x=3,n=10,shot='drive',playerId=2)=>{for(let i=0;i<n;i++)memory.observe({playerId,shot,x,y:35})};

test('memory needs several observations and stays bounded per opponent',()=>{
 const m=new OpponentMemory();repeated(m,3,3);assert.equal(m.read(2).confidence,0);repeated(m,3,100);
 assert.equal(m.read(2).samples,16);assert.ok(m.read(2).confidence>0&&m.read(2).confidence<1);
 for(let id=3;id<10;id++)repeated(m,3,1,'drive',id);assert.equal(m.players.size,4);
});

test('mixed placement remains uncertain and recent changes displace an old pattern',()=>{
 const m=new OpponentMemory();for(let i=0;i<16;i++)repeated(m,i%2?3:17,1);assert.ok(m.read(2).confidence<.2);
 repeated(m,3,16);assert.ok(m.read(2).expectedX<5);repeated(m,17,12);assert.ok(m.read(2).expectedX>13);
});

test('serves, invalid positions and other opponents do not contaminate a read',()=>{
 const m=new OpponentMemory();repeated(m,3,10,'serve-hard');repeated(m,Infinity);assert.equal(m.read(2).samples,0);
 repeated(m,3);repeated(m,17,10,'drive',3);assert.ok(m.read(2).expectedX<5);assert.ok(m.read(3).expectedX>15);
});

test('Court IQ scales a small physical target adjustment and can be wrong-footed',()=>{
 const m=new OpponentMemory();repeated(m);const target={x:10,y:32},p={team:0,abilities:{courtIQ:1.25}};
 const smart=anticipateReturn(p,target,m.read(2),{singles:true}),novice=anticipateReturn({...p,abilities:{courtIQ:.65}},target,m.read(2),{singles:true});
 assert.ok(smart.x<target.x&&smart.x>=target.x-1.5);assert.deepEqual({x:novice.x,y:novice.y},target);assert.ok(smart.x<novice.x,'a surprise right-side return now requires more recovery');
 assert.deepEqual(target,{x:10,y:32});
});

test('observed lobs produce bounded mirrored recovery depth',()=>{
 const m=new OpponentMemory();repeated(m,10,10,'lob');
 for(const team of [0,1]){const y=team===0?32:12,p={team,abilities:{courtIQ:1.2}},r=anticipateReturn(p,{x:10,y},m.read(2));assert.ok(team===0?r.y>y:r.y<y);assert.ok(Math.abs(r.y-y)<=1.5)}
});

test('memory records a shot only on an observed landing or opposing contact',()=>{
 const g=new Game({seed:3});g.phase='rally';g.shots=4;g.bounces=1;g.ball={x:10,y:35,z:2,vx:0,vy:0,vz:0};
 g.hit(g.players[0],'drive',3,1);assert.equal(g.opponentMemory.read(0).samples,0);
 g.aim=19;g.depth=0;assert.equal(g.opponentMemory.read(0).samples,0);
 Object.assign(g.ball,{x:6,y:5,z:.126,vx:0,vy:0,vz:-1});g.update(C.dt);
 assert.equal(g.opponentMemory.read(0).samples,1);assert.equal(g.opponentMemory.read(0).expectedX,g.ball.x);
 g.observeOpponentShot();assert.equal(g.opponentMemory.read(0).samples,1);
});

test('match-local learning survives points, resets with a match, and stays out of drills',()=>{
 const g=new Game({seed:3});repeated(g.opponentMemory);g.serveSetup();assert.equal(g.opponentMemory.read(2).samples,10);
 const report=g.matchReport();report.learning[0].recent[0].x=99;assert.equal(g.opponentMemory.read(2).expectedX,3);
 g.reset();assert.equal(g.opponentMemory.read(2).samples,0);g.startPractice('reset');assert.equal(g.opponentMemory.snapshot().length,0);
});

test('same observed history and seed preserve repeatable matches',()=>{
 const a=new Game({seed:9}),b=new Game({seed:9});for(const g of [a,b]){g.mode='watch';g.recordReplay=()=>{}}
 for(let i=0;i<12000;i++){a.update(C.dt);b.update(C.dt)}
 assert.deepEqual(a.stats,b.stats);assert.deepEqual(a.ball,b.ball);assert.deepEqual(a.opponentMemory.snapshot(),b.opponentMemory.snapshot());assert.ok(a.tacticalStats.patternReads>0);
});
