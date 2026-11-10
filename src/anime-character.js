import {sampleCharacterPose,solveArm3D,paddleCutout,paddleOutline} from './pixel-character.js?v=217';
import {conceptPoint,thighGarment,skirtGarment} from './character-concepts.js?v=217';
import {legDimensions,plantFeet} from './detailed-character.js?v=217';

export function tone(hex,f){return '#'+hex.slice(1).match(/../g).map(v=>{const n=parseInt(v,16);return Math.round(f<0?n*(1+f):n+(255-n)*f).toString(16).padStart(2,'0')}).join('')}
function path(c,points,color,ink='#4c453d',width=.3){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(ink){c.strokeStyle=ink;c.lineWidth=width;c.stroke()}}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill()}
function line(c,points,color,width=.4){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke()}
const point=(x,y)=>({x,y});
export function skinPalette(hex){
 const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)),color=values=>'#'+values.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
 return {base:hex,light:color(rgb.map((v,i)=>v*.86+[255,228,193][i]*.14)),shadow:color(rgb.map((v,i)=>v*.78+[12,2,7][i])),deep:color(rgb.map((v,i)=>v*.61+[14,3,8][i]))};
}
export function animePixelPalette(d){
 const skin=skinPalette(d.skin),hexes=[...Object.values(skin),d.shirt,tone(d.shirt,-.2),tone(d.shirt,-.48),tone(d.shirt,.13),d.hairColor,tone(d.hairColor,-.25),tone(d.hairColor,.18),d.trim,tone(d.trim,-.12),d.paddleColor??d.trim,tone(d.paddleColor??d.trim,-.12),'#4c453d','#483f35','#1c2430','#e5dfce','#fff3df',tone(d.trim,-.55),tone('#e5dfce',-.15)];
 return [...new Set(hexes)].map(hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)));
}
export function animeHeadCenter(neck){return {x:neck.x,y:neck.y-6}}
function ribbon(c,chain,widths,color,ink,palette){
 const sides=[[],[]];chain.forEach((p,i)=>{const a=chain[Math.max(0,i-1)],b=chain[Math.min(chain.length-1,i+1)],length=Math.hypot(b.x-a.x,b.y-a.y)||1;for(let side=0;side<2;side++){const sign=side?1:-1;sides[side].push(point(p.x-sign*(b.y-a.y)/length*widths[i]/2,p.y+sign*(b.x-a.x)/length*widths[i]/2))}});
 path(c,[...sides[0],...sides[1].toReversed()],color,ink);
 if(palette){
  // Choose shadow by screen direction, rather than flipping light at each bend.
  const right=sides[0].reduce((sum,p)=>sum+p.x,0)>sides[1].reduce((sum,p)=>sum+p.x,0)?0:1,left=1-right;
  const inset=(edge,f)=>edge.map((p,i)=>point(p.x+(chain[i].x-p.x)*f,p.y+(chain[i].y-p.y)*f));
  path(c,[...sides[right],...inset(sides[right],.55).toReversed()],palette.shadow,null);
  path(c,[...inset(sides[left],.16),...inset(sides[left],.38).toReversed()],palette.light,null);
 }else path(c,[...sides[1],...chain.toReversed()],tone(color,-.16),null);
}
export {ribbon as drawAnimeRibbon};

export function animeBodyDimensions(d){
 const leg=legDimensions(d),waist=d.waist*.87,legScale=Math.min(1,(waist+1)/(d.hip+1));
 return {waist,hip:waist+.3,pelvis:waist*.62,stance:Math.min(1,d.shoulder*.91/6.4),thigh:leg.thigh*.83*legScale,calf:leg.calf*.88*legScale,ankle:leg.ankle*.86*legScale};
}
// Same motion/contact language, independently authored body and costume silhouettes.


