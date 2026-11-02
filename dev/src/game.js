import {prepareReceiver,strokeDuration} from './match-animation.js?v=54';
import {strokeForContact} from './player-facing.js?v=54';
import {planIncoming,formationTarget,separateTargets} from './tactics.js?v=54';
import {createLineup} from './roster.js?v=54';
import {C,side,stepBall,launch,inBounds,legalVolley,Score,move,chooseCpuShot,playerProfile,paddleContactAvailable,paddleContactTarget,contactQuality,selectShot,aimStep,serveTarget,shotSkill,gripModifiers} from './core.js?v=54';
export class Game{constructor(){this.mode='play';this.difficulty='normal';this.lineup=null;this.lastHumanContactAt=-Infinity;this.reset()}
 configure(selection,lineup=null){this.lineup=lineup??createLineup(selection);this.reset()}
 setDifficulty(difficulty){this.difficulty=['easy','normal','hard'].includes(difficulty)?difficulty:'normal';return this.difficulty}
 timingWindow(){return this.difficulty==='easy'?{early:.6,late:.2}:this.difficulty==='hard'?{early:.15,late:0}:{early:.3,late:.08}}
 paddleFor(player,shot='drive'){const paddle=player.paddle??{},abilities=player.abilities??{};return {...paddle,power:(paddle.power??1)*(abilities.power??1),spin:(paddle.spin??1)*(abilities.spin??1),skill:shotSkill(player,shot)}}
 reset(){this.teamPlan=null;this.tacticalStats={poachAttempts:0,poachHits:0,coverSwaps:0,offBallDistance:0,mishitHits:0};this.events=[];this.trail=[];this.clock=0;this.score=new Score();this.players=[0,1,2,3].map((id)=>({...(this.lineup?structuredClone(this.lineup[id]):playerProfile()),id,team:id<2?0:1,x:id%2?15:5,y:id<2?39:5,vx:0,vy:0,swing:0}));this.aim=10;this.shot='attack';this.hitBuffer=0;this.feedbackTime=0;this.message='GET READY';this.pause=1;this.paused=false;this.serveSetup()}
 setPaused(paused){if(this.phase==='over'){this.paused=false;return false}this.paused=Boolean(paused);if(this.paused){this.hitBuffer=0;if(this.players[0])this.players[0].windup=0}return this.paused}
 togglePaused(){return this.setPaused(!this.paused)}
 nudgeAim(direction,fine=false){this.aim=Math.max(1,Math.min(19,this.aim+Math.sign(direction)*aimStep(this.players[0],fine)))}
 emit(type,detail={}){this.events.push({type,...detail});if(this.events.length>32)this.events.shift()}
 serveSetup(){this.replayFrames=[];this.replayHighlights=[];this.replayClip=null;this.replayTick=0;this.poachReservation=null;this.teamPlan=null;this.lastShot='serve';this.lastHitter=null;this.bounceMark=null;this.trail=[];this.contact=null;this.phase='serve';this.hitBuffer=0;this.lastHumanContactAt=-Infinity;this.shots=0;this.bounces=0;this.last=this.score.team;this.server=this.players[this.score.team*2+this.score.player];let right=this.score.player===this.score.rightPlayer[this.score.team];this.server.x=(this.score.team===0?right:!right)?15:5;this.server.y=this.score.team===0?45.5:-1.5;let mate=this.players[this.score.team*2+(1-this.score.player)];mate.x=20-this.server.x;mate.y=this.score.team===0?43:1;for(const p of this.players.filter(p=>p.team!==this.score.team)){const right=p.id%2===this.score.rightPlayer[p.team];p.x=(p.team===0?right:!right)?15:5;p.y=p.team===0?38:6;p.vx=0;p.vy=0}this.server.vx=this.server.vy=mate.vx=mate.vy=0;this.serveReceiver=this.players[(1-this.score.team)*2+(this.server.x<10?this.players[(1-this.score.team)*2].x>10?0:1:this.players[(1-this.score.team)*2].x<10?0:1)];for(const p of this.players.filter(p=>p.team!==this.score.team)){p.y=p===this.serveReceiver?(p.team===0?42:2):(p.team===0?30:14)}for(const p of this.players){p.lane=p.x<10?5:15;p.coverLane=p.lane;p.tacticalRole='hold';p.swing=0;p.windup=0;p.preparation=null;p.contactPoint=null;p.contactGrip=null;p.stroke='ready';p.animationShot='ready';p.reactionWait=0;p.stride=0}this.message=this.server.id===0&&this.mode==='play'?'YOUR SERVE: HARD OR SOFT':'GET READY';this.ball={x:this.server.x,y:this.server.y,z:1,vx:0,vy:0,vz:0,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius};this.timer=0}
 fault(team,why){if(this.phase==='pause'||this.phase==='over')return;const servingTeam=this.score.team,winner=1-team;this.score.point(winner);this.result=`${winner===0?'YOUR TEAM':'CPU'} WINS RALLY · ${why.toUpperCase()}`;this.outcome=winner===servingTeam?'POINT':this.score.team!==servingTeam?'SIDE OUT':'SECOND SERVER';this.message=why.toUpperCase();this.phase=this.score.winner===null?'pause':'over';this.pause=2.5;const highlight=this.replayHighlights.at(-1);if(this.replayFrames.length>15&&(highlight||this.shots>=15)){const start=highlight?Math.max(0,highlight.time-2):Math.max(0,this.clock-7),end=highlight?Math.min(this.clock,highlight.time+2):this.clock;this.replayClip={label:highlight?.label??`${this.shots}-SHOT RALLY`,frames:this.replayFrames.filter(f=>f.clock>=start&&f.clock<=end)};}}
 hit(player,shot,aim,quality=1){
  const err=legalVolley(player.team,player.y,this.bounces,this.shots);if(err){this.fault(player.team,err);return false}
  if(this.bounces>1){this.fault(player.team,'Double bounce');return false}
  const incomingVelocity={x:this.ball.vx||0,y:this.ball.vy||0,z:this.ball.vz||0},poor=quality<.8,wasPoach=!poor&&this.poachReservation?.shot===this.shots&&this.poachReservation.playerId===player.id;
  if(!poor&&(shot==='atp'||shot==='erne'))this.replayHighlights.push({time:this.clock,label:shot==='atp'?'AROUND THE POST':'ERNE'});
  player.mishit=poor;this.lastShot=shot;player.animationShot=shot;player.animationContactStart=true;this.lastHitter=player.id;
  let targetY=player.team===0?(shot==='dink'?14:shot==='drop'?12:shot==='slice'?6:4):(shot==='dink'?30:shot==='drop'?32:shot==='slice'?38:40);
  const technique=shotSkill(player,shot),grip=gripModifiers(player,this.ball,shot);player.contactGrip=grip.grip;
  if(shot==='lob'){const depth=1.8+(1-quality)*13+Math.max(0,1-technique)*7+Math.random()*2;targetY=player.team===0?depth:44-depth;}
  if(shot==='overhead'){const depth=3+Math.random()*9+(1-quality)*8+Math.max(0,1-technique)*5;targetY=player.team===0?depth:44-depth;}
  player.stroke=strokeForContact(player,this.ball);player.contactType=this.bounces===0?'volley':'groundstroke';player.contactPoint={x:this.ball.x,y:this.ball.y,z:this.ball.z};player.contactPaddleTarget=paddleContactTarget(player,this.ball,shot);
  player.swingDuration=strokeDuration(player,shot);player.preparation=null;
  if(poor)aim+=(Math.random()-.5)*4/quality;
  player.swingSide=this.ball.x>=player.x?1:-1;player.swing=player.swingDuration;player.windup=0;
  launch(this.ball,aim,targetY,shot,{...this.paddleFor(player,shot),power:this.paddleFor(player,shot).power*grip.power,spin:this.paddleFor(player,shot).spin*grip.spin,loft:shot==='lob'?1+Math.random()*.22:1},quality);this.ball.spinY=(this.ball.x-player.x)*12;if(shot==='slice')this.ball.spinZ=Math.sign(this.ball.vy||-1)*.8;
  const netward=player.team===0?-1:1,faceSide=(this.ball.x>=player.x?1:-1)*(player.stroke==='backhand'?-1:1),normalLength=Math.hypot(faceSide*.32,1,shot==='overhead'?.22:.12);
  const normal={x:faceSide*.32/normalLength,y:netward/normalLength,z:(shot==='overhead'?-.22:.12)/normalLength};
  const closing=Math.max(0,-(incomingVelocity.x*normal.x+incomingVelocity.y*normal.y+incomingVelocity.z*normal.z));
  const restitution=(shot==='overhead'?.18:['drop','dink'].includes(shot)?.06:.12)*quality;
  this.ball.vx+=normal.x*closing*restitution;this.ball.vy+=normal.y*closing*restitution*.2;this.ball.vz+=normal.z*closing*restitution;
  if(wasPoach)this.tacticalStats.poachHits++;if(poor)this.tacticalStats.mishitHits++;
  for(const p of this.players)if(p.team!==player.team)p.reactionWait=p.abilities.reaction;
  this.contact={x:player.contactPoint.x,y:player.contactPoint.y,z:player.contactPoint.z,time:.12};
  this.emit('hit',{shot,stroke:player.stroke});this.last=player.team;this.shots++;this.bounces=0;
  this.message=(wasPoach?'POACH · ':poor?'MISHIT · ':'')+shot.toUpperCase();return true;
 }
 canHumanHit(late=false){if(this.paused)return false;const p=this.players[0],b=this.ball,timing=this.timingWindow();return this.mode==='play'&&this.phase==='rally'&&this.last!==0&&(this.shots!==1||this.serveReceiver.id===0)&&side(b.y)===0&&(paddleContactAvailable(p,b,selectShot(p,b,this.shot))||(late&&timing.late>0&&this.clock-this.lastHumanContactAt<=timing.late))&&!legalVolley(0,p.y,this.bounces,this.shots)}
 tryHumanHit(late=false){if(!this.canHumanHit(late))return false;const p=this.players[0];const distance=Math.hypot(p.x-this.ball.x,p.y-this.ball.y);const buffered=this.hitBuffer>0,timed=buffered||late;this.hitBuffer=0;p.windup=0;const chosen=selectShot(p,this.ball,this.shot);const contact=contactQuality(p,this.ball,chosen,timed,Math.random(),this.difficulty);const aim=this.aim+(Math.random()-.5)*distance/(p.abilities.control*p.paddle.control*shotSkill(p,chosen));this.hit(p,chosen,aim,contact.quality);this.message=contact.mishit?`MISHIT · ${chosen.toUpperCase()}`:late?'GOOD LATE TIMING':buffered?'GOOD TIMING':distance<1.8?'GREAT CONTACT':'REACHING';this.feedbackTime=.65;return true}
 swing(){if(this.paused)return;if(this.phase==='serve'&&this.server.id===0&&this.mode==='play'){this.serve();return}if(this.phase!=='rally'||this.mode!=='play')return;if(this.tryHumanHit()||this.tryHumanHit(true))return;const window=this.timingWindow();this.hitBuffer=window.early;this.players[0].windup=this.hitBuffer;this.message='SWING QUEUED'}
 serve(){const type=this.shot==='soft'?'soft':'hard',shot=type==='soft'?'serve-soft':'serve-hard',target=serveTarget(this.server,this.aim,type);this.server.contactPoint={x:this.ball.x,y:this.ball.y,z:this.ball.z};this.server.stroke='serve';this.server.animationShot='serve';this.server.animationContactStart=true;this.server.swingDuration=strokeDuration(this.server,'serve');this.server.preparation=null;this.emit('hit',{shot,stroke:'serve'});this.server.swingSide=1;this.server.swing=this.server.swingDuration;this.contact={x:this.ball.x,y:this.ball.y,z:this.ball.z,time:.12};this.serveX=this.server.x;launch(this.ball,target,this.server.team===0?8:36,shot,this.paddleFor(this.server,'serve'));this.ball.spinY=0;this.last=this.server.team;this.shots=1;this.bounces=0;this.phase='rally';this.message=type.toUpperCase()+' SERVE'}
 recordReplay(){
 if(this.phase!=='rally'||this.replayTick++%4)return;
 const frame=structuredClone({clock:this.clock,players:this.players,ball:this.ball,trail:this.trail,contact:this.contact,bounceMark:this.bounceMark,score:this.score,phase:this.phase,mode:this.mode,difficulty:this.difficulty,aim:this.aim,shot:this.shot,shots:this.shots,message:this.message,timer:this.timer,serverId:this.server.id});
 this.replayFrames.push(frame);if(this.replayFrames.length>360)this.replayFrames.shift();
 }
 update(dt){if(this.paused)return;this.recordReplay();this.clock+=dt;for(const p of this.players){p.reactionWait=Math.max(0,(p.reactionWait||0)-dt);p.swing=Math.max(0,p.swing-dt);p.windup=Math.max(0,(p.windup||0)-dt)}if(this.contact)this.contact.time=Math.max(0,this.contact.time-dt);const pending=this.hitBuffer;this.hitBuffer=Math.max(0,this.hitBuffer-dt);this.feedbackTime=Math.max(0,this.feedbackTime-dt);if(pending>0&&this.hitBuffer===0&&this.phase==='rally'){this.message='MISSED TIMING';this.feedbackTime=.65}if(this.phase==='over')return;if(this.phase==='pause'){this.pause-=dt;if(this.pause<=0)this.serveSetup();return}if(this.phase==='serve'){this.timer+=dt;if((this.mode==='watch'||this.server.id!==0)&&this.timer>1.2)this.serve();return}
 const b=this.ball;this.trail.push({x:b.x,y:b.y,z:b.z});if(this.trail.length>8)this.trail.shift();const event=stepBall(b,dt);if(event){this.emit(event);if(event==='bounce')this.bounceMark={x:b.x,y:b.y,time:.35}}if(this.bounceMark)this.bounceMark.time=Math.max(0,this.bounceMark.time-dt);if(event==='net'){this.fault(this.last,'Net fault');return}if(event==='bounce'){const team=side(b.y);if(this.bounces>0){this.fault(1-this.last,'Double bounce');return}if(!inBounds(b.x,b.y)){this.fault(this.last,'Out');return}if(team===this.last){this.fault(this.last,'Wrong side');return}this.bounces++;if(this.shots===1){const legalX=this.serveX<10?b.x>=10:b.x<=10;const legalY=team===0?b.y>29:b.y<15;if(!legalX||!legalY){this.fault(this.last,'Service fault');return}}if(this.bounces>=2){this.fault(team,'Double bounce');return}}
 const incoming=1-this.last;
 if(!this.teamPlan||this.teamPlan.shot!==this.shots||this.clock>this.teamPlan.expires){
   this.teamPlan=planIncoming({players:this.players,team:incoming,ball:b,shots:this.shots,bounces:this.bounces,serveReceiver:this.serveReceiver,clock:this.clock});
   if(this.teamPlan.poach){
     if(this.poachReservation?.shot!==this.shots)this.tacticalStats.poachAttempts++;this.poachReservation={shot:this.shots,playerId:this.teamPlan.receiverId};
     const poacher=this.players[this.teamPlan.receiverId],mate=this.players.find(p=>p.team===incoming&&p!==poacher);
     const newLane=this.teamPlan.point.x<10?5:15;
     if(poacher.coverLane!==newLane){poacher.coverLane=newLane;mate.coverLane=20-newLane;this.tacticalStats.coverSwaps++}
   }
 }
 const r=this.players[this.teamPlan.receiverId],targets=[];
 for(const p of this.players){
   const target=formationTarget(p,{ball:b,incoming,receiverId:r.id,point:this.teamPlan.point,shots:this.shots,servingTeam:this.score.team,lastShot:this.lastShot,lastHitter:this.lastHitter});
   if(p===r){p.tacticalRole=this.teamPlan.poach?'poach':'receive';if(this.shots===1&&this.bounces===0)target.y=p.team===0?Math.max(38,target.y+3):Math.min(6,target.y-3)}else p.tacticalRole=target.role;
   targets.push({player:p,target});
 }
 separateTargets(targets,0,incoming===0?r.id:null);separateTargets(targets,1,incoming===1?r.id:null);
 for(const {player:p,target} of targets){
   const oldX=p.x,oldY=p.y;
   if(p.reactionWait<=0)move(p,target.x,target.y,dt);else move(p,p.x,p.y,dt);
   if(p!==r)this.tacticalStats.offBallDistance+=Math.hypot(p.x-oldX,p.y-oldY);
 }
 for(const p of this.players)prepareReceiver(p,this);
 if(this.canHumanHit())this.lastHumanContactAt=this.clock;
 if(this.hitBuffer>0&&this.tryHumanHit())return;
 const cpuCanRespond=(r.id!==0||this.mode==='watch')&&side(b.y)===incoming&&(this.shots>2||this.bounces>0);
 if(cpuCanRespond&&(paddleContactAvailable(r,b,'drive')||paddleContactAvailable(r,b,'overhead'))){
  const landingTime=(b.vz+Math.sqrt(Math.max(0,b.vz*b.vz+2*C.gravity*b.z)))/C.gravity;
  if(this.bounces===0&&(b.x+b.vx*landingTime<0||b.x+b.vx*landingTime>20))return;
  if(legalVolley(r.team,r.y,this.bounces,this.shots))return;
  const opponents=this.players.filter(p=>p.team!==r.team),opponentsAtKitchen=opponents.every(p=>p.team===0?p.y<34:p.y>10);
  const attackSkill=((r.abilities.drive??1)+(r.abilities.smash??1)+(r.abilities.power??1))/3,softSkill=((r.abilities.drop??1)+(r.abilities.dink??1)+(r.abilities.defense??1))/3,shot=chooseCpuShot({shots:this.shots,team:r.team,y:r.y,height:b.z,opponentsAtKitchen,aggression:r.abilities.aggression,courtIQ:r.abilities.courtIQ,attackSkill,softSkill}),chosen=selectShot(r,b,shot);
  if(!paddleContactAvailable(r,b,chosen)){ }
  else{
   const middle=(opponents[0].x+opponents[1].x)/2,attackMiddle=Math.random()<.38;
   const target=attackMiddle?Math.max(6.5,Math.min(13.5,middle)):(shot==='drive'?(middle<10?18.2:1.8):(r.x<10?17.5:2.5));
   const pressure=Math.min(2,Math.hypot(r.vx,r.vy)/12)+Math.min(1,this.shots/40);
   const error=(Math.random()+Math.random()+Math.random()-1.5)*(shot==='drive'?2.5:2.2)*(1+pressure*.4)/(r.abilities.control*r.paddle.control*shotSkill(r,chosen)*(shot==='drop'||shot==='dink'?(r.abilities.defense??1):1));
   const contact=contactQuality(r,b,chosen,false);this.hit(r,chosen,target+error,contact.quality);
  }
 }
 if(b.y< -5||b.y>49||b.x< -8||b.x>28)this.fault(this.bounces>0?1-this.last:this.last,this.bounces>0?'Unreturned':'Out')}
}
