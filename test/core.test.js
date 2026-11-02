import {test} from 'node:test';import assert from 'node:assert/strict';import {C,stepBall,launch,inBounds,legalVolley,Score,move,receiver,chooseCpuShot,playerProfile,contactAvailable,paddleContactAvailable,paddleContactTarget,contactQuality,serveTarget,serveAim,contactDifficulty,netCrossingX,paddleContactResponse} from '../src/core.js';import {Game} from '../src/game.js';
function completeToss(g){g.serve();if(g.serveToss)g.update(g.serveToss.duration+.01);return g;}
test('ball arcs and bounces',()=>{let b={x:5,y:40,z:1};launch(b,15,5,'lob');let high=0,event;for(let i=0;i<300&&!event;i++){event=stepBall(b);high=Math.max(high,b.z)}assert.equal(event,'bounce');assert.ok(high>5);assert.ok(b.vz>0);assert.ok(Math.abs(b.x-15)<1)});
test('net and boundaries',()=>{let b={x:10,y:22.1,z:1,vx:0,vy:-10,vz:0};assert.equal(stepBall(b,.02),'net');assert.ok(inBounds(0,44));assert.ok(!inBounds(-.1,4))});
test('two bounce and kitchen volleys',()=>{assert.match(legalVolley(0,35,0,1),/Two-bounce/);assert.match(legalVolley(0,35,0,2),/Two-bounce/);assert.match(legalVolley(0,28,0,3),/Kitchen/);assert.equal(legalVolley(0,28,1,3),null);assert.equal(legalVolley(0,35,0,3),null)});
test('first server exception, score, rotations and win by two',()=>{let s=new Score();assert.equal(s.server,2);s.point(1);assert.equal(s.team,1);assert.equal(s.server,1);s.point(1);assert.equal(s.points[1],1);assert.equal(s.player,0);s.point(0);assert.equal(s.server,2);s.point(0);assert.equal(s.team,0);s.points=[10,10];s.point(0);assert.equal(s.winner,null);s.point(0);assert.equal(s.winner,0)});
test('movement and receiver selection',()=>{let a={team:0,x:2,y:40,vx:0,vy:0},b={team:0,x:18,y:40,vx:0,vy:0};assert.equal(receiver([a,b],0,3,35),a);move(a,5,35,.1);assert.ok(a.x>2&&a.y<40)});
test('game serve, fault and reset transitions',()=>{let g=new Game();assert.equal(g.phase,'serve');completeToss(g);assert.equal(g.phase,'rally');g.fault(0,'test');assert.equal(g.phase,'pause');g.update(3);assert.equal(g.phase,'serve');assert.equal(g.score.team,1);g.reset();assert.deepEqual(g.score.points,[0,0])});


test('servers start behind their baseline on both sides',()=>{const g=new Game();assert.ok(g.server.y>44);g.score.team=1;g.serveSetup();assert.ok(g.server.y<0)});
test('early swing is buffered until a legal ball is in reach',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;const p=g.players[0];Object.assign(p,{x:10,y:35,vx:0,vy:0});Object.assign(g.ball,{x:10.5,y:36,z:1,vx:0,vy:-4,vz:.5});g.swing();assert.ok(g.hitBuffer>0);for(let i=0;i<35&&g.last===1;i++)g.update(C.dt);assert.equal(g.last,0);assert.equal(g.hitBuffer,0)});


test('a second bounce outside awards the rally to the hitter',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;Object.assign(g.ball,{x:21,y:40,z:.001,vx:0,vy:0,vz:-1});g.update(C.dt);assert.equal(g.message,'DOUBLE BOUNCE');assert.equal(g.phase,'pause');assert.equal(g.score.team,1)});


test('server keeps serving after scoring and partners change ends',()=>{const s=new Score();const first=s.player;s.point(0);assert.equal(s.player,first);assert.notEqual(s.rightPlayer[0],first);s.point(1);assert.equal(s.team,1);const next=s.player;s.point(1);assert.equal(s.player,next);s.point(0);assert.equal(s.server,2);assert.notEqual(s.player,next)});
test('service receivers stand diagonally opposite the server through rotation',()=>{const g=new Game();for(let n=0;n<12;n++){g.serveSetup();assert.notEqual(g.serveReceiver.x<10,g.server.x<10);assert.notEqual(g.serveReceiver.team,g.server.team);g.score.point(n%3===0?g.score.team:1-g.score.team)}});
test('kitchen lines forbid volleys',()=>{assert.match(legalVolley(0,29,0,3),/Kitchen/);assert.match(legalVolley(1,15,0,3),/Kitchen/)});
test('service on kitchen line is a fault',()=>{const g=new Game();completeToss(g);Object.assign(g.ball,{x:g.serveX<10?15:5,y:15,z:.001,vx:0,vy:0,vz:-1});g.update(C.dt);assert.equal(g.message,'SERVICE FAULT')});


