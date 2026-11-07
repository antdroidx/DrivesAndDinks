import {netHeightAt,C} from './core.js?v=182';

export class ReplayClock{
 constructor(){this.start(0)}
 start(time){this.started=time;this.held=0;this.pausedAt=null}
 get paused(){return this.pausedAt!==null}
 setPaused(paused,time){if(paused&&!this.paused)this.pausedAt=time;else if(!paused&&this.paused){this.held+=time-this.pausedAt;this.pausedAt=null}}
 elapsed(time){return Math.max(0,((this.pausedAt??time)-this.started-this.held)/1000)}
}

export const REPLAY_REVIEW_MARGIN=.35;
export function lineReplayReview(ball,time,{serve=false,receiverTeam=0,serveX=15}={}){
 if(![ball.x,ball.y,time].every(Number.isFinite))return null;
 const left=serve&&serveX<10?10:0,right=serve&&serveX>=10?10:20,top=serve&&receiverTeam===0?29:0,bottom=serve&&receiverTeam===1?15:44;
 const outside=Math.max(0,left-ball.x,ball.x-right,top-ball.y,ball.y-bottom),margin=Math.min(Math.abs(ball.x-left),Math.abs(ball.x-right),Math.abs(ball.y-top),Math.abs(ball.y-bottom));
 return outside<=REPLAY_REVIEW_MARGIN&&margin<=REPLAY_REVIEW_MARGIN?{kind:'line',x:ball.x,y:ball.y,z:0,time,margin,label:serve?'CLOSE SERVICE LINE':'CLOSE LINE CALL'}:null;
}
export function footReplayReview(focus){
 if(!focus||focus.boundary===undefined)return null;
 const team=focus.team??(focus.boundary===29?0:1),edge=focus.y+(team===0?-1:1)*(focus.halfDepth??.34),margin=Math.abs(edge-focus.boundary);
 return margin<=REPLAY_REVIEW_MARGIN?{kind:'foot',time:focus.time,margin,label:'CLOSE KITCHEN CALL'}:null;
}
export function netReplayReview(ball,time){
 const margin=Math.abs(ball.z-(netHeightAt(ball.x)+(ball.radius??C.ballRadius)));
 return margin<=REPLAY_REVIEW_MARGIN?{kind:'net',x:ball.x,y:ball.y,z:ball.z,time,margin,label:ball.netCord?'NET CORD':'CLOSE NET CONTACT'}:null;
}
export function replayTiming(clip){
 if(!clip.frames?.length)return null;
 const start=clip.frames[0].clock,end=clip.frames.at(-1).clock,candidate=clip.review??footReplayReview(clip.focus),review=candidate&&candidate.time>=start&&candidate.time<=end?candidate:null;
 const slowStart=review?Math.max(start,review.time-.25):end,slowEnd=review?Math.min(end,review.time+.25):end,rate=review?.35:1,hold=review?.55:.18;
 const lead=slowStart-start,slow=(slowEnd-slowStart)/rate;
 return {start,end,review,slowStart,slowEnd,rate,lead,slow,hold,duration:lead+slow+end-slowEnd+hold};
}
export function replayRateAt(clip,elapsed){const t=replayTiming(clip);return t&&elapsed>=t.lead&&elapsed<t.lead+t.slow?t.rate:1}
function renewedMarker(low,high){
 return high&&(!low||high.time>low.time||['x','y','z','playerId','shot'].some(key=>high[key]!==low[key]));
}
function replayDiscontinuity(low,high){
 // Older recordings omit the bounce counter. A new/renewed marker still
 // identifies the impact, including a second bounce at the same location.
 const a=low.ball,b=high.ball;
 const netImpact=Boolean(a?.netContact)!==Boolean(b?.netContact);
 // Posts have no persistent impact flag. stepBall reverses vy and stores the
 // crossing x/z on the terminal frame, before Game records the fault.
 const postImpact=a&&b&&a.vy*b.vy<0&&(a.y-C.net)*(b.y-C.net)<=0&&b.z<C.netPostHeight+(b.radius??C.ballRadius)&&[C.netPostLeft,C.netPostRight].some(x=>Math.abs(b.x-x)<=C.netPostRadius);
 return low.shots!==high.shots||low.bounces!==high.bounces||netImpact||postImpact||renewedMarker(low.contact,high.contact)||renewedMarker(low.bounceMark,high.bounceMark)||renewedMarker(low.netMark,high.netMark);
}
function interpolateFields(target,next,keys,alpha){
 for(const key of keys)if(Number.isFinite(target?.[key])&&Number.isFinite(next?.[key]))target[key]+=(next[key]-target[key])*alpha;
}
function interpolateSnapshot(low,high,clock){
 // Rendering owns every nested value it receives, even at exact frames and
 // during the final hold. Recorded snapshots remain immutable source data.
 const sample=structuredClone(low);sample.clock=clock;
 if(high&&!replayDiscontinuity(low,high)){
  const alpha=Math.max(0,Math.min(1,(clock-low.clock)/(high.clock-low.clock)));
  interpolateFields(sample.ball,high.ball,['x','y','z','vx','vy','vz'],alpha);
  for(const [index,player] of (sample.players??[]).entries()){
   const next=player.id===undefined?high.players?.[index]:high.players?.find(p=>p.id===player.id);
   if(!next)continue;
   interpolateFields(player,next,['x','y','vx','vy','fx','fy','stride','stamina'],alpha);
   // Countdown resets and new preparation/stroke modes are discrete events.
   for(const key of ['swing','windup','airborneTimer','splitStepTimer','recoveryTimer']){
    if(next[key]<=player[key])interpolateFields(player,next,[key],alpha);
   }
   if(player.preparation&&next.preparation&&['shotNumber','shot','stroke'].every(key=>player.preparation[key]===next.preparation[key]))interpolateFields(player.preparation,next.preparation,['phase'],alpha);
  }
  interpolateFields(sample,high,['timer'],alpha);
 }
 // Age only the already-visible cue; never reveal the next impact early.
 for(const key of ['contact','bounceMark','netMark'])if(Number.isFinite(sample[key]?.time))sample[key].time=Math.max(0,sample[key].time-(clock-low.clock));
 return sample;
}
export function faultReplaySample(clip,elapsed,interpolate=false){
 const timing=replayTiming(clip);if(!timing||elapsed>timing.duration)return null;
 const {start,end,slowEnd,lead,slow,rate}=timing,clock=Math.min(end,elapsed<=lead?start+Math.max(0,elapsed):elapsed<lead+slow?start+lead+(elapsed-lead)*rate:slowEnd+elapsed-lead-slow);
 let low=0,high=clip.frames.length-1;
 while(low<high){const middle=Math.ceil((low+high)/2);if(clip.frames[middle].clock<=clock)low=middle;else high=middle-1}
 if(!interpolate)return clip.frames[low];
 return interpolateSnapshot(clip.frames[low],clip.frames[low+1],clock);
}
// Stationary overview replay: fault markers identify the call without zooming.
export function faultReplayCamera(base,project=null){
 void project;return {x:base.x,y:base.y,width:base.width,height:base.height};
}
export function drawFaultContact(c,focus,project){
 const foot=project(focus.x,focus.y),a=project(Math.max(0,focus.x-2),focus.boundary),b=project(Math.min(20,focus.x+2),focus.boundary);
 c.save();c.strokeStyle='#ff694e';c.lineWidth=2.5;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.beginPath();c.ellipse(foot.x,foot.y,8,5,0,0,Math.PI*2);c.stroke();
 const text=focus.reason==='Kitchen momentum fault'?'MOMENTUM · FOOT CONTACT':'KITCHEN · FOOT CONTACT';c.font='bold 9px monospace';c.textAlign='center';c.fillStyle='#112a35ed';c.fillRect(foot.x-86,foot.y+10,172,16);c.fillStyle='#ffe2b5';c.fillText(text,foot.x,foot.y+21);c.restore();
}


// Broadcast highlights use one stationary view through the recorded outcome.
export function highlightReplayCamera(base){
 return {x:base.x,y:base.y,width:base.width,height:base.height};
}
