import {appearancePalette,sampleCharacterPose} from './pixel-character.js';

const point=(p,{cx,top,width,height})=>({x:cx+(p.x-24)/48*width,y:top+p.y/64*height,depth:p.depth??0});
const pathPoint=(p,frame)=>({x:frame.cx+(p.x-24)/48*frame.width,y:frame.top+p.y/64*frame.height});
const colorGradient=(c,frame,colors,vertical=false)=>{
 const {cx,top,width,height}=frame,g=c.createLinearGradient(cx-width*.38,top,cx+width*.38,vertical?top+height:top);
 g.addColorStop(0,colors[0]);g.addColorStop(.44,colors[1]);g.addColorStop(1,colors[2]);return g;
};
function smoothLine(c,a,b,width,fill,outline,scale){
 c.lineCap='round';c.lineJoin='round';
 c.strokeStyle=outline;c.lineWidth=width+1.8*scale;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
 c.strokeStyle=fill;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
}
function smoothChain(c,chain,width,fill,outline,scale){
 smoothLine(c,chain[0],chain[1],width,fill,outline,scale);
 smoothLine(c,chain[1],chain[2],width*.88,fill,outline,scale);
}
function bodyShape(c,pose,frame,colors,volume,female){
 const {cx,top,width,height}=frame,scale=width/48;
 const neck=pathPoint(pose.neck,frame),hipY=top+(pose.hips.y-2)/64*height;
 const shoulder=top+(pose.neck.y+3)/64*height,waist=top+(pose.hips.y-2)/64*height;
 const x=neck.x,sw=7*scale,ww=4.5*scale;
 const shirt=volume?colorGradient(c,frame,[colors.shirtDark,colors.shirt,colors.shirtLight]):colors.shirt;
 c.beginPath();c.moveTo(x-sw,shoulder+2*scale);c.quadraticCurveTo(x-sw*.35,shoulder-2*scale,x+sw*.1,shoulder-1*scale);c.quadraticCurveTo(x+sw*.8,shoulder+1*scale,x+sw,shoulder+3*scale);c.quadraticCurveTo(x+ww*.75,waist-5*scale,x+ww,waist);c.quadraticCurveTo(x,waist+1.5*scale,x-ww,waist);c.quadraticCurveTo(x-ww*.75,waist-5*scale,x-sw,shoulder+2*scale);c.closePath();
 c.fillStyle=shirt;c.strokeStyle=colors.outline;c.lineWidth=2.15*scale;c.fill();c.stroke();
 if(volume){
  c.beginPath();c.ellipse(x-sw*.38,shoulder+7*scale,1.55*scale,4.2*scale,-.16,0,Math.PI*2);c.fillStyle='#ffffff32';c.fill();
  c.beginPath();c.moveTo(x+sw*.35,shoulder+2*scale);c.quadraticCurveTo(x+ww*.72,waist-6*scale,x+ww,waist);c.lineTo(x+ww*.45,waist);c.quadraticCurveTo(x+ww*.2,waist-6*scale,x+sw*.12,shoulder+3*scale);c.closePath();c.fillStyle='#00000052';c.fill();
 }
 if(female){
  const hem=waist+9*scale;
  c.beginPath();c.moveTo(x-5*scale,waist);c.quadraticCurveTo(x-7*scale,waist+4*scale,x-8.5*scale,hem);c.quadraticCurveTo(x,hem+2*scale,x+8.5*scale,hem);c.quadraticCurveTo(x+7*scale,waist+4*scale,x+5*scale,waist);c.closePath();
  const skirt=volume?colorGradient(c,frame,[colors.shirtDark,colors.shirt,colors.shirtLight]):colors.shirt;
  c.fillStyle=skirt;c.strokeStyle=colors.outline;c.lineWidth=2.1*scale;c.fill();c.stroke();
  c.strokeStyle=colors.shoe;c.lineWidth=1.2*scale;c.beginPath();c.moveTo(x-7.5*scale,hem+1*scale);c.quadraticCurveTo(x,hem+.2*scale,x+7.8*scale,hem+1*scale);c.stroke();
  c.strokeStyle=colors.shirtDark;c.lineWidth=.65*scale;for(const dx of [-3.7,0,3.7]){c.beginPath();c.moveTo(x+dx*.5,waist+2*scale);c.lineTo(x+dx,hem);c.stroke()}
 }else{
  const shortBottom=waist+7*scale;
  c.beginPath();c.moveTo(x-5*scale,waist);c.lineTo(x+5*scale,waist);c.quadraticCurveTo(x+6.8*scale,waist+4*scale,x+6*scale,shortBottom);c.quadraticCurveTo(x+1.2*scale,shortBottom-1.7*scale,x+.3*scale,shortBottom);c.quadraticCurveTo(x-1.2*scale,shortBottom-1.7*scale,x-6*scale,shortBottom);c.quadraticCurveTo(x-6.8*scale,waist+4*scale,x-5*scale,waist);c.closePath();
  c.fillStyle=volume?colorGradient(c,frame,[colors.bottomDark,colors.bottom,colors.shirtDark]):colors.bottom;c.strokeStyle=colors.outline;c.lineWidth=2*scale;c.fill();c.stroke();
  c.strokeStyle=colors.shoe;c.lineWidth=1*scale;c.beginPath();c.moveTo(x*.999-4.5*scale,waist+1*scale);c.lineTo(x+4.5*scale,waist+1*scale);c.stroke();
 }
}
function headAndHair(c,pose,frame,colors,volume,female,view){
 const {cx,top,width,height}=frame,scale=width/48,hx=cx+(pose.neck.x-24)/48*width,hy=top+(pose.neck.y-9)/64*height;
 const skin=volume?colorGradient(c,frame,[colors.skinDark,colors.skin,colors.skinLight]):colors.skin;
 c.beginPath();c.ellipse(hx,hy,6.2*scale,7.6*scale,0,0,Math.PI*2);c.fillStyle=colors.outline;c.fill();
 c.beginPath();c.ellipse(hx,hy+.3*scale,4.9*scale,6.45*scale,0,0,Math.PI*2);c.fillStyle=skin;c.fill();
 if(view==='far'){
  c.fillStyle=colors.outline;c.beginPath();c.ellipse(hx-1.7*scale,hy+.1*scale,.7*scale,1.15*scale,0,0,Math.PI*2);c.ellipse(hx+1.9*scale,hy+.1*scale,.7*scale,1.15*scale,0,0,Math.PI*2);c.fill();
  c.strokeStyle=colors.skinDark;c.lineWidth=.65*scale;c.beginPath();c.arc(hx,hy+2*scale,1.15*scale,.1,Math.PI-.1);c.stroke();
 }else{c.fillStyle=colors.hair;c.beginPath();c.ellipse(hx,hy-1.3*scale,4.5*scale,3.65*scale,0,Math.PI,Math.PI*2);c.fill()}
 const hair=volume?colorGradient(c,frame,[colors.hair,colors.hairLight,colors.hair]):colors.hair;
 c.fillStyle=hair;c.strokeStyle=colors.outline;c.lineWidth=1.6*scale;
 c.beginPath();c.moveTo(hx-5.4*scale,hy-1.6*scale);c.quadraticCurveTo(hx-4.7*scale,hy-7.3*scale,hx+.4*scale,hy-7.7*scale);c.quadraticCurveTo(hx+5.2*scale,hy-6.7*scale,hx+5.7*scale,hy-1.8*scale);c.quadraticCurveTo(hx+2.5*scale,hy-4.5*scale,hx-1.2*scale,hy-3.1*scale);c.quadraticCurveTo(hx-3.7*scale,hy-1.8*scale,hx-5.4*scale,hy-1.6*scale);c.closePath();c.fill();c.stroke();
 if(female){c.strokeStyle=colors.outline;c.lineWidth=2.4*scale;c.beginPath();c.moveTo(hx+4.2*scale,hy-3*scale);c.bezierCurveTo(hx+11*scale,hy-5*scale,hx+12*scale,hy+3*scale,hx+7*scale,hy+12*scale);c.stroke();c.strokeStyle=hair;c.lineWidth=1.5*scale;c.stroke()}
}
function drawPaddle(c,pose,frame,colors,volume){
 const {width,height}=frame,scale=width/48,p=pathPoint(pose.paddle,frame),hand=pathPoint(pose.hand,frame),angle=pose.angle;
 c.save();c.translate(p.x,p.y);c.rotate(angle);
 const w=9.3*scale,h=12.4*scale,edge=volume?colorGradient(c,frame,[colors.paddle,colors.paddleLight,colors.paddle]):colors.paddle;
 const dx=hand.x-p.x,dy=hand.y-p.y,cos=Math.cos(angle),sin=Math.sin(angle);
 const grip={x:dx*cos+dy*sin,y:-dx*sin+dy*cos};
 c.beginPath();c.moveTo(0,4.6*scale);c.lineTo(grip.x,grip.y);c.strokeStyle=colors.outline;c.lineWidth=3.2*scale;c.lineCap='round';c.stroke();c.strokeStyle=colors.shoe;c.lineWidth=1.75*scale;c.stroke();
 c.fillStyle=colors.shoe;c.beginPath();c.arc(grip.x,grip.y,1.15*scale,0,Math.PI*2);c.fill();
 c.beginPath();c.roundRect(-w/2,-h/2,w,h,4*scale);c.fillStyle=edge;c.strokeStyle=colors.outline;c.lineWidth=2.3*scale;c.fill();c.stroke();
 c.beginPath();c.roundRect(-w*.35,-h*.37,w*.7,h*.72,3.1*scale);c.fillStyle=colors.paddleInterior;c.fill();
 if(volume){c.strokeStyle='#ffffff38';c.lineWidth=.7*scale;c.beginPath();c.moveTo(-w*.25,-h*.3);c.lineTo(w*.16,-h*.38);c.stroke()}
 c.restore();
}
export function drawSmoothCharacter(target,{appearance={},mode='idle',phase=0,frame=0,cx=0,top=0,width=120,height=160,view='far',style='rounded'}={}){
 const colors=appearancePalette(appearance),female=appearance.body==='female',volume=style==='volume';
 const pose=sampleCharacterPose({mode,phase,frame,view}),scope={cx,top,width,height},scale=width/48;
 target.save();target.lineCap='round';target.lineJoin='round';
 if(volume){target.fillStyle='#07161a80';target.beginPath();target.ellipse(cx,top+height*.96,width*.25,width*.055,0,0,Math.PI*2);target.fill()}
 const skin=volume?colorGradient(target,scope,[colors.skinDark,colors.skin,colors.skinLight]):colors.skin;
 for(const chain of pose.legs){
  const a=pathPoint(chain[0],scope),b=pathPoint(chain[1],scope),d=pathPoint(chain[2],scope);
  smoothLine(target,a,b,6.2*scale,colors.outline,colors.outline,scale);smoothLine(target,b,d,5.3*scale,colors.outline,colors.outline,scale);
  smoothLine(target,a,b,4.2*scale,skin,colors.outline,scale);smoothLine(target,b,d,3.6*scale,skin,colors.outline,scale);
  target.strokeStyle=colors.shoe;target.lineWidth=3.6*scale;smoothLine(target,{x:d.x-2*scale,y:d.y-2*scale},{x:d.x+3.2*scale,y:d.y-1*scale},3.8*scale,colors.shoe,colors.outline,scale*.5);
  target.fillStyle=colors.outline;target.beginPath();target.roundRect(d.x-3.8*scale,d.y-.5*scale,8.4*scale,3.2*scale,1.5*scale);target.fill();
  target.fillStyle=colors.shoe;target.beginPath();target.roundRect(d.x-3.1*scale,d.y-1*scale,7*scale,2.3*scale,1*scale);target.fill();
 }
 const armChains=pose.arms.map(chain=>chain.map(p=>pathPoint(p,scope)));
 const drawArm=(chain,back)=>{const armSkin=volume&&back?colors.skinDark:skin;smoothChain(target,chain,4.1*scale,armSkin,colors.outline,scale);if(!female){smoothLine(target,chain[0],chain[1],4.25*scale,volume?colorGradient(target,scope,[colors.shirtDark,colors.shirt,colors.shirtLight]):colors.shirt,colors.outline,scale); target.fillStyle=skin;target.beginPath();target.arc(chain[2].x,chain[2].y,1.45*scale,0,Math.PI*2);target.fill()}};
 armChains.forEach((chain,i)=>{if((pose.arms3[i][1].depth<0))drawArm(chain,true)});
 if(pose.paddle.depth<0)drawPaddle(target,pose,scope,colors,volume);
 bodyShape(target,pose,scope,colors,volume,female);
 headAndHair(target,pose,scope,colors,volume,female,view);
 armChains.forEach((chain,i)=>{if((pose.arms3[i][1].depth>=0))drawArm(chain,false)});
 if(pose.paddle.depth>=0)drawPaddle(target,pose,scope,colors,volume);
 target.restore();return true;
}
