import {CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS} from './roster.js?v=38';

// Original 48 x 64 pixel artwork. Shared joints prevent anatomy/frame drift.
// Colors belong to materials; no hue matching or sprite-sheet recoloring.
export const MOTIONS=Object.freeze(['run','shuffle','volley','forehand','backhand','forehandDink','backhandDink','forehandDrop','backhandDrop','overhead','lob','twoBackhand']);
export const CONTACT_PHASE=.52;
export const characterSpritesReady=()=>true;
export function onCharacterSpritesReady(callback){callback?.();return true}
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
const resolve=(items,id)=>items.find(item=>item.id===id)??items[0];
function shade(hex,amount){return '#'+hex.slice(1).match(/../g).map(v=>Math.round(lerp(parseInt(v,16),amount>0?255:0,Math.abs(amount))).toString(16).padStart(2,'0')).join('')}
export function appearancePalette(a={}){
 const shirt=resolve(CLOTHING_COLORS,a.shirtColor??'green').color,hair=resolve(HAIR_COLORS,a.hairColor??'brown').color,skin=resolve(SKIN_COLORS,a.skinColor??'medium').color,p=resolve(PADDLE_COLORS,a.paddleColor??'mint');
 return {outline:'#192131',shirt,shirtDark:shade(shirt,-.3),shirtLight:shade(shirt,.3),bottom:shade(shirt,-.5),bottomDark:shade(shirt,-.65),hair,hairLight:shade(hair,.22),skin,skinDark:shade(skin,-.24),skinLight:shade(skin,.15),paddle:p.edgeColor,paddleLight:p.accentColor??shade(p.edgeColor,.65),paddleInterior:'#10151d',shoe:'#f4eee0',shoeDark:'#9ba9b7'};
}
export function characterFrame(mode='idle',phase=0,frame=0){
 const row=Math.max(0,MOTIONS.indexOf(mode==='slide'?'shuffle':mode==='serve'?'lob':mode));
 return {row,col:['run','shuffle','slide'].includes(mode)?Math.abs(Math.floor(frame))%4:Math.floor(clamp(phase,0,.999)*4)};
}
// Ready, anticipation, impact, follow-through, recovery. Different arcs for
// compact dinks, lifting drops, blocks, full drives and overhead acceleration.
const paths={
 volley:[[32,29],[33,26],[37,28],[38,25],[32,29]],
 forehand:[[32,29],[40,28],[40,35],[19,23],[32,29]],
 backhand:[[32,29],[17,24],[9,34],[32,21],[32,29]],
 forehandDink:[[32,29],[33,40],[36,42],[38,34],[32,29]],
 backhandDink:[[32,29],[20,40],[13,42],[13,34],[32,29]],
 forehandDrop:[[32,29],[37,42],[39,39],[30,22],[32,29]],
 backhandDrop:[[32,29],[16,42],[10,39],[23,22],[32,29]],
 overhead:[[32,29],[18,8],[34,7],[40,39],[32,29]],
 lob:[[32,29],[29,44],[36,39],[35,12],[32,29]],
 serve:[[32,29],[36,43],[37,42],[23,22],[32,29]],
 twoBackhand:[[32,29],[16,25],[9,33],[34,18],[32,29]]
};
const times=[0,.28,CONTACT_PHASE,.78,1];
function samplePath(path,phase){
 let i=0;while(i<3&&phase>times[i+1])i++;
 const span=times[i+1]-times[i],t=clamp((phase-times[i])/span),t2=t*t,t3=t2*t;
 const tangent=(k,axis)=>k===0||k===4?0:(path[k+1][axis]-path[k-1][axis])/(times[k+1]-times[k-1]);
 const sample=axis=>(2*t3-3*t2+1)*path[i][axis]+(t3-2*t2+t)*span*tangent(i,axis)+(-2*t3+3*t2)*path[i+1][axis]+(t3-t2)*span*tangent(i+1,axis);
 // Hermite tangents carry velocity through impact instead of stopping at each pose.
 return {x:sample(0),y:sample(1)};
}
export function jointBetween(a,b,l1,l2,bend=1){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),reach=Math.min(d,l1+l2-.001),along=(l1*l1-l2*l2+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,l1*l1-along*along));
 return {x:a.x+dx/d*along-dy/d*h*bend,y:a.y+dy/d*along+dx/d*h*bend};
}
export function sampleCharacterPose({mode='idle',phase=0,frame=0,view='far',side=1,contact=null,contactWeight=0,moving=false}={}){
 phase=clamp(phase);const action=!!paths[mode],gait=frame*Math.PI/2,stepping=['run','shuffle','slide'].includes(mode)||moving;
 const stride=stepping?Math.sin(gait):0,bob=stepping?Math.cos(gait*2)*.6:0,weight=action?Math.sin(phase*Math.PI)*1.2:0;
 const hips={x:24+weight*(mode.startsWith('back')||mode==='twoBackhand'?-1:1),y:41+bob},neck={x:24+weight*.5,y:23+bob};
 const feet=mode==='run'?[{x:19+stride*2,y:59-stride*3},{x:29-stride*2,y:59+stride*3}]:[{x:19-stride*4,y:59-Math.max(0,stride)*2},{x:29+stride*4,y:59-Math.max(0,-stride)*2}];
 let paddle=action?samplePath(paths[mode],phase):{x:33+stride*.7,y:30+bob};
 if(side<0)paddle.x=48-paddle.x;
 if(contact)paddle=point(paddle,contact,clamp(contactWeight));
 const angle=mode==='overhead'?-.2+.9*Math.sin((phase-.52)*Math.PI)*Math.sin(phase*Math.PI):mode==='lob'?-.3:mode.startsWith('back')||mode==='twoBackhand'?.35:-.2;
 const hand={x:paddle.x-Math.sin(angle)*8,y:paddle.y+Math.cos(angle)*8};
 const twoHanded=mode==='twoBackhand',shoulders=[{x:neck.x-6,y:26+bob},{x:neck.x+6,y:26+bob}];
 const gripSide=side<0?0:1,freeSide=1-gripSide,hands=[];
 hands[gripSide]=hand;hands[freeSide]=twoHanded?{x:hand.x-1,y:hand.y+2}:{x:shoulders[freeSide].x+(freeSide?1:-1)*3-stride*2,y:39+bob};
 const arms=shoulders.map((s,i)=>[s,jointBetween(s,hands[i],10,10,i?1:-1),hands[i]]);
 const legs=feet.map((f,i)=>{const hip={x:hips.x+(i?4:-4),y:hips.y};return [hip,jointBetween(hip,f,9,9,i?-1:1),f]});
 return {mode,phase,view,hips,neck,feet,arms,legs,paddle,hand,angle,twoHanded,bob};
}
export function characterPaddleAnchor(options={}){return sampleCharacterPose(options).paddle}