test('serve formation keeps serving team back and receiving partner at kitchen',()=>{const g=new Game();for(const team of [0,1]){g.score.team=team;g.serveSetup();const serving=g.players.filter(p=>p.team===team),receiving=g.players.filter(p=>p.team!==team);for(const p of serving)assert.ok(team===0?p.y>=43:p.y<=1);const partner=receiving.find(p=>p!==g.serveReceiver);assert.equal(g.serveReceiver.y,team===0?-1:45);assert.equal(partner.y,team===0?14:30);assert.notEqual(g.serveReceiver.x<10,g.server.x<10)}});


test('receiving partner holds their assigned side during the serve',()=>{for(const team of [0,1]){const g=new Game();g.score.team=team;g.serveSetup();const partner=g.players.find(p=>p.team!==team&&p!==g.serveReceiver);const startX=partner.x;completeToss(g);for(let i=0;i<30&&g.phase==='rally';i++)g.update(C.dt);assert.equal(partner.x<10,startX<10);assert.ok(Math.abs(partner.x-startX)<1)}});


test('CPU selects a deep return, a third-shot drop and kitchen dinks',()=>{assert.equal(chooseCpuShot({shots:1,team:0,y:40,height:1,random:0}), 'drive');assert.equal(chooseCpuShot({shots:2,team:0,y:40,height:1,random:0}), 'drop');assert.equal(chooseCpuShot({shots:4,team:1,y:14,height:1,random:.5}), 'dink');assert.equal(chooseCpuShot({shots:4,team:1,y:14,height:3,random:0}), 'drive')});
test('serving team stays back while awaiting the return',()=>{const g=new Game();completeToss(g);const mate=g.players.find(p=>p.team===g.score.team&&p!==g.server);for(let i=0;i<30&&g.phase==='rally';i++)g.update(C.dt);assert.ok(mate.y>38)});


test('seeded watch match reaches a legal winning score',()=>{const original=Math.random;let seed=123456;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};try{const g=new Game();g.mode='watch';let maxShots=0;for(let i=0;i<120*1200&&g.phase!=='over';i++){g.update(C.dt);maxShots=Math.max(maxShots,g.shots)}assert.equal(g.phase,'over');assert.ok(maxShots>=3);const [a,b]=g.score.points;assert.ok(Math.max(a,b)>=11&&Math.abs(a-b)>=2)}finally{Math.random=original}});


test('serve returner starts behind the baseline and approaches the return',()=>{for(const team of [0,1]){const g=new Game();g.mode='watch';g.score.team=team;g.serveSetup();const r=g.serveReceiver,startY=r.y;assert.ok(r.team===0?startY>44:startY<0);completeToss(g);for(let i=0;i<110&&g.phase==='rally'&&g.bounces===0;i++){g.update(C.dt);assert.ok(r.y>=-3&&r.y<=47)}assert.ok(r.team===0?r.y<startY:r.y>startY)}});


test('CPU can use a defensive lob against a pair at the kitchen',()=>{assert.equal(chooseCpuShot({shots:4,team:0,y:30,height:1,opponentsAtKitchen:true,random:.99}),'lob');assert.equal(chooseCpuShot({shots:4,team:0,y:30,height:1,opponentsAtKitchen:false,random:.99}),'dink')});
test('missed timing feedback appears when an early swing expires',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=0;Object.assign(g.ball,{x:19,y:5,z:5,vx:0,vy:0,vz:0});g.swing();for(let i=0;i<45;i++)g.update(C.dt);assert.equal(g.message,'MISSED TIMING')});
test('side out retains the correct player positions across points',()=>{const s=new Score();s.point(1);const server=s.player;s.point(1);s.point(1);assert.equal(s.player,server);s.point(0);assert.notEqual(s.player,server);s.point(0);assert.equal(s.team,0);assert.equal(s.player,s.rightPlayer[0])});


