import {sampleCharacterPose,solveArm3D} from './pixel-character.js';
import {animeBodyDimensions,skinPalette,tone,animePixelPalette,drawAnimeRibbon} from './anime-character.js';
import {thighGarment,skirtGarment} from './character-concepts.js';

function polygon(c,points,color,ink='#4c453d',width=.35){
 c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();
 if(ink){c.strokeStyle=ink;c.lineWidth=width;c.stroke()}
}
function oval(c,x,y,rx,ry,color,ink=null,width=.35){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
 if(ink){c.strokeStyle=ink;c.lineWidth=width;c.stroke()}
}
function line(c,points,color,width=.4){
 c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
}
function limb(c,chain,width,color,shadow){
 drawAnimeRibbon(c,chain,Array.isArray(width)?width:chain.map(()=>width),color,'#4c453d',{shadow,light:tone(color,.1)});
}
function joint(c,point,r,color){oval(c,point.x,point.y,r,r,color,'#4c453d',.22)}
function profileShoe(c,foot,dir,d,body){
 const x=foot.x,y=foot.y;
 polygon(c,[{x:x-1.5,y:y-3.2},{x:x+1.5,y:y-3.2},{x:x+1.7,y:y-.4},{x:x-1.6,y:y-.4}],tone('#e5dfce',-.08),'#4c453d',.3);
 polygon(c,[{x:x-dir*2.1,y:y-.6},{x:x+dir*1.8,y:y-.8},{x:x+dir*4.2,y:y+.7},{x:x+dir*3.8,y:y+1.8},{x:x-dir*2.4,y:y+1.8}],d.trim,'#4c453d',.4);
 polygon(c,[{x:x-dir*2.2,y:y+1.25},{x:x+dir*3.9,y:y+1.25},{x:x+dir*3.7,y:y+1.9},{x:x-dir*2.4,y:y+1.9}],tone(d.trim,-.45),null);
 line(c,[{x:x-dir*1.4,y:y-.55},{x:x+dir*1.9,y:y-.25}],tone(d.trim,.28),.35);
 line(c,[{x:x-dir*.8,y:y+.1},{x:x+dir*1.5,y:y+.35}],tone(d.trim,.18),.28);
 line(c,[{x:x-1.1,y:y-2.5},{x:x+1.1,y:y-2.5}],d.trim,.45);
}
export function profilePose(design,mode,phase,options={}){
 const raw=sampleCharacterPose({...options,mode,phase,view:options.view??'far',contactWeight:options.alignStrength??0}),direction=(options.direction??1)*(mode==='tweener'?-1:1),height=design.height/177;
 const cos=Math.cos(raw.rig.yaw),sin=Math.sin(raw.rig.yaw);
 const project=p=>{const x=p.x*cos+p.z*sin,z=p.z*cos-p.x*sin;return {x:24+direction*z+x*.24,y:63+(p.y-63)*height+x*.38,depth:x}};
 const arms=raw.arms3.map(chain=>chain.map(project));
 const stride=Math.sin((options.frame??0)*Math.PI/2),moving=!!options.moving||['run','shuffle','backpedal','crossover'].includes(mode);
 const feet=options.feet3D?options.feet3D.map(p=>({x:p.x*cos-p.z*sin,y:p.y,z:p.x*sin+p.z*cos})):raw.feet.map((foot,i)=>({x:i?4:-4,y:61-(59-foot.y),z:moving?(i?-1:1)*stride*5:(i?1:-1)*1.8}));
 const legs=feet.map((foot,i)=>solveArm3D({...raw.rig.hips,x:raw.rig.hips.x+(i?2:-2)},foot,{x:0,y:0,z:1},[10.8,10.8]).map(project));
 return {raw,direction,neck:project(raw.rig.neck),hips:project(raw.rig.hips),arms,legs,paddle:project(raw.rig.paddle),hand:project(raw.rig.hand)};
}

