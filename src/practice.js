import {launch,stepBall,move,C} from './core.js?v=217';
import {seededRandom} from './competition.js?v=217';
import {planIncoming,volleyBrakeTarget} from './tactics.js?v=217';
import {volleyMomentumFault} from './player-feet.js?v=217';
import {prepareReceiver} from './match-animation.js?v=217';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const step=(shot,shots,playerY,feedY,feedTargetY,target,extra={})=>({shot,shots,playerY,feed:{fromY:feedY,toY:feedTargetY,shot:extra.feedShot??'drive'},target,...extra});

export const PRACTICE_DRILLS=Object.freeze({
 return:{name:'Deep return',instruction:'ATTACK after the bounce. Land in the deep target.',shot:'drive',shots:1,playerY:42,feedY:0,target:{left:2,right:18,top:1,bottom:10},sequence:[step('drive',1,42,0,39,{left:2,right:18,top:1,bottom:10},{feedShot:'serve-hard'})]},
 drop:{name:'Third-shot drop',instruction:'SOFT after the bounce. Aim short into the kitchen target.',shot:'drop',shots:2,playerY:39,feedY:5,target:{left:2,right:18,top:15.2,bottom:21},sequence:[step('drop',2,39,5,38,{left:2,right:18,top:15.2,bottom:21},{feedShot:'drive'})]},
 reset:{name:'Kitchen reset',instruction:'SOFT to absorb the drive. Aim short into the kitchen target.',shot:'dink',shots:4,playerY:30.6,feedY:13,target:{left:2,right:18,top:15.2,bottom:21},sequence:[step('dink',4,30.6,13,30.4,{left:2,right:18,top:15.2,bottom:21},{feedShot:'drive'})]},
 lob:{name:'Lob recovery',instruction:'LOB deep after the bounce. Clear the moving defense and land near the baseline.',shot:'lob',shots:6,playerY:35,feedY:8,target:{left:2,right:18,top:1,bottom:10},sequence:[step('lob',6,35,8,35,{left:2,right:18,top:1,bottom:10},{feedShot:'lob'})]},
 moving:{name:'Moving target',instruction:'ATTACK the moving target. Track the lane before contact.',shot:'drive',shots:2,playerY:42,feedY:0,target:{left:5,right:15,top:2,bottom:10,move:{axis:'x',center:10,amplitude:4,period:6}},sequence:[step('drive',2,42,0,39,{left:5,right:15,top:2,bottom:10,move:{axis:'x',center:10,amplitude:4,period:6}},{feedShot:'serve-hard'})]},
 transition:{name:'Transition sequence',instruction:'Drop the third shot, then attack the next feed when the lane opens.',shot:'drop',shots:2,playerY:42,feedY:5,target:{left:2,right:18,top:15.2,bottom:21},sequence:[
  step('drop',2,42,5,38,{left:2,right:18,top:15.2,bottom:21},{feedShot:'drive'}),
  step('drive',5,32,8,35,{left:2,right:18,top:1,bottom:10},{feedShot:'drive'})
 ]}
});

export class PracticeSession{
 constructor(id='return',seed=1){
  this.id=Object.hasOwn(PRACTICE_DRILLS,id)?id:'return';this.drill=PRACTICE_DRILLS[this.id];this.sequence=this.drill.sequence??[this.drill];this.seed=seed;this.random=seededRandom(seed);this.total=10;
  this.results=[];this.stepResults=[];this.sequenceIndex=0;this.state='feed';this.elapsed=0;this.cooldown=0;this.returnedShot=null;
 }
 get step(){return this.sequence[this.sequenceIndex]??this.sequence[0]}
 get successes(){return this.results.filter(result=>result.success).length}
 targetAt(clock=this.elapsed){
  const base=this.step.target??this.drill.target??{left:0,right:20,top:0,bottom:44};
  const move=base.move;
  if(!move)return {...base};
  const phase=((clock%move.period)+move.period)%move.period/move.period;
  const offset=Math.sin(phase*Math.PI*2)*move.amplitude;
  return {...base,left:clamp(base.left+offset,0,20),right:clamp(base.right+offset,0,20)};
 }
 nextBall(){
  const feed=this.step.feed??{fromY:this.drill.feedY,toY:this.id==='reset'?30.4:this.id==='return'?39:38,shot:this.id==='return'?'serve-hard':'drive'};
  const x=8+this.random()*4,b={x:7+this.random()*6,y:feed.fromY,z:2.35,vx:0,vy:0,vz:0};
  launch(b,x,feed.toY,feed.shot??'drive');return b;
 }
 recordStep(reason,success=false,landing=null){
  const result={index:this.sequenceIndex,expectedShot:this.step.shot,shot:this.returnedShot,success,reason,target:structuredClone(this.targetAt()),landing:landing?{x:landing.x,y:landing.y}:null};
  this.stepResults.push(result);return result;
 }
 finish(reason,success=false,landing=null){
  if(this.state!=='feed')return null;
  const result={attempt:this.results.length+1,success,reason,shot:this.returnedShot,landing:landing?{x:landing.x,y:landing.y}:null,steps:structuredClone(this.stepResults),sequenceLength:this.sequence.length};
  this.results.push(result);this.state=this.results.length===this.total?'complete':'result';this.cooldown=1.3;this.stepResults=[];this.sequenceIndex=0;return result;
 }
 summary(){return {id:this.id,name:this.drill.name,seed:this.seed,total:this.total,completed:this.results.length,successes:this.successes,sequenceLength:this.sequence.length,results:structuredClone(this.results)}}
}

