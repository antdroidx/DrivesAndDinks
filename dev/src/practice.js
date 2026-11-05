import {launch,stepBall,move,C} from './core.js?v=142';
import {seededRandom} from './competition.js?v=142';
import {planIncoming,volleyBrakeTarget} from './tactics.js?v=142';
import {volleyMomentumFault} from './player-feet.js?v=142';
import {prepareReceiver} from './match-animation.js?v=142';

export const PRACTICE_DRILLS=Object.freeze({
 return:{name:'Deep return',instruction:'ATTACK after the bounce. Land in the deep target.',shot:'drive',shots:1,playerY:42,feedY:0,target:{left:2,right:18,top:1,bottom:10}},
 drop:{name:'Third-shot drop',instruction:'SOFT after the bounce. Aim short into the kitchen target.',shot:'drop',shots:2,playerY:39,feedY:5,target:{left:2,right:18,top:15.2,bottom:21}},
 reset:{name:'Kitchen reset',instruction:'SOFT to absorb the drive. Aim short into the kitchen target.',shot:'dink',shots:4,playerY:30.6,feedY:13,target:{left:2,right:18,top:15.2,bottom:21}}
});

export class PracticeSession{
 constructor(id='return',seed=1){this.id=Object.hasOwn(PRACTICE_DRILLS,id)?id:'return';this.drill=PRACTICE_DRILLS[this.id];this.seed=seed;this.random=seededRandom(seed);this.total=10;this.results=[];this.state='feed';this.elapsed=0;this.cooldown=0;this.returnedShot=null}
 get successes(){return this.results.filter(r=>r.success).length}
 nextBall(){const x=8+this.random()*4,b={x:7+this.random()*6,y:this.drill.feedY,z:2.35,vx:0,vy:0,vz:0};launch(b,x,this.id==='reset'?30.4:this.id==='return'?39:38,this.id==='return'?'serve-hard':'drive');return b}
 finish(reason,success=false,landing=null){
  if(this.state!=='feed')return null;
  const result={attempt:this.results.length+1,success,reason,shot:this.returnedShot,landing:landing?{x:landing.x,y:landing.y}:null};
  this.results.push(result);this.state=this.results.length===this.total?'complete':'result';this.cooldown=1.3;return result;
 }
 summary(){return {id:this.id,name:this.drill.name,seed:this.seed,total:this.total,completed:this.results.length,successes:this.successes,results:structuredClone(this.results)}}
}

export function beginPracticeFeed(game){
 const session=game.practice,p=game.players[0],coach=game.players.find(other=>other.team===1);
 game.serveSetup();game.phase='ready';game.last=1;game.shots=session.drill.shots;game.bounces=0;game.ball=session.nextBall();
 Object.assign(p,{x:10,y:session.drill.playerY,vx:0,vy:0,stamina:1,recoveryTimer:0,splitStepTimer:0});
 Object.assign(coach,{x:game.ball.x,y:session.drill.feedY+(session.id==='return'?-1:1),vx:0,vy:0,stroke:session.id==='return'?'serve':'forehand',animationShot:session.id==='return'?'serve':'drive',swing:.36,swingDuration:.36,contactPoint:{...game.ball}});
 game.serveReceiver=p;game.server=coach;session.state='ready';session.cooldown=1.2;session.elapsed=0;session.returnedShot=null;coach.swing=0;game.message=`GET READY · ${session.drill.instruction}`;
}

export function finishPracticeFeed(game,reason,success=false,landing=null){
 const result=game.practice.finish(reason,success,landing);if(!result)return;
 game.emit('drill-result',result);game.hitBuffer=0;game.message=reason;game.result=`${success?'TARGET HIT':'TRY AGAIN'} · ${reason}`;game.outcome=`${game.practice.successes} / ${game.practice.results.length} TARGETS`;
 game.phase=game.practice.state==='complete'?'over':'pause';game.pause=1.3;
}

export function updatePractice(game,dt){
 const session=game.practice;if(session.state==='complete')return;
 if(session.state==='ready'){
  session.cooldown-=dt;if(session.cooldown<=0){session.state='feed';game.phase='rally';game.message=session.drill.instruction;game.server.swing=.36;game.emit('rally-start',{practice:session.id,attempt:session.results.length+1})}return;
 }
 if(session.state==='result'){session.cooldown-=dt;if(session.cooldown<=0)beginPracticeFeed(game);return}
 session.elapsed+=dt;const b=game.ball,event=stepBall(b,dt);
 game.trail.push({x:b.x,y:b.y,z:b.z});if(game.trail.length>8)game.trail.shift();
 if(event)game.emit(event,{position:{x:b.x,y:b.y,z:b.z}});
 if(event==='post'){finishPracticeFeed(game,'Hit the net post');return}
 if(event==='bounce'){
  game.bounceMark={x:b.x,y:b.y,time:.35};game.lastBounceAt=game.clock;
  if(game.last===0){
   const zone=session.drill.target,inside=b.x>=zone.left&&b.x<=zone.right&&b.y>=zone.top&&b.y<=zone.bottom;
   const correct=session.returnedShot===session.drill.shot;
   finishPracticeFeed(game,!correct?`Use ${session.drill.shot.toUpperCase()} for this drill`:inside?'Target hit':'Outside the target',inside&&correct,b);return;
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
  const target=player.volleyMomentum?volleyBrakeTarget(player,{x:player.x,y:session.drill.playerY}):{x:player.x,y:session.drill.playerY};move(player,target.x,target.y,dt);
 }
 if(volleyMomentumFault(player)){finishPracticeFeed(game,'Kitchen momentum fault');return}
 game.updateSurfaceEffects(dt);
 if(game.canHumanHit())game.lastHumanContactAt=game.clock;
 if(game.hitBuffer>0)game.tryHumanHit();
}
