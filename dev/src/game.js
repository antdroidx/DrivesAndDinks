import {lineReplayReview,footReplayReview,netReplayReview} from './fault-replay.js?v=173';
import {OpponentMemory,anticipateReturn} from './opponent-memory.js?v=173';
import {MatchJournal} from './match-journal.js?v=173';import {summarizePlaytest} from './playtest-summary.js?v=173';
import {PracticeSession,beginPracticeFeed,updatePractice,finishPracticeFeed} from './practice.js?v=173';
import {kitchenContact,volleyMomentumFault} from './player-feet.js?v=173';
import {seededRandom} from './competition.js?v=173';
import {kitchenFootContact} from './core.js?v=173';
import {prepareReceiver,strokeDuration} from './match-animation.js?v=173';
import {strokeForContact} from './player-facing.js?v=173';
import {planIncoming,commitDoublesCoverage,formationTarget,separateTargets,chooseCpuPlacement,cpuServePlan,serveReturnTarget,volleyBrakeTarget,safeVolleyRecovery,waitForRisingContact} from './tactics.js?v=173';
import {createLineup,applyPhysique} from './roster.js?v=173';import {postRallyReactionPlan,applyRallyReactions} from './player-emotion.js?v=173';
import {normalizeStackingSelection,createStackPlans,stackFallbackReason,commitStackingCoverage,summarizeStacking} from './stacking.js?v=173';
import {C,side,stepBall,launch,inBounds,legalVolley,Score,move,chooseCpuShot,venueConditions,playerProfile,paddleContactAvailable,paddleContactTarget,contactQuality,selectShot,aimStep,serveTarget,shotSkill,gripModifiers,contactDifficulty,resolvePlayerCollisions,paddleContactResponse,paddleShapeModifiers,shotDepthTarget,strokePower,atpTargetX} from './core.js?v=173';
export class Game{constructor({seed}={}){this.seed=seed??null;this.showNameTags=true;this.random=seed===undefined?()=>Math.random():seededRandom(seed);this.visualRandom=seededRandom((seed??Date.now())^0x51f15e);this.format='doubles';this.mode='play';this.difficulty='normal';this.lineup=null;this.stackingConfig=normalizeStackingSelection();this.lastHumanContactAt=-Infinity;this.sideSwitched=false;this.sideSwitchThreshold=6;this.sideSwitchCount=0;this.reset()}
 configure(selection,lineup=null){this.showNameTags=selection?.showNameTags!==false&&selection?.showNameTags!=='false';if(selection?.format)this.format=selection.format==='singles'?'singles':'doubles';this.stackingConfig=normalizeStackingSelection(selection?.stacking);this.lineup=(lineup??createLineup(selection,{random:this.random})).map(p=>applyPhysique(p));this.reset()}
 startPractice(id='return',seed=1){this.format='singles';this.mode='play';this.reset();this.practice=new PracticeSession(id,seed);this.depth=this.practice.id==='return'?.5:.15;beginPracticeFeed(this)}
 matchReport(){return {schemaVersion:1,build:globalThis.DRIVES_DINKS_BUILD??'dev',seed:this.seed,format:this.format,mode:this.practice?'practice':this.mode,difficulty:this.difficulty,showNameTags:this.showNameTags!==false,elapsed:this.phase==='over'?(this.journal.rallies.at(-1)?.time??this.clock):this.clock,complete:this.phase==='over',score:structuredClone(this.score),players:this.players.map(p=>({id:p.id,team:p.team,name:p.name??`Player ${p.id+1}`,handedness:p.handedness??'right',archetype:p.archetype??p.ratingStyle??'balanced',attributes:structuredClone(p.attributes??{}),physique:structuredClone(p.physique??null),paddle:structuredClone(p.paddle)})),stats:structuredClone(this.stats),tactics:structuredClone(this.tacticalStats),journal:this.journal.snapshot(),playtest:summarizePlaytest(this.journal.snapshot(),this.stats,this.tacticalStats),learning:this.opponentMemory.snapshot(),practice:this.practice?.summary()??null,sideSwitched:this.sideSwitched,sideSwitchThreshold:this.sideSwitchThreshold,stacking:{config:structuredClone(this.stackingConfig),plans:structuredClone(this.stackPlans??[]),summary:summarizeStacking(this.journal.snapshot(),this.tacticalStats)}}}
 observeOpponentShot(){const shot=this.observedShot;if(!shot)return;this.observedShot=null;if(!this.practice&&side(this.ball.y)!==shot.team)this.opponentMemory.observe({...shot,x:this.ball.x,y:this.ball.y})}
 setPhysique(appearance){
  for(const roster of [this.lineup,this.players])if(roster?.[0]){const p=roster[0],adjusted=applyPhysique(p,{...p.appearance,...appearance});Object.assign(p,{appearance:adjusted.appearance,abilities:adjusted.abilities,baseAbilities:adjusted.baseAbilities,physique:adjusted.physique})}
 }
 setDifficulty(difficulty){this.difficulty=['easy','normal','hard'].includes(difficulty)?difficulty:'normal';return this.difficulty}
 maybeSwitchSides(){if(this.practice||this.score.winner!==null||this.sideSwitched||Math.max(...this.score.points)<this.sideSwitchThreshold)return false;this.sideSwitched=true;this.sideSwitchCount++;this.message='SWITCH SIDES';this.emit('side-switch',{score:[...this.score.points],at:this.sideSwitchThreshold});return true}
 timingWindow(){return this.difficulty==='easy'?{early:.6,late:.2}:this.difficulty==='hard'?{early:.15,late:0}:{early:.3,late:.08}}
 paddleFor(player,shot='drive'){const paddle=player.paddle??{},abilities=player.abilities??{},shape=paddleShapeModifiers(player);return {...paddle,power:(paddle.power??1)*shape.power*(abilities.power??1),control:(paddle.control??1)*shape.control,spin:(paddle.spin??1)*(abilities.spin??1),skill:shotSkill(player,shot)}}
 reset(){this.practice=null;this.opponentMemory=new OpponentMemory();this.observedShot=null;this.journal=new MatchJournal();this.scenario=null;this.teamPlan=null;this.tacticalStats={poachAttempts:0,poachHits:0,coverSwaps:0,offBallDistance:0,mishitHits:0,patternReads:0,singlesApproaches:0,contactWaits:0,recoverySets:0,stackDecisions:0,stackSelected:0,stackNeeded:0,stackAligned:0,stackCrossPlanned:0,stackCrossings:0,stackStays:0,stackFallbacks:0,stackByTeamType:{},stackByHandPair:{}};this.stats={rallies:0,serves:0,shots:{},faults:{},patterns:{},teams:[{hits:0,mishits:0},{hits:0,mishits:0}]};this.events=[];this.trail=[];this.clock=0;this.score=new Score(this.format);this.sideSwitched=false;this.sideSwitchCount=0;this.players=(this.format==='singles'?[0,2]:[0,1,2,3]).map((id)=>({...(this.lineup?structuredClone(this.lineup[id]):playerProfile()),id,team:id<2?0:1,x:id%2?15:5,y:id<2?39:5,vx:0,vy:0,swing:0}));this.aim=10;this.depth=.5;this.humanFeedback='';this.shot='attack';this.hitBuffer=0;this.feedbackTime=0;this.message='GET READY';this.pause=1;this.paused=false;this.serveSetup()}
 setVenue(surfaceKind='outdoor'){this.surfaceKind=surfaceKind;this.conditions=venueConditions(surfaceKind,this.random);return this.conditions}
 setPaused(paused){if(this.phase==='over'){this.paused=false;return false}this.paused=Boolean(paused);if(this.paused){this.hitBuffer=0;if(this.players[0])this.players[0].windup=0}return this.paused}
 togglePaused(){return this.setPaused(!this.paused)}
 nudgeAim(direction,fine=false){this.aim=Math.max(1,Math.min(19,this.aim+Math.sign(direction)*aimStep(this.players[0],fine)))}
 setDepth(value){if(Number.isFinite(value))this.depth=Math.max(0,Math.min(1,value));return this.depth}
 nudgeDepth(direction,fine=false){return this.setDepth(this.depth+Math.sign(direction)*(fine?.025:.1))}
 targetDepth(shot){return shotDepthTarget(0,shot,this.depth)}
 emit(type,detail={}){this.journal.record(type,this.clock,detail);this.events.push({type,...detail});if(this.events.length>32)this.events.shift()}
 activateStacking(player,shotNumber,quality=1){const plan=this.stackPlans?.[player.team];if(!plan?.selected||plan.activated||shotNumber!==plan.triggerShot)return false;if(plan.triggerRole==='serve'&&player.id!==this.server.id)return false;if(plan.triggerRole==='return'&&player.id!==this.serveReceiver.id)return false;plan.activated=true;plan.trigger={shotNumber,playerId:player.id,quality,mishit:Boolean(player.mishit),time:this.clock};plan.crossAfter=plan.mode!=='stay';const reason=plan.crossAfter?stackFallbackReason(plan,{players:this.players,lastShot:this.lastShot,ball:this.ball}):null;if(reason){plan.fallback=reason;plan.crossAfter=false;this.tacticalStats.stackFallbacks++;this.emit('stack-fallback',{team:plan.team,reason,shot:shotNumber,playerId:player.id});return true}if(plan.mode==='stay'){this.tacticalStats.stackStays++;this.emit('stack-stay',{team:plan.team,shot:shotNumber,playerId:player.id})}else{this.tacticalStats.stackCrossPlanned++;this.emit('stack-cross',{team:plan.team,shot:shotNumber,playerId:player.id,targetLanes:structuredClone(plan.targetLanes)})}return true}
 updateStackingSafety(){for(const plan of this.stackPlans??[]){const reason=stackFallbackReason(plan,{players:this.players,lastShot:this.lastShot,ball:this.ball});if(reason){plan.fallback=reason;plan.crossAfter=false;this.tacticalStats.stackFallbacks++;this.emit('stack-fallback',{team:plan.team,reason,shot:this.shots})}}}
 serveSetup(){
  this.observedShot=null;this.replayReview=null;this.lastPointWinner=null;this.lastPointFaultTeam=null;this.surfaceKind=this.surfaceKind??"outdoor";this.conditions??=venueConditions(this.surfaceKind,this.random);this.dust=[];this.replayContacts=[];this.faultFocus=null;this.serveToss=null;this.replayFrames=[];this.replayHighlights=[];this.replayClip=null;this.pointReplay=null;this.replayTick=0;this.poachReservation=null;this.teamPlan=null;this.stackPlans=[];this.lastShot='serve';this.lastHitter=null;this.bounceMark=null;this.trail=[];this.contact=null;this.phase='serve';this.hitBuffer=0;this.humanFeedback='';this.feedbackTime=0;this.lastHumanContactAt=-Infinity;this.shots=0;this.bounces=0;this.last=this.score.team;
  if(this.format==='singles'){
   this.server=this.players.find(p=>p.team===this.score.team);this.serveReceiver=this.players.find(p=>p.team!==this.score.team);
   const right=this.score.points[this.score.team]%2===0;
   this.server.x=(this.score.team===0?right:!right)?15:5;this.server.y=this.score.team===0?45.5:-1.5;
   this.serveReceiver.x=20-this.server.x;this.serveReceiver.y=this.score.team===0?-1:45;
   for(const p of this.players)p.vx=p.vy=0;
  }else{
   this.server=this.players[this.score.team*2+this.score.player];
   let right=this.score.player===this.score.rightPlayer[this.score.team];
   this.server.x=(this.score.team===0?right:!right)?15:5;this.server.y=this.score.team===0?45.5:-1.5;
   let mate=this.players[this.score.team*2+(1-this.score.player)];
   mate.x=20-this.server.x;mate.y=this.score.team===0?43:1;
   for(const p of this.players.filter(p=>p.team!==this.score.team)){
    const right=p.id%2===this.score.rightPlayer[p.team];
    p.x=(p.team===0?right:!right)?15:5;p.y=p.team===0?38:6;p.vx=0;p.vy=0;
   }
   this.server.vx=this.server.vy=mate.vx=mate.vy=0;
   this.serveReceiver=this.players[(1-this.score.team)*2+(this.server.x<10?this.players[(1-this.score.team)*2].x>10?0:1:this.players[(1-this.score.team)*2].x<10?0:1)];
   for(const p of this.players.filter(p=>p.team!==this.score.team))p.y=p===this.serveReceiver?(p.team===0?45:-1):(p.team===0?30:14);
  }
  for(const p of this.players){
   p.lane=p.x<10?5:15;p.coverLane=p.lane;p.coverChangedAt=-Infinity;p.tacticalRole='hold';p.readShot=null;p.anticipation=null;p.approachShot=null;p.recoverySetShot=null;p.waitedShot=null;p.lastShotQuality=null;p.lastShotPlacement=null;p.contactMechanics=null;p.swing=0;p.windup=0;p.preparation=null;p.contactPoint=null;p.contactGrip=null;p.stroke='ready';p.animationShot='ready';p.reactionWait=0;p.baselineTimer=0;p.serveHold=0;p.volleyMomentum=false;p.airborneTimer=0;p.erneAirborne=false;p.stamina=Math.min(1,(p.stamina??1)+.3);p.stride=0;p.fx=0;p.fy=0;p.dustCooldown=0;p.effortTimer=0;p.aggressionTimer=0;p.surpriseTimer=0;p.celebrateTimer=0;p.reactionKind=null;p.reactionTimer=0;p.expression='focus';
  }
  this.stackPlans=this.format==='doubles'?createStackPlans({players:this.players,server:this.server,receiver:this.serveReceiver,score:this.score,config:this.stackingConfig,random:this.random}):[];
  for(const plan of this.stackPlans){
   if(plan.mode==='off')continue;
   this.tacticalStats.stackDecisions++;
   if(plan.stackRequired)this.tacticalStats.stackNeeded++;else this.tacticalStats.stackAligned++;
   if(plan.selected)this.tacticalStats.stackSelected++;
   let stackType=this.tacticalStats.stackByTeamType[plan.teamType];
   if(!stackType)stackType=this.tacticalStats.stackByTeamType[plan.teamType]={decisions:0,selected:0,probabilitySum:0};
   stackType.decisions++;stackType.selected+=plan.selected?1:0;stackType.probabilitySum+=plan.adaptiveProbability;
   let stackHand=this.tacticalStats.stackByHandPair[plan.handPair];
   if(!stackHand)stackHand=this.tacticalStats.stackByHandPair[plan.handPair]={decisions:0,selected:0,probabilitySum:0};
   stackHand.decisions++;stackHand.selected+=plan.selected?1:0;stackHand.probabilitySum+=plan.adaptiveProbability;
   if(plan.selected){
    const active=this.players.find(p=>p.id===plan.activeId),partner=this.players.find(p=>p.id===plan.partnerId);
    if(active&&partner){partner.x=plan.stackPartnerX;partner.lane=plan.initialLane;partner.coverLane=plan.initialLane;}
   }
   this.emit('stack-decision',{team:plan.team,mode:plan.mode,teamType:plan.teamType,handPair:plan.handPair,selected:plan.selected,probability:plan.adaptiveProbability,preferredSide:plan.preferredSide,triggerRole:plan.triggerRole,initialLane:plan.initialLane,targetLanes:structuredClone(plan.targetLanes),metrics:structuredClone(plan.metrics)});
  }
  this.serveReceiver.baselineTimer=2.4;this.serveReceiver.serveHold=.3;this.message=this.server.id===0&&this.mode==='play'?'YOUR SERVE: HARD OR SOFT':'GET READY';
  const serveSide=this.server.x<10?.58:-.58,serveForward=this.server.team===0?-.7:.7;
  this.serveContact={x:this.server.x+serveSide,y:this.server.y+serveForward,z:2.35};
  this.ball={...this.serveContact,z:1.65,vx:0,vy:0,vz:0,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius};this.timer=0;
 } volleyError(player){if(this.bounces!==0)return null;if(this.shots<=2)return 'Two-bounce fault';return kitchenFootContact(player)?'Kitchen foot fault':null}
 fault(team,why,player=null){
  if(this.practice){finishPracticeFeed(this,why);return}
  if(this.phase==='pause'||this.phase==='over')return;
  if(why.startsWith('Kitchen')&&player){const foot=kitchenContact(player);if(foot){this.faultFocus={...foot,time:this.clock,reason:why};this.recordReplay(true)}}
  this.recordReplay(true);
  const servingTeam=this.score.team,winner=1-team;
  this.stats.rallies++;this.stats.faults[why]=(this.stats.faults[why]||0)+1;this.emit('rally-end',{winner,reason:why,shots:this.shots,playerId:player?.id??null,position:{x:this.ball.x,y:this.ball.y,z:this.ball.z}});this.score.point(winner);const sideSwitched=this.maybeSwitchSides();
  this.result=`${winner===0?'YOUR TEAM':'CPU'} WINS RALLY · ${why.toUpperCase()}`;
  this.outcome=winner===servingTeam?'POINT':this.score.team!==servingTeam?'SIDE OUT':'SECOND SERVER';
  this.message=sideSwitched?'SWITCH SIDES':why.toUpperCase();this.phase=this.score.winner===null?'pause':'over';this.pause=2.5;
  const highlight=this.faultFocus?{time:this.clock,label:why.toUpperCase()}:this.replayHighlights.at(-1),matchPoint=this.score.winner!==null,longRally=this.shots>=20;
 let focus=this.faultFocus?structuredClone(this.faultFocus):null;
 if(!focus&&highlight?.x!==undefined)focus={x:highlight.x,y:highlight.y,z:highlight.z,time:highlight.time,reason:highlight.label};
 if(!focus&&this.replayContacts.length){const recent=this.replayContacts.filter(c=>c.time>=Math.max(0,this.clock-3)).at(-1);if(recent)focus={x:recent.x,y:recent.y,z:recent.z,time:recent.time,reason:'CONTACT'};}
 this.lastPointWinner=winner;this.lastPointFaultTeam=team;for(const p of this.players)if(p.team===team&&this.ball?.shot)p.surpriseTimer=Math.max(p.surpriseTimer,.35);
 const reactionPlan=postRallyReactionPlan({winner,faultTeam:team,faultPlayerId:player?.id,faultAggression:player?.playstyle?.aggression??player?.abilities?.aggression??.5,faultMishit:player?.mishit??false,lastHitterId:this.lastHitter,shots:this.shots,score:this.score,special:['AROUND THE POST','ERNE'].includes(highlight?.label),random:this.visualRandom});applyRallyReactions(this.players,reactionPlan);
 if(reactionPlan.triggered&&this.replayFrames.length){const base=structuredClone(this.replayFrames.at(-1));Object.assign(base,{clock:this.clock,phase:'pause',message:this.message,players:structuredClone(this.players),ball:structuredClone(this.ball),score:structuredClone(this.score),lastPointWinner:winner,contact:null,bounceMark:null});this.replayFrames.push(base);for(let i=1;i<=10;i++){const frame=structuredClone(base);frame.clock=this.clock+i/30;frame.players=frame.players.map(p=>({...p,reactionTimer:Math.max(0,(p.reactionTimer??0)-i/30),celebrateTimer:Math.max(0,(p.celebrateTimer??0)-i/30)}));this.replayFrames.push(frame)}}
  if(this.replayFrames.length>15){
    const qualifiers=[];
    if(highlight)qualifiers.push(highlight.label);
    if(longRally)qualifiers.push(`${this.shots}-SHOT RALLY`);
    if(matchPoint)qualifiers.push('MATCH POINT WIN');
    const start=highlight?Math.max(0,highlight.time-2):Math.max(0,this.clock-(matchPoint?10:8));
    const end=Math.max(this.clock,this.replayFrames.at(-1)?.clock??this.clock);
    const frames=this.replayFrames.filter(f=>f.clock>=start&&f.clock<=end);
    const review=why.startsWith('Kitchen')?footReplayReview(this.faultFocus):['Out','Unreturned','Double bounce','Service fault','Net fault'].includes(why)?this.replayReview:null;
    this.pointReplay={label:qualifiers.join(' · ')||`${this.shots}-SHOT RALLY`,frames,...(focus?{focus}:{}),...(review?{review}:{})};
    if(qualifiers.length&&frames.length>15)this.replayClip={...this.pointReplay};
  }
 }
 hit(player,shot,aim,quality=1,placement=null){
  const err=this.volleyError(player);if(err){this.fault(player.team,err,player);return false}
  if(this.bounces>1){this.fault(player.team,'Double bounce');return false}
  this.recordReplay(true);
  this.observeOpponentShot();this.replayReview=null;
  const incomingVelocity={x:this.ball.vx||0,y:this.ball.vy||0,z:this.ball.vz||0},poor=quality<.8,wasPoach=!poor&&this.poachReservation?.shot===this.shots&&this.poachReservation.playerId===player.id;
    const nearKitchen=player.team===0?player.y<=33:player.y>=11,incomingShot=this.ball.shot??this.lastShot,incomingAttack=['drive','overhead'].includes(incomingShot),speedUp=shot==='drive'&&incomingShot==='dink'&&this.ball.z>=2.55&&nearKitchen;
  const reset=!poor&&['drop','dink'].includes(shot)&&incomingAttack&&(nearKitchen||this.bounces===0);
  if(this.bounces===0)player.volleyMomentum=true;
  player.stamina=Math.max(0,(player.stamina??1)-(['drive','overhead','tweener'].includes(shot)?.075:.055)/Math.max(.65,player.abilities.endurance??1));
  player.shotLabel=reset?'RESET':speedUp?'SPEED-UP':shot.toUpperCase();player.effortTimer=['drive','overhead','atp','erne'].includes(shot)?.8:.5;player.aggressionTimer=(speedUp||['drive','overhead','atp','erne'].includes(shot))&&(player.playstyle?.aggression??player.abilities?.aggression??.5)>.6?.7:0;
  player.mishit=poor;this.lastShot=shot;player.animationShot=shot;player.animationContactStart=true;this.lastHitter=player.id;
  let targetY=player.team===0?(shot==='dink'?14:shot==='drop'?12:shot==='slice'?6:4):(shot==='dink'?30:shot==='drop'?32:shot==='slice'?38:40);
  const technique=shotSkill(player,shot),grip=gripModifiers(player,this.ball,shot),difficulty=contactDifficulty(player,this.ball,shot)+(this.poachReservation?.shot===this.shots&&this.poachReservation.playerId===player.id?.14:0);player.wasPoach=wasPoach;player.contactDifficulty=difficulty;player.contactSpeed=Math.hypot(player.vx||0,player.vy||0);player.contactMotion=player.motion;player.incomingSpeed=Math.hypot(incomingVelocity.x,incomingVelocity.y);player.contactBounces=this.bounces;player.contactAge=this.clock-(this.lastBounceAt??-Infinity);player.contactGrip=grip.grip;
  if(shot==='atp')aim=atpTargetX(this.ball.x);
  if(shot==='lob'||shot==='tweener'){const depth=1.8+(1-quality)*13+Math.max(0,1-technique)*7+this.random()*2;targetY=player.team===0?depth:44-depth;}
  if(shot==='overhead'){const depth=3+this.random()*9+(1-quality)*8+Math.max(0,1-technique)*5;targetY=player.team===0?depth:44-depth;}
  if(placement&&['drive','drop','dink','slice','overhead'].includes(shot)&&Number.isFinite(placement.y))targetY=placement.y;
  if(!placement&&player.id===0&&this.mode==='play'&&['drive','drop','dink','slice','lob','tweener','overhead'].includes(shot))targetY+=shotDepthTarget(player.team,shot,this.depth)-shotDepthTarget(player.team,shot,.5);
  const shotPattern=placement?.intent??(speedUp?'speed-up':player.id===0&&this.mode==='play'?'manual':shot==='dink'?'short-angle':shot==='drop'?'drop-setup':'open-court');player.placementIntent=shotPattern;player.lastShotQuality=quality;player.lastShotPlacement={x:aim,y:targetY};
  player.stroke=strokeForContact(player,this.ball);player.contactType=this.bounces===0?'volley':'groundstroke';player.contactPoint={x:this.ball.x,y:this.ball.y,z:this.ball.z};player.contactPaddleTarget=paddleContactTarget(player,this.ball,shot);
  player.swingDuration=strokeDuration(player,shot,{quality,difficulty});player.preparation=null;
  if(poor)aim+=(this.random()-.5)*4/quality;
  player.swingSide=this.ball.x>=player.x?1:-1;player.swing=player.swingDuration;player.windup=0;
  const netward=player.team===0?-1:1,faceSide=(this.ball.x>=player.x?1:-1)*(player.stroke==='backhand'?-1:1),normalLength=Math.hypot(faceSide*.32,1,shot==='overhead'?.22:.12),normal={x:faceSide*.32/normalLength,y:netward/normalLength,z:(shot==='overhead'?-.22:.12)/normalLength};
  const attacking=['drive','overhead','atp','erne'].includes(shot),mechanics=strokePower(player,shot,quality,difficulty),equipment=this.paddleFor(player,shot);
  const effectivePaddle={...equipment,power:attacking?(player.paddle?.power??1)*paddleShapeModifiers(player).power*mechanics.power*grip.power:equipment.power*grip.power*(1-difficulty*.13),skill:attacking?1:equipment.skill,spin:equipment.spin*grip.spin,loft:shot==='lob'?1+this.random()*.22:1};
  player.contactMechanics=attacking?mechanics:null;
  const contactResponse=paddleContactResponse({ball:this.ball,incoming:incomingVelocity,paddleVelocity:{x:(player.vx||0)*.35+faceSide*7.5*(attacking?mechanics.swingSpeed:1),y:(player.vy||0)*.35+netward*2.2*(attacking?mechanics.swingSpeed:1),z:shot==='overhead'?-4:1.2},normal,center:player.contactPaddleTarget,power:effectivePaddle.power,control:effectivePaddle.control,spin:effectivePaddle.spin,quality,swingDirection:faceSide,sweetSpotScale:paddleShapeModifiers(player).sweetSpot});
  aim+=contactResponse.aimError;player.paddleTwist=contactResponse.twist;player.contactSweetSpot=contactResponse.sweetSpot;
  const patternCurve=(aim-this.ball.x)*.32+contactResponse.twist*1.2+(player.stroke==='backhand'?-1:1)*faceSide*.18,dinkLift=shot==='dink'?Math.max(0,Math.min(2.4,(1-quality)*2.2+Math.max(0,difficulty-.45)*1.15+Math.abs(contactResponse.twist)*.55)):0;
   const curveScale=shot==='dink'?.45:shot==='drop'?.55:shot==='slice'?1.15:1;
   launch(this.ball,aim,targetY,shot,{...effectivePaddle,power:effectivePaddle.power*contactResponse.paceScale},quality,{sideSpin:patternCurve*curveScale,sliceSpin:shot==='slice'?(this.ball.vy||-1):contactResponse.twist*.25,shape:dinkLift>.8?'dink-float':shotPattern,loftBonus:dinkLift});
   if(['drop','dink'].includes(shot)&&quality>=.8)this.ball.vz+=Math.max(0,difficulty-.45)*4/Math.max(.7,technique);
   this.ball.spin+=contactResponse.spinKick;
  const closing=Math.max(0,-(incomingVelocity.x*normal.x+incomingVelocity.y*normal.y+incomingVelocity.z*normal.z));
  const restitution=(shot==='overhead'?.18:['drop','dink'].includes(shot)?.025:player.contactType==='volley'?.16:.1)*quality;
  this.ball.vx+=normal.x*closing*restitution;this.ball.vy+=normal.y*closing*restitution*.2;this.ball.vz+=normal.z*closing*restitution;
  if(shot==='erne'||shot==='atp')player.outsideTimer=1.25;if(wasPoach)this.tacticalStats.poachHits++;if(poor)this.tacticalStats.mishitHits++;
  const surpriseShot=['atp','erne','tweener'].includes(shot)||(speedUp&&quality>=.8)||(shot==='lob'&&quality>=.9&&difficulty>.55);for(const p of this.players)if(p.team!==player.team){p.reactionWait=p.abilities.reaction+(1-(p.stamina??1))*.12;p.splitStepTimer=.16;if(surpriseShot)p.surpriseTimer=.65;}
  this.contact={x:player.contactPoint.x,y:player.contactPoint.y,z:player.contactPoint.z,time:.12,quality,difficulty,sweetSpot:player.contactSweetSpot,playerId:player.id,shot};
  this.replayContacts.push({time:this.clock,x:player.contactPoint.x,y:player.contactPoint.y,z:player.contactPoint.z});if(this.replayContacts.length>16)this.replayContacts.shift();
  if(!poor&&(shot==='atp'||shot==='erne'))this.replayHighlights.push({time:this.clock,x:player.contactPoint.x,y:player.contactPoint.y,z:player.contactPoint.z,label:shot==='atp'?'AROUND THE POST':'ERNE'});
  this.stats.shots[shot]=(this.stats.shots[shot]||0)+1;this.stats.patterns[shotPattern]=(this.stats.patterns[shotPattern]||0)+1;this.stats.teams[player.team].hits++;if(poor)this.stats.teams[player.team].mishits++;
  if(this.practice&&player.id===0)this.practice.returnedShot=shot;
  if(!this.practice)this.observedShot={playerId:player.id,team:player.team,shot};
  this.emit('hit',{shot,stroke:player.stroke,playerId:player.id,quality,difficulty,position:player.contactPoint,placement:{x:aim,y:targetY},intent:player.placementIntent,pattern:shotPattern,curve:this.ball.spinY,mechanics:player.contactMechanics,pace:Math.hypot(this.ball.vx,this.ball.vy)});this.activateStacking(player,this.shots,quality);this.last=player.team;this.shots++;this.bounces=0;
  this.message=(wasPoach?'POACH · ':poor?'MISHIT · ':speedUp?'SPEED-UP · ':'')+player.shotLabel;this.recordReplay(true);return true;
 }
 startScenario(type='erne'){
  if(!['erne','atp'].includes(type))return false;
  this.format='doubles';this.reset();
  const erne=type==='erne',contact=erne?{x:.55,y:30,z:3.8}:{x:-1.65,y:26.5,z:1.35},startPos=erne?{x:4.5,y:33}:{x:1.2,y:31};
  this.mode='watch';this.phase='rally';this.shots=5;this.bounces=erne?0:1;this.last=1;
  Object.assign(this.players[0],{x:startPos.x,y:startPos.y,vx:0,vy:0,outsideTimer:0,preparation:{shot:type,stroke:'forehand',phase:0}});
  Object.assign(this.players[1],{x:12,y:31});Object.assign(this.players[2],{x:8,y:9});Object.assign(this.players[3],{x:14,y:7});
  const ballStart=erne?{x:5.5,y:12,z:3.2}:{x:5,y:18,z:4.2};
  this.ball={...ballStart,vx:0,vy:0,vz:0,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius,shot:'drive'};
  this.trail=[];this.scenario={type,erne,time:0,contactTime:1.05,startPos,contact,ballStart,bouncePoint:{x:1,y:24,z:C.ballRadius},bounced:false};
  this.message=`DEV SCENARIO · ${type.toUpperCase()} APPROACH`;return true;
 }
 updateScenario(dt){
  const s=this.scenario,p=this.players[0],t=Math.max(0,Math.min(1,s.time/s.contactTime)),mix=(a,b)=>a+(b-a)*t;
  this.clock+=dt;s.time+=dt;p.x=mix(s.startPos.x,s.contact.x-.3);p.y=mix(s.startPos.y,s.contact.y);p.vx=(s.contact.x-.3-s.startPos.x)/s.contactTime;p.vy=(s.contact.y-s.startPos.y)/s.contactTime;p.preparation.phase=.48*t;p.preparation.stroke='forehand';
  if(s.erne){Object.assign(this.ball,{x:mix(s.ballStart.x,s.contact.x),y:mix(s.ballStart.y,s.contact.y),z:mix(s.ballStart.z,s.contact.z)+Math.sin(Math.PI*t)*.75});}
  else if(t<.48){const u=t/.48,local=(a,b)=>a+(b-a)*u;Object.assign(this.ball,{x:local(s.ballStart.x,s.bouncePoint.x),y:local(s.ballStart.y,s.bouncePoint.y),z:local(s.ballStart.z,s.bouncePoint.z)+Math.sin(Math.PI*u)*2.2});}
  else {if(!s.bounced){s.bounced=true;this.bounceMark={x:s.bouncePoint.x,y:s.bouncePoint.y,time:.35};this.emit('bounce');}const u=(t-.48)/.52,local=(a,b)=>a+(b-a)*u;Object.assign(this.ball,{x:local(s.bouncePoint.x,s.contact.x),y:local(s.bouncePoint.y,s.contact.y),z:local(s.bouncePoint.z,s.contact.z)+Math.sin(Math.PI*u)*.65});}
  this.trail.push({x:this.ball.x,y:this.ball.y,z:this.ball.z});if(this.trail.length>8)this.trail.shift();this.recordReplay();
  if(t>=1){Object.assign(this.ball,s.contact);const type=s.type;this.hit(p,type,type==='atp'?2:10,1);this.scenario=null;}
 }
 canHumanHit(late=false){if(this.paused)return false;const p=this.players[0],b=this.ball,timing=this.timingWindow();return this.mode==='play'&&this.phase==='rally'&&this.last!==0&&(this.shots!==1||this.serveReceiver.id===0)&&side(b.y)===0&&(paddleContactAvailable(p,b,selectShot(p,b,this.shot))||(late&&timing.late>0&&this.clock-this.lastHumanContactAt<=timing.late))&&!this.volleyError(p)}
 tryHumanHit(late=false){if(!this.canHumanHit(late))return false;const p=this.players[0];const distance=Math.hypot(p.x-this.ball.x,p.y-this.ball.y);const buffered=this.hitBuffer>0,timed=buffered||late;this.hitBuffer=0;p.windup=0;const chosen=selectShot(p,this.ball,this.shot);const contact=contactQuality(p,this.ball,chosen,timed,this.random(),this.difficulty);
 const attemptedPoach=this.poachReservation?.shot===this.shots&&this.poachReservation.playerId===p.id;if(attemptedPoach){contact.quality*=.84;contact.mishit=contact.quality<.8}const aim=this.aim+(this.random()-.5)*distance/(p.abilities.control*p.paddle.control*shotSkill(p,chosen));this.hit(p,chosen,aim,contact.quality);this.message=contact.mishit?`MISHIT · ${attemptedPoach?'RUSHED POACH':contact.reason}`:late?'GOOD LATE TIMING':buffered?'GOOD TIMING':distance<1.8?'GREAT CONTACT':'REACHING';if(p.shotLabel==='RESET')this.message=`RESET · ${this.message}`;this.humanFeedback=this.message;p.lastContactFeedback={quality:contact.quality,reason:contact.reason,mishit:contact.mishit};this.feedbackTime=.9;return true}
 swing(){if(this.paused)return;if(this.phase==='serve'&&this.server.id===0&&this.mode==='play'){this.serve();return}if(this.phase!=='rally'||this.mode!=='play')return;if(this.tryHumanHit()||this.tryHumanHit(true))return;const window=this.timingWindow();this.hitBuffer=window.early;this.players[0].windup=this.hitBuffer;this.message=this.teamPlan?.receiverId!==0?'PARTNER BALL':this.clock-this.lastHumanContactAt>this.timingWindow().late&&this.clock-this.lastHumanContactAt<.6?'TOO LATE':'EARLY: SWING QUEUED'}
 serve(automatic=false){
  if(this.serveToss)return false;
  const plan=automatic?cpuServePlan(this.server,this.serveReceiver,this.random()):null;
  const type=plan?.type??(this.shot==='soft'?'soft':'hard'),shot=type==='soft'?'serve-soft':'serve-hard',target=serveTarget(this.server,plan?.aim??this.aim,type,this.random()),targetY=plan?.y??(this.server.team===0?8:36),startZ=1.65,tossSpeed=7.5,contactZ=this.serveContact.z,duration=(tossSpeed+Math.sqrt(tossSpeed*tossSpeed+2*C.gravity*(contactZ-startZ)))/C.gravity;
  Object.assign(this.ball,this.serveContact,{z:startZ,vx:0,vy:0,vz:tossSpeed,spin:0,spinX:0,spinY:0,spinZ:0});const serveCurve=plan?.curve??((target-this.server.x)*.18+(type==='soft'?.25:0));const serveShape=plan?.style?'serve-'+plan.style:type==='soft'?'serve-float':'serve-drive';this.serveToss={type,shot,target,targetY,time:0,duration,startZ,tossSpeed,curve:serveCurve,shape:serveShape,intent:plan?.intent??'manual-serve'};this.message=`TOSS · ${type.toUpperCase()} SERVE`;return true;
 }
 releaseServe(){
  const toss=this.serveToss,type=toss.type,shot=toss.shot,target=toss.target;this.stats.serves++;this.serveToss=null;Object.assign(this.ball,this.serveContact,{vx:0,vy:0,vz:0});this.server.contactPoint={...this.serveContact};this.server.contactGrip='one';this.server.stroke='serve';this.server.animationShot='serve';this.server.animationContactStart=true;this.server.swingDuration=strokeDuration(this.server,'serve');this.server.preparation=null;this.emit('rally-start',{});this.emit('hit',{shot,stroke:'serve',playerId:this.server.id,quality:1,position:{...this.serveContact}});this.activateStacking(this.server,0,1);this.server.swingSide=1;this.server.swing=this.server.swingDuration;this.contact={...this.serveContact,time:.12,quality:1,difficulty:0,sweetSpot:1,playerId:this.server.id,shot:'serve'};this.serveX=this.server.x;launch(this.ball,target,toss.targetY??(this.server.team===0?8:36),shot,this.paddleFor(this.server,'serve'),1,{sideSpin:(toss.curve??0)*.25,sliceSpin:0,shape:toss.shape??'serve-standard'});this.last=this.server.team;this.shots=1;this.bounces=0;this.phase='rally';this.message=type.toUpperCase()+' SERVE'
 }
updateSurfaceEffects(dt){
  const dry=this.surfaceKind==='indoor'?0:1;
  for(const p of this.players){
   p.dustCooldown=Math.max(0,(p.dustCooldown||0)-dt);
   const currentSpeed=Math.hypot(p.vx||0,p.vy||0),oldSpeed=Math.hypot(p.fx||0,p.fy||0);
   if(dry===1&&oldSpeed>4.1&&!p.airborneTimer&&p.dustCooldown<=0){
    const stop=currentSpeed<oldSpeed*.68;
    const dot=(oldSpeed<=0||currentSpeed<=0)?1:((p.vx||0)*(p.fx||0)+(p.vy||0)*(p.fy||0))/(oldSpeed*currentSpeed);
    if(stop||(currentSpeed>3.5&&dot<.28)){
     const strength=Math.min(1,Math.max(0,(stop?oldSpeed-currentSpeed:currentSpeed)/10));
     this.dust.push({x:p.x,y:p.y,z:.08,life:.26,age:0,strength,direction:Math.sign((p.vx||0)||(p.fx||0)),count:strength>.42?2:1});
     if(this.dust.length>30)this.dust.shift();
     p.dustCooldown=.22+this.visualRandom()*.08;
    }
   }
   p.fx=p.vx||0;p.fy=p.vy||0;
  }
  for(const d of this.dust){d.age+=dt;d.life-=dt}
  this.dust=this.dust.filter(d=>d.life>0);
 }
 recordReplay(force=false){
  if(this.phase!=='rally'||(!force&&this.replayTick++%4))return;
  const frame=structuredClone({faultFocus:this.faultFocus,dust:this.dust.filter(d=>d.life>0),conditions:this.conditions,clock:this.clock,players:this.players,ball:this.ball,lastPointWinner:this.lastPointWinner,trail:this.trail,contact:this.contact,bounceMark:this.bounceMark,score:this.score,phase:this.phase,mode:this.mode,difficulty:this.difficulty,aim:this.aim,depth:this.depth,shot:this.shot,shots:this.shots,bounces:this.bounces,lastBounceAt:this.lastBounceAt,message:this.message,timer:this.timer,serverId:this.server.id,format:this.format,stacking:structuredClone(this.stackPlans??[]),sideSwitched:this.sideSwitched});
  this.replayFrames.push(frame);if(this.replayFrames.length>360)this.replayFrames.shift();
 }
 update(dt){if(this.paused)return;if(this.scenario){this.updateScenario(dt);return}this.recordReplay();this.clock+=dt;for(const p of this.players){p.airborneTimer=Math.max(0,(p.airborneTimer||0)-dt);p.reactionWait=Math.max(0,(p.reactionWait||0)-dt);p.effortTimer=Math.max(0,(p.effortTimer||0)-dt);p.aggressionTimer=Math.max(0,(p.aggressionTimer||0)-dt);p.surpriseTimer=Math.max(0,(p.surpriseTimer||0)-dt);p.celebrateTimer=Math.max(0,(p.celebrateTimer||0)-dt);p.outsideTimer=Math.max(0,(p.outsideTimer||0)-dt);p.baselineTimer=Math.max(0,(p.baselineTimer||0)-dt);p.serveHold=Math.max(0,(p.serveHold||0)-dt);p.splitStepTimer=Math.max(0,(p.splitStepTimer||0)-dt);p.recoveryTimer=Math.max(0,(p.recoveryTimer||0)-dt);p.swing=Math.max(0,p.swing-dt);p.windup=Math.max(0,(p.windup||0)-dt)}if(this.contact)this.contact.time=Math.max(0,this.contact.time-dt);const pending=this.hitBuffer;this.hitBuffer=Math.max(0,this.hitBuffer-dt);this.feedbackTime=Math.max(0,this.feedbackTime-dt);if(pending>0&&this.hitBuffer===0&&this.phase==='rally'){this.message=Math.hypot(this.players[0].x-this.ball.x,this.players[0].y-this.ball.y)>2.2?'OUT OF REACH':'TOO EARLY';this.humanFeedback=this.message;this.feedbackTime=.9}if(this.practice){updatePractice(this,dt);return}if(this.phase==='over')return;if(this.phase==='pause'){this.pause-=dt;if(this.pause<=0)this.serveSetup();return}if(this.phase==='serve'){this.timer+=dt;if(this.serveToss){const toss=this.serveToss;toss.time+=dt;this.ball.z=toss.startZ+toss.tossSpeed*toss.time-.5*C.gravity*toss.time*toss.time;if(toss.time>=toss.duration)this.releaseServe();return}if((this.mode==='watch'||this.server.id!==0)&&this.timer>1.2)this.serve(true);return}
 const b=this.ball;this.trail.push({x:b.x,y:b.y,z:b.z});if(this.trail.length>8)this.trail.shift();const activeConditions=this.mode==='play'?this.conditions:null;b.wind=activeConditions?.wind??0;b.humidity=activeConditions?.humidity??0;const event=stepBall(b,dt);if(event){this.emit(event,{position:{x:b.x,y:b.y,z:b.z}});if(event==='net')this.replayReview=netReplayReview(b,this.clock);if(event==='bounce'){if(this.bounces===0&&this.replayReview?.kind!=='net')this.replayReview=lineReplayReview(b,this.clock,{serve:this.shots===1,receiverTeam:1-this.last,serveX:this.serveX});this.observeOpponentShot();this.bounceMark={x:b.x,y:b.y,time:.35};this.lastBounceAt=this.clock}}if(this.bounceMark)this.bounceMark.time=Math.max(0,this.bounceMark.time-dt);if(event==='post'){this.fault(this.last,'Post fault');return}if(event==='bounce'){const team=side(b.y);if(b.netContact&&team===this.last){this.fault(this.last,'Net fault');return}if(b.netContact)b.netContact=false;if(this.bounces>0){this.fault(1-this.last,'Double bounce');return}if(!inBounds(b.x,b.y)){this.fault(this.last,'Out');return}if(team===this.last){this.fault(this.last,'Wrong side');return}this.bounces++;if(this.shots===1){const legalX=this.serveX<10?b.x>=10-1e-6:b.x<=10+1e-6;const legalY=team===0?b.y>29+1e-6:b.y<15-1e-6;if(!legalX||!legalY){this.fault(this.last,'Service fault');return}}if(this.bounces>=2){this.fault(team,'Double bounce');return}}
 if(event)this.recordReplay(true);this.updateStackingSafety();
 const incoming=1-this.last;
 if(!this.teamPlan||this.teamPlan.shot!==this.shots||this.clock>this.teamPlan.expires){
   this.teamPlan=planIncoming({players:this.players,team:incoming,ball:b,shots:this.shots,bounces:this.bounces,serveReceiver:this.serveReceiver,clock:this.clock,stackPlan:this.stackPlans?.[incoming]});
   const receiver=this.players.find(p=>p.id===this.teamPlan.receiverId),uncertainty=Math.max(0,1-(receiver.abilities.courtIQ??1));
   
   this.teamPlan.point.x+=(this.random()-.5)*uncertainty*2;this.teamPlan.point.y+=(this.random()-.5)*uncertainty;
   if(this.teamPlan.poach){
     if(this.poachReservation?.shot!==this.shots)this.tacticalStats.poachAttempts++;this.poachReservation={shot:this.shots,playerId:this.teamPlan.receiverId};
   }
 }
 const r=this.players.find(p=>p.id===this.teamPlan.receiverId),targets=[];
 for(const p of this.players){
   let target=formationTarget(p,{ball:b,incoming,receiverId:r.id,point:this.teamPlan.point,shots:this.shots,servingTeam:this.score.team,lastShot:this.lastShot,lastHitter:this.lastHitter,singles:this.format==='singles',players:this.players,opponentContactIn:this.teamPlan.point.time===undefined?Infinity:this.teamPlan.created+this.teamPlan.point.time-this.clock,stackPlan:this.stackPlans?.[p.team]});
   if(this.shots>2&&p.team!==incoming&&!target.brake&&(p.id!==0||this.mode==='watch')){
    const pattern=this.opponentMemory.read(r.id);target=anticipateReturn(p,target,pattern,{singles:this.format==='singles'});p.anticipation=target.read?{opponentId:r.id,...target.read}:null;
    if(target.read&&p.readShot!==this.shots){p.readShot=this.shots;this.tacticalStats.patternReads++;this.emit('anticipation',{playerId:p.id,opponentId:r.id,...target.read})}
   }else p.anticipation=null;
   if(target.role==='singles-set'&&p.recoverySetShot!==this.shots){p.recoverySetShot=this.shots;this.tacticalStats.recoverySets++;this.emit('recovery-set',{playerId:p.id,shot:this.shots,speed:Math.hypot(p.vx||0,p.vy||0)})}
   if(target.role==='singles-approach'&&p.approachShot!==this.shots){p.approachShot=this.shots;this.tacticalStats.singlesApproaches++;this.emit('approach',{playerId:p.id,shot:this.shots,target:{x:target.x,y:target.y}})}
   if(p===r){p.tacticalRole=this.teamPlan.poach?'poach':'receive';if(this.shots===1&&this.bounces===0&&(p.serveHold||0)>0)target.y=p.team===0?Math.max(44.5,target.y):Math.min(-.5,target.y)}else p.tacticalRole=target.role;
   targets.push({player:p,target});
 }
 separateTargets(targets,0,incoming===0?r.id:this.lastHitter,this.stackPlans?.[0]);separateTargets(targets,1,incoming===1?r.id:this.lastHitter,this.stackPlans?.[1]);
 for(const {player:p,target} of targets){
   const oldX=p.x,oldY=p.y;
   const approachingVolley=p===r&&this.shots>2&&this.bounces===0;
   const destination=p.volleyMomentum||approachingVolley?volleyBrakeTarget(p,target):target;
   if(p!==r)p.tacticalRole=destination.role;
   if(p.reactionWait<=0)move(p,destination.x,destination.y,dt,destination.brake);else move(p,p.x,p.y,dt);
   if(p!==r)this.tacticalStats.offBallDistance+=Math.hypot(p.x-oldX,p.y-oldY);
 }
 resolvePlayerCollisions(this.players);this.updateSurfaceEffects(dt);
 if(this.format==='doubles'){const stackPlan=this.stackPlans?.[r?.team];if(commitStackingCoverage(this.players,stackPlan,this.clock)){this.tacticalStats.stackCrossings++;this.emit('stack-crossed',{team:stackPlan.team,shot:this.shots,targetLanes:structuredClone(stackPlan.targetLanes)})}else if(commitDoublesCoverage(this.players,this.teamPlan,this.lastShot,this.clock))this.tacticalStats.coverSwaps++;}
 for(const p of this.players){if(volleyMomentumFault(p)){this.fault(p.team,'Kitchen momentum fault',p);return}}
 for(const p of this.players){const outside=p.x<-.5||p.x>20.5;if(outside&&this.ball.z>=3.2&&Math.abs(p.y-22)<9&&!p.erneAirborne&&p===r&&this.bounces===0)p.airborneTimer=.7;p.erneAirborne=p.airborneTimer>0;prepareReceiver(p,this);}
 if(this.canHumanHit())this.lastHumanContactAt=this.clock;
 if(this.hitBuffer>0&&this.tryHumanHit())return;
 const waitingForBounce=this.bounces===0&&this.teamPlan.point.bounces>0;
 const cpuCanRespond=(r.id!==0||this.mode==='watch')&&side(b.y)===incoming&&(this.shots>2||this.bounces>0)&&!waitingForBounce;
 if(cpuCanRespond&&(paddleContactAvailable(r,b,'drive')||paddleContactAvailable(r,b,'overhead')||(selectShot(r,b,'lob')==='tweener'&&paddleContactAvailable(r,b,'tweener')))){
  if(this.format==='singles'&&this.bounces>0&&waitForRisingContact(r,b,this.teamPlan.point)){if(r.waitedShot!==this.shots){r.waitedShot=this.shots;this.tacticalStats.contactWaits++}return}
  const sweet=paddleContactTarget(r,b,selectShot(r,b,'lob')==='tweener'?'tweener':'drive'),approach=(b.x-sweet.x)*b.vx+(b.y-sweet.y)*b.vy;
  if(approach< -1&&Math.hypot(b.x-sweet.x,b.y-sweet.y)>.48&&b.z>.6)return;
  const landingTime=(b.vz+Math.sqrt(Math.max(0,b.vz*b.vz+2*C.gravity*b.z)))/C.gravity;
  if(this.bounces===0&&(b.x+b.vx*landingTime<0||b.x+b.vx*landingTime>20))return;
  if(this.volleyError(r))return;
  const opponents=this.players.filter(p=>p.team!==r.team),opponentsAtKitchen=opponents.every(p=>p.team===0?p.y<34:p.y>10);
  const partner=this.players.find(p=>p.team===r.team&&p.id!==r.id),difficulty=contactDifficulty(r,b,'drive');
  const partnerReady=!partner||((partner.stamina??1)>.3&&(partner.recoveryTimer??0)<.3&&Math.abs(partner.y-r.y)<8);
  const balanced=Math.hypot(r.vx||0,r.vy||0)<(r.abilities.speed??C.speed)*.85&&difficulty<.78;
  const transition=this.format==='doubles'&&r.team===this.score.team&&this.shots>=4&&[r,partner].some(p=>p&&(p.team===0?p.y>33:p.y<11));
  const opponentsDeep=opponents.every(p=>p.team===0?p.y>35:p.y<9);
  const read=this.opponentMemory.read(r.id),attackSkill=((r.abilities.drive??1)+(r.abilities.smash??1)+(r.abilities.power??1))/3,softSkill=((r.abilities.drop??1)+(r.abilities.dink??1)+(r.abilities.defense??1))/3,shot=selectShot(r,b,'lob')==='tweener'?'lob':chooseCpuShot({shots:this.shots,team:r.team,y:r.y,height:b.z,opponentsAtKitchen,difficulty,partnerReady,balanced,transition,opponentsDeep,aggression:r.playstyle?.aggression??r.abilities.aggression,courtIQ:r.abilities.courtIQ,attackSkill,softSkill,tendency:r.ratingStyle,patience:r.playstyle?.patience,singles:this.format==='singles',pattern:read,incomingShot:b.shot??this.lastShot,random:this.random()}),chosen=selectShot(r,b,shot);
  if(!paddleContactAvailable(r,b,chosen)){ }
  else{
   if(this.bounces===0&&(r.abilities.courtIQ??1)>=.85&&!safeVolleyRecovery(r,strokeDuration(r,chosen)))return;
   const serveReturn=this.shots===1,placement=serveReturn?serveReturnTarget(r,opponents,chosen,{difficulty:contactDifficulty(r,b,chosen),pattern:read,shots:this.shots}):chooseCpuPlacement(r,opponents,chosen,{pattern:read,shots:this.shots}),target=placement.x;
   const pressure=contactDifficulty(r,b,chosen)*2+(1-(r.stamina??1))*3+Math.max(0,1-(r.abilities.courtIQ??1));
   const returnSafety=serveReturn?.55:1,error=(this.random()+this.random()+this.random()-1.5)*(shot==='drive'?2.5:2.2)*(1+pressure*.4)*returnSafety/(r.abilities.control*this.paddleFor(r,chosen).control*shotSkill(r,chosen)*(shot==='drop'||shot==='dink'?(r.abilities.defense??1):1));
   const adjustedTarget=serveReturn?Math.max(3,Math.min(17,target+error)):target+error,contact=contactQuality(r,b,chosen,false,this.random());this.hit(r,chosen,adjustedTarget,contact.quality,placement);
  }
 }
 if(b.y< -5||b.y>49||b.x< -8||b.x>28)this.fault(this.bounces>0?1-this.last:this.last,this.bounces>0?'Unreturned':'Out')}
}
