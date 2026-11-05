import {resolveAnimeGameDesign,applyAnimeLook} from './anime-game.js?v=142';
import {createProfileRenderer} from './profile-athlete.js?v=142';
import {sampleMatchAnimation} from './match-animation.js?v=142';
import {playerFeet} from './player-feet.js?v=142';
import {drawContactCue,replayContactAt} from './contact-cues.js?v=142';

const MAX_REPLAY_Z=24;
export function sideReplayProjection(width,height,maxZ=16){
 const scale=Math.min(width/56,height/Math.max(24,(maxZ+4)/.65)),project=(x,y,z=0)=>({x:width/2+(y-22)*scale+(x-10)*scale*.24,y:height*.73+(x-10)*scale*.38-z*scale});
 return {project,scale};
}
export function sideReplayCamera(width,height,clip,snapshot){
 // A fixed high-lob envelope fits every recorded rally, so replay composition
 // neither pans nor changes scale.
 const {project,scale}=sideReplayProjection(width,height,MAX_REPLAY_Z);
 return {x:0,y:0,width,height,project,scale};
}
export function replayAngleFor(clip,{aspect=1.5}={}){return clip.focus?.boundary!==undefined||aspect<1.1?'overview':'sideline'}

export function createSideReplayRenderer(createCanvas){
 const drawProfile=createProfileRenderer(createCanvas);
 return (c,viewport,snapshot,clip,{palette,style='anime',look='sports',outfit='performance'}={})=>{
  const {width,height}=viewport,camera=sideReplayCamera(width,height,clip,snapshot),{project,scale}=camera;
  const line=(a,b,color='#f3f0de',weight=1)=>{const p=project(...a),q=project(...b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.strokeStyle=color;c.lineWidth=weight;c.stroke()};
  const polygon=(points,color)=>{c.beginPath();points.forEach((p,i)=>{const q=project(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.closePath();c.fillStyle=color;c.fill()};
  const rectangle=(x1,y1,x2,y2,color)=>polygon([[x1,y1],[x2,y1],[x2,y2],[x1,y2]],color);
  c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle='#142933';c.fillRect(0,0,width,height);
  c.scale(width/camera.width,height/camera.height);c.translate(-camera.x,-camera.y);
  rectangle(-5,-5,25,49,palette?.apron??'#647b78');rectangle(0,0,20,44,palette?.court??'#467482');rectangle(0,15,20,29,palette?.kitchen??'#8d9e94');
  for(let i=0;i<180;i++){const p=project((i*137%1000)/50,(i*269%1000)/1000*44);c.fillStyle=i%2?'#ffffff08':'#071e2810';c.fillRect(p.x,p.y,Math.max(.7,scale*.035),Math.max(.7,scale*.035))}
  for(const [a,b] of [[[0,0],[20,0]],[[20,0],[20,44]],[[20,44],[0,44]],[[0,44],[0,0]],[[0,15],[20,15]],[[0,29],[20,29]],[[10,0],[10,15]],[[10,29],[10,44]]])line(a,b,'#f3f0de',scale*.08);
  const net=()=>{
   for(let x=0;x<=20;x++)line([x,22,0],[x,22,2.85],'#122a3470',scale*.02);
   for(let z=.3;z<2.8;z+=.3)line([0,22,z],[20,22,z],'#122a3470',scale*.02);
   line([-.5,22,0],[-.5,22,3],'#243b43',scale*.13);line([20.5,22,0],[20.5,22,3],'#243b43',scale*.13);line([-.5,22,3],[20.5,22,3],'#f2edda',scale*.11);
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
   c.fillStyle='#071c2740';c.beginPath();c.ellipse(q.x,q.y,scale*.7,scale*.14,0,0,Math.PI*2);c.fill();
   drawProfile(c,d,mode,phase,q.x,q.y,scale/units,{style,look,direction,view:p.team===0?'near':'far',frame:(p.stride??0)*1.35,moving,feet3D,contact3D,alignStrength:animation?.alignStrength??0,paddleShape:p.paddle?.shapeId,side:['resetBlock','counterVolley','halfVolley'].includes(mode)&&p.stroke==='backhand'?-1:1,emotion:p.mishit&&p.swing>0?'reaction':p.swing>0||moving?'effort':'focus',sweat:1-(p.stamina??1),emotionClock:snapshot.clock});
  }
  drawContactCue(c,replayContactAt(clip,snapshot.clock),project,{scale:Math.max(1,scale/12),labels:true});
  if(snapshot.bounceMark?.time>0){const p=project(snapshot.bounceMark.x,snapshot.bounceMark.y);c.strokeStyle='#fff6ba';c.lineWidth=scale*.05;c.beginPath();c.ellipse(p.x,p.y,scale*.45,scale*.15,0,0,Math.PI*2);c.stroke()}
  c.restore();
 };
}
