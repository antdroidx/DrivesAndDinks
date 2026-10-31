import {test} from 'node:test';import assert from 'node:assert/strict';import {C,stepBall,launch,inBounds,legalVolley,Score,move,receiver,chooseCpuShot} from '../src/core.js';import {Game} from '../src/game.js';
test('ball arcs and bounces',()=>{let b={x:5,y:40,z:1};launch(b,15,5,'lob');let high=0,event;for(let i=0;i<300&&!event;i++){event=stepBall(b);high=Math.max(high,b.z)}assert.equal(event,'bounce');assert.ok(high>5);assert.ok(b.vz>0);assert.ok(Math.abs(b.x-15)<1)});
test('net and boundaries',()=>{let b={x:10,y:22.1,z:1,vx:0,vy:-10,vz:0};assert.equal(stepBall(b,.02),'net');assert.ok(inBounds(0,44));assert.ok(!inBounds(-.1,4))});
test('two bounce and kitchen volleys',()=>{assert.match(legalVolley(0,35,0,1),/Two-bounce/);assert.match(legalVolley(0,35,0,2),/Two-bounce/);assert.match(legalVolley(0,28,0,3),/Kitchen/);assert.equal(legalVolley(0,28,1,3),null);assert.equal(legalVolley(0,35,0,3),null)});
test('first server exception, score, rotations and win by two',()=>{let s=new Score();assert.equal(s.server,2);s.point(1);assert.equal(s.team,1);assert.equal(s.server,1);s.point(1);assert.equal(s.points[1],1);assert.equal(s.player,0);s.point(0);assert.equal(s.server,2);s.point(0);assert.equal(s.team,0);s.points=[10,10];s.point(0);assert.equal(s.winner,null);s.point(0);assert.equal(s.winner,0)});
test('movement and receiver selection',()=>{let a={team:0,x:2,y:40,vx:0,vy:0},b={team:0,x:18,y:40,vx:0,vy:0};assert.equal(receiver([a,b],0,3,35),a);move(a,5,35,.1);assert.ok(a.x>2&&a.y<40)});
test('game serve, fault and reset transitions',()=>{let g=new Game();assert.equal(g.phase,'serve');g.serve();assert.equal(g.phase,'rally');g.fault(0,'test');assert.equal(g.phase,'pause');g.update(3);assert.equal(g.phase,'serve');assert.equal(g.score.team,1);g.reset();assert.deepEqual(g.score.points,[0,0])});


test('servers start behind their baseline on both sides',()=>{const g=new Game();assert.ok(g.server.y>44);g.score.team=1;g.serveSetup();assert.ok(g.server.y<0)});
test('early swing is buffered until a legal ball is in reach',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;const p=g.players[0];Object.assign(p,{x:10,y:35,vx:0,vy:0});Object.assign(g.ball,{x:10,y:38.4,z:1,vx:0,vy:-3,vz:0});g.swing();assert.ok(g.hitBuffer>0);for(let i=0;i<20&&g.last===1;i++)g.update(C.dt);assert.equal(g.last,0);assert.equal(g.hitBuffer,0)});


test('a second bounce outside awards the rally to the hitter',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;Object.assign(g.ball,{x:21,y:40,z:.001,vx:0,vy:0,vz:-1});g.update(C.dt);assert.equal(g.message,'DOUBLE BOUNCE');assert.equal(g.phase,'pause');assert.equal(g.score.team,1)});


test('server keeps serving after scoring and partners change ends',()=>{const s=new Score();const first=s.player;s.point(0);assert.equal(s.player,first);assert.notEqual(s.rightPlayer[0],first);s.point(1);assert.equal(s.team,1);const next=s.player;s.point(1);assert.equal(s.player,next);s.point(0);assert.equal(s.server,2);assert.notEqual(s.player,next)});
test('service receivers stand diagonally opposite the server through rotation',()=>{const g=new Game();for(let n=0;n<12;n++){g.serveSetup();assert.notEqual(g.serveReceiver.x<10,g.server.x<10);assert.notEqual(g.serveReceiver.team,g.server.team);g.score.point(n%3===0?g.score.team:1-g.score.team)}});
test('kitchen lines forbid volleys',()=>{assert.match(legalVolley(0,29,0,3),/Kitchen/);assert.match(legalVolley(1,15,0,3),/Kitchen/)});
test('service on kitchen line is a fault',()=>{const g=new Game();g.serve();Object.assign(g.ball,{x:g.serveX<10?15:5,y:15,z:.001,vx:0,vy:0,vz:-1});g.update(C.dt);assert.equal(g.message,'SERVICE FAULT')});


test('serve formation keeps serving team back and receiving partner at kitchen',()=>{const g=new Game();for(const team of [0,1]){g.score.team=team;g.serveSetup();const serving=g.players.filter(p=>p.team===team),receiving=g.players.filter(p=>p.team!==team);for(const p of serving)assert.ok(team===0?p.y>=43:p.y<=1);const partner=receiving.find(p=>p!==g.serveReceiver);assert.equal(g.serveReceiver.y,team===0?2:42);assert.equal(partner.y,team===0?14:30);assert.notEqual(g.serveReceiver.x<10,g.server.x<10)}});


test('receiving partner holds their assigned side during the serve',()=>{for(const team of [0,1]){const g=new Game();g.score.team=team;g.serveSetup();const partner=g.players.find(p=>p.team!==team&&p!==g.serveReceiver);const startX=partner.x;g.serve();for(let i=0;i<30&&g.phase==='rally';i++)g.update(C.dt);assert.equal(partner.x<10,startX<10);assert.ok(Math.abs(partner.x-startX)<1)}});


test('CPU selects a deep return, a third-shot drop and kitchen dinks',()=>{assert.equal(chooseCpuShot({shots:1,team:0,y:40,height:1,random:0}), 'drive');assert.equal(chooseCpuShot({shots:2,team:0,y:40,height:1,random:0}), 'drop');assert.equal(chooseCpuShot({shots:4,team:1,y:14,height:1,random:0}), 'dink');assert.equal(chooseCpuShot({shots:4,team:1,y:14,height:3,random:0}), 'drive')});
test('serving team stays back while awaiting the return',()=>{const g=new Game();g.serve();const mate=g.players.find(p=>p.team===g.score.team&&p!==g.server);for(let i=0;i<30&&g.phase==='rally';i++)g.update(C.dt);assert.ok(mate.y>38)});


test('seeded watch match reaches a legal winning score',()=>{const original=Math.random;let seed=123456;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};try{const g=new Game();g.mode='watch';let maxShots=0;for(let i=0;i<120*1200&&g.phase!=='over';i++){g.update(C.dt);maxShots=Math.max(maxShots,g.shots)}assert.equal(g.phase,'over');assert.ok(maxShots>=3);const [a,b]=g.score.points;assert.ok(Math.max(a,b)>=11&&Math.abs(a-b)>=2)}finally{Math.random=original}});


test('serve returner stays near baseline before the serve bounces',()=>{for(const team of [0,1]){const g=new Game();g.mode='watch';g.score.team=team;g.serveSetup();const r=g.serveReceiver;g.serve();for(let i=0;i<110&&g.phase==='rally'&&g.bounces===0;i++){g.update(C.dt);assert.ok(r.team===0?r.y>=37:r.y<=7,`returner moved to ${r.y}`)}}});
