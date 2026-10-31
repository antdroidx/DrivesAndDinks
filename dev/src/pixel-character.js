import {HAIR_COLORS,SKIN_TONES,CLOTHING_COLORS,PADDLE_COLORS} from './roster.js?v=27';

const LOGICAL_WIDTH=96;
const LOGICAL_HEIGHT=128;
const OUTLINE='#11172c';
const PADDLE_FACE='#171925';
const WHITE='#f8f1d7';

const resolve=(items,id,fallback)=>items.find(item=>item.id===id)??items.find(item=>item.id===fallback)??items[0];
const hexRgb=hex=>{const value=hex.replace('#','');return [0,2,4].map(index=>parseInt(value.slice(index,index+2),16))};
const rgbHex=rgb=>`#${rgb.map(value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,'0')).join('')}`;
function mix(hex,target,amount){const source=hexRgb(hex);return rgbHex(source.map((value,index)=>value+(target[index]-value)*amount))}
export function appearancePalette(appearance={}){
 const hair=resolve(HAIR_COLORS,appearance.hair,'brown').color;
 const skin=resolve(SKIN_TONES,appearance.skin,'medium').color;
 const shirt=resolve(CLOTHING_COLORS,appearance.shirtColor,'green').color;
 const bottom=resolve(CLOTHING_COLORS,appearance.bottomColor,'black').color;
 const paddle=resolve(PADDLE_COLORS,appearance.paddleColor,'mint').color;
 return {outline:OUTLINE,hair,hairDark:mix(hair,[10,12,25],.42),hairLight:mix(hair,[255,242,207],.24),skin,skinDark:mix(skin,[104,50,36],.38),skinLight:mix(skin,[255,234,203],.28),shirt,shirtDark:mix(shirt,[15,20,40],.4),shirtLight:mix(shirt,[255,248,222],.3),bottom,bottomDark:mix(bottom,[12,17,35],.42),paddle,paddleDark:mix(paddle,[16,24,43],.38),paddleLight:mix(paddle,[255,248,221],.24),face:PADDLE_FACE,white:WHITE};
}