export function animePose(design,mode,phase,view,options={}){
 const raw=sampleCharacterPose({...options,mode,phase,view,frame:options.frame??phase*4}),convert=p=>conceptPoint(p,design);
 const arms=raw.arms.map(chain=>chain.map(convert)),body=animeBodyDimensions(design),hips=convert(raw.hips),legs=raw.legs.map((chain,i)=>{
  const points=chain.map(convert),shift=hips.x+(i?1:-1)*body.pelvis-points[0].x,footShift=(chain[2].x-raw.hips.x)*(body.stance-1);
  return points.map((p,j)=>({...p,x:p.x+shift*(1-j/2)+footShift*(j/2)}));
 });
 return {raw,neck:convert(raw.neck),hips:convert(raw.hips),arms,legs,paddle:convert(raw.paddle),hand:arms[raw.gripSide][2]};
}
function animeRearHairCap(c,x,y,hair,ink,d){
 const female=d.body==='female',style=d.hair,bob=['bob','waves'].includes(style),pixie=style==='pixie';
 const bottom=pixie?2.35:female?(bob?6.8:style==='long'?5.2:4.45):(style==='curls'?4.15:style==='crewCut'?4.05:2.8);
 path(c,[point(x-5.15,y-2.7),point(x-4.9,y-5.1),point(x-3.1,y-6.5),point(x-.6,y-7),point(x+1.8,y-6.7),point(x+3.8,y-5.7),point(x+5.1,y-3.7),point(x+5,y-.4),point(x+4.3,y+bottom-.7),point(x+2.4,y+bottom),point(x,y+bottom+.25),point(x-2.4,y+bottom),point(x-4.3,y+bottom-.7)],tone(hair,-.06),ink,.3);
 if(style==='spiky')path(c,[point(x-4.6,y-3.7),point(x-4,y-6.2),point(x-2.7,y-5.1),point(x-2,y-7.5),point(x-.7,y-5.4),point(x+.4,y-8),point(x+1.5,y-5.4),point(x+3,y-7),point(x+3.2,y-4.8),point(x+4.5,y-5.7)],tone(hair,.04),ink,.2);
 if(style==='crewCut'){
  path(c,[point(x-4.8,y-.4),point(x-4.2,y+2.4),point(x-2.2,y+3.8),point(x-1.3,y+1.8)],tone(hair,-.14),ink,.2);
  path(c,[point(x+4.8,y-.3),point(x+4.1,y+2.7),point(x+2.2,y+4),point(x+1.2,y+1.8)],tone(hair,-.1),ink,.2);
  for(const [x1,y1,x2,y2] of [[-3.8,-4.8,-1.3,-5.9],[-2.4,-5.8,.2,-6.4],[-.5,-6.1,2.2,-5.5],[1.4,-5.7,3.8,-4.2]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],tone(hair,.16),.26);
 }
}
function animeHairMass(c,x,y,hair,ink,near,style='crop'){
 const back=style==='shag'?3.8:style==='crewCut'?2.5:2.65;
 c.beginPath();
 if(near){
  c.moveTo(x-5.2,y+1.1);c.bezierCurveTo(x-6.7,y-3,x-4.7,y-7.7,x,y-7.4);c.bezierCurveTo(x+5.4,y-7.8,x+6.6,y-2.7,x+5,y+1.2);c.lineTo(x+4.7,y+back-.15);c.quadraticCurveTo(x,y+back+1.05,x-5,y+back-.2);c.closePath();
 }else if(style==='sidePart'){
  c.moveTo(x-5.6,y+1.4);c.bezierCurveTo(x-7,y-3,x-5.3,y-7.8,x-1.1,y-7.4);c.bezierCurveTo(x+1.8,y-7.7,x+3.3,y-6.4,x+3.1,y-4.4);c.lineTo(x+3.4,y-3.5);c.lineTo(x+2.5,y-3.8);c.lineTo(x+1.8,y-2);c.lineTo(x+.7,y-3.5);c.lineTo(x-.5,y-1.2);c.lineTo(x-2.2,y-3.1);c.lineTo(x-3.7,y-.8);c.lineTo(x-4.3,y-2.8);c.closePath();
 }else{
  c.moveTo(x-5.2,y+1.2);c.bezierCurveTo(x-6.8,y-3,x-4.7,y-7.7,x,y-7.4);c.bezierCurveTo(x+5.4,y-7.8,x+6.8,y-2.6,x+5,y+1.5);c.lineTo(x+4.1,y-2.5);c.quadraticCurveTo(x+3.6,y-.25,x+2.4,y+.1);c.lineTo(x+2.7,y-3.7);c.quadraticCurveTo(x+.6,y-.15,x-.8,y+.8);c.lineTo(x-.6,y-3);c.quadraticCurveTo(x-2,y+(style==='sidePart'?-1.2:.05),x-3.3,y+.5);c.lineTo(x-3.3,y-1.8);c.closePath();
 }
 c.fillStyle=hair;c.fill();c.strokeStyle=ink;c.lineWidth=.45;c.stroke()
}
function animeHairTexture(c,x,y,hair,ink,near,style='crop'){
 const light=tone(hair,.2),mid=tone(hair,.06),shadow=tone(hair,-.22);
 if(style==='shag'){
  if(!near){
   line(c,[point(x-2.2,y-6.5),point(x-1.5,y-4.6),point(x-1.8,y-1.7)],shadow,.3);
   line(c,[point(x+1.8,y-6.5),point(x+1.2,y-4.5),point(x+1.6,y-1.5)],shadow,.3);
   for(const [x1,y1,x2,y2,x3,y3] of [[-4.7,-3.5,-5.3,-.5,-4.1,1.4],[-3.4,-4.8,-4,-1.4,-3.1,.8],[3.2,-4.8,4,-1.3,3.2,.9],[4.4,-3.5,5.2,-.5,4.3,1.2]])path(c,[point(x+x1,y+y1),point(x+x2,y+y2),point(x+x3,y+y3)],tone(hair,(x1<0?.12:-.08)),ink,.18);
   line(c,[point(x-2.1,y-6.2),point(x+.1,y-7),point(x+2.1,y-6.1)],light,.32);
  }else{
   for(const [x1,y1,x2,y2] of [[-3.8,-4.8,-3.2,2.7],[-1.8,-5.8,-1.2,3.3],[.2,-6,.5,3.4],[2.1,-5.4,1.8,3.1],[3.8,-4.4,3.3,2.5]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],x1<0?shadow:light,.3);
  }
  return;
 }
 if(style==='sidePart'&&!near){
  path(c,[point(x-4.8,y-2.8),point(x-4.4,y-5.8),point(x-2.3,y-7.2),point(x-.3,y-6.3),point(x-1.1,y-3.7),point(x-2.6,y-1.3)],tone(hair,.13),ink,.18);
  path(c,[point(x-2.1,y-5.7),point(x-1.3,y-2.4),point(x-.6,y-2.5),point(x-1.5,y-6)],tone(hair,-.55),ink,.16);line(c,[point(x-1.55,y-5.8),point(x-1.15,y-2.35)],tone(hair,-.58),.24);
  for(const [ax,ay,bx,by,cx,cy] of [[-4.1,-4.6,-3.5,-5.8,-2.6,-3.4],[-3.2,-5.4,-2.4,-6.6,-1.7,-3.8],[-2.2,-5.8,-1.3,-6.4,-.7,-3.5],[.3,-5.5,1.3,-5.8,1.1,-3.4]])path(c,[point(x+ax,y+ay),point(x+bx,y+by),point(x+cx,y+cy)],tone(hair,ax%2?.2:-.1),ink,.18);
  return;
 }
 if(style==='sidePart'){
  for(const [x1,y1,x2,y2] of [[-3.8,-4.4,-3,-2],[-2.2,-5.2,-1.4,-2.3],[-.2,-5.6,.5,-2.2],[1.8,-5,2.5,-2.2],[3.3,-4.2,3.7,-2]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],tone(hair,.18),.28);return;
 }
 if(style==='crewCut'){
  for(const [x1,y1,x2,y2] of [[-3.8,-4.3,-2.6,-3],[-2.3,-5,-1,-3.4],[-.6,-5.4,.8,-3.5],[1.2,-5,2.5,-3.2],[2.8,-4.2,3.6,-2.9]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],light,.3);return;
 }
 const locks=near?[[-4.5,3.6,-3.8,-4.2,-2.4,3.9],[-2.7,4,-2,-5,-.7,3.9],[-.6,4,.3,-5,1.6,3.7],[1.5,3.7,2.5,-4.4,3.5,3.2]]:[[-4.4,-2,-3.8,-5.4,-2.3,-2.3],[-2.8,-2.1,-2.2,-5.8,-.9,-2.2],[-1,-2,-.2,-5.8,1,-2.1],[.9,-2,2.1,-5.3,3.2,-2.3],[2.5,-2,3.6,-4.5,4,-2.5]];
 for(const [index,[ax,ay,bx,by,cx,cy]] of locks.entries())path(c,[point(x+ax,y+ay),point(x+bx,y+by),point(x+cx,y+cy)],index%2?light:shadow,ink,.18);
 for(const [x1,y1,x2,y2] of near?[[-3.5,2.5,-2.8,-3.4],[-1.2,2.8,-.5,-3.8],[1,2.7,1.7,-3.5],[3,2.1,3.5,-2.8]]:[[-3.5,-2.5,-2.9,-4.6],[-1.8,-2.4,-1.2,-4.8],[0,-2.3,.6,-4.8],[1.8,-2.4,2.4,-4.4],[3.2,-2.5,3.6,-4]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],mid,.28);
}
function drawAnimeSideSweep(c,x,y,hair,ink,near){
 if(near){
  path(c,[point(x-5.2,y-.4),point(x-5.6,y-3.8),point(x-4.4,y-6),point(x-2,y-7.4),point(x+.5,y-7.5),point(x+3.1,y-6.4),point(x+5,y-4.2),point(x+5.3,y-1.5),point(x+5,y+.5),point(x+4.1,y+2.9),point(x+2.4,y+3.6),point(x,y+3),point(x-2.5,y+3.5),point(x-4.3,y+2.2)],tone(hair,-.04),ink,.4);
  for(const [x1,y1,x2,y2,x3,y3] of [[-4.2,-4.8,-1.8,-6.4,.4,-6.1],[-3.2,-3.2,-.4,-5.4,2.4,-5.5],[-1.8,-2,1,-4.3,3.9,-3.8]])path(c,[point(x+x1,y+y1),point(x+x2,y+y2),point(x+x3,y+y3)],tone(hair,(x1<0?.14:.05)),ink,.16);
  return;
 }
 path(c,[point(x-5.2,y-.3),point(x-5.7,y-3.8),point(x-4.5,y-6.2),point(x-2.3,y-7.7),point(x-.2,y-7.8),point(x+2.2,y-7),point(x+4.4,y-5.3),point(x+5.3,y-3.1),point(x+5,y-.4),point(x+4.4,y-1.2),point(x+3.7,y-3),point(x+2.6,y-2.4),point(x+1.1,y-3.5),point(x-.6,y-2.4),point(x-2.4,y-3.2),point(x-4,y-1.2)],hair,ink,.4);
 path(c,[point(x-4.5,y-5.4),point(x-1.8,y-7),point(x+.8,y-6.6),point(x+3.8,y-4.4),point(x+2.4,y-2.8),point(x-.2,y-3.5),point(x-2.7,y-3)],tone(hair,.13),ink,.18);
 for(const [x1,y1,x2,y2] of [[-3.8,-5,-1.2,-6.2],[-2.3,-6.1,.4,-6.4],[-.3,-6.4,2.2,-5.5],[1.5,-5.5,3.5,-4.1]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],tone(hair,.22),.26);
for(const [x1,y1,cx,cy,x2,y2] of [[-4.2,-4.8,-1.7,-6.3,1.2,-5.8],[-3.4,-3.8,-.5,-5.5,2.5,-4.7],[-2.5,-2.8,.4,-4.5,3.3,-3.5]]){c.beginPath();c.moveTo(x+x1,y+y1);c.quadraticCurveTo(x+cx,y+cy,x+x2,y+y2);c.strokeStyle=tone(hair,(x1<0?-.26:.2));c.lineWidth=.28;c.lineCap='round';c.stroke()}
 c.beginPath();c.moveTo(x-3.6,y-4.8);c.quadraticCurveTo(x-.7,y-6.3,x+2.8,y-4.6);c.strokeStyle=tone(hair,-.3);c.lineWidth=.3;c.stroke();
}
function drawAnimeSweptLayers(c,x,y,hair,ink,near){
 if(near){
  path(c,[point(x-5.2,y-.3),point(x-5.8,y-3.4),point(x-5,y-6.2),point(x-2.8,y-8.2),point(x-.1,y-8.8),point(x+2.5,y-8),point(x+4.7,y-6),point(x+5.6,y-3.3),point(x+5.2,y-.2),point(x+4.5,y+2.8),point(x+3.2,y+4.5),point(x+1.6,y+3.4),point(x+.2,y+4.6),point(x-1.4,y+3.3),point(x-3.1,y+4.4),point(x-4.6,y+2.5)],tone(hair,-.04),ink,.42);
  path(c,[point(x-4.8,y-1.4),point(x-4.5,y+.7),point(x-3.8,y+1.5),point(x-3.5,y+.1),point(x-4,y-1.5)],tone(hair,-.14),ink,.18);
  path(c,[point(x+4.8,y-1.2),point(x+4.5,y+.8),point(x+3.8,y+1.6),point(x+3.5,y+.1),point(x+4,y-1.4)],tone(hair,-.1),ink,.18);
  for(const [x1,y1,x2,y2,x3,y3] of [[-4.4,-5,-2.2,-7,.1,-7.5],[-3.2,-3.4,-.5,-6,2.3,-6.3],[-1.8,-2,.7,-4.6,3.8,-4.5]])path(c,[point(x+x1,y+y1),point(x+x2,y+y2),point(x+x3,y+y3)],tone(hair,(x1<0?.15:.03)),ink,.17);
  return;
 }
 path(c,[point(x-5.2,y-.5),point(x-5.9,y-3.4),point(x-5.1,y-6.4),point(x-3.1,y-9),point(x-.2,y-10.1),point(x+2.5,y-9.1),point(x+4.8,y-6.7),point(x+5.7,y-3.5),point(x+5.2,y-.4),point(x+4.5,y-.8),point(x+4.1,y-2.9),point(x+2.8,y-3.6),point(x+1.2,y-2.8),point(x-.3,y-3.8),point(x-1.9,y-2.6),point(x-3.6,y-3.3),point(x-4.6,y-1.1)],tone(hair,-.02),ink,.42);
 path(c,[point(x-4.9,y-4),point(x-3.5,y-7.1),point(x-.7,y-8.8),point(x+2.5,y-8),point(x+4.7,y-5.3),point(x+2.8,y-4.7),point(x+.6,y-5.8),point(x-1.5,y-4.7),point(x-3.5,y-3.2)],tone(hair,.13),ink,.18);
 path(c,[point(x-4.9,y-2.5),point(x-5.2,y-.2),point(x-4.6,y+1.3),point(x-3.9,y+1.6),point(x-3.9,y-.2),point(x-4.2,y-1.8)],tone(hair,-.1),ink,.2);
 path(c,[point(x+4.7,y-2.7),point(x+5.2,y-.1),point(x+4.6,y+1.4),point(x+3.9,y+1.7),point(x+3.9,y-.1),point(x+4.2,y-1.9)],tone(hair,-.06),ink,.2);
 c.beginPath();c.moveTo(x+.1,y-7.6);c.quadraticCurveTo(x-.8,y-4.8,x-.25,y-2.2);c.strokeStyle=tone(hair,-.24);c.lineWidth=.36;c.lineCap='round';c.stroke();
 c.beginPath();c.moveTo(x+2.2,y-6.9);c.quadraticCurveTo(x+3.5,y-4.1,x+3.15,y-1.2);c.strokeStyle=tone(hair,.2);c.lineWidth=.32;c.stroke();
 for(const [x1,y1,x2,y2] of [[-3.8,-6.7,-1.8,-7.8],[-2.3,-7.5,.1,-8.2],[-.3,-8.1,2.1,-7.3],[1.4,-7.1,3.5,-5.5]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],tone(hair,.2),.25);
}function drawAnimeAfro(c,x,y,hair,ink,near){
 const base=near?[
  [-5.3,-.5],[-6,-1.8],[-5.8,-3.5],[-5.1,-5],[-3.8,-6.2],[-2.2,-6.8],[-.4,-7.1],[1.4,-6.9],[3.2,-6.2],[4.7,-5],[5.6,-3.4],[5.9,-1.6],[5.4,.1],[4.5,2.8],[2.8,4.2],[.4,4.8],[-2.2,4.3],[-4,3],[-5.1,1.3]
 ]:[
  [-5.2,-1],[-5.9,-2.5],[-5.6,-4.2],[-4.8,-5.6],[-3.5,-6.5],[-1.8,-7],[0,-7.2],[1.8,-7],[3.5,-6.4],[4.8,-5.4],[5.6,-3.8],[5.8,-2],[5.2,-.7],[3.7,-1.2],[1.8,-.9],[0,-1.3],[-1.8,-.8],[-3.7,-1.2]
 ];
 path(c,base.map(([a,b])=>point(x+a,y+b)),tone(hair,-.03),ink,.42);
 for(const [x1,y1,x2,y2] of near?[[-4,-2.5,-2.5,-4.5],[-2,-4.8,-.2,-5.9],[.6,-5.4,2.7,-4.5],[2.8,-2.2,4.2,-1.3],[-3,1.5,-1,2.4]]:[[-4,-3,-2.5,-4.8],[-2,-5.2,-.2,-6],[.8,-5.8,2.8,-4.8],[3,-2.7,4.4,-1.8],[-3,-1.7,-1,-2.2]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],tone(hair,.22),.3);
 path(c,[point(x-3.8,near?y-2.6:y-3.4),point(x-1.2,near?y-4.8:y-5.4),point(x+1.5,near?y-4.5:y-5.1),point(x+3.5,near?y-2.4:y-3.1)],tone(hair,.1),null);
}
function hairTail(c,d,x,y,phase,near,ink,layer='behind'){
 const sway=Math.sin(phase*Math.PI*2)*1.1,behind=layer==='behind';
 function tail(sign){c.beginPath();c.moveTo(x+sign*4,y-3);c.bezierCurveTo(x+sign*(12+sway),y-7,x+sign*(15+sway),y+5,x+sign*9,y+12);c.quadraticCurveTo(x+sign*11,y+3,x+sign*6,y+2.5);c.closePath();c.fillStyle=d.hairColor;c.fill();c.strokeStyle=ink;c.lineWidth=.4;c.stroke();line(c,[point(x+sign*7,y-1),point(x+sign*(11+sway),y+3),point(x+sign*9,y+8)],tone(d.hairColor,.13),.55);oval(c,x+sign*5,y-2,1.15,.95,d.trim)}
 function thinTail(sign){const drift=sway*sign;c.beginPath();c.moveTo(x+sign*4.3,y-3);c.bezierCurveTo(x+sign*(7.1+drift),y-2.3,x+sign*(8+drift),y+3.4,x+sign*(6.8+drift),y+10.8);c.quadraticCurveTo(x+sign*(5.8+drift),y+4.2,x+sign*5,y+1.4);c.closePath();c.fillStyle=d.hairColor;c.fill();c.strokeStyle=ink;c.lineWidth=.35;c.stroke();line(c,[point(x+sign*5.3,y-1),point(x+sign*(6.5+drift),y+4),point(x+sign*(6.3+drift),y+8.5)],tone(d.hairColor,.16),.38);oval(c,x+sign*4.7,y-2.7,1,.75,d.trim)}
 if(d.hair==='ponytail'&&behind)tail(near?-1:1);
 if(d.hair==='twinTails'&&behind){thinTail(-1);thinTail(1)}
if(d.hair==='long'&&!behind){
if(near){
   path(c,[point(x-5.7,y-5.2),point(x-6.1,y-1.6),point(x-6,y+3.8),point(x-5.5,y+10.2),point(x-4.3,y+15.8),point(x-2.1,y+18.3),point(x,y+19),point(x+2.1,y+18.3),point(x+4.3,y+15.8),point(x+5.5,y+10.2),point(x+6,y+3.8),point(x+6.1,y-1.6),point(x+5.7,y-5.2)],tone(d.hairColor,-.08),ink,.28);
   for(const [x1,y1,x2,y2] of [[-4.5,-4.5,-4.1,17.2],[-3.2,-4.8,-2.9,18],[-1.8,-5,-1.5,18.6],[-.5,-5.1,-.3,19],[.7,-5.1,.5,19],[2,-5,1.8,18.6],[3.3,-4.8,3,18],[4.5,-4.5,4.1,17.2]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],tone(d.hairColor,(x1<0?.06:-.04)),.18);
   for(const [x1,y1,x2,y2] of [[-3.8,-4.6,-3.5,15.8],[-2.4,-4.8,-2.1,17.3],[-1,-5,-.8,18.2],[.2,-5,.1,18.6],[1.3,-5,1.1,18.2],[2.6,-4.8,2.3,17.3],[3.9,-4.6,3.6,15.8]])line(c,[point(x+x1,y+y1),point(x+x2,y+y2)],tone(d.hairColor,(x1<0?.08:.06)),.14);
  }
  else for(const side of [-1,1]){const drift=Math.sin(phase*Math.PI*2+side)*.4;c.beginPath();c.moveTo(x+side*3.8,y-3.6);c.bezierCurveTo(x+side*(6+drift),y-.8,x+side*(6.4+drift),y+6,x+side*(5.4+drift),y+12.8);c.quadraticCurveTo(x+side*4.4,y+13.4,x+side*3.8,y+11.4);c.quadraticCurveTo(x+side*4.5,y+4.5,x+side*2.5,y-.8);c.closePath();c.fillStyle=d.hairColor;c.fill();c.strokeStyle=ink;c.lineWidth=.38;c.stroke()}
 }
 if(['bob','waves'].includes(d.hair)&&(near?behind:!behind)){
  if(near)path(c,[point(x-5.2,y-3.8),point(x-5.8,y+2.8),point(x-4.4,y+6.4),point(x,y+7.2),point(x+4.4,y+6.4),point(x+5.8,y+2.8),point(x+5.2,y-3.8)],d.hair==='waves'?tone(d.hairColor,-.04):d.hairColor,ink,.35);
  else for(const side of [-1,1]){c.beginPath();c.moveTo(x+side*3.8,y-3.5);c.quadraticCurveTo(x+side*(d.hair==='waves'?6.4:5.8),y-.5,x+side*(d.hair==='waves'?5.7:5.1),y+5.8);c.lineTo(x+side*3.4,y+4.6);c.closePath();c.fillStyle=d.hairColor;c.fill();c.strokeStyle=ink;c.lineWidth=.35;c.stroke()}
 }
}function normalizeEmotion(emotion){return ({smile:'happy',reaction:'surprise',neutral:'focus',sad:'disappointment',calm:'relief'})[emotion]??emotion??'focus'}
function expressionShape(emotion){
 emotion=normalizeEmotion(emotion);
 const eye={width:.8,height:1.06,pupil:.55,brow:.15,low:.06};
 if(emotion==='focus'){eye.width=.85}
 if(emotion==='effort'){eye.width=.7;eye.height=1.2}
 if(emotion==='fatigue'){eye.width=.78;eye.height=.62;eye.pupil=.48;eye.low=.24}
 if(emotion==='surprise'){eye.width=1.04;eye.height=1.48;eye.pupil=.4;eye.low=-.18}
 if(emotion==='aggression'){eye.width=.62;eye.height=.88;eye.pupil=.44;eye.low=.02}
 if(emotion==='happy'){eye.width=.76;eye.height=.72;eye.low=.16}
 if(emotion==='disappointment'){eye.width=.74;eye.height=.5;eye.pupil=.5;eye.low=.28}
 if(emotion==='anger'){eye.width=.55;eye.height=.78;eye.pupil=.42;eye.low=.05}
 if(emotion==='relief'){eye.width=.5;eye.height=.3;eye.pupil=.45;eye.low=.2}
 return eye;
}
function emotionMarks(c,emotion,intensity,head){
 const alpha=Math.max(.35,Math.min(.9,intensity));c.save();c.globalAlpha=alpha;
 if(emotion==='surprise'){for(const [x1,y1,x2,y2] of [[-7,-5,-9,-7],[0,-8,0,-10.5],[7,-5,9,-7]])line(c,[point(head.x+x1,head.y+y1),point(head.x+x2,head.y+y2)],'#f6cc59',.38)}
 if(emotion==='aggression'){line(c,[point(head.x-7,head.y-3),point(head.x-4.5,head.y-4)],'#ef8a4b',.42);line(c,[point(head.x+4.5,head.y-4),point(head.x+7,head.y-3)],'#ef8a4b',.42)}
 if(emotion==='happy'){line(c,[point(head.x-7,head.y-4),point(head.x-5.5,head.y-5.5)],'#f6cc59',.35);line(c,[point(head.x+5.5,head.y-5.5),point(head.x+7,head.y-4)],'#f6cc59',.35)}
 if(emotion==='fatigue'){c.strokeStyle='#b5e6ef';c.lineWidth=.28;c.beginPath();c.arc(head.x+5.5,head.y+3.5,1.3,-.8,.8);c.stroke()}
 if(emotion==='disappointment'){line(c,[point(head.x-5.5,head.y-2.2),point(head.x-3.8,head.y-1.2)],'#77a9b5',.28)}
 if(emotion==='anger'){line(c,[point(head.x-6,head.y-3.8),point(head.x-3.8,head.y-4.5)],'#ef8a4b',.38);line(c,[point(head.x+3.8,head.y-4.5),point(head.x+6,head.y-3.8)],'#ef8a4b',.38)}
 if(emotion==='relief'){for(let i=0;i<2;i++)oval(c,head.x+3.2+i*1.2,head.y+4.2+i*.2,.55-i*.12,.24,'#d8f3f49c')}
 c.restore();
}
function drawAnimeBraid(c,d,x,y,phase,near,ink,showTail=true){
 const sway=Math.sin(phase*Math.PI*2)*.35,bx=x+(near?-.25:-.65)+sway*.12;
 oval(c,x-.15,y-7.2,2.25,1.85,tone(d.hairColor,.05));
 path(c,[point(x-2,y-7.2),point(x-1.1,y-8.8),point(x+.2,y-7.4),point(x+1.7,y-8.2),point(x+2,y-6.6),point(x+.6,y-5.9),point(x-.9,y-6.1)],tone(d.hairColor,.12),ink,.2);
 line(c,[point(x-1.5,y-7.5),point(x+.2,y-8.2),point(x+1.4,y-7.1)],tone(d.hairColor,-.2),.28);
 if(!showTail)return;
 line(c,[point(x-.8,y-5.9),point(bx,y-4.6)],tone(d.hairColor,-.14),2.35);
 for(let i=0;i<12;i++){
  const t=i/11,by=y-5.5+i*1.65,rx=2.05-t*1.2,ry=1.45-t*.5,drift=Math.sin(i*.78+phase*3)*.18;
  oval(c,bx+drift,by,rx,ry,tone(d.hairColor,i%2?-.14:.1));
  line(c,[point(bx-rx*.65+drift,by-.2),point(bx+rx*.55+drift,by+.35)],tone(d.hairColor,i%2?.2:-.22),.25);
 }
 oval(c,bx,y+11.6,1.15,.62,d.trim);
 path(c,[point(bx-.85,y+11.9),point(bx-.45,y+14.8),point(bx,y+16.2),point(bx+.5,y+14.7),point(bx+.8,y+11.9)],tone(d.hairColor,-.1),ink,.24);
}
function animeHead(c,d,n,near,warm,phase,ink,rawEmotion){
 const emotion=normalizeEmotion(rawEmotion);
 const {x,y}=animeHeadCenter(n),skin=d.skin,hair=d.hairColor,colors=skinPalette(skin);
 // Tapered jaw, small ears and a tiny implied nose replace the round toy face.
 c.beginPath();c.moveTo(x-4.9,y-3.6);c.quadraticCurveTo(x-6,y+1,x-3.5,y+4.4);c.quadraticCurveTo(x-1,y+6,x,y+6.1);c.quadraticCurveTo(x+2.3,y+5.3,x+4.1,y+3.5);c.quadraticCurveTo(x+5.6,y,x+4.8,y-3.8);c.quadraticCurveTo(x+3.3,y-6.8,x,y-6.6);c.quadraticCurveTo(x-3.7,y-6.8,x-4.9,y-3.6);c.closePath();c.fillStyle=skin;c.fill();c.strokeStyle=ink;c.lineWidth=.4;c.stroke();
 if(d.hair!=='long')for(const sign of [-1,1]){oval(c,x+sign*4.8,y+.6,.9,1.35,skin);line(c,[point(x+sign*4.8,y+.1),point(x+sign*5,y+1)],tone(skin,-.18),.3)}
 if(!near){
  path(c,[point(x-2.7,y+4.75),point(x+.15,y+6.05),point(x+2.7,y+4.5),point(x+.15,y+5.1)],tone(skin,-.12),null);
  line(c,[point(x+.1,y-.9),point(x+.7,y+1.55),point(x+.15,y+2.05)],tone(skin,-.18),.28);
  path(c,[point(x-4.2,y-2.8),point(x+4.3,y-2.8),point(x+3.9,y-1.2),point(x+.6,y-1.8),point(x-2.6,y-1.1)],colors.shadow,null);
  path(c,[point(x-3.7,y+.8),point(x-2.8,y+2.8),point(x-1.5,y+3.8),point(x-2.6,y+2.7)],colors.light,null);
  path(c,[point(x+3.9,y-.2),point(x+4,y+2.5),point(x+1.4,y+5),point(x+.5,y+5.3),point(x+2.6,y+2)],colors.shadow,null);
   const shape=expressionShape(emotion);
   for(const sign of [-1,1]){const ex=x+sign*2.1,ey=y+.4+(shape.low*.35),eyeWidth=shape.width,eyeHeight=shape.height;
    oval(c,ex,ey,eyeWidth,eyeHeight,'#fff3df');oval(c,ex+sign*.08,ey+.14,.52,shape.pupil,warm?'#6b5340':tone(hair,.22));oval(c,ex+sign*.08,ey+.26,.28,.6,tone(ink,.24));oval(c,ex-.18,ey-.27,.2,.26,'#fffdf2');
    const browY=ey-.62+(emotion==='effort'?.2:emotion==='surprise'?.12:emotion==='happy'?.1:emotion==='fatigue'?.34:emotion==='aggression'?.18:emotion==='disappointment'?.32:emotion==='anger'?-.05:emotion==='relief'?.24:0);
    c.beginPath();c.moveTo(ex-eyeWidth,browY);c.quadraticCurveTo(ex+sign*.3,browY-(emotion==='effort'?.36:emotion==='surprise'?.16:.22)+(emotion==='fatigue'?.18:0),ex+eyeWidth,browY+(emotion==='effort'?.22:emotion==='aggression'?sign*.28:emotion==='fatigue'?.16:0));c.strokeStyle=tone(ink,.16);c.lineWidth=.26;c.stroke();
    line(c,[point(ex-.9,y-1.75),point(ex,y-1.95),point(ex+.8,y-1.75)],tone(hair,.06),.24);
   }
   oval(c,x+.25,y+2.55,.18,.14,tone(skin,-.22));
   if(emotion==='happy'){c.beginPath();c.moveTo(x-.85,y+3.65);c.quadraticCurveTo(x+.15,y+4.65,x+1.05,y+3.55);c.strokeStyle=tone(skin,-.35);c.lineWidth=.28;c.stroke()}
   else if(emotion==='disappointment'){c.beginPath();c.moveTo(x-.75,y+4.05);c.quadraticCurveTo(x+.1,y+3.45,x+.9,y+3.95);c.strokeStyle=tone(skin,-.4);c.lineWidth=.28;c.stroke()}
   else if(emotion==='anger'){line(c,[point(x-.8,y+3.75),point(x+.8,y+3.9)],tone(skin,-.48),.34);for(const dx of [-.4,.05,.5])line(c,[point(x+dx,y+3.65),point(x+dx,y+4.1)],'#fff3df',.14)}
   else if(emotion==='relief'){c.beginPath();c.moveTo(x-.55,y+3.8);c.quadraticCurveTo(x+.1,y+4.35,x+.72,y+3.85);c.strokeStyle=tone(skin,-.34);c.lineWidth=.24;c.stroke();oval(c,x+2.1,y+3.9,.55,.25,'#d8f3f4a8')}
   else if(emotion==='surprise'){oval(c,x+.15,y+4.15,.58,.78,tone(skin,-.52));oval(c,x+.15,y+4.35,.3,.32,tone(skin,-.72))}
   else if(emotion==='aggression'){line(c,[point(x-.8,y+3.8),point(x+.8,y+3.65)],tone(skin,-.4),.3);for(const dx of [-.45,0,.45])line(c,[point(x+dx,y+3.55),point(x+dx,y+4.05)],'#fff3df',.16)}
   else{const mouthY=y+4+(emotion==='effort'?.28:emotion==='fatigue'?.34:0);if(emotion==='fatigue')oval(c,x+.15,mouthY,.42,.55,tone(skin,-.48));else line(c,[point(x-.55,mouthY),point(x+.35,mouthY+(emotion==='effort'?-.16:emotion==='fatigue'?.12:0)),point(x+.85,mouthY)],tone(skin,-.34),.24)}
  }
 const buzz=d.hair==='buzz',bald=d.hair==='bald',covered=d.headwear==='cap'||d.headwear==='visor',accessorized=d.headwear!=='none';
  if(near&&!['bald','buzz','afro','curls'].includes(d.hair))animeRearHairCap(c,x,y,hair,ink,d);
 if(bald){
  if(!near)path(c,[point(x-3.9,y-3.9),point(x-2.8,y-5.2),point(x-.4,y-5.7),point(x-1.3,y-4.6),point(x-3,y-3.5)],colors.light,null);
  else path(c,[point(x-3.2,y-5.4),point(x-1.8,y-6.3),point(x+.4,y-6.4),point(x+2.4,y-5.4),point(x+1.1,y-4.8),point(x-1.4,y-5)],colors.light,null);
 }else if(buzz){
  c.save();c.beginPath();c.moveTo(x-4.8,y-2.3);c.bezierCurveTo(x-5.2,y-5.5,x-2.6,y-6.9,x,y-6.9);c.bezierCurveTo(x+3.1,y-6.9,x+5.3,y-5.1,x+4.8,y-2.3);c.quadraticCurveTo(x,y-3.1,x-4.8,y-2.3);c.closePath();c.fillStyle=tone(hair,.09);c.fill();c.clip();
  path(c,[point(x+2,y-6.4),point(x+5.3,y-5.1),point(x+5.3,y-2),point(x+2.2,y-2.7)],tone(hair,-.12),null);
  for(let row=0;row<4;row++)for(let col=0;col<11;col++){const sx=x-4.4+col*.84+(row%2)*.3,sy=y-5.7+row*.72;line(c,[point(sx,sy),point(sx+.1,sy+.18)],tone(hair,row%2?-.23:.25),.2)}c.restore();
 }else if(d.hair==='afro'){
  drawAnimeAfro(c,x,y,hair,ink,near);
 }else if(d.hair==='pixie'){
   if(near){
    path(c,[point(x-5,y-.5),point(x-5.3,y-3.8),point(x-4,y-4.7),point(x-3.7,y-6.4),point(x-2.2,y-5.3),point(x-1.4,y-7.2),point(x-.1,y-5.6),point(x+1.5,y-7),point(x+2.5,y-5.1),point(x+4,y-6),point(x+4.2,y-4.2),point(x+5.2,y-3.3),point(x+5,y-.3),point(x+4.1,y+1.7),point(x+2.2,y+2.8),point(x,y+3),point(x-2.2,y+2.8),point(x-4.1,y+1.7)],hair,ink,.4);
   }else{
    path(c,[point(x-5,y-.2),point(x-5.2,y-3.8),point(x-3.5,y-5.8),point(x-1.4,y-6.8),point(x+1.3,y-6.6),point(x+3.6,y-5.5),point(x+5.1,y-3.5),point(x+5,y-.3),point(x+3.5,y-1.3),point(x+2.3,y-3),point(x+.5,y-1.3),point(x-1.5,y-3),point(x-3.3,y-1.1)],hair,ink,.4);
    if(d.headwear!=='cap')path(c,[point(x-4.7,y-3.7),point(x-4,y-6.3),point(x-2.8,y-5.2),point(x-1.8,y-7.6),point(x-.6,y-5.6),point(x+.7,y-7.9),point(x+1.7,y-5.5),point(x+3.2,y-7),point(x+3.5,y-4.7),point(x+4.7,y-5.2)],tone(hair,.04),ink,.28);
    path(c,[point(x-4.8,y-3.1),point(x+4.8,y-3.1),point(x+4.4,y-.7),point(x+2.2,y-1.5),point(x+.4,y-.5),point(x-1.7,y-1.5),point(x-3.7,y-.6)],tone(hair,-.08),ink,.24);
   }}else if(d.hair==='curls'){
  animeHairMass(c,x,y,hair,ink,near,'shag');
  if(!near){path(c,[point(x-5,y-1.4),point(x-5.8,y+1.8),point(x-4.5,y+3.7),point(x-3.2,y+.4)],tone(hair,-.04),ink,.28);path(c,[point(x+5,y-1.4),point(x+5.8,y+1.8),point(x+4.5,y+3.7),point(x+3.2,y+.4)],tone(hair,-.04),ink,.28)}
  animeHairTexture(c,x,y,hair,ink,near,'shag');
 }else if(d.hair==='crop'){
  animeHairMass(c,x,y,hair,ink,near,'crewCut');animeHairTexture(c,x,y,hair,ink,near,'crewCut');
 }else if(d.hair==='crewCut'){
  drawAnimeSweptLayers(c,x,y,hair,ink,near);
 }else if(d.hair==='sidePart'){
  drawAnimeSideSweep(c,x,y,hair,ink,near);
 }else if(d.hair==='spiky'){
   if(near){
    path(c,[[-5,0],[-5.2,-2.7],[-4.2,-3.1],[-4.5,-5.8],[-2.8,-4.6],[-2.1,-7],[-.8,-5.1],[.2,-7.8],[1.3,-5.2],[3,-6.5],[3.1,-4.3],[4.5,-5.2],[4.1,-3],[5.1,-2.3],[5,0],[4.2,2.1],[2.1,2.7],[0,2.85],[-2.1,2.7],[-4.2,2.1]].map(([a,b])=>point(x+a,y+b)),hair,ink,.38);
   }else{
    path(c,covered?[[-5,0],[-5.4,-2.7],[-4.8,-3],[-5.1,-5],[-3.4,-4.6],[-3.3,-5.8],[-1.2,-5.3],[-.2,-6],[1.2,-5.2],[2.8,-5.5],[4.5,-4.5],[5.1,0],[3.2,-1.5],[1.9,-.3],[.2,-2.4],[-1.5,-.5],[-3.1,-2.4]]:[[-5,0],[-6.5,-3],[-5,-3],[-6,-6],[-3,-5],[-3.8,-8],[-.8,-6.4],[1,-9],[2.1,-6],[5,-7],[4.6,-4],[7,-4.4],[5.1,.6],[3.2,-1.5],[1.9,-.3],[.2,-2.4],[-1.5,-.5],[-3.1,-2.4]].map(([a,b])=>point(x+a,y+b)),hair,ink,.38);
   }}else if(d.hair==='long'){
   if(near){
    path(c,[point(x-5.2,y-.3),point(x-5.5,y-3.8),point(x-3.7,y-6.1),point(x-1.1,y-7),point(x+1.3,y-6.9),point(x+3.8,y-5.8),point(x+5.3,y-3.5),point(x+5,y-.4),point(x+2.5,y-1.5),point(x,y-1.1),point(x-2.5,y-1.5)],tone(hair,-.05),ink,.38);
   }else{
    path(c,[point(x-5.2,y-.3),point(x-5.5,y-4),point(x-3.8,y-6.3),point(x-1.5,y-7.3),point(x-.2,y-7.4),point(x+1.5,y-7.1),point(x+2.8,y-5.9),point(x+4,y-5.8),point(x+5.4,y-3.5),point(x+5,y-.4),point(x+3.4,y-1.2),point(x+2.7,y-3.7),point(x+1.4,y-1.5),point(x+.2,y-4.2),point(x-.4,y-1.1),point(x-2,y-3.8),point(x-3.2,y-1.3)],hair,ink,.4);
    path(c,[point(x-3.5,y-4.6),point(x-2.2,y-2.1),point(x-1.3,y-1.8),point(x-2.6,y-5.2)],tone(hair,-.16),null);path(c,[point(x+.4,y-4.8),point(x+1.4,y-1.8),point(x+2.4,y-2.1),point(x+2,y-5.2)],tone(hair,-.12),null);
   }}else if(['bob','waves'].includes(d.hair)){
  path(c,[point(x-5.2,y-.2),point(x-5.5,y-4),point(x-3.8,y-6.4),point(x-1,y-7.2),point(x+1.5,y-7),point(x+4,y-5.8),point(x+5.4,y-3.6),point(x+5.1,y-.2),point(x+3.8,y-1),point(x+3,y-3.5),point(x+1.4,y-1.4),point(x-.2,y-3.4),point(x-1.8,y-1.3),point(x-3.3,y-3.4)],hair,ink,.4);
  if(!near)path(c,[point(x-4.7,y-3),point(x+4.7,y-3),point(x+4.2,y-.8),point(x+2.5,y-1.5),point(x+.7,y-.6),point(x-1.2,y-1.5),point(x-3.1,y-.7)],tone(hair,d.hair==='waves'?.05:-.05),d.hair==='waves'?tone(hair,-.03):hair,ink,.25);
 }else{
  animeHairMass(c,x,y,hair,ink,near,d.body==='male'?'crewCut':'crop');
 }
 if(d.hair==='bun'){const bx=x-.4,by=y-7.4;oval(c,bx,by,2.55,2.15,tone(hair,.05));path(c,[point(bx-2.3,by+.1),point(bx-1.4,by-1.8),point(bx-.4,by-2.1),point(bx+.2,by-.2),point(bx-.5,by+1.5)],tone(hair,.14),null);line(c,[point(bx-1.5,by+.2),point(bx-.3,by-1.5)],tone(hair,-.25),.3);line(c,[point(bx+.3,by-1.6),point(bx+1.5,by-.1)],tone(hair,.2),.28)}
 if(!buzz&&!bald&&d.hair!=='long'){
  path(c,[point(x-4.3,y-3.6),point(x-3.3,y-5.5),point(x-1.6,y-5.9),point(x-2.6,y-3),point(x-3.1,y-1.5)],tone(hair,warm?.12:.18),null);
  path(c,[point(x+.4,y-6.1),point(x+2.5,y-5.4),point(x+3.8,y-3.2),point(x+2.7,y-3.8),point(x+1.4,y-4)],tone(hair,.1),null);
  if(!['pixie','long','bob','spiky'].includes(d.hair))for(const sign of [-1,1]){c.beginPath();c.moveTo(x+sign*.6,y-6.1);c.quadraticCurveTo(x+sign*3.5,y-4.4,x+sign*4.2,y-1.2);c.strokeStyle=tone(hair,-.25);c.lineWidth=.3;c.stroke()}
 }
 if(d.headwear==='cap'){
  const capColor=d.headwearColor??d.trim;
  c.beginPath();c.moveTo(x-6,y-1.8);c.quadraticCurveTo(x-5.5,y-8.6,x,y-7.8);c.quadraticCurveTo(x+6,y-8.4,x+6,y-1.8);c.closePath();c.fillStyle=capColor;c.fill();c.strokeStyle=ink;c.lineWidth=.45;c.stroke();
  for(const [hx,hy] of [[-3.3,-4.8],[-1.5,-5.8],[.4,-5.9],[2.3,-5.2],[3.7,-3.8],[-2.2,-2.9],[1.4,-3.1]])oval(c,x+hx,y+hy,.16,.22,tone(capColor,-.28));
  if(!near){
   path(c,[point(x-5.8,y-2),point(x+5.5,y-2.2),point(x+7.3,y-.4),point(x+1,y-.2)],tone(capColor,-.12),ink);
  }else{
   path(c,[point(x-3.4,y-2.4),point(x+3.4,y-2.4),point(x+3,y-.3),point(x-3,y-.3)],tone(capColor,-.12),ink,.3);
   line(c,[point(x-2.4,y-1.4),point(x+2.4,y-1.4)],ink,.28);
   for(const hx of [-1.4,-.5,.5,1.4])oval(c,x+hx,y-1.35,.12,.12,ink);
  }
 }else if(d.headwear==='visor'){path(c,[point(x-5.8,y-3.7),point(x+5.7,y-3.7),point(x+7.1,y-1.5),point(x-5.9,y-2)],(d.headwearColor??d.trim),ink)}
 else if(d.headwear==='headband')line(c,[point(x-5,y-3),point(x+.2,y-3.6),point(x+5.2,y-3)],(d.headwearColor??d.trim),1.3);
 if(d.eyewear==='glasses'){
  const rim='#202a38';
  if(!near){
   for(const sign of [-1,1]){const ex=x+sign*2.3;c.beginPath();c.ellipse(ex,y+.5,2.05,1.85,0,0,Math.PI*2);c.strokeStyle='#e5dfce';c.lineWidth=.9;c.stroke();c.strokeStyle=rim;c.lineWidth=.62;c.stroke();line(c,[point(ex-.8,y-.3),point(ex-.2,y-.65)],'#fff3df',.3)}
   line(c,[point(x-.35,y+.25),point(x+.35,y+.25)],rim,.65);
   for(const sign of [-1,1])line(c,[point(x+sign*4.3,y+.2),point(x+sign*5.15,y-.3)],rim,.65);
  }else for(const sign of [-1,1])line(c,[point(x+sign*4.7,y+.8),point(x+sign*5.3,y-.1)],rim,.65);
 }

}
export function animeTorso(design,pose,warm=false){
 const crop=design.body==='female'&&design.outfit==='shorts',bottom=pose.hips.y-.5;
 return {crop,bottom,hem:bottom-(crop?5:0),shoulder:design.shoulder*.91,waist:design.waist*.87,top:pose.neck.y+.2};
}
function trainer(c,f,d,ink,sole){
 const w=.95+d.build*.18,px=(x,y)=>point(f.x+x*w,f.y+y);
 // Ribbed ankle sock, padded collar and tongue stay attached to the foot.
 path(c,[px(-1.3,-4.2),px(1.1,-4.2),px(1.2,-1.4),px(-1.5,-1.3)],'#e5dfce',ink,.3);
 line(c,[px(-1.2,-3.2),px(1.1,-3.2)],d.trim,.65);
 path(c,[px(-2.2,-2),px(-.9,-2.4),px(1.2,-2),px(2.1,-.8),px(3.6,.3),px(3.8,1.4),px(-2.6,1.4)],'#e5dfce',ink,.4);
 path(c,[px(-2.05,-1.75),px(-.65,-2.05),px(.15,-.35),px(-1.45,.35),px(-2.3,.05)],tone(d.trim,.16),null);
 path(c,[px(.55,-.55),px(3.15,.05),px(3.55,.55),px(2.4,.72),px(.65,.35)],tone('#e5dfce',-.13),null);
 path(c,[px(1.25,-1.85),px(3.25,-.55),px(3.55,.2),px(2.25,.12),px(1.45,-.75)],tone('#e5dfce',.12),null);
 path(c,[px(-2.1,-1.6),px(-.7,-1.9),px(.1,-.3),px(-1.6,.4),px(-2.4,.2)],tone(d.trim,-.12),null);
 path(c,[px(.4,-.2),px(1.5,-.8),px(3.3,.1),px(2.8,.5),px(.8,.4)],tone('#e5dfce',-.15),null);
 path(c,[px(-.6,-2.1),px(.9,-1.8),px(1.6,-.5),px(.2,-.3)],d.trim,ink,.2);
 for(let i=0;i<3;i++)line(c,[px(-.4+i*.3,-1.7+i*.4),px(.9+i*.25,-1.4+i*.4)],'#fff3df',.35);
 line(c,[px(-2.3,-1.2),px(-2.2,.3)],ink,.25);line(c,[px(2.4,.25),px(3.1,.3)],ink,.22);
}
export function drawAnimeAthlete(c,design,mode,phase,view,cx,baseline,scale,options={}){
 const {look='sports',emotion='focus'}=options;
 const d=design,p=animePose(d,mode,phase,view,options),{raw,neck:n,hips:h}=p,near=raw.view==='near',warm=look==='storybook',ink=warm?'#483f35':'#4c453d',leg=legDimensions(d),body=animeBodyDimensions(d),skin=skinPalette(d.skin);
 if(options.footTargets)p.legs.forEach((chain,i)=>{const target=options.footTargets[i].ankle,dx=target.x-chain[2].x,dy=target.y-chain[2].y;chain[1].x+=dx*.5;chain[1].y+=dy*.5;chain[2]={...target}});
 const plant=options.plantWorld??{cx,baseline,scale};if(!options.footTargets)plantFeet(p,{...options,legLengths:p.legs.map(chain=>({upper:Math.hypot(chain[1].x-chain[0].x,chain[1].y-chain[0].y),lower:Math.hypot(chain[2].x-chain[1].x,chain[2].y-chain[1].y)}))},raw,plant.cx,plant.baseline,plant.scale);
 c.save();c.translate(cx-24*scale+(raw.rootOffset||0)*scale,baseline-63*scale);c.scale(scale,scale);

 hairTail(c,d,n.x,animeHeadCenter(n).y,phase,near,ink,'behind');
 for(const [index,chain] of p.legs.entries()){ribbon(c,chain,[body.thigh,body.calf,body.ankle],d.skin,ink,skin);const f=chain[2];
  trainer(c,f,d,ink,options.footTargets?.[index].sole);
 }
 function arm(i){const a=p.arms[i],width=2.6+d.build*1.2;ribbon(c,a,[width,width*.85,width*.5],d.skin,ink,skin);
  if(d.outfit==='polo'||(d.body==='male'&&d.outfit==='performance')){const end=point(a[0].x+(a[1].x-a[0].x)*.43,a[0].y+(a[1].y-a[0].y)*.43);ribbon(c,[a[0],end],[width+1.5,width+1],d.shirt,ink);line(c,[point(end.x-.7,end.y-.1),point(end.x+.8,end.y+.3)],d.trim,.55)}
  oval(c,a[2].x,a[2].y,width*.36,width*.48,d.skin);line(c,[point(a[2].x-.7,a[2].y-1.7),point(a[2].x+.8,a[2].y-1.5)],d.trim,.8);
  // A sweatband on the racket wrist, the detail courts actually carry.
  if(i===raw.gripSide){const hand=a[2],elbow=a[1],dx=hand.x-elbow.x,dy=hand.y-elbow.y,len=Math.max(.001,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len,half=1.4+d.build*.45,cx=hand.x-ux*2.1,cy=hand.y-uy*2.1;
   line(c,[point(cx+uy*half,cy-ux*half),point(cx-uy*half,cy+ux*half)],d.trim,1.7);
  }
 }
 function paddle(){const q=p.paddle;line(c,[p.hand,q],'#494047',1.5);c.save();c.translate(q.x,q.y);c.rotate(raw.angle);const paddleShape=options.paddleShape??'hybrid-flat',shape=paddleOutline(paddleShape),cutout=paddleCutout(paddleShape),scale=.76,drawPoints=(points,factor,fill,stroke=null)=>{c.beginPath();points.forEach(([x,y],index)=>{const point={x:x*factor*scale,y:y*factor*scale};index?c.lineTo(point.x,point.y):c.moveTo(point.x,point.y)});c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.38;c.lineJoin='round';c.stroke()}};drawPoints(shape,1,d.paddleColor??d.trim,ink);drawPoints(shape,.84,'#1c2430');drawPoints(shape,.62,'#101722');if(cutout)drawPoints(cutout,.58,'#10232d','#e7f1ed55');line(c,[point(-1.5*scale,-2.3*scale),point(-.3*scale,-3*scale),point(.9*scale,-2.8*scale)], '#ffffff28',.38);c.restore()}

 const layers=raw.arms.map((chain,i)=>({i,back:chain[1].depth<raw.neck.depth}));layers.filter(a=>a.back).forEach(a=>arm(a.i));if(raw.paddle.depth<raw.neck.depth)paddle();
 ribbon(c,[point(n.x,n.y-.6),point(n.x,n.y+2.8)],[3.4,3.8],d.skin,ink,skin);
 path(c,[point(n.x-1.7,n.y-.3),point(n.x+1.7,n.y-.3),point(n.x+1.4,n.y+1.2),point(n.x-.9,n.y+.8)],skin.deep,null);
 const {shoulder,waist,top,hem,crop,bottom}=animeTorso(d,p,warm);
 if(crop){
  path(c,[point(h.x-waist,hem-1),point(h.x+waist,hem-1),point(h.x+waist,bottom),point(h.x-waist,bottom)],d.skin,ink,.35);
  path(c,[point(h.x+waist-1.2,hem-1),point(h.x+waist,hem-1),point(h.x+waist,bottom),point(h.x+waist-1.2,bottom)],skin.shadow,null);
  path(c,[point(h.x-waist,hem-.3),point(h.x+waist,hem-.3),point(h.x+waist,hem+.8),point(h.x-waist,hem+.4)],skin.shadow,null);
  line(c,[point(h.x+.2,bottom-1.7),point(h.x+.2,bottom-1.2)],skin.shadow,.25);
 }
 c.beginPath();c.moveTo(n.x-2.5,top);c.lineTo(n.x-shoulder,top+2.1);c.quadraticCurveTo(n.x-shoulder+.5,top+6,h.x-waist,hem);c.quadraticCurveTo(h.x,hem+1,h.x+waist,hem);c.quadraticCurveTo(n.x+shoulder-1,top+6,n.x+shoulder,top+2.1);c.lineTo(n.x+2.5,top);c.quadraticCurveTo(n.x,top+3.4,n.x-2.5,top);c.closePath();const fabric=c.createLinearGradient(n.x-shoulder,0,n.x+shoulder,0);fabric?.addColorStop(0,tone(d.shirt,-.14));fabric?.addColorStop(.32,tone(d.shirt,.13));fabric?.addColorStop(.65,d.shirt);fabric?.addColorStop(1,tone(d.shirt,-.22));c.fillStyle=fabric??d.shirt;c.fill();c.strokeStyle=ink;c.lineWidth=.3;c.stroke();
 path(c,[point(n.x+shoulder-1.5,top+2.8),point(n.x+shoulder,top+2.2),point(h.x+waist,hem),point(h.x+waist-2,hem),point(h.x+waist-1.8,hem-6)],tone(d.shirt,-.2),null);
 path(c,[point(n.x-shoulder+1,top+3),point(n.x-shoulder+2.2,top+3.5),point(h.x-waist+1.8,hem),point(h.x-waist+.6,hem)],d.trim,null);
 if(d.outfit==='polo'){
  if(!near){
   path(c,[point(n.x-2.4,top),point(n.x-.5,top+2),point(n.x-2.3,top+3.8),point(n.x-3.2,top+1.1)],tone(d.trim,.12),ink,.25);
   path(c,[point(n.x+2.4,top),point(n.x+.5,top+2),point(n.x+2.3,top+3.8),point(n.x+3.2,top+1.1)],tone(d.trim,-.1),ink,.25);
   line(c,[point(n.x,top+2),point(n.x,top+5.2)],tone(d.shirt,-.3),.3);oval(c,n.x,top+3.6,.2,.2,d.trim);
  }else{
   line(c,[point(n.x-2.8,top+.7),point(n.x+2.8,top+.7)],tone(d.trim,-.08),.7);
   line(c,[point(n.x-2.2,top+1.45),point(n.x+2.2,top+1.45)],tone(d.shirt,-.2),.3);
  }
 }else{
  line(c,[point(n.x-shoulder+.4,top+2),point(n.x-shoulder+1,top+5)],d.trim,.65);
  line(c,[point(n.x+shoulder-.4,top+2),point(n.x+shoulder-1,top+5)],d.trim,.65);
 }
 if(hem-top>7){path(c,[point(h.x-waist+.8,hem-4.5),point(h.x+2,hem-2.8),point(h.x-waist+1,hem-3.4)],tone(d.shirt,-.15),null);
 path(c,[point(h.x+waist-1,hem-6.5),point(h.x-1,hem-4.8),point(h.x+waist-.6,hem-5.6)],tone(d.shirt,.13),null)}
 line(c,[point(n.x-2.6,top+.1),point(n.x,top+2.2),point(n.x+2.5,top+.1)],d.trim,.75);

 for(let i=0;i<3;i++)line(c,[point(h.x+waist-3.2,hem-1.8-i*1.7),point(h.x+waist-1,hem-2.6-i*1.7)],tone(d.shirt,-.3),.35);

 if(hem-top>8){if(!near){path(c,[point(n.x-1,top+5),point(n.x+1.4,top+5),point(n.x+.4,top+6.3),point(n.x+1.2,top+8),point(n.x-1,top+7.2)],d.trim,null)}else{line(c,[point(n.x-1.6,top+4),point(n.x+1.6,top+4)],d.trim,.6)}}
 if(d.body==='female'&&d.outfit!=='shorts'){
  const skirt=skirtGarment(h,p.legs,body.hip-1,Math.max(1.5,body.thigh-.6));path(c,skirt.polygon.map(([x,y])=>point(x,y)),tone(d.shirt,.1),ink);
  const pleats=d.outfit==='performance'?[-.86,-.67,-.48,-.29,-.1,.1,.29,.48,.67,.86]:[-.7,-.3,.3,.7];for(const [index,offset] of pleats.entries()){const end=skirt.ends[offset<0?0:1],sx=h.x+body.hip*offset,hemX=end.x+(offset-(offset<0?-.5:.5))*body.hip*.42;path(c,[point(sx,h.y+.5),point((sx+hemX)/2,h.y+4.2),point(hemX,end.y+.6)],index%2?tone(d.shirt,.12):tone(d.shirt,-.18),null)}
  line(c,[point(skirt.left,skirt.ends[0].y+1),point(h.x,skirt.bottom),point(skirt.right,skirt.ends[1].y+1)],d.trim,.55);
 }else{
  const shorts=tone(d.shirt,-.48);for(const chain of p.legs){const g=thighGarment(chain,body.thigh+1);path(c,g.polygon.map(([x,y])=>point(x,y)),shorts,ink);line(c,[point(...g.polygon[1]),point(...g.polygon[2])],d.trim,.6)}
  path(c,[point(h.x-body.hip,h.y-1),point(h.x+body.hip,h.y-1),point(h.x+body.hip,h.y+2),point(h.x,h.y+3),point(h.x-body.hip,h.y+2)],shorts,ink);
 }
 if(crop)line(c,[point(h.x-waist,hem),point(h.x+waist,hem)],d.trim,.65);
 line(c,[point(h.x-waist,h.y-1),point(h.x+waist,h.y-1)],tone(d.shirt,-.35),.8);
 hairTail(c,d,n.x,animeHeadCenter(n).y,phase,near,ink,'front');
 const normalizedEmotion=normalizeEmotion(emotion);animeHead(c,d,n,near,warm,phase,ink,normalizedEmotion);if(d.hair==='braid')drawAnimeBraid(c,d,n.x,animeHeadCenter(n).y,phase,near,ink,near);const emotionHead=animeHeadCenter(n),sweat=Math.max(0,Math.min(1,options.sweat??0));emotionMarks(c,normalizedEmotion,options.emotionIntensity??.65,emotionHead);if(sweat>.1){oval(c,emotionHead.x-2.4,emotionHead.y-4.8,1.2,.28,'#d8f3f4aa');const drops=sweat>.68?3:sweat>.34?2:1;for(let i=0;i<drops;i++){const sign=i===0?-1:i===1?1:0,drop=((options.emotionClock??0)*(.7+i*.15)+i*.31)%1;oval(c,emotionHead.x+sign*5.4+(i===2?2.2:0),emotionHead.y+1+drop*3,.34+(i===2?.08:0),.58+drop*.18,'#b5e6ef')}}
 layers.filter(a=>!a.back).forEach(a=>arm(a.i));if(raw.paddle.depth>=raw.neck.depth)paddle();c.restore();
}