// Integer scan conversion: no antialiasing, rotated sprites or ghost limbs.
function polygon(c,points,color){c.fillStyle=color;const low=Math.floor(Math.min(...points.map(p=>p.y))),high=Math.ceil(Math.max(...points.map(p=>p.y)));for(let y=low;y<high;y++){const cuts=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a.y<=y+.5&&b.y>y+.5)||(b.y<=y+.5&&a.y>y+.5))cuts.push(a.x+(y+.5-a.y)*(b.x-a.x)/(b.y-a.y))}cuts.sort((a,b)=>a-b);for(let i=0;i+1<cuts.length;i+=2)c.fillRect(Math.round(cuts[i]),y,Math.max(1,Math.round(cuts[i+1])-Math.round(cuts[i])),1)}}
const poly=(c,coords,color)=>polygon(c,coords.map(([x,y])=>({x,y})),color);
function segment(c,a,b,width,color){const d=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/d*width/2,ny=(b.x-a.x)/d*width/2;polygon(c,[{x:a.x+nx,y:a.y+ny},{x:b.x+nx,y:b.y+ny},{x:b.x-nx,y:b.y-ny},{x:a.x-nx,y:a.y-ny}],color);c.fillStyle=color;for(const p of [a,b])c.fillRect(Math.round(p.x-width/2),Math.round(p.y-width/2),Math.round(width),Math.round(width))}
let buffer;
export function drawPixelCharacter(target,{appearance={},mode='idle',frame=0,phase=0,x=0,y=0,width=96,height=128,view='near',side=1,alignTo=null,alignStrength=0,moving=false}={}){
 buffer??=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(96,96):Object.assign(document.createElement('canvas'),{width:96,height:96});
 const c=buffer.getContext('2d'),colors=appearancePalette(appearance),female=appearance.body==='female';
 const contact=alignTo?{x:(alignTo.x-x)*48/width,y:(alignTo.y-y)*64/height}:null;
 const pose=sampleCharacterPose({mode,phase,frame,view,side,contact,contactWeight:alignStrength,moving});
 c.clearRect(0,0,96,96);c.save();c.translate(24,16);
 const {hips,neck,bob,arms,legs}=pose;
 for(const [hip,knee,foot] of legs){segment(c,hip,knee,6,colors.outline);segment(c,knee,foot,5,colors.outline);segment(c,hip,knee,4,colors.skinDark);segment(c,knee,foot,3,colors.skin);segment(c,{x:foot.x,y:foot.y-4},foot,4,colors.shoe);poly(c,[[foot.x-3,foot.y-1],[foot.x+2,foot.y-1],[foot.x+4,foot.y+1],[foot.x+4,foot.y+3],[foot.x-3,foot.y+3]],colors.outline);c.fillStyle=colors.shoe;c.fillRect(Math.round(foot.x-2),Math.round(foot.y),5,2)}
 function arm(index){const [a,b,d]=arms[index];segment(c,a,b,6,colors.outline);segment(c,b,d,5,colors.outline);segment(c,a,b,4,colors.skinDark);segment(c,b,d,3,colors.skin);if(!female){const sleeve=point(a,b,.52);segment(c,a,sleeve,6,colors.shirtDark);segment(c,a,sleeve,4,colors.shirt)}c.fillStyle=colors.skinLight;c.fillRect(Math.round(d.x-1),Math.round(d.y-1),2,2)}
 arm(0);
 poly(c,[[neck.x-5,23+bob],[neck.x+5,23+bob],[neck.x+8,27+bob],[hips.x+5,39+bob],[hips.x-5,39+bob],[neck.x-8,27+bob]],colors.outline);
 poly(c,[[neck.x-4,24+bob],[neck.x+4,24+bob],[neck.x+6,27+bob],[hips.x+4,39+bob],[hips.x-4,39+bob],[neck.x-6,27+bob]],colors.shirt);
 poly(c,[[neck.x-5,26+bob],[neck.x-2,26+bob],[hips.x-2,38+bob],[hips.x-4,38+bob]],colors.shirtLight);
 poly(c,[[neck.x+4,26+bob],[neck.x+6,27+bob],[hips.x+4,39+bob],[hips.x+1,39+bob]],colors.shirtDark);
 c.fillStyle=colors.shoe;c.fillRect(Math.round(hips.x-4),Math.round(38+bob),8,1);
 if(female){poly(c,[[hips.x-5,39+bob],[hips.x+5,39+bob],[hips.x+9,47+bob],[hips.x-9,47+bob]],colors.outline);poly(c,[[hips.x-4,39+bob],[hips.x+4,39+bob],[hips.x+7,46+bob],[hips.x-7,46+bob]],colors.shirt);for(const offset of [-4,0,4])segment(c,{x:hips.x+offset*.6,y:41+bob},{x:hips.x+offset,y:46+bob},1,colors.shirtDark)}
 else {poly(c,[[hips.x-6,39+bob],[hips.x+6,39+bob],[hips.x+7,47+bob],[hips.x+1,47+bob],[hips.x,43+bob],[hips.x-1,47+bob],[hips.x-7,47+bob]],colors.outline);c.fillStyle=colors.bottom;c.fillRect(Math.round(hips.x-5),Math.round(40+bob),5,6);c.fillRect(Math.round(hips.x+1),Math.round(40+bob),5,6)}
 c.fillStyle=colors.skinDark;c.fillRect(Math.round(neck.x-2),Math.round(21+bob),4,4);
 const hx=neck.x,hy=15+bob;
 poly(c,[[hx-4,hy-7],[hx+3,hy-7],[hx+6,hy-4],[hx+6,hy+3],[hx+3,hy+7],[hx-3,hy+7],[hx-6,hy+3],[hx-6,hy-4]],colors.outline);
 poly(c,[[hx-3,hy-5],[hx+3,hy-5],[hx+5,hy-2],[hx+4,hy+4],[hx+2,hy+6],[hx-2,hy+6],[hx-4,hy+3],[hx-5,hy-2]],colors.skin);
 c.fillStyle=colors.skinLight;c.fillRect(Math.round(hx-3),Math.round(hy-1),3,4);
 poly(c,[[hx-5,hy-3],[hx-3,hy-6],[hx+3,hy-6],[hx+5,hy-3],[hx+4,hy],[hx+1,hy-2],[hx-2,hy-1],[hx-4,hy+1]],colors.hair);
 c.fillStyle=colors.hairLight;c.fillRect(Math.round(hx-2),Math.round(hy-5),4,1);
 if(view==='near')poly(c,[[hx-5,hy-2],[hx+5,hy-2],[hx+4,hy+4],[hx+2,hy+5],[hx-3,hy+4]],colors.hair);
 else{c.fillStyle=colors.outline;c.fillRect(Math.round(hx-3),Math.round(hy+1),1,2);c.fillRect(Math.round(hx+2),Math.round(hy+1),1,2);c.fillStyle=colors.skinDark;c.fillRect(Math.round(hx),Math.round(hy+4),2,1)}
 if(female){poly(c,[[hx+4,hy-3],[hx+8,hy-1],[hx+8+Math.sin(frame)*1.5,hy+7],[hx+5,hy+9],[hx+5,hy+2]],colors.hair);c.fillStyle=colors.shirtLight;c.fillRect(Math.round(hx+5),Math.round(hy),2,2)}
 arm(1);
 const {paddle:p,angle,hand}=pose,rot=([a,b])=>({x:p.x+a*Math.cos(angle)-b*Math.sin(angle),y:p.y+a*Math.sin(angle)+b*Math.cos(angle)});
 segment(c,rot([0,4]),hand,3,colors.outline);segment(c,rot([0,5]),hand,1,colors.shoeDark);
 const shape=[[-3,-6],[2,-6],[4,-4],[4,3],[2,5],[-2,5],[-4,3],[-4,-4]];
 polygon(c,shape.map(rot),colors.outline);polygon(c,shape.map(([a,b])=>rot([a*.83,b*.86])),colors.paddle);polygon(c,shape.map(([a,b])=>rot([a*.58,b*.62])),colors.paddleInterior);
 segment(c,rot([-2,-5]),rot([1,-5]),1,colors.paddleLight);
 c.restore();target.save();target.imageSmoothingEnabled=false;
 target.drawImage(buffer,x-width/2,y-height/4,width*2,height*1.5);target.restore();return true;
}