function profileHead(c,d,neck,direction,rawEmotion,sweat,clock){
 const emotion=({smile:'happy',reaction:'surprise',neutral:'focus'})[rawEmotion]??rawEmotion??'focus';
 const y=neck.y-6,skin=skinPalette(d.skin),hair=d.hairColor,ink='#4c453d';
 c.save();c.translate(neck.x,y);c.scale(direction,1);
 if(d.hair==='ponytail'){
  const sway=Math.sin(clock*3)*.7;
  polygon(c,[{x:-2,y:-4},{x:-8,y:-5},{x:-12-sway,y:1},{x:-10,y:8},{x:-6,y:5},{x:-6,y:-1}],tone(hair,-.12),ink,.35);
  oval(c,-7,-2,2.1,1.5,d.trim,ink,.25);
 }
 if(d.hair==='braid'){
  for(let i=0;i<7;i++)oval(c,-7.5+Math.sin(i*.7)*.55,-1+i*1.7,1.25-i*.06,1.35,tone(hair,i%2?.08:-.08),ink,.2);
  oval(c,-5.2,-2.8,1.4,1.1,d.trim,ink,.25);
 }
 if(d.hair==='twinTails'){
  const sway=Math.sin(clock*3)*.65;
  for(const side of [-1,1]){
   line(c,[{x:side*4,y:-3},{x:side*(8+sway),y:2}],tone(hair,-.08),2.8);
   line(c,[{x:side*(8+sway),y:2},{x:side*(7+sway),y:8}],tone(hair,.1),2.1);
   oval(c,side*4.4,-3,1.25,1,d.trim,ink,.22);
  }
 }
 polygon(c,[{x:-4.5,y:-4},{x:-1,y:-6.5},{x:2.8,y:-5.2},{x:3.8,y:-1.1},{x:4.45,y:.45},{x:3.85,y:1.45},{x:3.25,y:3.8},{x:1.1,y:5.8},{x:-2.8,y:4.7},{x:-4.6,y:1.7}],d.skin,ink,.5);
 polygon(c,[{x:-3.8,y:-3},{x:-2.6,y:2.8},{x:1,y:5.5},{x:-2.5,y:4.5},{x:-4.2,y:1.3}],skin.shadow,null);
 oval(c,-3.9,.8,1.05,1.5,skin.base,ink,.25);
 line(c,[{x:-4.2,y:.5},{x:-3.4,y:1.1}],skin.deep,.3);
 const eyeY=emotion==='surprise'?-.3:emotion==='fatigue'?.3:.05;
 const eyeHeight=emotion==='surprise'?1.05:emotion==='happy'?.5:emotion==='fatigue'?.54:emotion==='aggression'?.72:.82;
 polygon(c,[{x:1.05,y:eyeY-eyeHeight*.45},{x:2.2,y:eyeY-eyeHeight*.62},{x:3.05,y:eyeY-.08},{x:2.45,y:eyeY+eyeHeight*.62},{x:1.25,y:eyeY+eyeHeight*.5}], '#f4dfc8',null);
 oval(c,2.3,eyeY+.08,.54,eyeHeight*.62,tone(hair,.18),'#76635c',.16);
 oval(c,2.35,eyeY+.18,.23,eyeHeight*.36,'#3b3440');
 oval(c,2.12,eyeY-.1,.12,.15,'#fff8ed');
 line(c,[{x:1.05,y:eyeY-eyeHeight*.5},{x:2.95,y:eyeY-.18}],skin.deep,.24);
 line(c,[{x:1.25,y:eyeY-eyeHeight*.72},{x:2.75,y:eyeY-eyeHeight*.42}],skin.deep,.18);
 oval(c,3.45,1.05,.42,.58,skin.shadow);
 line(c,[{x:3.25,y:1.7},{x:3.05,y:2.05}],skin.deep,.15);
 if(emotion==='surprise')oval(c,3.1,3.55,.48,.7,skin.deep,ink,.18);
 else if(emotion==='happy')line(c,[{x:2.25,y:3.7},{x:3.35,y:3.2}],skin.deep,.4);
 else if(emotion==='aggression')line(c,[{x:2.05,y:3.55},{x:3.55,y:3.45}],skin.deep,.4);
 else if(emotion==='fatigue')line(c,[{x:2.3,y:3.5},{x:3.2,y:3.7}],skin.deep,.35);
 else line(c,[{x:2.2,y:3.55},{x:3.35,y:3.45}],skin.deep,.35);
 if(d.hair==='bald'){
  polygon(c,[{x:-3.5,y:-3.6},{x:-2.6,y:-5.2},{x:-.5,y:-5.8},{x:-1.2,y:-4.4},{x:-2.7,y:-3.4}],skin.light,null);
 }else if(d.hair==='buzz'){
  polygon(c,[{x:-4.5,y:-1.8},{x:-4.1,y:-4.7},{x:-2,y:-6.3},{x:.2,y:-6.7},{x:2.7,y:-5.7},{x:4.35,y:-3.8},{x:4.45,y:-1.7},{x:2,y:-2.7},{x:-.4,y:-3.15},{x:-2.4,y:-2.55}],tone(hair,.12),ink,.32);
  for(let i=0;i<7;i++)line(c,[{x:-3.3+i*1.05,y:-4.7+(i%2)*.4},{x:-3.1+i*1.05,y:-4.45+(i%2)*.4}],tone(hair,.3),.18);
 }else if(d.hair==='crop'){
  polygon(c,[{x:-4.7,y:-1.6},{x:-5,y:-4.5},{x:-2.6,y:-6.4},{x:.2,y:-7},{x:3,y:-5.8},{x:4.5,y:-3.4},{x:4.2,y:-1.6},{x:1.5,y:-2.8},{x:-1.8,y:-2.2}],hair,ink,.38);
  polygon(c,[{x:-3.8,y:-3.5},{x:-1.8,y:-5.9},{x:-.7,y:-5.7},{x:-1.4,y:-3.7}],tone(hair,.18),null);
  polygon(c,[{x:.3,y:-5.7},{x:2.8,y:-4.7},{x:1.7,y:-3.2}],tone(hair,-.1),null);
 }else if(d.hair==='curls'){
  polygon(c,[{x:-4.5,y:-1.8},{x:-4.3,y:-4.4},{x:0,y:-6.4},{x:4.3,y:-3.8},{x:4.5,y:-1.8},{x:1.5,y:-2.8},{x:-1.8,y:-2.2}],hair,ink,.35);
  for(let i=0;i<6;i++)oval(c,-3.8+i*1.5,-4.7-Math.sin(i/5*Math.PI)*1.3,1.45,1.35,tone(hair,i%2?.1:-.08),ink,.2);
 }else if(d.hair==='spiky'){
  polygon(c,[{x:-4.7,y:-1.4},{x:-5.3,y:-4},{x:-3.2,y:-5.3},{x:-3.8,y:-8.2},{x:-1.3,y:-6.1},{x:-.2,y:-9.1},{x:1.4,y:-6.2},{x:3.7,y:-7.6},{x:3.2,y:-4.8},{x:5.1,y:-5.3},{x:4.3,y:-1.8},{x:1.6,y:-3},{x:-1.8,y:-2.4}],hair,ink,.4);
  line(c,[{x:-2.6,y:-5.3},{x:-1.8,y:-7.5}],tone(hair,.25),.35);
 }else if(d.hair==='sidePart'){
  polygon(c,[{x:-4.8,y:-1.5},{x:-4.4,y:-4.6},{x:-1.2,y:-6.8},{x:3.8,y:-5.2},{x:4.7,y:-2.2},{x:1.3,y:-3.3},{x:-2.3,y:-2.4}],hair,ink,.4);
  polygon(c,[{x:-2.8,y:-5.5},{x:1.9,y:-5.1},{x:3.3,y:-3.5},{x:.5,y:-4.2}],tone(hair,.2),null);
 }else if(d.hair==='pixie'){
  polygon(c,[{x:-4.8,y:-1.5},{x:-5.3,y:-4.3},{x:-2.6,y:-6.4},{x:-.3,y:-8},{x:1.4,y:-5.7},{x:4.5,y:-6},{x:4.4,y:-2.2},{x:1.3,y:-3.2}],hair,ink,.4);
  line(c,[{x:-1.2,y:-5.7},{x:1.2,y:-4.3}],tone(hair,.22),.35);
 }else if(d.hair==='bob'||d.hair==='waves'){
  polygon(c,[{x:-4.8,y:-1.5},{x:-4.7,y:-5},{x:-1.6,y:-7},{x:2.8,y:-5.5},{x:4.5,y:-2.4},{x:3.5,y:-2.5},{x:1.4,y:-3.3},{x:-1.8,y:-2.4}],hair,ink,.4);
  polygon(c,[{x:-5.1,y:-1.6},{x:-5.5,y:3.7},{x:-3.2,y:6.1},{x:-2.5,y:3.2},{x:-4.2,y:-.8}],hair,ink,.35);
  polygon(c,[{x:4.2,y:-1.8},{x:5.2,y:3.6},{x:3.1,y:5.5},{x:2.4,y:3},{x:3.5,y:-.8}],hair,ink,.35);
  if(d.hair==='waves')for(const side of [-1,1])for(let i=0;i<3;i++)oval(c,side*(4.25+i*.3),-.4+i*1.5,1.05,1.15,tone(hair,i%2?.1:-.06),ink,.18);
 }else{
  polygon(c,[{x:-4.8,y:-1.5},{x:-4.7,y:-5},{x:-1.6,y:-7},{x:2.8,y:-5.5},{x:4.5,y:-2.4},{x:3.5,y:-2.5},{x:1.4,y:-3.3},{x:-1.8,y:-2.4}],hair,ink,.4);
 }
 if(d.headwear==='cap'){
  polygon(c,[{x:-5.3,y:-3.3},{x:-4.8,y:-8},{x:0,y:-9},{x:4.3,y:-6},{x:4.6,y:-3}],d.trim,ink,.4);
  polygon(c,[{x:1,y:-3.5},{x:7.6,y:-2.7},{x:8,y:-1.5},{x:2,y:-2}],tone(d.trim,-.12),ink,.3);
  line(c,[{x:0,y:-8},{x:.4,y:-4}],tone(d.trim,-.2),.3);
 }else if(d.headwear==='visor'){
  polygon(c,[{x:-4.8,y:-4},{x:3.9,y:-4},{x:7.5,y:-2.7},{x:2.4,y:-2.5},{x:-4.5,y:-2.7}],d.trim,ink,.35);
 }else if(d.headwear==='headband'){
  line(c,[{x:-5,y:-3.4},{x:3.2,y:-4}],d.trim,1.25);
  line(c,[{x:-4.6,y:-3.65},{x:2.8,y:-4.25}],tone(d.trim,.2),.3);
 }
 if(d.eyewear==='glasses'){
  c.strokeStyle=ink;c.lineWidth=.45;c.beginPath();c.ellipse(2,.2,1.65,1.5,0,0,Math.PI*2);c.stroke();
  line(c,[{x:-2.8,y:-.1},{x:.3,y:.1}],ink,.45);
 }
 const sweatLevel=Math.max(0,Math.min(1,sweat));
 if(sweatLevel>.1){
  oval(c,-2.4,-5.2,1.1,.25,'#d8f3f4aa');
  const drops=sweatLevel>.68?3:sweatLevel>.34?2:1;
  for(let i=0;i<drops;i++){const drop=((clock||0)*(.7+i*.14)+i*.31)%1;oval(c,-3.2+i*3.2,2+drop*3,.32,.58+drop*.18,'#b5e6ef')}
 }
 c.globalAlpha=.72;
 if(emotion==='surprise'){line(c,[{x:-7,y:-5},{x:-9,y:-7}], '#f6cc59',.35);line(c,[{x:0,y:-8},{x:0,y:-10.5}], '#f6cc59',.35);line(c,[{x:7,y:-5},{x:9,y:-7}], '#f6cc59',.35)}
 if(emotion==='aggression'){line(c,[{x:-7,y:-3},{x:-4.5,y:-4}], '#ef8a4b',.4);line(c,[{x:4.5,y:-4},{x:7,y:-3}], '#ef8a4b',.4)}
 if(emotion==='happy'){line(c,[{x:-7,y:-4},{x:-5.5,y:-5.5}], '#f6cc59',.34);line(c,[{x:5.5,y:-5.5},{x:7,y:-4}], '#f6cc59',.34)}
 if(emotion==='fatigue'){c.strokeStyle='#b5e6ef';c.lineWidth=.28;c.beginPath();c.arc(5.5,3.5,1.3,-.8,.8);c.stroke()}
 c.globalAlpha=1;c.restore();
}

