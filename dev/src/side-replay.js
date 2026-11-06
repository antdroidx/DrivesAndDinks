import {resolveAnimeGameDesign,applyAnimeLook} from './anime-game.js?v=163';
import {createProfileRenderer} from './profile-athlete.js?v=163';
import {sampleMatchAnimation} from './match-animation.js?v=163';
import {playerFeet} from './player-feet.js?v=163';
import {drawContactCue,replayContactAt} from './contact-cues.js?v=163';
import {paintCourtTexture} from './court-art.js?v=163';import {playerEmotionState} from './player-emotion.js?v=163';
import {C} from './core.js?v=163';
import {NEUTRAL_PLAYER_HEIGHT_CM,PROFILE_CANONICAL_BODY_UNITS,PROFILE_VISUAL_BODY_UNITS,playerHeightFeet,netTopHeight} from './court-scale.js?v=163';

// Measured ceiling of the ball in live play is about 7 feet, with the highest
// overhead contact near 7.4. Eight feet leaves headroom without reserving space
// for a lob the engine never produces.
export const MAX_REPLAY_Z=8;

const COURT_LENGTH=C.length,COURT_WIDTH=C.width,PROFILE_BODY=PROFILE_CANONICAL_BODY_UNITS;

// The replay backdrop is its own plate: the sideline camera looks across the
// court, so the venue that matters is the far side, beyond the far sideline.
const REPLAY_PLATE={file:'replay-sideline.png',boundary:.5,floor:'#93aac4'};

function replayName(name){return String(name||'').split(/\s+/)[0]}
function drawReplayName(c,name,x,y,scale){
 const label=replayName(name);if(!label)return;c.save();c.font=`bold ${Math.max(8,Math.min(12,scale*.42))}px monospace`;c.textAlign='center';const width=Math.max(32,c.measureText(label).width+12);c.fillStyle='#10232de8';c.fillRect(x-width/2,y-15,width,14);c.fillStyle='#fff8df';c.fillText(label,x,y-5);c.restore();
}
const shade=(hex,t)=>'#'+hex.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*(1-t)).toString(16).padStart(2,'0')).join(''),
 sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),
 dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,
 cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}),
 norm=a=>{const l=Math.hypot(a.x,a.y,a.z)||1;return {x:a.x/l,y:a.y/l,z:a.z/l}};

// Camera height and stand-off set the oblique side angle. The eye sits a little
// off the net plane so the net shows real depth instead of collapsing to a line.
const EYE={x:44,y:24.5,z:29},TARGET={x:10,y:22,z:0};