test('human contact requires ball inside visible reach and height',()=>{const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;const p=g.players[0];Object.assign(p,{x:10,y:35});Object.assign(g.ball,{x:12.5,y:35,z:1});assert.equal(g.canHumanHit(),false);Object.assign(g.ball,{x:11,y:35,z:8});assert.equal(g.canHumanHit(),false);g.ball.z=2;assert.equal(g.canHumanHit(),true)});



test('abilities are isolated per player and affect speed and reach',()=>{const a={...playerProfile(),team:0,x:10,y:35,vx:0,vy:0},b={...playerProfile(),team:0,x:10,y:35,vx:0,vy:0};a.abilities.speed=6;for(let n=0;n<60;n++){move(a,19,35,C.dt);move(b,19,35,C.dt)}assert.ok(b.x>a.x);assert.equal(b.abilities.speed,12);const ball={x:12,y:35,z:2};a.x=b.x=10;assert.equal(contactAvailable(a,ball),false);a.abilities.reach=1.5;assert.equal(contactAvailable(a,ball),true)});
test('contact is limited to the paddle volume rather than the whole player silhouette',()=>{
 const p={...playerProfile(),team:0,x:10,y:35};const near={x:10.7,y:34.7,z:1.35},behind={x:10.5,y:36.2,z:1.5};
 assert.equal(contactAvailable(p,behind),true);assert.equal(paddleContactAvailable(p,behind,'drive'),false);assert.equal(paddleContactAvailable(p,near,'drive'),true);
 assert.ok(paddleContactTarget(p,near,'drive').x>p.x);assert.equal(paddleContactAvailable(p,{x:10.7,y:34.7,z:5.8},'overhead'),true);
});
test('paddle power and spin change flight independently',()=>{const a={x:10,y:44,z:4},b={...a};launch(a,10,0,'drive',{power:1,spin:1});launch(b,10,0,'drive',{power:1.5,spin:1.4});assert.ok(Math.abs(b.vy)>Math.abs(a.vy));assert.ok(b.spin>a.spin)});
test('contact responds immediately without pausing the ball or simulation',()=>{const g=new Game();g.phase='rally';g.shots=3;g.last=1;g.bounces=0;const p=g.players[0];p.x=10;p.y=35;Object.assign(g.ball,{x:11,y:35,z:2,vx:0,vy:-4,vz:0});assert.equal(g.hit(p,'drive',15),true);assert.equal(p.stroke,'forehand');assert.equal(p.contactType,'volley');assert.deepEqual(p.contactPoint,{x:11,y:35,z:2});assert.equal(g.events.filter(e=>e.type==='hit').length,1);assert.equal(g.pendingImpact,undefined);assert.ok(Math.hypot(g.ball.vx,g.ball.vy)>0);const before={x:p.x,y:p.y};move(p,19,35,C.dt);assert.ok(p.x>before.x);assert.notEqual(p.motion,'planted')});
test('paddle-face impact adds an incoming-ball deflection to the aimed launch',()=>{
 const make=incomingX=>{const g=new Game();g.phase='rally';g.shots=3;g.last=1;g.bounces=1;const p=g.players[0];Object.assign(p,{x:10,y:35});Object.assign(g.ball,{x:10.7,y:34.7,z:1.3,vx:incomingX,vy:8,vz:0});g.hit(p,'drive',15,1);return g.ball.vx};
 assert.notEqual(make(-5),make(5));
});
test('new serve preserves appearance and equipment while clearing old animation',()=>{const g=new Game();const p=g.players[0];p.appearance.shirtColor='red';p.paddle.power=1.2;p.contactPoint={x:1,y:1,z:1};g.serveSetup();assert.equal(p.appearance.shirtColor,'red');assert.equal(p.paddle.power,1.2);assert.equal(p.contactPoint,null)});


test('mishit chance is low on clean contact and high at the edge',()=>{const clean=playerProfile(),edge=playerProfile();clean.x=edge.x=10;clean.y=edge.y=35;clean.vx=edge.vx=clean.vy=edge.vy=0;const ball={x:10.5,y:35.5,z:1.4};assert.ok(contactQuality(clean,ball,'drive',false,.99).quality>.9);assert.equal(contactQuality(clean,ball,'drive',false,.99).mishit,false);const out=contactQuality(edge,{x:11.6,y:37.3,z:.2},'drive',false,0);assert.equal(out.mishit,true);assert.ok(out.quality<.65)});

