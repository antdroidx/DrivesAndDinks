import {resolveAnimeGameDesign,applyAnimeLook} from './anime-game.js?v=151';
import {createProfileRenderer} from './profile-athlete.js?v=151';
import {sampleMatchAnimation} from './match-animation.js?v=151';
import {playerFeet} from './player-feet.js?v=151';
import {drawContactCue,replayContactAt} from './contact-cues.js?v=151';
import {paintCourtTexture} from './court-art.js?v=151';import {playerEmotionState} from './player-emotion.js?v=151';

// Measured ceiling of the ball in live play is about 7 feet, with the highest
// overhead contact near 7.4. Ten feet leaves headroom without reserving space
// for a lob the engine never produces.
export const MAX_REPLAY_Z=10;
export function sideReplayProjection(width,height,maxZ=16){
 // The overhead court angle: the camera sits high above the side of the court,
 // so the court length runs across the screen, the width recedes upward and the
 // net stands down the middle of the frame. There is no sideways offset at all,
 // because any lateral term shears the court into a skewed parallelogram.
 const elevation=45*Math.PI/180,depth=Math.sin(elevation),tilt=Math.cos(elevation);
 const scale=Math.min(width/47,height/(20*depth+maxZ*tilt)*.95);
 // Centre the court and the lob headroom in the frame instead of pinning the
 // near sideline to the bottom edge.
 const margin=Math.max(0,(height-(20*depth+maxZ*tilt)*scale)/2);
 const ground=margin+10*scale*depth+maxZ*scale*tilt;
 const project=(x,y,z=0)=>({x:width/2+(y-22)*scale,y:ground+(x-10)*scale*depth-z*scale*tilt});
 return {project,scale,depth,tilt,ground};
}
export function sideReplayCamera(width,height,clip,snapshot){
 // A fixed high-lob envelope fits every recorded rally, so replay composition
 // neither pans nor changes scale.
 const {project,scale,depth,tilt,ground}=sideReplayProjection(width,height,MAX_REPLAY_Z);
 return {x:0,y:0,width,height,project,scale,depth,tilt,ground};
}
export function replayAngleFor(clip,{aspect=1.5}={}){return clip.focus?.boundary!==undefined||aspect<1.1?'overview':'sideline'}