export function drawProfileAthlete(c,d,mode,phase,cx,baseline,scale,options={}){
 const p=profilePose(d,mode,phase,options),body=animeBodyDimensions(d),skin=skinPalette(d.skin),ink='#4c453d',n=p.neck,h=p.hips,dir=p.direction;
 c.save();c.translate(cx-24*scale,baseline-63*scale);c.scale(scale,scale);
 const arm=i=>{const chain=p.arms[i],width=3.2+d.build*1.1;
  limb(c,chain,[width,width*.98,width*.68],d.skin,skin.deep);
  joint(c,chain[1],width*.48,skin.shadow);
  if(d.outfit==='polo'||d.body==='male'&&d.outfit==='performance'){
   const end={x:chain[0].x+(chain[1].x-chain[0].x)*.43,y:chain[0].y+(chain[1].y-chain[0].y)*.43};
   limb(c,[chain[0],end],[width+1.2,width+1],d.shirt,tone(d.shirt,-.2));
   line(c,[{x:end.x-1,y:end.y-.2},{x:end.x+1,y:end.y+.4}],d.trim,.45);
  }
  oval(c,chain[2].x,chain[2].y,.85,1.1,d.skin,ink,.25);
  if(i===p.raw.gripSide)line(c,[{x:chain[2].x-1.3,y:chain[2].y-1.5},{x:chain[2].x+1.1,y:chain[2].y-1.3}],d.trim,1.15);
 };
 const drawPaddle=()=>{
  line(c,[p.hand,p.paddle],'#494047',1.35);
  c.save();c.translate(p.paddle.x,p.paddle.y);c.rotate(Math.atan2(-(p.hand.x-p.paddle.x),p.hand.y-p.paddle.y));
  oval(c,0,0,options.paddleShape==='wide'?3.5:2.8,options.paddleShape==='elongated'?5.8:5.1,tone(d.trim,-.18),ink,.45);
  oval(c,0,0,options.paddleShape==='wide'?2.85:2.2,options.paddleShape==='elongated'?5.05:4.35,'#1c2430',ink,.25);
  oval(c,0,0,options.paddleShape==='wide'?2.3:1.75,options.paddleShape==='elongated'?4.45:3.8,'#101722');
  line(c,[{x:-1.5,y:-3.1},{x:-.3,y:-3.8},{x:1.1,y:-3.3}], '#ffffff55',.38);
  line(c,[{x:-1.4,y:3.4},{x:1.2,y:3.1}], tone(d.trim,.25),.3);
  c.restore();
 };
 const layers=p.arms.map((chain,i)=>({i,back:chain[1].depth<p.neck.depth}));
 layers.filter(a=>a.back).forEach(a=>arm(a.i));if(p.paddle.depth<p.neck.depth)drawPaddle();
 for(const chain of p.legs.toSorted((a,b)=>a[0].depth-b[0].depth)){
  limb(c,chain,[body.thigh*1.05,body.calf*1.05,body.ankle*1.18],d.skin,skin.shadow);
  joint(c,chain[1],body.calf*.48,skin.shadow);
  profileShoe(c,chain[2],dir,d,body);
 }
 const waist=body.waist*.78,shoulder=d.shoulder*.62,top=n.y+.8,hem=h.y-(d.body==='female'&&d.outfit==='shorts'?5:.5);
 line(c,[{x:n.x,y:n.y-1},{x:n.x,y:top+2}],d.skin,3.2);
 polygon(c,[{x:n.x-shoulder,y:top},{x:n.x+shoulder,y:top+1.3},{x:h.x+waist,y:hem},{x:h.x-waist,y:hem}],d.shirt,ink,.45);
 joint(c,{x:n.x-dir*shoulder*.75,y:top+1.5},1.5,tone(d.shirt,-.12));
 joint(c,{x:n.x+dir*shoulder*.75,y:top+1.5},1.5,tone(d.shirt,-.12));
 polygon(c,[{x:n.x+dir*shoulder*.2,y:top+1.2},{x:n.x+dir*shoulder,y:top+2.2},{x:h.x+dir*waist*.7,y:hem-.3},{x:h.x+dir*waist*.15,y:hem-.3}],tone(d.shirt,-.16),null);
 polygon(c,[{x:n.x-dir*shoulder*.45,y:top+1.8},{x:n.x-dir*shoulder*.05,y:top+1.3},{x:n.x+dir*waist*.15,y:hem-1.2},{x:n.x-dir*waist*.35,y:hem-.6}],tone(d.shirt,.16),null);
 line(c,[{x:n.x-dir*shoulder*.2,y:top+3.2},{x:n.x+dir*waist*.15,y:hem-2.8}],tone(d.shirt,-.28),.35);
 line(c,[{x:n.x-dir*1.8,y:top+.1},{x:n.x+dir*2,y:top+1.2}],d.trim,.8);
 line(c,[{x:n.x-shoulder*.8,y:top+1.1},{x:n.x+shoulder*.8,y:top+1.5}],tone(d.shirt,.22),.45);
 line(c,[{x:n.x-waist,y:hem-1.2},{x:n.x+waist,y:hem-1.2}],d.trim,.6);
 if(d.outfit==='polo')polygon(c,[{x:n.x-dir*1.7,y:top},{x:n.x+dir*1.7,y:top+.6},{x:n.x+dir*2.8,y:top+3.1},{x:n.x,y:top+1.8}],d.trim,ink,.3);
 if(d.body==='female'&&d.outfit!=='shorts'){
  const skirt=skirtGarment(h,p.legs,body.hip-1,Math.max(1.5,body.thigh-.6));
  polygon(c,skirt.polygon.map(([x,y])=>({x,y})),tone(d.shirt,.08),ink,.45);
  line(c,[{x:skirt.left,y:skirt.ends[0].y+1},{x:h.x,y:skirt.bottom},{x:skirt.right,y:skirt.ends[1].y+1}],d.trim,.6);
  for(const offset of [-.55,-.2,.2,.55])line(c,[{x:h.x+offset*body.hip,y:h.y+1},{x:h.x+offset*body.hip*1.35,y:skirt.bottom-1}],tone(d.shirt,-.18),.3);
 }else{
  for(const chain of p.legs){const g=thighGarment(chain,body.thigh*.85+1);polygon(c,g.polygon.map(([x,y])=>({x,y})),tone(d.shirt,-.48),ink,.35)}
  polygon(c,[{x:h.x-body.hip,y:h.y-1},{x:h.x+body.hip,y:h.y-1},{x:h.x+body.hip,y:h.y+2},{x:h.x,y:h.y+3},{x:h.x-body.hip,y:h.y+2}],tone(d.shirt,-.48),ink,.35);
  line(c,[{x:h.x-body.hip*.8,y:h.y+.2},{x:h.x+body.hip*.8,y:h.y+.2}],d.trim,.4);
  line(c,[{x:h.x-body.hip*.65,y:h.y+.8},{x:h.x+body.hip*.65,y:h.y+.8}],tone(d.shirt,-.3),.3);
 }
 profileHead(c,d,n,dir,options.emotion??'focus',options.sweat??0,options.emotionClock??0);
 layers.filter(a=>!a.back).forEach(a=>arm(a.i));if(p.paddle.depth>=p.neck.depth)drawPaddle();c.restore();
 return p;
}