test('low contact quality weakens the trajectory and marks a mishit',()=>{const clean={x:10,y:44,z:2},weak={...clean};launch(clean,10,4,'drive',{power:1,control:1,spin:1},1);launch(weak,10,4,'drive',{power:1,control:1,spin:1},.55);assert.ok(Math.abs(weak.vy)<Math.abs(clean.vy));const g=new Game();g.phase='rally';g.last=1;g.shots=3;g.bounces=1;const p=g.players[0];p.x=10;p.y=35;Object.assign(g.ball,{x:10.5,y:35.5,z:1});g.hit(p,'drive',15,.55);assert.equal(p.mishit,true);assert.match(g.message,/MISHIT/)});


test('easy difficulty queues swings for longer than normal without changing the rules',()=>{
 const bufferFor=(difficulty)=>{const g=new Game();g.setDifficulty(difficulty);g.phase='rally';g.last=1;g.shots=3;g.bounces=0;Object.assign(g.ball,{x:19,y:5,z:5,vx:0,vy:0,vz:0});g.swing();return g.hitBuffer};
 assert.equal(bufferFor('normal'),.3);assert.equal(bufferFor('easy'),.6)
 const g=new Game();g.setDifficulty('easy');g.reset();assert.equal(g.difficulty,'easy')
});

test('easy difficulty is more forgiving at the edge of the hit window',()=>{
 const p=playerProfile();Object.assign(p,{x:10,y:35,vx:0,vy:0});const ball={x:11.6,y:37.3,z:.2};
 const normal=contactQuality(p,ball,'drive',false,.35,'normal');
 const easy=contactQuality(p,ball,'drive',false,.35,'easy');
 assert.equal(normal.mishit,true);assert.equal(easy.mishit,false);assert.ok(easy.quality>normal.quality)
});
test('easy difficulty accepts a slightly late swing while normal does not',()=>{
 const setup=(difficulty)=>{const g=new Game();g.setDifficulty(difficulty);g.phase='rally';g.last=1;g.shots=3;g.bounces=1;const p=g.players[0];Object.assign(p,{x:10,y:35,vx:0,vy:0});Object.assign(g.ball,{x:10,y:38.8,z:1,vx:0,vy:-3,vz:0});g.clock=.2;g.lastHumanContactAt=0;g.swing();return g};
 const normal=setup('normal');assert.equal(normal.last,1);assert.equal(normal.hitBuffer,.3)
 const easy=setup('easy');assert.equal(easy.last,0);assert.equal(easy.hitBuffer,0);assert.ok(easy.events.some(event=>event.type==='hit'));assert.ok(Math.hypot(easy.ball.vx,easy.ball.vy)>0)
});
test('serve skill improves placement and hard and soft serves use distinct trajectories',()=>{
 const weak=playerProfile(),strong=playerProfile();weak.abilities.serve=.7;strong.abilities.serve=1.3;
 const weakTarget=serveTarget(weak,10,'hard',0),strongTarget=serveTarget(strong,10,'hard',0);
 assert.ok(Math.abs(10-strongTarget)<Math.abs(10-weakTarget));
 const hard={x:15,y:45.5,z:1},soft={x:15,y:45.5,z:1};launch(hard,8,8,'serve-hard',{power:1,spin:1});launch(soft,8,8,'serve-soft',{power:1,spin:1});
 assert.ok(Math.abs(hard.vy)>Math.abs(soft.vy));assert.equal(hard.shot,'serve-hard');assert.equal(soft.shot,'serve-soft')
});

test('human serves use the selected aim and serve button type',()=>{
 const g=new Game();g.server.x=5;g.aim=17;g.shot='soft';completeToss(g);assert.equal(g.ball.shot,'serve-soft');assert.match(g.message,/SOFT SERVE/);assert.ok(g.ball.vx>0);
 g.reset();g.server.x=15;g.aim=2;g.shot='attack';completeToss(g);assert.equal(g.ball.shot,'serve-hard');assert.match(g.message,/HARD SERVE/);assert.ok(g.ball.vx<0)
});
test('serve aiming stays inside the legal diagonal service box',()=>{
 const left={x:5},right={x:15};assert.equal(serveAim(left,2),10.8);assert.equal(serveAim(right,18),9.2);
 const g=new Game();g.aim=2;g.shot='attack';const original=Math.random;Math.random=()=>.5;try{completeToss(g)}finally{Math.random=original}
 let event=null;for(let i=0;i<500&&!event;i++)event=stepBall(g.ball,C.dt);
 assert.equal(event,'bounce');assert.ok(g.ball.x<=10);assert.ok(inBounds(g.ball.x,g.ball.y))
});