export function createSideReplayRenderer(createCanvas){
 const drawProfile=createProfileRenderer(createCanvas);
 return (c,viewport,snapshot,clip,{palette,style='anime',look='sports',outfit='performance'}={})=>{
  const {width,height}=viewport,camera=sideReplayCamera(width,height,clip,snapshot),{project,scale,depth,tilt,ground}=camera;
  const line=(a,b,color='#f3f0de',weight=1)=>{const p=project(...a),q=project(...b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.strokeStyle=color;c.lineWidth=weight;c.stroke()};
  const polygon=(points,color)=>{c.beginPath();points.forEach((p,i)=>{const q=project(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.closePath();c.fillStyle=color;c.fill()};
  const rectangle=(x1,y1,x2,y2,color)=>polygon([[x1,y1],[x2,y1],[x2,y2],[x1,y2]],color);
  c.save();c.setTransform(1,0,0,1,0,0);
  // Stepped bands stand in for a venue backdrop so the frame is not an empty void.
  for(let i=0;i<8;i++){const t=i/7;c.fillStyle='rgb('+Math.round(16+t*21)+','+Math.round(31+t*27)+','+Math.round(40+t*28)+')';c.fillRect(0,height*i/8,width,height/8+.5)}
  c.scale(width/camera.width,height/camera.height);c.translate(-camera.x,-camera.y);
  // The surround runs to a horizon rather than ending in a hard rectangle.
  const horizon=ground-15*scale*depth;
  c.fillStyle=palette?.apron??'#647b78';c.fillRect(0,horizon,width,height-horizon);
  c.fillStyle='#0b1c2466';c.fillRect(0,horizon,width,Math.max(2,scale*.2));
  rectangle(0,0,20,44,palette?.court??'#467482');rectangle(0,15,20,29,palette?.kitchen??'#8d9e94');
  c.save();c.beginPath();
   [[0,0],[20,0],[20,44],[0,44]].forEach((p,i)=>{const q=project(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});
   c.closePath();c.clip();
   paintCourtTexture(c,project,{count:2600,outdoors:true,dot:Math.max(1,scale*.05),block:Math.max(1,scale*.05)});
   c.restore();
  for(const [a,b] of [[[0,0],[20,0]],[[20,0],[20,44]],[[20,44],[0,44]],[[0,44],[0,0]],[[0,15],[20,15]],[[0,29],[20,29]],[[10,0],[10,15]],[[10,29],[10,44]]])line(a,b,'#f3f0de',scale*.08);
  const net=()=>{
   // From above the net is a narrow strip standing down the middle of the
   // frame: its span across the court runs up the screen and its height is the
   // strip's width.
   const nx=width/2,half=Math.max(5,1.5*scale*tilt),span=10*scale*depth;
   c.save();c.globalAlpha=.72;
   polygon([[nx-half,ground+span],[nx+half,ground+span],[nx+half,ground-span],[nx-half,ground-span]],'#122a34');
   c.restore();
   for(let i=-9;i<=9;i++){const px=nx+i*half/4;c.beginPath();c.moveTo(px,ground+span);c.lineTo(px,ground-span);c.strokeStyle='#2c4a5499';c.lineWidth=Math.max(.5,scale*.014);c.stroke()}
   c.beginPath();c.moveTo(nx-half,ground+span);c.lineTo(nx-half,ground-span);c.strokeStyle='#f2edda';c.lineWidth=Math.max(1.2,scale*.06);c.stroke();
   c.beginPath();c.moveTo(nx+half,ground+span);c.lineTo(nx+half,ground-span);c.strokeStyle='#f2edda';c.lineWidth=Math.max(1.2,scale*.06);c.stroke();
   c.beginPath();c.moveTo(nx-half,ground+span);c.lineTo(nx-half,ground+span+scale*.3);c.strokeStyle='#243b43';c.lineWidth=Math.max(1.2,scale*.11);c.stroke();
   c.beginPath();c.moveTo(nx+half,ground-span);c.lineTo(nx+half,ground-span-scale*.3);c.strokeStyle='#243b43';c.lineWidth=Math.max(1.2,scale*.11);c.stroke();
  };
  const entities=[{kind:'net',depth:10},...snapshot.players.map(player=>({kind:'player',depth:player.x,player})),{kind:'ball',depth:snapshot.ball.x}].sort((a,b)=>a.depth-b.depth);
  for(const entity of entities){
   if(entity.kind==='net'){net();continue}
   if(entity.kind==='ball'){
    const b=snapshot.ball,q=project(b.x,b.y,b.z),ground=project(b.x,b.y,0);c.fillStyle='#09202d44';c.beginPath();c.ellipse(ground.x,ground.y,scale*.24,scale*.07,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#f3e99b66';c.lineWidth=scale*.045;c.beginPath();for(const [i,p] of (snapshot.trail??[]).entries()){const t=project(p.x,p.y,p.z);i?c.lineTo(t.x,t.y):c.moveTo(t.x,t.y)}c.stroke();
    c.fillStyle='#f4ea71';c.beginPath();c.ellipse(q.x,q.y,scale*.125,scale*.125,0,0,Math.PI*2);c.fill();continue;
   }
   const p=entity.player,q=project(p.x,p.y),animation=sampleMatchAnimation(p,{...snapshot,server:snapshot.players.find(player=>player.id===snapshot.serverId)}),moving=Math.hypot(p.vx,p.vy)>1;
   const mode=animation?.mode??(moving?'run':'idle'),phase=animation?.phase??0,d=applyAnimeLook(resolveAnimeGameDesign({appearance:p.appearance,characterId:p.characterId,outfit}),look),direction=p.team===0?-1:1,units=10.2,stature=d.height/177;
   const feet3D=playerFeet(p).map(foot=>({x:(foot.x-p.x)*units,y:63-(2+foot.z*units)/stature,z:(foot.y-p.y)*direction*units}));
   const contact3D=p.animationContactStart&&p.swing>0&&p.contactPoint?{x:(p.contactPoint.x-p.x)*units,y:63-p.contactPoint.z*units/stature,z:(p.contactPoint.y-p.y)*direction*units}:null;

   drawProfile(c,d,mode,phase,q.x,q.y,scale*tilt/units,{style,look,direction,view:p.team===0?'near':'far',frame:(p.stride??0)*1.35,moving,feet3D,contact3D,alignStrength:animation?.alignStrength??0,paddleShape:p.paddle?.shapeId,side:(p.handedness==='left'||p.hand==='left'?-1:1)*(['resetBlock','counterVolley','halfVolley'].includes(mode)&&p.stroke==='backhand'?-1:1),handedness:p.handedness??'right',...(()=>{const state=playerEmotionState(p,{phase:'rally',rallyShots:snapshot.shots,incomingShot:snapshot.ball?.shot,lastPointWinner:null});return {emotion:state.expression,sweat:state.sweat,emotionIntensity:state.intensity,emotionMarks:state.marks,emotionClock:snapshot.clock}})()});
  }
  drawContactCue(c,replayContactAt(clip,snapshot.clock),project,{scale:Math.max(1,scale/12),labels:true});
  if(snapshot.bounceMark?.time>0){const p=project(snapshot.bounceMark.x,snapshot.bounceMark.y);c.strokeStyle='#fff6ba';c.lineWidth=scale*.05;c.beginPath();c.ellipse(p.x,p.y,scale*.45,scale*.15,0,0,Math.PI*2);c.stroke()}
  c.restore();
 };
}
