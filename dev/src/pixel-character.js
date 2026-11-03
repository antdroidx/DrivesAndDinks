import {CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS} from './roster.js?v=81';

// Original 48 x 64 pixel artwork. Shared joints prevent anatomy/frame drift.
// Colors belong to materials; no hue matching or sprite-sheet recoloring.
export const MOTIONS=Object.freeze(['run','shuffle','volley','forehand','backhand','forehandDink','backhandDink','forehandDrop','backhandDrop','overhead','lob','twoBackhand','twoBackhandDink','erne','serve','poachLunge','slideReturn','splitStep']);
export const CONTACT_PHASE=.52;
export const PIXEL_DENSITY=3;
export const CHARACTER_BUFFER={width:96*PIXEL_DENSITY,height:96*PIXEL_DENSITY};
export const characterSpritesReady=()=>true;
export function onCharacterSpritesReady(callback){callback?.();return true}
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
const resolve=(items,id)=>items.find(item=>item.id===id)??items[0];
function shade(hex,amount){return '#'+hex.slice(1).match(/../g).map(v=>Math.round(lerp(parseInt(v,16),amount>0?255:0,Math.abs(amount))).toString(16).padStart(2,'0')).join('')}
export function appearancePalette(a={}){
 const shirt=resolve(CLOTHING_COLORS,a.shirtColor??'green').color,hair=resolve(HAIR_COLORS,a.hairColor??'brown').color,skin=resolve(SKIN_COLORS,a.skinColor??'medium').color,p=resolve(PADDLE_COLORS,a.paddleColor??'mint');
 return {outline:'#192131',shirt,shirtDark:shade(shirt,-.3),shirtLight:shade(shirt,.3),bottom:shade(shirt,-.5),bottomDark:shade(shirt,-.65),hair,hairLight:shade(hair,.22),skin,skinDark:shade(skin,-.24),skinLight:shade(skin,.15),paddle:p.edgeColor,paddleInterior:'#10151d',shoe:'#f4eee0',shoeDark:'#9ba9b7',sock:'#dbe3de',accent:shade(shirt,.55),grip:'#d9dde0'};
}
export function characterFrame(mode='idle',phase=0,frame=0){
 const row=Math.max(0,MOTIONS.indexOf(mode==='slide'?'shuffle':mode));
 return {row,col:['run','shuffle','slide'].includes(mode)?Math.abs(Math.floor(frame))%4:Math.floor(clamp(phase,0,.999)*4)};
}
// Ready, anticipation, impact, follow-through, recovery. Different arcs for
// compact dinks, lifting drops, blocks, full drives and overhead acceleration.
const READY=[7,27,11];
// Coordinates are anatomical: +x = player's right, +z = toward the net.
const paths={
 volley:[READY,[8,26,8],[11,27,14],[10,25,15],READY],
 forehand:[READY,[14,29,-3],[17,33,11],[-9,24,13],READY],
 backhand:[READY,[-9,25,1],[-13,33,12],[10,22,13],READY],
 forehandDink:[READY,[9,39,6],[12,42,14],[13,35,16],READY],
 backhandDink:[READY,[-5,39,6],[-11,42,11],[-12,35,12],READY],
 forehandDrop:[READY,[13,41,2],[15,40,13],[5,24,17],READY],
 backhandDrop:[READY,[-9,41,2],[-12,40,11],[-2,24,14],READY],
 overhead:[READY,[9,7,-3],[10,3,10],[14,36,15],READY],
 lob:[READY,[6,43,4],[10,41,14],[6,15,17],READY],
 serve:[READY,[12,39,2],[11,33,14],[-4,15,16],READY],
 twoBackhand:[READY,[-9,26,1],[-13,33,12],[10,20,14],READY],
 erne:[READY,[15,31,-2],[19,23,7],[7,22,13],READY],
 poachLunge:[READY,[10,27,5],[15,27,14],[11,25,15],READY],
 slideReturn:[READY,[16,38,-2],[22,31,15],[8,27,17],READY],
 splitStep:[READY,[8,29,7],[9,28,11],[7,27,9],READY]
};
const wristAngles={
 volley:[0,.3,.65,.8,0],forehand:[0,1.3,1.3,-1.1,0],backhand:[0,-1.1,-1.3,1.1,0],
 forehandDink:[0,2.6,2.7,2,0],backhandDink:[0,-2.2,-2.25,-1.7,0],
 forehandDrop:[0,2.4,2.5,1.4,0],backhandDrop:[0,-2.2,-2.25,-1.2,0],
 overhead:[0,-.5,0,1.8,0],lob:[0,2.8,2.7,.2,0],serve:[0,1.4,1.9,-.6,0],twoBackhand:[0,-1.1,-1.3,-.4,0],erne:[0,1.1,1.65,-.35,0],poachLunge:[0,1.2,1.75,-.4,0],slideReturn:[0,1.5,1.9,-.25,0],splitStep:[0,.4,.65,.2,0]
};
paths.twoBackhandDink=[READY,[-6,36,7],[-10,40,12],[-8,34,14],READY];wristAngles.twoBackhandDink=[0,-1.8,-2,-1.5,0];
const times=[0,.28,CONTACT_PHASE,.78,1];
function samplePath(path,phase){
 let i=0;while(i<3&&phase>times[i+1])i++;
 const span=times[i+1]-times[i],t=clamp((phase-times[i])/span),t2=t*t,t3=t2*t;
 const tangent=(k,axis)=>k===0||k===4?0:(path[k+1][axis]-path[k-1][axis])/(times[k+1]-times[k-1]);
 const sample=axis=>(2*t3-3*t2+1)*path[i][axis]+(t3-2*t2+t)*span*tangent(i,axis)+(-2*t3+3*t2)*path[i+1][axis]+(t3-t2)*span*tangent(i+1,axis);
 // Hermite tangents carry velocity through impact instead of stopping at each pose.
 return {x:sample(0),y:sample(1),z:path[0].length>2?sample(2):0};
}
export function jointBetween(a,b,l1,l2,bend=1){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),reach=Math.min(d,l1+l2-.001),along=(l1*l1-l2*l2+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,l1*l1-along*along));
 return {x:a.x+dx/d*along-dy/d*h*bend,y:a.y+dy/d*along+dx/d*h*bend};
}
const vadd=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const vsub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const vmul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const length=a=>Math.hypot(a.x,a.y,a.z);
const mix3=(a,b,t)=>vadd(a,vmul(vsub(b,a),t));
export const ARM_LENGTHS=Object.freeze([9.5,10]);
// Pole vectors are in the player's body space, not left/right screen space.
// Clamp impossible targets as a whole grip+paddle, never stretch the forearm.
export function solveArm3D(shoulder,wrist,pole){
 const [upper,lower]=ARM_LENGTHS,delta=vsub(wrist,shoulder),distance=Math.max(.001,length(delta));
 const dir=vmul(delta,1/distance),reach=clamp(distance,Math.abs(upper-lower)+.001,upper+lower-.01);
 const end=vadd(shoulder,vmul(dir,reach)),along=(upper*upper-lower*lower+reach*reach)/(2*reach);
 const normal=vsub(pole,vmul(dir,dot(pole,dir))),normalLength=length(normal);
 const bend=normalLength>.0001?vmul(normal,1/normalLength):{x:1,y:0,z:0};
 const elbow=vadd(vadd(shoulder,vmul(dir,along)),vmul(bend,Math.sqrt(Math.max(0,upper*upper-along*along))));
 return [shoulder,elbow,end];
}
export {courtView,strokeForContact} from './player-facing.js?v=81';
export function sampleCharacterPose({mode='idle',phase=0,frame=0,view='far',side=1,travelSide=side,contact=null,contactWeight=0,contactDepth=null,moving=false}={}){
 phase=clamp(phase);const action=!!paths[mode],gait=frame*Math.PI/2,stepping=['run','shuffle','slide'].includes(mode)||moving;
 const stride=stepping?Math.sin(gait):0,bob=stepping?Math.cos(gait*2)*.6:0,weight=action?Math.sin(phase*Math.PI):0;
 const back=mode.startsWith('back')||mode.startsWith('twoBackhand'),twoHanded=mode.startsWith('twoBackhand');
 const mirror=view==='near'?1:-1,facing=view==='near'?-1:1;
 const yaw=weight*(back?-.45:.35)*side,cos=Math.cos(yaw),sin=Math.sin(yaw),lean=weight*(back?-1:1)*1.2*side;
 const project=p=>{const depth=p.z*cos-p.x*sin;return {x:24+mirror*(p.x*cos+p.z*sin+lean),y:p.y+facing*.4*depth,depth:facing*depth}};
 let paddle3=action?samplePath(paths[mode],phase):{x:READY[0]+stride*.35,y:READY[1]+bob,z:READY[2]};
 paddle3.x*=side;
 if(contact){const cx=(contact.x-24)/mirror-lean;
  const depth=contactDepth??(paddle3.z-cx*sin)/cos;
  const x=cx*cos-depth*sin,z=cx*sin+depth*cos;
  paddle3=mix3(paddle3,{x,y:contact.y-facing*.4*depth,z},clamp(contactWeight));
 }
 let gripAngle=action?samplePath(wristAngles[mode].map(v=>[v,0]),phase).x*side:0;
 // At live impact the handle points back toward the shoulder, so a low
 // face cannot drag the wrist below the paddle or reverse the elbow.
 const crouch=clamp((paddle3.y-43)*.7,0,14)+(mode==='slideReturn'?7:mode==='poachLunge'?4:0),shoulderY=26+bob+crouch,forwardLean=crouch*.45;
 if(contact){const toward=Math.atan2(paddle3.x-side*6,shoulderY-paddle3.y),difference=Math.atan2(Math.sin(toward-gripAngle),Math.cos(toward-gripAngle));gripAngle+=difference*clamp(contactWeight)}
 const shoulders=[{x:-6,y:shoulderY,z:forwardLean},{x:6,y:shoulderY,z:forwardLean}];
 let hand3={x:paddle3.x-Math.sin(gripAngle)*8,y:paddle3.y+Math.cos(gripAngle)*8,z:paddle3.z};
 if(contact){const towardShoulder=vsub(twoHanded?mix3(shoulders[0],shoulders[1],.5):shoulders[side<0?0:1],paddle3);hand3=mix3(hand3,vadd(paddle3,vmul(towardShoulder,8/Math.max(.001,length(towardShoulder)))),clamp(contactWeight))}
 const gripSide=side<0?0:1,freeSide=1-gripSide;
 let gripArm=solveArm3D(shoulders[gripSide],hand3,{x:side*7,y:9,z:-4});
 const correction=vsub(gripArm[2],hand3);paddle3=vadd(paddle3,correction);hand3=gripArm[2];
 // The off hand supports the throat at ready, balances drives, and shares the
 // grip for a two-hander. It always has its own natural downward elbow pole.
 const support={x:hand3.x-side*2,y:hand3.y-2,z:hand3.z};
 const balance={x:-side*(12+stride*.4),y:34+bob,z:6+weight*2};
 const freeHand=twoHanded?vadd(hand3,{x:0,y:1.6,z:0}):mix3(support,balance,weight);
 const arms3=[];arms3[gripSide]=gripArm;arms3[freeSide]=solveArm3D(shoulders[freeSide],freeHand,{x:-side*7,y:9,z:-4});
 const arms=arms3.map(chain=>chain.map(project)),paddle=project(paddle3),hand=project(hand3);
 const angle=Math.atan2(-(hand.x-paddle.x),hand.y-paddle.y);
 const load=action?Math.sin(Math.PI*phase):0,weightShift=load*(back?-1.4:1.7)*side;let stance=action?1.6+load*1.2:0;if(mode==='poachLunge')stance+=load*2.8;if(mode==='slideReturn')stance+=load*4.2;if(mode==='splitStep')stance+=load*2;
 const jump=mode==='erne'?Math.sin(Math.PI*clamp((phase-.16)/.68)):0,lateralJump=mode==='erne'?side*jump*1.2:0,rootOffset=animationRootOffset(mode,phase,travelSide);
 const neck=project({x:0,y:23+bob+crouch-jump*3.2,z:forwardLean}),hips={x:24+mirror*lean*.45+weightShift+lateralJump,y:41+bob+crouch*.45-jump*3.2};
 let feet=mode==='run'?[{x:19+stride*4*travelSide,y:59-Math.max(0,stride)*5},{x:29-stride*4*travelSide,y:59-Math.max(0,-stride)*5}]:[
  {x:19-stance-stride*4,y:59-Math.max(0,stride)*2-Math.max(0,weightShift)*.9},
  {x:29+stance+stride*4,y:59-Math.max(0,-stride)*2-Math.max(0,-weightShift)*.9}
 ];
 // A poach is a short netward step-and-block; a slide is a low lateral
 // reach with a planted lead shoe and a long trailing leg. Fade both out
 // before recovery instead of keeping locomotion cycling through impact.
 if(mode==='poachLunge'){
  const lead=travelSide<0?0:1,trail=1-lead;
  feet[lead]={x:feet[lead].x+travelSide*load*2,y:feet[lead].y-load*3};
  feet[trail]={x:feet[trail].x-travelSide*load,y:feet[trail].y+load};
  hips.x+=travelSide*load*1.5;hips.y+=load*.8;
 }
 if(mode==='slideReturn'){
  const lead=travelSide<0?0:1,trail=1-lead;
  feet[lead]={x:24+travelSide*(8+load*4),y:59};
  feet[trail]={x:24-travelSide*(5+load*3),y:59-load*1.5};
  hips.x+=travelSide*load*2;hips.y+=load*3;
 }
 if(mode==='splitStep')feet=feet.map(foot=>({...foot,y:foot.y-load*.8}));
 if(mode==='erne')feet=feet.map((foot,index)=>({x:foot.x+(index?1:-1)*side*jump*2,y:foot.y-jump*(index?7.2:5.6)}));
 const legs=feet.map((f,i)=>{const hip={x:hips.x+(i?4:-4),y:hips.y};return [hip,jointBetween(hip,f,9,9,i?-1:1),f]});
 return {mode,phase,view,hips,neck,feet,arms,arms3,legs,paddle,hand,angle,twoHanded,bob:bob+crouch,gripSide,weightShift,jump,rootOffset,reachLimited:length(correction)>.01};
}
export function animationRootOffset(mode,phase,side=1){
 if(mode!=='erne')return 0;
 const p=clamp(phase);
 if(p<.52)return side*lerp(0,15,p/.52);
 if(p<.9)return side*15;
 return side*lerp(15,0,(p-.9)/.1);
}
export function characterPaddleAnchor(options={}){return sampleCharacterPose(options).paddle}