test('spin bends the flight and air drag removes forward speed',()=>{
 const top={x:10,y:5,z:10,vx:8,vy:0,vz:0,spin:2},back={...top,spin:-2};const before=Math.hypot(top.vx,top.vy);
 for(let i=0;i<20;i++){stepBall(top);stepBall(back)}
 assert.ok(top.vz<back.vz);assert.ok(Math.hypot(top.vx,top.vy)<before);
});

test('forehand and backhand follow the player facing on both court ends',()=>{
 for(const team of [0,1])for(const offset of [-.7,.7]){
  const g=new Game();g.phase='rally';g.shots=3;g.last=1-team;g.bounces=1;
  const p=g.players[team*2];Object.assign(p,{x:10,y:team===0?35:9});
  Object.assign(g.ball,{x:10+offset,y:p.y,z:2.5});
  assert.equal(g.hit(p,'drive',10),true);
  assert.equal(p.stroke,offset*(team===0?1:-1)>0?'forehand':'backhand');
 }
});
test('overheads require head-height balls and ordinary chest-height balls stay drives',()=>{
 const p={...playerProfile(),team:0,x:10,y:35};
 assert.equal(paddleContactAvailable(p,{x:10.7,y:34.7,z:5.8},'overhead'),true);
 assert.equal(paddleContactAvailable(p,{x:10.7,y:34.7,z:2.5},'overhead'),false);
 assert.equal(paddleContactAvailable(p,{x:10.7,y:34.7,z:4.5},'drive'),true);
});


test('individual shot ratings change mishit risk independently',()=>{
 const common={...playerProfile(),x:10,y:35,vx:0,vy:0},ball={x:10.6,y:35.2,z:1.4};
 const weak={...common,abilities:{...common.abilities,control:1.4,dink:.74,drive:1.2}};
 const strong={...common,abilities:{...common.abilities,control:1.4,dink:1.22,drive:.8}};
 const weakDink=contactQuality(weak,ball,'dink',false,.99),strongDink=contactQuality(strong,ball,'dink',false,.99);
 const weakDrive=contactQuality(weak,ball,'drive',false,.99),strongDrive=contactQuality(strong,ball,'drive',false,.99);
 assert.ok(strongDink.chance<weakDink.chance);assert.ok(strongDrive.chance>weakDrive.chance);
});

test('aggression changes attack selection without changing ball rules',()=>{
 const low=chooseCpuShot({shots:2,team:0,y:40,height:3.6,aggression:.15,random:.4});
 const high=chooseCpuShot({shots:2,team:0,y:40,height:3.6,aggression:1,random:.4});
 assert.equal(low,'drop');assert.equal(high,'drive');
});

test('ball radius makes a low center-of-ball cross the net',()=>{
 const b={x:10,y:22.1,z:2.95,vx:0,vy:-10,vz:0,radius:C.ballRadius};
 assert.equal(stepBall(b,.02),'net');
});

test('high-speed impacts lose more bounce than slow impacts',()=>{
 const slow={x:10,y:10,z:C.ballRadius+.001,vx:0,vy:-4,vz:-14,radius:C.ballRadius};
 const fast={...slow,z:C.ballRadius+.001,vz:-36};
 stepBall(slow);stepBall(fast);
 assert.ok(slow.vz/Math.abs(-14)>fast.vz/Math.abs(-36));
});

test('side spin curves the ball laterally and decays over time',()=>{
 const straight={x:10,y:10,z:2,vx:12,vy:-10,vz:3,spin:0,radius:C.ballRadius};
 const curved={...straight,spinY:20};
 for(let i=0;i<15;i++){stepBall(straight);stepBall(curved)}
 assert.ok(curved.x>straight.x+.005);assert.ok(curved.spinY<20);
});

test('serves make contact at a forward waist-height toss point',()=>{
 for(const team of [0,1]){const g=new Game();g.score.team=team;g.serveSetup();const server=g.server,y=server.y;completeToss(g);assert.equal(server.contactPoint.z,2.35);assert.equal(g.ball.z,2.35);assert.ok(team===0?server.contactPoint.y<y:server.contactPoint.y>y);assert.equal(server.stroke,'serve');assert.equal(server.animationContactStart,true)};
});