export function beginPracticeFeed(game){
 const session=game.practice,p=game.players[0],coach=game.players.find(other=>other.team===1),current=session.step;
 game.serveSetup();game.phase='ready';game.last=1;game.shots=current.shots;game.bounces=0;game.ball=session.nextBall();
 Object.assign(p,{x:10,y:current.playerY,vx:0,vy:0,stamina:1,recoveryTimer:0,splitStepTimer:0});
 Object.assign(coach,{x:game.ball.x,y:current.feed.fromY+(session.id==='return'?-1:1),vx:0,vy:0,stroke:current.feed.shot==='lob'?'lob':session.id==='return'?'serve':'forehand',animationShot:current.feed.shot==='lob'?'lob':session.id==='return'?'serve':'drive',swing:.36,swingDuration:.36,contactPoint:{...game.ball}});
 game.shot=current.shot==='lob'?'lob':current.shot==='drive'?'attack':'soft';game.serveReceiver=p;game.server=coach;session.state='ready';session.cooldown=1.2;session.elapsed=0;session.returnedShot=null;coach.swing=0;game.message=`GET READY · ${current.instruction??session.drill.instruction}`;
}

export function finishPracticeFeed(game,reason,success=false,landing=null){
 const result=game.practice.finish(reason,success,landing);if(!result)return;
 game.emit('drill-result',result);game.hitBuffer=0;game.message=reason;game.result=`${success?'TARGET HIT':'TRY AGAIN'} · ${reason}`;game.outcome=`${game.practice.successes} / ${game.practice.results.length} TARGETS`;
 game.phase=game.practice.state==='complete'?'over':'pause';game.pause=1.3;
}

export function advancePracticeStep(game,reason,success,landing){
 const session=game.practice;session.recordStep(reason,success,landing);
 if(!success||session.sequenceIndex>=session.sequence.length-1){finishPracticeFeed(game,reason,success,landing);return false}
 session.sequenceIndex++;session.state='between';session.cooldown=.65;game.phase='pause';game.pause=.65;game.message=`GOOD · NEXT: ${session.step.instruction??session.drill.instruction}`;game.emit('drill-step',{attempt:session.results.length+1,step:session.sequenceIndex,success:true,landing:landing?{x:landing.x,y:landing.y}:null});return true;
}

export function updatePractice(game,dt){
 const session=game.practice;if(session.state==='complete')return;
 if(session.state==='ready'){
  session.cooldown-=dt;if(session.cooldown<=0){session.state='feed';game.phase='rally';game.message=session.step.instruction??session.drill.instruction;game.server.swing=.36;game.emit('rally-start',{practice:session.id,attempt:session.results.length+1,step:session.sequenceIndex})}return;
 }
 if(session.state==='between'){session.cooldown-=dt;if(session.cooldown<=0)beginPracticeFeed(game);return}
 if(session.state==='result'){session.cooldown-=dt;if(session.cooldown<=0){session.sequenceIndex=0;session.stepResults=[];beginPracticeFeed(game)}return}
 session.elapsed+=dt;const b=game.ball,event=stepBall(b,dt);
 game.trail.push({x:b.x,y:b.y,z:b.z});if(game.trail.length>8)game.trail.shift();
 if(event)game.emit(event,{position:{x:b.x,y:b.y,z:b.z}});
 if(event==='post'){advancePracticeStep(game,'Hit the net post',false);return}
 if(event==='bounce'){
  game.bounceMark={x:b.x,y:b.y,time:.35};game.lastBounceAt=game.clock;
  if(game.last===0){
   const zone=session.targetAt(),inside=b.x>=zone.left&&b.x<=zone.right&&b.y>=zone.top&&b.y<=zone.bottom,correct=session.returnedShot===session.step.shot;
   advancePracticeStep(game,!correct?`Use ${session.step.shot.toUpperCase()} for this drill`:inside?'Target hit':'Outside the target',inside&&correct,b);return;
  }
  game.bounces++;
  if(b.netContact&&b.y<22){finishPracticeFeed(game,'Feed hit the net');return}
  if(game.bounces>=2){finishPracticeFeed(game,'Second bounce · time the next feed earlier');return}
 }
 if(game.bounceMark)game.bounceMark.time=Math.max(0,game.bounceMark.time-dt);
 if(session.elapsed>8||b.y>49||b.y< -5||b.x< -5||b.x>25){finishPracticeFeed(game,game.last===0?'Outside the target':'No return · time the next feed earlier');return}
 const player=game.players[0];
 if(game.last===1){
  if(!game.teamPlan||game.clock>game.teamPlan.expires)game.teamPlan=planIncoming({players:game.players,team:0,ball:b,shots:game.shots,bounces:game.bounces,serveReceiver:player,clock:game.clock});
  const target=game.bounces===0&&game.shots>2?volleyBrakeTarget(player,game.teamPlan.point):game.teamPlan.point;
  move(player,target.x,target.y,dt);prepareReceiver(player,game);
 }else{
  const target=player.volleyMomentum?volleyBrakeTarget(player,{x:player.x,y:session.step.playerY}):{x:player.x,y:session.step.playerY};move(player,target.x,target.y,dt);
 }
 if(volleyMomentumFault(player)){finishPracticeFeed(game,'Kitchen momentum fault');return}
 game.updateSurfaceEffects(dt);
 if(game.canHumanHit())game.lastHumanContactAt=game.clock;
 if(game.hitBuffer>0)game.tryHumanHit();
}
