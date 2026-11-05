import {netHeightAt,C} from './core.js?v=133';

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
 return margin<=REPLAY_REVIEW_MARGIN?{kind:'net',x:ball.x,y:ball.y,z:ball.z,time,margin,label:'CLOSE NET CONTACT'}:null;
}
export function replayTiming(clip){
 if(!clip.frames?.length)return null;
 const start=clip.frames[0].clock,end=clip.frames.at(-1).clock,candidate=clip.review??footReplayReview(clip.focus),review=candidate&&candidate.time>=start&&candidate.time<=end?candidate:null;
 const slowStart=review?Math.max(start,review.time-.25):end,slowEnd=review?Math.min(end,review.time+.25):end,rate=review?.35:1,hold=review?.55:.18;
 const lead=slowStart-start,slow=(slowEnd-slowStart)/rate;
 return {start,end,review,slowStart,slowEnd,rate,lead,slow,hold,duration:lead+slow+end-slowEnd+hold};
}
export function replayRateAt(clip,elapsed){const t=replayTiming(clip);return t&&elapsed>=t.lead&&elapsed<t.lead+t.slow?t.rate:1}
export function faultReplaySample(clip,elapsed){
 const timing=replayTiming(clip);if(!timing||elapsed>timing.duration)return null;
 const {start,end,slowEnd,lead,slow,rate}=timing,clock=Math.min(end,elapsed<=lead?start+Math.max(0,elapsed):elapsed<lead+slow?start+lead+(elapsed-lead)*rate:slowEnd+elapsed-lead-slow);
 let low=0,high=clip.frames.length-1;
 while(low<high){const middle=Math.ceil((low+high)/2);if(clip.frames[middle].clock<=clock)low=middle;else high=middle-1}
 return clip.frames[low];
}
export function faultReplayCamera(base,focus,project,clock){
 if(!focus)return null;const t=Math.max(0,Math.min(1,(clock-focus.time+.8)/.8)),ease=t*t*(3-2*t),zoom=1+ease*.7,target=project(focus.x,focus.y),width=base.width/zoom,height=base.height/zoom;
 const cx=(base.x+base.width/2)*(1-ease)+target.x*ease,cy=(base.y+base.height/2)*(1-ease)+(target.y-25)*ease;
 return {x:cx-width/2,y:cy-height/2,width,height};
}
export function drawFaultContact(c,focus,project){
 const foot=project(focus.x,focus.y),a=project(Math.max(0,focus.x-2),focus.boundary),b=project(Math.min(20,focus.x+2),focus.boundary);
 c.save();c.strokeStyle='#ff694e';c.lineWidth=2.5;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.beginPath();c.ellipse(foot.x,foot.y,8,5,0,0,Math.PI*2);c.stroke();
 const text=focus.reason==='Kitchen momentum fault'?'MOMENTUM · FOOT CONTACT':'KITCHEN · FOOT CONTACT';c.font='bold 9px monospace';c.textAlign='center';c.fillStyle='#112a35ed';c.fillRect(foot.x-86,foot.y+10,172,16);c.fillStyle='#ffe2b5';c.fillText(text,foot.x,foot.y+21);c.restore();
}


// Broadcast highlights track flight and retain the bounce/outcome inside a padded frame.
export function highlightReplayCamera(base,clip,project,snapshot){
 if(clip.focus?.boundary!==undefined)return faultReplayCamera(base,clip.focus,project,snapshot.clock);
 const start=clip.frames[0].clock,t=Math.max(0,Math.min(1,(snapshot.clock-start)/.65)),ease=t*t*(3-2*t);
 const zoom=1+.38*ease,width=base.width/zoom,height=base.height/zoom;
 const neighbors=clip.frames.filter(f=>Math.abs(f.clock-snapshot.clock)<=.14);
 const points=(neighbors.length?neighbors:[snapshot]).map(f=>project(f.ball.x,f.ball.y,f.ball.z));
 const current=project(snapshot.ball.x,snapshot.ball.y,snapshot.ball.z);
 const target={x:points.reduce((v,p)=>v+p.x,0)/points.length,y:points.reduce((v,p)=>v+p.y,0)/points.length};
 let cx=(base.x+base.width/2)*(1-ease)+target.x*ease,cy=(base.y+base.height/2)*(1-ease)+target.y*ease;
 // Include both ball and surface position so high lobs do not hide their landing.
 const ground=project(snapshot.ball.x,snapshot.ball.y,0);
 if(Math.abs(ground.y-current.y)<height*.7)cy=(cy+ground.y)*.5;
 cx=Math.max(current.x-width*.36,Math.min(current.x+width*.36,cx));
 cy=Math.max(current.y-height*.36,Math.min(current.y+height*.36,cy));
 return {x:cx-width/2,y:cy-height/2,width,height};
}