test('the net cannot block a ball passing outside the posts',()=>{
 const b={x:-1,y:22.1,z:1,vx:2,vy:-10,vz:0,radius:C.ballRadius};
 assert.notEqual(stepBall(b,.02),'net');assert.ok(b.y<22);
});

test('return difficulty affects mishit pressure and safe shot selection',()=>{
 const p={...playerProfile(),team:0,x:10,y:35,vx:0,vy:0},ball={x:10.6,y:35.2,z:1.5},far={...ball,x:15,y:39,z:.3};
 assert.ok(contactDifficulty(p,far,'drive')>contactDifficulty(p,ball,'drive'));
 assert.ok(netCrossingX({x:-1.65,y:26.5},{x:2,y:4})<0);
 assert.equal(chooseCpuShot({shots:5,team:0,y:30,height:2,aggression:.8,courtIQ:1,difficulty:.9,random:.5}),'lob');
});

test('serve returns remain drives even when return difficulty is severe',()=>{
 assert.equal(chooseCpuShot({shots:1,team:0,y:40,height:1.4,difficulty:.95,random:.5}),'drive');
});

test('serve receivers begin behind the baseline while awaiting the bounce',()=>{for(const team of [0,1]){const g=new Game();g.score.team=team;g.serveSetup();assert.ok(g.serveReceiver.team===0?g.serveReceiver.y>44:g.serveReceiver.y<0);assert.ok(g.serveReceiver.baselineTimer>2);}});

test('paddle contact uses sweet spot incoming pace and contact quality',()=>{
 const center={x:10,y:35,z:1.5},base={incoming:{x:0,y:-20,z:0},paddleVelocity:{x:0,y:-10,z:0},normal:{x:0,y:-1,z:0},center,power:1.1,control:1.4,spin:1.1,quality:1,swingDirection:1};
 const sweet=paddleContactResponse({...base,ball:center}),edge=paddleContactResponse({...base,ball:{...center,x:10.55,y:35.1,z:1.5}}),fast=paddleContactResponse({...base,ball:center,incoming:{x:0,y:-34,z:0}}),weak=paddleContactResponse({...base,ball:center,quality:.65});
 assert.ok(sweet.sweetSpot>edge.sweetSpot);assert.ok(sweet.paceScale>edge.paceScale);assert.ok(Math.abs(edge.twist)>0);assert.ok(fast.paceScale>=sweet.paceScale);assert.ok(weak.paceScale<sweet.paceScale);
});

test('serve uses a physical toss before contact',()=>{const g=new Game(),start=g.ball.z;g.serve();assert.ok(g.serveToss);g.update(.2);assert.equal(g.phase,'serve');assert.ok(g.ball.z>start);while(g.serveToss)g.update(1/120);assert.equal(g.phase,'rally');assert.ok(Math.abs(g.ball.z-2.35)<.02)});

test('net collision slows and rebounds the ball instead of deleting it',()=>{const b={x:10,y:22.1,z:1,vx:8,vy:-10,vz:-2,radius:C.ballRadius};assert.equal(stepBall(b,.02),'net');assert.equal(b.netContact,true);assert.ok(b.vy>0);assert.ok(Math.abs(b.vx)<8);assert.ok(b.y>C.net);});
test('net post collision has its own geometry and fault',()=>{const post={x:C.netPostLeft,y:22.1,z:1,vx:2,vy:-10,vz:0,radius:C.ballRadius};assert.equal(stepBall(post,.02),'post');const g=new Game();g.phase='rally';g.shots=3;g.last=0;g.bounces=0;g.ball={x:C.netPostLeft,y:22.1,z:1,vx:2,vy:-10,vz:0,radius:C.ballRadius};g.update(.02);assert.equal(g.message,'POST FAULT');});
test('a net touch falls back to the hitter before the net fault is called',()=>{const g=new Game();g.phase='rally';g.shots=3;g.last=0;g.bounces=0;g.ball={x:10,y:22.1,z:1,vx:8,vy:-10,vz:-2,radius:C.ballRadius};g.update(.02);assert.equal(g.phase,'rally');for(let i=0;i<200&&g.phase==='rally';i++)g.update(C.dt);assert.equal(g.message,'NET FAULT');});