// Integer scan conversion: no antialiasing, rotated sprites or ghost limbs.
function polygon(c,points,color){
 // Rasterize slopes and curves on a denser pixel grid. The context is scaled
 // by the same density, so fill commands still map to one physical pixel.
 const d=PIXEL_DENSITY,scaled=points.map(p=>({x:p.x*d,y:p.y*d}));
 c.fillStyle=color;
 const low=Math.floor(Math.min(...scaled.map(p=>p.y))),high=Math.ceil(Math.max(...scaled.map(p=>p.y)));
 for(let sy=low;sy<high;sy++){
  const cuts=[];
  for(let i=0;i<scaled.length;i++){
   const a=scaled[i],b=scaled[(i+1)%scaled.length];
   if((a.y<=sy+.5&&b.y>sy+.5)||(b.y<=sy+.5&&a.y>sy+.5))cuts.push(a.x+(sy+.5-a.y)*(b.x-a.x)/(b.y-a.y));
  }
  cuts.sort((a,b)=>a-b);
  for(let i=0;i+1<cuts.length;i+=2)c.fillRect(cuts[i]/d,sy/d,Math.max(1,cuts[i+1]-cuts[i])/d,1/d);
 }
}
const poly=(c,coords,color)=>polygon(c,coords.map(([x,y])=>({x,y})),color);
function segment(c,a,b,width,color){const d=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/d*width/2,ny=(b.x-a.x)/d*width/2;polygon(c,[{x:a.x+nx,y:a.y+ny},{x:b.x+nx,y:b.y+ny},{x:b.x-nx,y:b.y-ny},{x:a.x-nx,y:a.y-ny}],color);c.fillStyle=color;for(const p of [a,b])c.fillRect(Math.round(p.x-width/2),Math.round(p.y-width/2),Math.round(width),Math.round(width))}
function taperedSegment(c,a,b,startWidth,endWidth,color){
 const d=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;
 polygon(c,[{x:a.x+nx*startWidth/2,y:a.y+ny*startWidth/2},{x:b.x+nx*endWidth/2,y:b.y+ny*endWidth/2},{x:b.x-nx*endWidth/2,y:b.y-ny*endWidth/2},{x:a.x-nx*startWidth/2,y:a.y-ny*startWidth/2}],color);
}
const PADDLE_OUTLINES=Object.freeze({
 wide:Object.freeze([[-4.5,-5],[3.5,-5],[5,-3],[5,2.5],[3.5,4.5],[-3.5,4.5],[-5,2.5],[-5,-3]]),
 elongated:Object.freeze([[-2.4,-8],[2.4,-8],[3.5,-6],[3.5,2],[2.4,4.5],[-2.4,4.5],[-3.5,2],[-3.5,-6]]),
 hybrid:Object.freeze([[-3,-6],[2,-6],[4,-4],[4,3],[2,5],[-2,5],[-4,3],[-4,-4]])
});
export function paddleOutline(shapeId='hybrid'){return PADDLE_OUTLINES[shapeId]??PADDLE_OUTLINES.hybrid}
let buffer;
export function drawPixelCharacter(target,{appearance={},characterId='',mode='idle',frame=0,phase=0,x=0,y=0,width=96,height=128,view='near',side=1,travelSide=side,alignTo=null,alignStrength=0,contactDepth=null,moving=false,paddleShape='hybrid',lighting='classic'}={}){
 buffer??=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(CHARACTER_BUFFER.width,CHARACTER_BUFFER.height):Object.assign(document.createElement('canvas'),CHARACTER_BUFFER);
 const c=buffer.getContext('2d'),colors=appearancePalette(appearance),female=appearance.body==='female';
 const identitySeed=[...String(characterId||appearance.hairColor)].reduce((sum,char)=>sum+char.charCodeAt(0),0),identityStyle=identitySeed%4,torsoSpread=(identitySeed%3)*.45;
 const rootOffset=animationRootOffset(mode,phase,travelSide),contact=alignTo?{x:(alignTo.x-x)*48/width-rootOffset,y:(alignTo.y-y)*64/height}:null;
 const pose=sampleCharacterPose({mode,phase,frame,view,side,travelSide,contact,contactWeight:alignStrength,contactDepth,moving});
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,CHARACTER_BUFFER.width,CHARACTER_BUFFER.height);c.save();c.scale(PIXEL_DENSITY,PIXEL_DENSITY);c.translate(24+rootOffset,16);
 const {hips,neck,bob,arms,legs}=pose;
 const waist=hips.y-2,top=neck.y;
 for(const [hip,knee,foot] of legs){taperedSegment(c,hip,knee,2.9,6,colors.outline);segment(c,knee,foot,5,colors.outline);taperedSegment(c,hip,knee,1.7,4,colors.skinDark);segment(c,knee,foot,3,colors.skin);segment(c,{x:foot.x,y:foot.y-3.5},foot,4,colors.sock);segment(c,{x:foot.x,y:foot.y-2.5},foot,4,colors.shoe);poly(c,[[foot.x-3,foot.y-1],[foot.x+2,foot.y-1],[foot.x+4,foot.y+1],[foot.x+4,foot.y+3],[foot.x-3,foot.y+3]],colors.outline);c.fillStyle=colors.shoe;c.fillRect(Math.round(foot.x-2),Math.round(foot.y),5,2);c.fillStyle=colors.accent;c.fillRect(Math.round(foot.x-1),Math.round(foot.y-3),3,1)}
 function armPart(index,part){
  const a=arms[index][part],d=arms[index][part+1];
  segment(c,a,d,part?4:5,colors.outline);segment(c,a,d,part?2:3,part?colors.skin:colors.skinDark);
  if(!female&&part===0){const sleeve=point(a,d,.46);segment(c,a,sleeve,5,colors.shirtDark);segment(c,a,sleeve,3,colors.shirt)}
  if(part===1){c.fillStyle=colors.skinLight;c.fillRect(Math.round(d.x-1),Math.round(d.y-1),2,2);c.fillStyle=colors.accent;c.fillRect(Math.round(d.x-2),Math.round(d.y+1),3,2)}
 }
 const {paddle:p,angle,hand}=pose,rot=([a,b])=>({x:p.x+a*Math.cos(angle)-b*Math.sin(angle),y:p.y+a*Math.sin(angle)+b*Math.cos(angle)});
 function drawPaddle(){
  segment(c,rot([0,4]),hand,3,colors.outline);segment(c,rot([0,5]),hand,1,colors.grip);c.fillStyle=colors.outline;c.fillRect(Math.round(rot([0,6]).x),Math.round(rot([0,6]).y),1,1);
  const shape=paddleOutline(paddleShape);
  polygon(c,shape.map(rot),colors.outline);polygon(c,shape.map(([a,b])=>rot([a*.83,b*.86])),colors.paddle);polygon(c,shape.map(([a,b])=>rot([a*.58,b*.62])),colors.paddleInterior);
 }
 const parts=arms.flatMap((chain,index)=>[0,1].map(part=>({index,part,depth:(chain[part].depth+chain[part+1].depth)/2}))).sort((a,b)=>a.depth-b.depth);
 for(const part of parts.filter(p=>p.depth<neck.depth))armPart(part.index,part.part);
 if(p.depth<neck.depth)drawPaddle();
 poly(c,[[neck.x-5,top],[neck.x+5,top],[neck.x+8,top+4],[hips.x+5+torsoSpread,waist],[hips.x-5-torsoSpread,waist],[neck.x-8,top+4]],colors.outline);
 poly(c,[[neck.x-4,top+1],[neck.x+4,top+1],[neck.x+6,top+4],[hips.x+4+torsoSpread,waist],[hips.x-4-torsoSpread,waist],[neck.x-6,top+4]],colors.shirt);
 c.fillStyle=colors.accent;if(view==='near')c.fillRect(Math.round(neck.x-3),Math.round(top+5),6,1);else{const badge=identityStyle%2?1:2;c.fillRect(Math.round(neck.x-badge),Math.round(top+7),badge*2,3)}
 poly(c,[[neck.x-5,top+3],[neck.x-2,top+3],[hips.x-2,waist-1],[hips.x-4,waist-1]],colors.shirtLight);
 poly(c,[[neck.x+4,top+3],[neck.x+6,top+4],[hips.x+4,waist],[hips.x+1,waist]],colors.shirtDark);
 c.fillStyle=colors.shoe;c.fillRect(Math.round(hips.x-4),Math.round(waist-1),8,1);
 if(female){poly(c,[[hips.x-5,waist],[hips.x+5,waist],[hips.x+9,waist+8],[hips.x-9,waist+8]],colors.outline);poly(c,[[hips.x-4,waist],[hips.x+4,waist],[hips.x+7,waist+7],[hips.x-7,waist+7]],colors.shirt);
 const fold=appearance.shirtColor==='white'?'#8999ac':colors.shirtDark;
 const highlight=appearance.shirtColor==='white'?'#fffdf5':colors.shirtLight;
 for(const offset of [-4,0,4]){
  poly(c,[[hips.x+offset*.65,waist+1],[hips.x+offset*.65+1,waist+1],[hips.x+offset+1.2,waist+7],[hips.x+offset-.5,waist+7]],fold);
  segment(c,{x:hips.x+offset*.65-1,y:waist+2},{x:hips.x+offset-1,y:waist+6},.65,highlight);
 }
 segment(c,{x:hips.x-6.8,y:waist+7},{x:hips.x+6.8,y:waist+7},.8,fold);
 segment(c,{x:hips.x-4.5,y:waist+.5},{x:hips.x+4.5,y:waist+.5},1,fold)}
 else {poly(c,[[hips.x-6,waist],[hips.x+6,waist],[hips.x+7,waist+8],[hips.x+1,waist+8],[hips.x,waist+4],[hips.x-1,waist+8],[hips.x-7,waist+8]],colors.outline);c.fillStyle=colors.bottom;c.fillRect(Math.round(hips.x-5),Math.round(waist+1),5,6);c.fillRect(Math.round(hips.x+1),Math.round(waist+1),5,6)}
 c.fillStyle=colors.skinDark;c.fillRect(Math.round(neck.x-2),Math.round(21+bob),4,4);
 const style=identityStyle,hx=neck.x+(view==='far'?(style-1.5)*.35:0),hy=neck.y-8;
 poly(c,[[hx-4,hy-7],[hx+3,hy-7],[hx+6,hy-4],[hx+6,hy+3],[hx+3,hy+7],[hx-3,hy+7],[hx-6,hy+3],[hx-6,hy-4]],colors.outline);
 poly(c,[[hx-3,hy-5],[hx+3,hy-5],[hx+5,hy-2],[hx+4,hy+4],[hx+2,hy+6],[hx-2,hy+6],[hx-4,hy+3],[hx-5,hy-2]],colors.skin);
 c.fillStyle=colors.skinLight;c.fillRect(Math.round(hx-3),Math.round(hy-1),3,4);c.fillStyle=colors.skinDark;c.fillRect(Math.round(hx+2),Math.round(hy+2),1,2);
 poly(c,[[hx-5,hy-3],[hx-3,hy-6],[hx+3,hy-6],[hx+5,hy-3],[hx+4,hy],[hx+1,hy-2],[hx-2,hy-1],[hx-4,hy+1]],colors.hair);
 c.fillStyle=colors.hairLight;c.fillRect(Math.round(hx-2),Math.round(hy-5),4,1);
 if(style===1){c.fillStyle=colors.hair;c.fillRect(Math.round(hx-5),Math.round(hy-4),2,3)}else if(style===2){c.fillStyle=colors.hairLight;c.fillRect(Math.round(hx-4),Math.round(hy-6),4,1)}
 if(view==='near')poly(c,[[hx-5,hy-2],[hx+5,hy-2],[hx+4,hy+4],[hx+2,hy+5],[hx-3,hy+4]],colors.hair);
 else{c.fillStyle=colors.outline;c.fillRect(Math.round(hx-3),Math.round(hy+1),1,2);c.fillRect(Math.round(hx+2),Math.round(hy+1),1,2);c.fillStyle=colors.hairLight;c.fillRect(Math.round(hx-1),Math.round(hy+3),3,1);c.fillStyle=colors.skinDark;c.fillRect(Math.round(hx),Math.round(hy+4),2,1)}
 if(female){const tail=8+(style%2),sway=Math.sin((Number(frame)||0)*.35)*1.5;poly(c,[[hx+4,hy-3],[hx+tail,hy-1],[hx+tail+sway,hy+7],[hx+5,hy+9],[hx+5,hy+2]],colors.hair);c.fillStyle=colors.accent;c.fillRect(Math.round(hx+5),Math.round(hy),2,2);if(style===3){c.fillStyle=colors.outline;c.fillRect(Math.round(hx-5),Math.round(hy-1),10,1)}}
 else if(style===3){c.fillStyle=colors.accent;c.fillRect(Math.round(hx-5),Math.round(hy-2),10,1);c.fillRect(Math.round(hx+4),Math.round(hy-2),1,3)}
 for(const part of parts.filter(p=>p.depth>=neck.depth))armPart(part.index,part.part);
 if(p.depth>=neck.depth)drawPaddle();
 c.restore();
 // Preserve the exact pixel silhouette. The light pass is clipped to existing
 // sprite pixels, so no rectangular background is introduced.
 if(lighting==='relief'||lighting==='depth'){
  const depth=lighting==='depth',light=c.createLinearGradient(0,0,CHARACTER_BUFFER.width,CHARACTER_BUFFER.height);
  light.addColorStop(0,'rgba(255,248,220,.055)');light.addColorStop(.4,'rgba(255,255,255,0)');light.addColorStop(1,depth?'rgba(8,22,36,.31)':'rgba(18,32,48,.17)');
  c.save();c.globalCompositeOperation='source-atop';c.fillStyle=light;c.fillRect(0,0,CHARACTER_BUFFER.width,CHARACTER_BUFFER.height);
  if(depth){const rim=c.createLinearGradient(0,0,CHARACTER_BUFFER.width,0);rim.addColorStop(0,'rgba(207,255,232,.075)');rim.addColorStop(.38,'rgba(207,255,232,0)');rim.addColorStop(1,'rgba(9,20,34,.8)');c.fillStyle=rim;c.fillRect(0,0,CHARACTER_BUFFER.width,CHARACTER_BUFFER.height)}
  c.restore();
 }
 target.save();target.imageSmoothingEnabled=true;target.imageSmoothingQuality='high';
 target.drawImage(buffer,x-width/2,y-height/4,width*2,height*1.5);target.restore();return true;
}
