import {test} from 'node:test';import assert from 'node:assert/strict';import {C,stepBall,launch,inBounds,legalVolley,Score,move,receiver} from '../src/core.js';import {Game} from '../src/game.js';
test('ball arcs and bounces',()=>{let b={x:5,y:40,z:1};launch(b,15,5,'lob');let high=0,event;for(let i=0;i<300&&!event;i++){event=stepBall(b);high=Math.max(high,b.z)}assert.equal(event,'bounce');assert.ok(high>5);assert.ok(b.vz>0);assert.ok(Math.abs(b.x-15)<1)});
test('net and boundaries',()=>{let b={x:10,y:22.1,z:1,vx:0,vy:-10,vz:0};assert.equal(stepBall(b,.02),'net');assert.ok(inBounds(0,44));assert.ok(!inBounds(-.1,4))});
test('two bounce and kitchen volleys',()=>{assert.match(legalVolley(0,35,0,1),/Two-bounce/);assert.match(legalVolley(0,35,0,2),/Two-bounce/);assert.match(legalVolley(0,28,0,3),/Kitchen/);assert.equal(legalVolley(0,28,1,3),null);assert.equal(legalVolley(0,35,0,3),null)});
test('first server exception, score, rotations and win by two',()=>{let s=new Score();assert.equal(s.server,2);s.point(1);assert.equal(s.team,1);assert.equal(s.server,1);s.point(1);assert.equal(s.points[1],1);assert.equal(s.player,1);s.point(0);assert.equal(s.server,2);s.point(0);assert.equal(s.team,0);s.points=[10,10];s.point(0);assert.equal(s.winner,null);s.point(0);assert.equal(s.winner,0)});
test('movement and receiver selection',()=>{let a={team:0,x:2,y:40,vx:0,vy:0},b={team:0,x:18,y:40,vx:0,vy:0};assert.equal(receiver([a,b],0,3,35),a);move(a,5,35,.1);assert.ok(a.x>2&&a.y<40)});
test('game serve, fault and reset transitions',()=>{let g=new Game();assert.equal(g.phase,'serve');g.serve();assert.equal(g.phase,'rally');g.fault(0,'test');assert.equal(g.phase,'pause');g.update(2);assert.equal(g.phase,'serve');assert.equal(g.score.team,1);g.reset();assert.deepEqual(g.score.points,[0,0])});


test('servers start behind their baseline on both sides',()=>{const g=new Game();assert.ok(g.server.y>44);g.score.team=1;g.serveSetup();assert.ok(g.server.y<0)});
test('early swing is buffered until a legal ball is in reach',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;const p=g.players[0];Object.assign(p,{x:10,y:35,vx:0,vy:0});Object.assign(g.ball,{x:10,y:38.4,z:1,vx:0,vy:-3,vz:0});g.swing();assert.ok(g.hitBuffer>0);for(let i=0;i<20&&g.last===1;i++)g.update(C.dt);assert.equal(g.last,0);assert.equal(g.hitBuffer,0)});


test('a second bounce outside awards the rally to the hitter',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;Object.assign(g.ball,{x:21,y:40,z:.001,vx:0,vy:0,vz:-1});g.update(C.dt);assert.equal(g.message,'DOUBLE BOUNCE');assert.equal(g.phase,'pause');assert.equal(g.score.team,1)});