export function sideReplayProjection(width,height,maxZ=16){
 // A real perspective camera from the side at an elevated angle. The court
 // length runs across the screen, the width recedes toward the far end and the
 // net stands down the middle with converging edges.
 const fwd=norm(sub(TARGET,EYE)),right=norm(cross(fwd,{x:0,y:0,z:1})),up=cross(right,fwd);
 const raw=(x,y,z=0)=>{const p=sub({x,y,z},EYE),vz=Math.max(.001,dot(p,fwd));return {x:dot(p,right)/vz,y:-dot(p,up)/vz,vz}};
 // Frame the court surface plus a realistic ball volume. Sizing to the extreme
 // corners of the ball envelope would leave the court needlessly small.
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 const samples=[];
 for(const x of [0,COURT_WIDTH])for(const y of [0,COURT_LENGTH])samples.push([x,y,0]);
 for(const x of [2,18])for(const y of [2,42])for(const z of [0,maxZ])samples.push([x,y,z]);
 for(const [x,y,z] of samples){const p=raw(x,y,z);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
 const margin=.02,focal=Math.min(width*(1-2*margin)/(maxX-minX),height*(1-2*margin)/(maxY-minY));
 const cx=width/2-focal*(minX+maxX)/2,cy=height/2-focal*(minY+maxY)/2;
 const project=(x,y,z=0)=>{const p=raw(x,y,z);return {x:cx+focal*p.x,y:cy+focal*p.y}};
 const horizon=project(-4000,22,0).y,
  scale=Math.hypot(project(10,22,1).x-project(10,22,0).x,project(10,22,1).y-project(10,22,0).y),
  depthOf=(x,y,z=0)=>raw(x,y,z).vz,
  // Vertical scale at a point, used to size upright figures with the same
  // foreshortening the camera applies to the court.
  lift=(x,y)=>Math.hypot(project(x,y,1).x-project(x,y,0).x,project(x,y,1).y-project(x,y,0).y),
  // Screen length of one foot along the court's length at a point.
  span=(x,y)=>{const a=project(x,y),b=project(x,y+1);return Math.hypot(b.x-a.x,b.y-a.y)};
 return {project,scale,horizon,depthOf,lift,span,focal,cx,cy};
}
export function sideReplayCamera(width,height,clip,snapshot){
 // A fixed envelope fits every recorded rally, so replay composition neither
 // pans nor changes scale.
 const camera=sideReplayProjection(width,height,MAX_REPLAY_Z);
 return {x:0,y:0,width,height,...camera};
}
// The screen height of a player at a point, calibrated to real court feet.
export function sideReplayFigureHeight(camera,x,y,heightCm=NEUTRAL_PLAYER_HEIGHT_CM){const feet=playerHeightFeet(heightCm),base=camera.project(x,y,0),top=camera.project(x,y,feet);return Math.hypot(top.x-base.x,top.y-base.y)*PROFILE_CANONICAL_BODY_UNITS/PROFILE_VISUAL_BODY_UNITS}
export function replayAngleFor(clip,{aspect=1.5}={}){return clip.focus?.boundary!==undefined||aspect<1.1?'overview':'sideline'}

export function createSideReplayRenderer(createCanvas,createImage=()=>typeof Image==='undefined'?null:new Image()){
 const drawProfile=createProfileRenderer(createCanvas);
 let plate=null;
 const backdrop=()=>{
  if(plate)return plate;
  const image=createImage();
  if(!image)return null;
  plate={image,ready:false};
  image.onload=()=>{plate.ready=true};
  image.src=new URL('../assets/venues/'+REPLAY_PLATE.file,import.meta.url).href;
  return plate;
 };
 return (c,viewport,snapshot,clip,{palette,style='anime',look='sports',outfit='performance',showNameTags=true}={})=>{
  const {width,height}=viewport,camera=sideReplayCamera(width,height,clip,snapshot),{project,scale,depthOf,lift}=camera;
  // The ball uses the same world-foot scale as the court and athletes.
  const ballScale=(x,y)=>lift(x,y);
  const line=(a,b,color='#f3f0de',weight=1)=>{const p=project(...a),q=project(...b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.strokeStyle=color;c.lineWidth=weight;c.stroke()};
  const polygon=(points,color)=>{c.beginPath();points.forEach((p,i)=>{const q=project(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.closePath();c.fillStyle=color;c.fill()};
  const rectangle=(x1,y1,x2,y2,color)=>polygon([[x1,y1],[x2,y1],[x2,y2],[x1,y2]],color);
  c.save();c.setTransform(1,0,0,1,0,0);
  // The venue backdrop stands beyond the far sideline and meets the ground just
  // below the camera horizon, so its floor line lands between the far baseline
  // and the horizon.
  const venueFloor=Math.max(1,Math.min(height*.62,project(-24,COURT_LENGTH/2,0).y));
  c.fillStyle=REPLAY_PLATE.floor;c.fillRect(0,0,width,height);
  const art=backdrop();
  if(art?.ready){
   const image=art.image;
   c.drawImage(image,0,0,image.width,image.height*REPLAY_PLATE.boundary,0,0,width,Math.max(1,venueFloor));
  }else{
   // Until the plate loads the venue reads as a stepped backdrop.
   for(let i=0;i<8;i++){const t=i/7;c.fillStyle='rgb('+Math.round(16+t*21)+','+Math.round(31+t*27)+','+Math.round(40+t*28)+')';c.fillRect(0,venueFloor*i/8,width,venueFloor/8+.5)}
  }
  const apronTop=Math.max(0,venueFloor),apronSpan=height-apronTop;
  if(apronSpan>0)for(let i=0;i<8;i++){const t=i/7;c.fillStyle=shade(REPLAY_PLATE.floor,.16*(1-t));c.fillRect(0,apronTop+apronSpan*i/8,width,apronSpan/8+.5)}
  c.fillStyle='#0b1c2466';c.fillRect(0,venueFloor,width,Math.max(2,scale*.2));
  rectangle(0,0,COURT_WIDTH,COURT_LENGTH,palette?.court??'#467482');rectangle(0,C.net-C.kitchen,COURT_WIDTH,C.net+C.kitchen,palette?.kitchen??'#8d9e94');
  c.save();c.beginPath();
   [[0,0],[COURT_WIDTH,0],[COURT_WIDTH,COURT_LENGTH],[0,COURT_LENGTH]].forEach((p,i)=>{const q=project(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});
   c.closePath();c.clip();
   paintCourtTexture(c,project,{count:2600,outdoors:true,dot:Math.max(1,scale*.05),block:Math.max(1,scale*.05)});
   c.restore();
  for(const [a,b] of [[[0,0],[COURT_WIDTH,0]],[[COURT_WIDTH,0],[COURT_WIDTH,COURT_LENGTH]],[[COURT_WIDTH,COURT_LENGTH],[0,COURT_LENGTH]],[[0,COURT_LENGTH],[0,0]],[[0,C.net-C.kitchen],[COURT_WIDTH,C.net-C.kitchen]],[[0,C.net+C.kitchen],[COURT_WIDTH,C.net+C.kitchen]],[[10,0],[10,C.net-C.kitchen]],[[10,C.net+C.kitchen],[10,COURT_LENGTH]]])line(a,b,'#f3f0de',scale*.08);
  const net=()=>{
   // The regulation tape is 36 inches at the posts and 34 inches at center.
   const left=C.netPostLeft,right=C.netPostRight,topPoints=[];
   for(let x=left;x<=right+.001;x+=.5)topPoints.push([x,C.net,netTopHeight(x)]);
   c.save();c.globalAlpha=.7;
   polygon([[left,C.net,0],[right,C.net,0],...topPoints.slice().reverse()],'#122a3422');
   c.restore();
   for(let z=.4;z<C.netPostHeight;z+=.4){
    let previous=null;
    for(const point of topPoints){if(z<=point[2]){if(previous)line(previous,point,'#2c4a5488',Math.max(.6,scale*.03));previous=point}else previous=null}
   }
   for(let x=0;x<=C.width;x+=2)line([x,C.net,0],[x,C.net,netTopHeight(x)],'#2c4a5466',Math.max(.5,scale*.022));
   for(let i=0;i<topPoints.length-1;i++)line(topPoints[i],topPoints[i+1],'#f2edda',Math.max(1.4,scale*.07));
   line([left,C.net,0],[left,C.net,C.netPostHeight],'#243b43',Math.max(1.3,scale*.12));
   line([right,C.net,0],[right,C.net,C.netPostHeight],'#243b43',Math.max(1.3,scale*.12));
  };
  const entities=[{kind:'net',depth:depthOf(C.width/2,C.net)},...snapshot.players.map(player=>({kind:'player',depth:depthOf(player.x,player.y),player})),{kind:'ball',depth:depthOf(snapshot.ball.x,snapshot.ball.y)}].sort((a,b)=>b.depth-a.depth);
  for(const entity of entities){
   if(entity.kind==='net'){net();continue}
   if(entity.kind==='ball'){
    const b=snapshot.ball,q=project(b.x,b.y,b.z),ground=project(b.x,b.y,0),bs=Math.max(1,ballScale(b.x,b.y));
    c.fillStyle='#09202d44';c.beginPath();c.ellipse(ground.x,ground.y,bs*.24,bs*.07,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#f3e99b66';c.lineWidth=Math.max(.6,scale*.045);c.beginPath();for(const [i,p] of (snapshot.trail??[]).entries()){const t=project(p.x,p.y,p.z);i?c.lineTo(t.x,t.y):c.moveTo(t.x,t.y)}c.stroke();
    c.fillStyle='#f4ea71';c.beginPath();c.ellipse(q.x,q.y,Math.max(2,bs*.125),Math.max(2,bs*.125),0,0,Math.PI*2);c.fill();continue;
   }
   const p=entity.player,q=project(p.x,p.y),d=applyAnimeLook(resolveAnimeGameDesign({appearance:p.appearance,characterId:p.characterId,outfit:p.appearance?.outfit??outfit}),look),figureScale=sideReplayFigureHeight(camera,p.x,p.y,d.height)/PROFILE_BODY,units=lift(p.x,p.y)/figureScale,zUnits=units,animation=sampleMatchAnimation(p,{...snapshot,server:snapshot.players.find(player=>player.id===snapshot.serverId)}),moving=Math.hypot(p.vx,p.vy)>1;
   const mode=animation?.mode??(moving?'run':'idle'),phase=animation?.phase??0,direction=p.team===0?-1:1,stature=d.height/177;
   const footPose=playerFeet(p).map(foot=>({x:(foot.x-p.x)*units,y:63-(2+foot.z*zUnits)/stature,z:(foot.y-p.y)*direction*units}));
   const contact3D=p.animationContactStart&&p.swing>0&&p.contactPoint?{x:(p.contactPoint.x-p.x)*units,y:63-p.contactPoint.z*zUnits/stature,z:(p.contactPoint.y-p.y)*direction*units}:null;

   drawProfile(c,d,mode,phase,q.x,q.y,figureScale,{style,look,direction,view:p.team===0?'near':'far',frame:(p.stride??0)*1.35,moving,feet3D:footPose,contact3D,alignStrength:animation?.alignStrength??0,paddleShape:p.paddle?.shapeId,side:(p.handedness==='left'||p.hand==='left'?-1:1)*(['resetBlock','counterVolley','halfVolley'].includes(mode)&&p.stroke==='backhand'?-1:1),handedness:p.handedness??'right',headwearBackwards:p.team===0,...(()=>{const state=playerEmotionState(p,{phase:snapshot.phase??'rally',rallyShots:snapshot.shots,incomingShot:snapshot.ball?.shot,lastPointWinner:snapshot.lastPointWinner});return {emotion:state.expression,sweat:state.sweat,emotionIntensity:state.intensity,emotionMarks:state.marks,emotionClock:snapshot.clock}})()});
   if(showNameTags!==false)drawReplayName(c,p.name,q.x,q.y-figureScale*.84,scale);
  }
  drawContactCue(c,replayContactAt(clip,snapshot.clock),project,{scale:Math.max(1,scale/12),labels:true});
  if(snapshot.bounceMark?.time>0){const p=project(snapshot.bounceMark.x,snapshot.bounceMark.y);c.strokeStyle='#fff6ba';c.lineWidth=Math.max(.6,scale*.05);c.beginPath();c.ellipse(p.x,p.y,Math.max(4,scale*.45),Math.max(2,scale*.15),0,0,Math.PI*2);c.stroke()}
  c.restore();
 };
}