export function createProfileRenderer(createCanvas=()=>document.createElement('canvas')){
 let buffer=null;const colorCaches=new Map();
 return (c,d,mode,phase,cx,baseline,scale,options={})=>{
  if(options.style!=='anime-pixel')return drawProfileAthlete(c,d,mode,phase,cx,baseline,scale,options);
  if(!buffer){buffer=createCanvas();buffer.width=buffer.height=144}
  const pc=buffer.getContext('2d',{willReadFrequently:true});pc.clearRect(0,0,144,144);const pose=drawProfileAthlete(pc,d,mode,phase,72,126,1.5,options),data=pc.getImageData(0,0,144,144),palette=animePixelPalette(d),key=palette.flat().join(',');
  if(!colorCaches.has(key)){if(colorCaches.size>=32)colorCaches.clear();colorCaches.set(key,new Map())}
  const cache=colorCaches.get(key),pixels=data.data;
  for(let i=0;i<pixels.length;i+=4){
   if(pixels[i+3]<160){pixels[i+3]=0;continue}pixels[i+3]=255;
   const rgb=(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];let best=cache.get(rgb);
   if(!best){let distance=Infinity;for(const color of palette){const delta=(color[0]-pixels[i])**2+(color[1]-pixels[i+1])**2+(color[2]-pixels[i+2])**2;if(delta<distance){best=color;distance=delta}}if(cache.size>=4096)cache.clear();cache.set(rgb,best)}
   for(let channel=0;channel<3;channel++)pixels[i+channel]=best[channel];
  }
  pc.putImageData(data,0,0);c.save();c.imageSmoothingEnabled=false;c.drawImage(buffer,cx-48*scale,baseline-84*scale,96*scale,96*scale);c.restore();return pose;
 };
}