let scratch;
function getScratch(){if(!scratch){scratch=document.createElement('canvas');scratch.width=LOGICAL_WIDTH;scratch.height=LOGICAL_HEIGHT}return scratch}
function rect(context,x,y,width,height,color){context.fillStyle=color;context.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height))}
function rasterLine(context,x0,y0,x1,y1,size,color){
 let x=Math.round(x0),y=Math.round(y0),dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,error=dx+dy;context.fillStyle=color;
 for(let guard=0;guard<256;guard++){context.fillRect(x-Math.floor(size/2),y-Math.floor(size/2),size,size);if(x===Math.round(x1)&&y===Math.round(y1))break;const e2=2*error;if(e2>=dy){error+=dy;x+=sx}if(e2<=dx){error+=dx;y+=sy}}
}
function pointInside(points,x,y){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,yi]=points[i],[xj,yj]=points[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside}return inside}
function rasterPolygon(context,points,color){
 const minX=Math.floor(Math.min(...points.map(point=>point[0]))),maxX=Math.ceil(Math.max(...points.map(point=>point[0]))),minY=Math.floor(Math.min(...points.map(point=>point[1]))),maxY=Math.ceil(Math.max(...points.map(point=>point[1])));context.fillStyle=color;
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(pointInside(points,x+.5,y+.5))context.fillRect(x,y,1,1);
}
function roundedRect(cx,cy,width,height,radius,angle=0){
 const halfW=width/2,halfH=height/2,r=Math.min(radius,halfW,halfH),points=[];
 for(const [x,y] of [[-halfW+r,-halfH],[halfW-r,-halfH],[halfW,-halfH+r],[halfW,halfH-r],[halfW-r,halfH],[-halfW+r,halfH],[-halfW,halfH-r],[-halfW,-halfH+r]]){
  const cos=Math.cos(angle),sin=Math.sin(angle);points.push([cx+x*cos-y*sin,cy+x*sin+y*cos]);
 }
 return points;
}
const lerp=(a,b,t)=>a+(b-a)*t;
const lerpPoint=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
const ease=t=>t*t*(3-2*t);
const BASE=Object.freeze({t:0,hand:[61,55],elbow:[57,53],freeHand:[31,58],freeElbow:[37,54],face:[74,48],feetL:[33,111],feetR:[64,111],kneeL:[38,94],kneeR:[58,94],shift:0,jump:0,headTilt:0});
const key=(t,values={})=>({...BASE,...values,t});
const POSE_KEYS={
 forehand:[key(0),key(.24,{hand:[35,51],elbow:[42,52],freeHand:[60,49],freeElbow:[55,50],face:[24,38],shift:-1,kneeL:[37,92],kneeR:[57,93]}),key(.5,{hand:[65,52],elbow:[57,50],freeHand:[34,55],freeElbow:[39,53],face:[82,49],shift:2,kneeL:[40,91],kneeR:[60,93]}),key(.68,{hand:[67,39],elbow:[59,48],freeHand:[31,52],freeElbow:[36,53],face:[81,23],shift:2,headTilt:1}),key(1)],
 backhand:[key(0),key(.26,{hand:[61,45],elbow:[58,51],freeHand:[36,49],freeElbow:[39,53],face:[74,32],shift:1}),key(.5,{hand:[32,51],elbow:[40,51],freeHand:[28,47],freeElbow:[35,52],face:[17,49],shift:-2,kneeL:[36,92],kneeR:[58,94]}),key(.7,{hand:[25,38],elbow:[35,48],freeHand:[27,42],freeElbow:[34,50],face:[10,25],shift:-2,headTilt:1}),key(1)],
 overhead:[key(0),key(.2,{hand:[59,44],elbow:[57,49],freeHand:[33,52],freeElbow:[38,53],face:[69,27],jump:1,kneeL:[36,92],kneeR:[59,92]}),key(.42,{hand:[61,34],elbow:[59,43],freeHand:[29,43],freeElbow:[36,48],face:[72,22],jump:5,kneeL:[37,87],kneeR:[58,87]}),key(.56,{hand:[67,53],elbow:[59,46],freeHand:[31,52],freeElbow:[38,53],face:[82,62],jump:3,kneeL:[38,90],kneeR:[58,91]}),key(.72,{hand:[51,61],elbow:[54,54],freeHand:[33,57],freeElbow:[39,55],face:[40,72],jump:1}),key(1)],
 atp:[key(0),key(.32,{hand:[59,58],elbow:[57,53],freeHand:[36,50],freeElbow:[41,52],face:[71,50],shift:-1}),key(.58,{hand:[71,63],elbow:[61,54],freeHand:[33,54],freeElbow:[39,54],face:[88,75],shift:2}),key(.8,{hand:[61,51],elbow:[57,48],freeHand:[31,51],freeElbow:[37,53],face:[72,39],shift:1}),key(1)],
 erne:[key(0),key(.25,{hand:[58,45],elbow:[57,50],freeHand:[31,48],freeElbow:[37,52],face:[68,28],jump:1}),key(.52,{hand:[69,45],elbow:[61,45],freeHand:[28,44],freeElbow:[36,49],face:[87,48],jump:3,kneeL:[37,90],kneeR:[59,90]}),key(.75,{hand:[59,57],elbow:[56,51],freeHand:[31,54],freeElbow:[37,54],face:[67,66],jump:1}),key(1)]
};
function samplePose(mode,phase){
 const keys=POSE_KEYS[mode]??POSE_KEYS.forehand,p=Math.max(0,Math.min(1,Number(phase)||0));let a=keys[0],b=keys.at(-1);
 for(let i=0;i<keys.length-1;i++)if(p>=keys[i].t&&p<=keys[i+1].t){a=keys[i];b=keys[i+1];break}
 const span=Math.max(.0001,b.t-a.t),t=ease((p-a.t)/span);
 return {hand:lerpPoint(a.hand,b.hand,t),elbow:lerpPoint(a.elbow,b.elbow,t),freeHand:lerpPoint(a.freeHand,b.freeHand,t),freeElbow:lerpPoint(a.freeElbow,b.freeElbow,t),face:lerpPoint(a.face,b.face,t),feetL:lerpPoint(a.feetL,b.feetL,t),feetR:lerpPoint(a.feetR,b.feetR,t),kneeL:lerpPoint(a.kneeL,b.kneeL,t),kneeR:lerpPoint(a.kneeR,b.kneeR,t),shift:lerp(a.shift,b.shift,t),jump:lerp(a.jump,b.jump,t),headTilt:lerp(a.headTilt,b.headTilt,t),step:0};
}
function poseFor({mode='idle',frame=0,phase=0,moving=false,contactTarget=null}={}){
 let pose;
 if(POSE_KEYS[mode])pose=samplePose(mode,phase);
 else{
  const cycle=(frame+.5)/8*Math.PI*2,stride=Math.sin(cycle),liftL=Math.max(0,stride),liftR=Math.max(0,-stride),slide=mode==='slide';
  const bob=moving?(frame%4<2?0:1):(frame%4<2?0:.6);
  pose={hand:[60-stride*2,55+Math.round(stride)],elbow:[57-stride,53],freeHand:[32+stride*5,56-stride*2],freeElbow:[37+stride*2,54],face:[74-stride*2,47],feetL:[34+(slide?4:stride*6),111-Math.round(liftL*(slide?0:4))],feetR:[62-(slide?4:stride*5),111-Math.round(liftR*(slide?0:4))],kneeL:[39-stride*2,94-Math.round(liftL*6)],kneeR:[57+stride*2,94-Math.round(liftR*6)],shift:slide?2:-stride*.35,jump:0,headTilt:0,step:stride};
 }
 if(contactTarget&&['forehand','backhand','overhead','erne','atp'].includes(mode)){
  const focus=1-Math.min(1,Math.abs((phase??0)-.53)/.24),amount=Math.max(0,focus);
  if(amount>0){
   pose.face=lerpPoint(pose.face,contactTarget,amount);
   const shoulder=[60+pose.shift,43-pose.jump],dx=pose.face[0]-shoulder[0],dy=pose.face[1]-shoulder[1],length=Math.max(1,Math.hypot(dx,dy)),ux=dx/length,uy=dy/length;
   pose.hand=lerpPoint(pose.hand,[pose.face[0]-ux*8,pose.face[1]-uy*8],amount);
   pose.elbow=[shoulder[0]+(pose.hand[0]-shoulder[0])*.52-uy*1.5,shoulder[1]+(pose.hand[1]-shoulder[1])*.52+ux*1.5];
  }
 }
 return pose;
}
function drawLimb(context,palette,start,joint,end,outer='skin'){
 rect(context,start[0]-3,start[1]-1,6,3,palette.outline);
 rasterLine(context,start[0],start[1],joint[0],joint[1],7,palette.outline);
 rasterLine(context,start[0],start[1],joint[0],joint[1],5,palette[outer]);
 rasterLine(context,joint[0],joint[1],end[0],end[1],7,palette.outline);
 rasterLine(context,joint[0],joint[1],end[0],end[1],5,palette[outer]);
 rect(context,Math.round(joint[0])-2,Math.round(joint[1])-2,4,4,palette[outer]);
}
function drawShoe(context,palette,foot,back=false){
 const x=Math.round(foot[0]),y=Math.round(foot[1]);
 rasterPolygon(context,[[x-5,y-5],[x+1,y-7],[x+8,y-4],[x+10,y-1],[x+9,y+2],[x-4,y+2],[x-6,y]],palette.outline);
 rasterPolygon(context,[[x-4,y-4],[x+1,y-6],[x+7,y-3],[x+8,y-1],[x+7,y],[x-4,y],[x-5,y-1]],palette.white);
 rect(context,x+1,y-3,4,1,back?palette.bottomDark:palette.paddle);
 rect(context,x-4,y+1,14,2,palette.outline);rect(context,x-3,y,12,1,palette.bottom);
 rect(context,x-2,y-2,3,2,palette.white);rect(context,x-3,y-1,1,2,palette.paddleDark);
}
function drawLeg(context,palette,hip,knee,foot,back=false,shortsColor){
 const skin=back?palette.skinDark:palette.skin;
 drawLimb(context,palette,hip,knee,foot,skin);
 rect(context,hip[0]-5,hip[1]-2,10,5,shortsColor);
 drawShoe(context,palette,foot,back);
}
function drawArm(context,palette,shoulder,elbow,hand,skin,band=true){
 drawLimb(context,palette,shoulder,elbow,hand,skin);
 if(band){rect(context,hand[0]-3,hand[1]-2,6,2,palette.white);rect(context,hand[0]-2,hand[1]-1,5,3,palette.skinLight)}
 rect(context,hand[0]-3,hand[1]-3,6,5,palette.outline);rect(context,hand[0]-2,hand[1]-2,4,3,palette.skinLight);
}
function drawPaddle(context,palette,hand,face){
 const dx=face[0]-hand[0],dy=face[1]-hand[1],length=Math.max(1,Math.hypot(dx,dy)),ux=dx/length,uy=dy/length,angle=Math.atan2(uy,ux);
 const gripEnd=[hand[0]+ux*5,hand[1]+uy*5],throat=[hand[0]+ux*9,hand[1]+uy*9];
 rasterLine(context,hand[0],hand[1],gripEnd[0],gripEnd[1],5,palette.outline);rasterLine(context,hand[0],hand[1],gripEnd[0],gripEnd[1],3,palette.white);
 rasterLine(context,gripEnd[0],gripEnd[1],throat[0],throat[1],4,palette.outline);rasterLine(context,gripEnd[0],gripEnd[1],throat[0],throat[1],2,palette.face);
 for(let band=0;band<3;band++){const bx=hand[0]+ux*(1.2+band*1.25),by=hand[1]+uy*(1.2+band*1.25);rect(context,Math.round(bx)-2,Math.round(by)-1,4,2,palette.paddleDark)}
 const outer=roundedRect(face[0],face[1],17,25,5,angle),inner=roundedRect(face[0],face[1],13,21,4,angle);
 rasterPolygon(context,outer,palette.paddle);rasterPolygon(context,inner,palette.face);
 rasterPolygon(context,roundedRect(face[0],face[1],2,14,1,angle),palette.paddleLight);
 rasterPolygon(context,roundedRect(face[0]-ux*2,face[1]-uy*2,8,1,0,angle),palette.paddleDark);
 rasterPolygon(context,roundedRect(face[0]-ux*6,face[1]-uy*6,7,1,0,angle),palette.white);
 rect(context,hand[0]-4,hand[1]-3,7,4,palette.outline);rect(context,hand[0]-3,hand[1]-2,5,3,palette.skinLight);
}
function hairStyle(characterId,body){
 if(body==='female')return ['selena','harper','quinn'].includes(characterId)?'ponytail':characterId==='lena'?'bun':'ponytail';
 return ['remy','jordan'].includes(characterId)?'waves':'crop';
}
function drawHairBack(context,palette,pose,body,characterId){
 const style=hairStyle(characterId,body),sway=Math.round(pose.step*3+pose.shift*.5);
 if(style==='ponytail'){
  rasterPolygon(context,[[39+pose.shift,19+pose.headTilt],[30+sway,23],[22+sway,35],[17+sway,55],[25+sway,51],[32+sway,39],[39+pose.shift,30]],palette.outline);
  rasterPolygon(context,[[38+pose.shift,21+pose.headTilt],[31+sway,25],[25+sway,37],[21+sway,51],[26+sway,47],[34+sway,35],[40+pose.shift,29]],palette.hair);
  rasterPolygon(context,[[34+sway,28],[26+sway,39],[23+sway,50],[29+sway,43],[36+sway,31]],palette.hairDark);
 }else if(style==='bun'){
  rasterPolygon(context,[[38+pose.shift,18],[27+pose.shift,17],[24+pose.shift,24],[31+pose.shift,29],[40+pose.shift,28]],palette.outline);
  rasterPolygon(context,[[37+pose.shift,19],[29+pose.shift,19],[27+pose.shift,23],[32+pose.shift,27],[39+pose.shift,26]],palette.hair);
 }else if(style==='waves'){
  rasterPolygon(context,[[38+pose.shift,16],[50+pose.shift,13],[61+pose.shift,18],[60+pose.shift,27],[53+pose.shift,24],[47+pose.shift,30],[38+pose.shift,27]],palette.outline);
  rasterPolygon(context,[[39+pose.shift,17],[50+pose.shift,15],[59+pose.shift,19],[58+pose.shift,24],[52+pose.shift,22],[47+pose.shift,28],[39+pose.shift,25]],palette.hair);
  rect(context,44+pose.shift,17,9,2,palette.hairLight);
 }else{
  rasterPolygon(context,[[38+pose.shift,17],[49+pose.shift,14],[61+pose.shift,18],[58+pose.shift,25],[47+pose.shift,23],[39+pose.shift,26]],palette.outline);
  rasterPolygon(context,[[39+pose.shift,18],[49+pose.shift,16],[59+pose.shift,19],[57+pose.shift,23],[47+pose.shift,21],[40+pose.shift,24]],palette.hair);
 }
}
function drawHead(context,palette,pose,body,view,characterId){
 const sx=pose.shift,headY=pose.headTilt;
 rect(context,46+sx,38+headY,7,6,palette.skinDark);rect(context,47+sx,37+headY,6,3,palette.skin);
 rasterPolygon(context,[[40+sx,17+headY],[53+sx,14+headY],[62+sx,21+headY],[60+sx,31+headY],[54+sx,40+headY],[45+sx,38+headY],[39+sx,31+headY]],palette.outline);
 rasterPolygon(context,[[42+sx,19+headY],[53+sx,16+headY],[60+sx,22+headY],[58+sx,31+headY],[53+sx,37+headY],[46+sx,36+headY],[41+sx,30+headY]],view==='back'?palette.hairDark:palette.skin);
 if(view!=='back'){
  rasterPolygon(context,[[41+sx,21+headY],[46+sx,20+headY],[45+sx,36+headY],[42+sx,31+headY]],palette.skinDark);
  rect(context,43+sx,24+headY,6,1,palette.hairDark);rect(context,51+sx,24+headY,7,1,palette.hairDark);
  rect(context,49+sx,26+headY,2,2,palette.outline);rect(context,56+sx,26+headY,2,2,palette.outline);rect(context,50+sx,26+headY,1,1,palette.white);rect(context,57+sx,26+headY,1,1,palette.white);
  rect(context,58+sx,31+headY,2,2,palette.skinDark);rect(context,54+sx,34+headY,4,1,palette.skinDark);rect(context,52+sx,33+headY,1,1,palette.skinLight);
 }else{
  rasterPolygon(context,[[42+sx,20+headY],[56+sx,17+headY],[60+sx,27+headY],[54+sx,36+headY],[45+sx,34+headY]],palette.hair);
  rect(context,46+sx,19+headY,2,9,palette.hairDark);
 }
 rect(context,47+sx,17+headY,14,2,palette.white);rect(context,57+sx,19+headY,8,2,palette.white);rect(context,57+sx,21+headY,8,1,palette.outline);
}
function drawTorso(context,palette,appearance,pose,body){
 const sx=pose.shift,topY=42-pose.jump;
 const points=body==='female'?[[39+sx,topY],[57+sx,topY],[61+sx,topY+11],[55+sx,topY+25],[42+sx,topY+25],[36+sx,topY+12]]:[[37+sx,topY],[58+sx,topY],[62+sx,topY+13],[56+sx,topY+26],[41+sx,topY+26],[35+sx,topY+13]];
 rasterPolygon(context,points,palette.outline);
 rasterPolygon(context,points.map(([x,y],i)=>[x+(i<2?0:i>3?-1:0),y+(i<2?2:y>topY+20?-2:0)]),palette.shirt);
 rasterPolygon(context,[[42+sx,topY+2],[55+sx,topY+2],[53+sx,topY+8],[45+sx,topY+8]],palette.white);
 rect(context,43+sx,topY+14,17,2,palette.shirtLight);rect(context,56+sx,topY+5,2,16,palette.shirtDark);
 if(appearance.outfit==='polo'){rect(context,48+sx,topY+2,2,3,palette.white);rect(context,48+sx,topY+7,1,5,palette.shirtDark)}
}
function drawLowerBody(context,palette,appearance,pose,body){
 const sx=pose.shift,hipY=68-pose.jump;
 if(appearance.outfit==='dress'){
  rasterPolygon(context,[[43+sx,hipY-1],[57+sx,hipY-1],[69+sx,hipY+12],[33+sx,hipY+12]],palette.outline);
  rasterPolygon(context,[[45+sx,hipY],[56+sx,hipY],[65+sx,hipY+10],[36+sx,hipY+10]],palette.shirt);
  rect(context,35+sx,hipY+8,28,2,palette.bottom);rect(context,42+sx,hipY-1,15,1,palette.bottom);
 }else{
  rasterPolygon(context,[[43+sx,hipY-1],[57+sx,hipY-1],[58+sx,hipY+13],[50+sx,hipY+13],[48+sx,hipY+5],[43+sx,hipY+5],[41+sx,hipY+13],[33+sx,hipY+13]],palette.outline);
  rasterPolygon(context,[[44+sx,hipY],[56+sx,hipY],[57+sx,hipY+11],[50+sx,hipY+11],[48+sx,hipY+4],[43+sx,hipY+4],[42+sx,hipY+11],[35+sx,hipY+11]],palette.bottom);
  rect(context,35+sx,hipY+9,2,1,palette.white);rect(context,52+sx,hipY+1,3,1,palette.bottomDark);
 }
 drawLeg(context,palette,[43+sx,hipY+4],pose.kneeL,[pose.feetL[0],pose.feetL[1]-pose.jump],true,appearance.outfit==='dress'?palette.bottom:palette.bottom);
 drawLeg(context,palette,[55+sx,hipY+4],pose.kneeR,[pose.feetR[0],pose.feetR[1]-pose.jump],false,appearance.outfit==='dress'?palette.bottom:palette.bottom);
}
export function drawPixelCharacter(target,{appearance={},characterId='avery',mode='idle',frame=0,phase=0,moving=false,view='front',mirror=false,contactTarget=null,x=0,y=0,width=80,height=106}={}){
 const canvas=getScratch(),context=canvas.getContext('2d'),palette=appearancePalette(appearance),body=appearance.body??'male',pose=poseFor({mode,frame,phase,moving,contactTarget});
 context.clearRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);context.imageSmoothingEnabled=false;
 const sx=pose.shift,topY=42-pose.jump,shoulderL=[37+sx,topY+2],shoulderR=[60+sx,topY+1];
 drawHairBack(context,palette,pose,body,characterId);
 drawArm(context,palette,shoulderL,[pose.freeElbow[0]+sx,pose.freeElbow[1]-pose.jump],[pose.freeHand[0]+sx,pose.freeHand[1]-pose.jump],palette.skin,true);
 drawLowerBody(context,palette,appearance,pose,body);
 drawTorso(context,palette,appearance,pose,body);
 drawArm(context,palette,shoulderR,[pose.elbow[0]+sx,pose.elbow[1]-pose.jump],[pose.hand[0]+sx,pose.hand[1]-pose.jump],palette.skin,true);
 drawPaddle(context,palette,[pose.hand[0]+sx,pose.hand[1]-pose.jump],[pose.face[0]+sx,pose.face[1]-pose.jump]);
 drawHead(context,palette,pose,body,view,characterId);
 target.save();target.imageSmoothingEnabled=false;target.translate(x+width/2,y);if(mirror)target.scale(-1,1);target.drawImage(canvas,-width/2,0,width,height);target.restore();
}
