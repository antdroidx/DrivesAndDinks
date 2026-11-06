import {sampleCharacterPose} from './pixel-character.js?v=163';
import {conceptPoint,thighGarment,skirtGarment} from './character-concepts.js?v=163';
import {legDimensions,plantFeet} from './detailed-character.js?v=163';

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
 const skin=skinPalette(d.skin),hexes=[...Object.values(skin),d.shirt,tone(d.shirt,-.2),tone(d.shirt,-.48),tone(d.shirt,.13),d.hairColor,tone(d.hairColor,-.25),tone(d.hairColor,.18),d.trim,tone(d.trim,-.12),'#4c453d','#483f35','#1c2430','#e5dfce','#fff3df',tone(d.trim,-.55),tone('#e5dfce',-.15)];
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
function hairTail(c,d,x,y,phase,near,ink){
 const sway=Math.sin(phase*Math.PI*2)*1.3;
 function tail(sign){c.beginPath();c.moveTo(x+sign*4,y-3);c.bezierCurveTo(x+sign*(14+sway),y-9,x+sign*(17+sway),y+5,x+sign*10,y+13);c.quadraticCurveTo(x+sign*13,y+3,x+sign*6,y+3);c.closePath();c.fillStyle=d.hairColor;c.fill();c.strokeStyle=ink;c.lineWidth=.4;c.stroke();line(c,[point(x+sign*7,y-1),point(x+sign*(12+sway),y+3),point(x+sign*11,y+8)],tone(d.hairColor,.13),.6);oval(c,x+sign*5,y-2,1.2,1,d.trim)}
 if(d.hair==='ponytail')tail(near?-1:1);if(d.hair==='twinTails'){tail(-1);tail(1)}
 if(d.hair==='braid'){for(let i=0;i<8;i++){const bx=x+5+Math.sin(i*.65+phase*3)*.5;oval(c,bx,y+2+i*1.5,1.5-i*.07,1.3,tone(d.hairColor,i%2?-.12:.08))}oval(c,x+5,y+14,1,.7,d.trim)}
 if(['bob','waves'].includes(d.hair)){
  for(const sign of [-1,1]){c.beginPath();c.moveTo(x+sign*4,y-4);c.quadraticCurveTo(x+sign*8,y-1,x+sign*(d.hair==='waves'?7.8:6.3),y+7);c.lineTo(x+sign*3.8,y+5.8);c.closePath();c.fillStyle=d.hairColor;c.fill();c.strokeStyle=ink;c.lineWidth=.4;c.stroke()}
 }
}
function expressionShape(emotion){
 const focused=emotion==='focus'||emotion==='effort',effort=emotion==='effort',reaction=emotion==='reaction',smile=emotion==='smile';
 const eye={width:.8,height:1.06,pupil:.55,brow:.15,low:.06};
 if(focused){eye.width=effort?.7:.85;eye.height=effort?1.2:1.06}
 if(reaction){eye.width=1.04;eye.height=1.34;eye.low=-.18}
 if(smile){eye.width=.76;eye.height=.72;eye.low=.16}
 return eye;
}
function animeHead(c,d,n,near,warm,phase,ink,emotion){
 const {x,y}=animeHeadCenter(n),skin=d.skin,hair=d.hairColor,colors=skinPalette(skin);
 // Tapered jaw, small ears and a tiny implied nose replace the round toy face.
 c.beginPath();c.moveTo(x-4.9,y-3.6);c.quadraticCurveTo(x-6,y+1,x-3.5,y+4.4);c.quadraticCurveTo(x-1,y+6,x,y+6.1);c.quadraticCurveTo(x+2.3,y+5.3,x+4.1,y+3.5);c.quadraticCurveTo(x+5.6,y,x+4.8,y-3.8);c.quadraticCurveTo(x+3.3,y-6.8,x,y-6.6);c.quadraticCurveTo(x-3.7,y-6.8,x-4.9,y-3.6);c.closePath();c.fillStyle=skin;c.fill();c.strokeStyle=ink;c.lineWidth=.4;c.stroke();
 for(const sign of [-1,1]){oval(c,x+sign*4.8,y+.6,.9,1.35,skin);line(c,[point(x+sign*4.8,y+.1),point(x+sign*5,y+1)],tone(skin,-.18),.3)}
 if(!near){
  path(c,[point(x-4.2,y-2.8),point(x+4.3,y-2.8),point(x+3.9,y-1.2),point(x+.6,y-1.8),point(x-2.6,y-1.1)],colors.shadow,null);
  path(c,[point(x-3.7,y+.8),point(x-2.8,y+2.8),point(x-1.5,y+3.8),point(x-2.6,y+2.7)],colors.light,null);
  path(c,[point(x+3.9,y-.2),point(x+4,y+2.5),point(x+1.4,y+5),point(x+.5,y+5.3),point(x+2.6,y+2)],colors.shadow,null);
   const shape=expressionShape(near?'focus':emotion);
   for(const sign of [-1,1]){const ex=x+sign*2.1,ey=y+.4+(shape.low*.35),eyeWidth=shape.width,eyeHeight=shape.height;
   oval(c,ex,ey,eyeWidth,eyeHeight,'#fff3df');oval(c,ex+sign*.08,ey+.14,.52,shape.pupil,warm?'#6b5340':tone(hair,.22));oval(c,ex+sign*.08,ey+.26,.28,.6,tone(ink,.24));oval(c,ex-.18,ey-.27,.2,.26,'#fffdf2');
   const browY=ey-.62+(emotion==='effort'?.2:emotion==='reaction'?.12:emotion==='smile'?.1:0);
    c.beginPath();c.moveTo(ex-eyeWidth,browY);c.quadraticCurveTo(ex+sign*.3,browY-(emotion==='effort'?.36:emotion==='reaction'?.1:.22),ex+eyeWidth,browY+(emotion==='effort'?.22:0));c.strokeStyle=tone(ink,.16);c.lineWidth=.26;c.stroke();
    line(c,[point(ex-.9,y-1.75),point(ex,y-1.95),point(ex+.8,y-1.75)],tone(hair,.06),.24);
  }
  oval(c,x+.25,y+2.55,.18,.14,tone(skin,-.22));
   if(emotion==='smile'){c.beginPath();c.moveTo(x-.75,y+3.8);c.quadraticCurveTo(x+.15,y+4.45,x+.95,y+3.7);c.strokeStyle=tone(skin,-.35);c.lineWidth=.26;c.stroke()}
   else{const mouthY=y+4+(emotion==='effort'?.28:emotion==='reaction'?.12:0);line(c,[point(x-.55,mouthY),point(x+.35,mouthY+(emotion==='effort'?-.16:0)),point(x+.85,mouthY)],tone(skin,-.34),.24)}
 }
 const spiky=['spiky','pixie'].includes(d.hair),buzz=d.hair==='buzz',bald=d.hair==='bald';
 if(bald){
  path(c,[point(x-3.9,y-3.9),point(x-2.8,y-5.2),point(x-.4,y-5.7),point(x-1.3,y-4.6),point(x-3,y-3.5)],colors.light,null);
 }else if(buzz){
  c.save();c.beginPath();c.moveTo(x-4.8,y-2.3);c.bezierCurveTo(x-5.2,y-5.5,x-2.6,y-6.9,x,y-6.9);c.bezierCurveTo(x+3.1,y-6.9,x+5.3,y-5.1,x+4.8,y-2.3);c.quadraticCurveTo(x,y-3.1,x-4.8,y-2.3);c.closePath();c.fillStyle=tone(hair,.09);c.fill();c.clip();
  path(c,[point(x+2,y-6.4),point(x+5.3,y-5.1),point(x+5.3,y-2),point(x+2.2,y-2.7)],tone(hair,-.12),null);
  for(let row=0;row<5;row++)for(let col=0;col<12;col++){const sx=x-4.5+col*.8+(row%2)*.3,sy=y-5.9+row*.72;line(c,[point(sx,sy),point(sx+.1,sy+.2)],tone(hair,row%2?-.23:.25),.2)}c.restore();
 }else if(spiky){path(c,[[-5,0],[-6.5,-3],[-5,-3],[-6,-6],[-3,-5],[-3.8,-8],[-.8,-6.4],[1,-9],[2.1,-6],[5,-7],[4.6,-4],[7,-4.4],[5.1,.6],[3.2,-1.5],[1.9,-.3],[.2,-2.4],[-1.5,-.5],[-3.1,-2.4]].map(([a,b])=>point(x+a,y+b)),hair,ink)}
 else{
  c.beginPath();c.moveTo(x-5.2,y+1.4);c.bezierCurveTo(x-7,y-3,x-4.7,y-7.8,x,y-7.4);c.bezierCurveTo(x+5.5,y-8,x+7.1,y-2.5,x+5,y+1.7);
  if(near||buzz){c.quadraticCurveTo(x,y+(buzz?-2:5),x-5.2,y+1.4)}else{
   const swept=d.hair==='sidePart';c.lineTo(x+4.2,y-2.7);c.quadraticCurveTo(x+3.7,y-.3,x+2.5,y+.2);c.lineTo(x+2.8,y-3.9);c.quadraticCurveTo(x+.6,y-.2,x-.7,y+.9);c.lineTo(x-.5,y-3.1);c.quadraticCurveTo(x-2,y+(swept?-1.5:.1),x-3.4,y+.6);c.lineTo(x-3.4,y-2);c.lineTo(x-5.2,y+1.4)
  }c.closePath();c.fillStyle=hair;c.fill();c.strokeStyle=ink;c.lineWidth=.45;c.stroke();
 }
 if(!buzz&&!bald&&d.headwear!=='cap'){for(const sign of [-1,1])path(c,[point(x+sign*4.6,y-3),point(x+sign*6.4,y-1.5),point(x+sign*5.8,y-1.7),point(x+sign*6.2,y+.9),point(x+sign*4.9,y-.1)],hair,ink,.3)}
 if(d.hair==='curls'){for(let i=0;i<6;i++)oval(c,x-4.6+i*1.8,y-4.5-Math.sin(i/5*Math.PI)*2,1.7,1.6,tone(hair,i%2?.07:-.07))}
 if(!buzz&&!bald){
  // Highlight planes follow locks; no smooth shine or bright strand grid.
  path(c,[point(x-4.5,y-3.7),point(x-3.4,y-5.7),point(x-1.7,y-6.1),point(x-2.7,y-3.1),point(x-3.2,y-1.6)],tone(hair,warm?.12:.18),null);
  path(c,[point(x+.4,y-6.4),point(x+2.6,y-5.6),point(x+4,y-3.3),point(x+2.8,y-4),point(x+1.4,y-4.2)],tone(hair,.1),null);
  for(const sign of [-1,1]){c.beginPath();c.moveTo(x+sign*.6,y-6.4);c.quadraticCurveTo(x+sign*3.7,y-4.6,x+sign*4.4,y-1.2);c.strokeStyle=tone(hair,-.25);c.lineWidth=.3;c.stroke()}
 }
 if(d.headwear==='cap'){
  c.beginPath();c.moveTo(x-6,y-3);c.quadraticCurveTo(x-5.5,y-10,x,y-9.2);c.quadraticCurveTo(x+6,y-9,x+6,y-3);c.closePath();c.fillStyle=d.trim;c.fill();c.strokeStyle=ink;c.lineWidth=.45;c.stroke();
  path(c,[point(x-5.8,y-3.2),point(x+5.5,y-3.4),point(x+7.3,y-1.4),point(x+1,y-1.2)],tone(d.trim,-.12),ink);line(c,[point(x,y-8),point(x+.3,y-4)],tone(d.trim,-.2),.3);
 }else if(d.headwear==='visor'){path(c,[point(x-5.8,y-3.7),point(x+5.7,y-3.7),point(x+7.1,y-1.5),point(x-5.9,y-2)],d.trim,ink)}
 else if(d.headwear==='headband')line(c,[point(x-5,y-3),point(x+.2,y-3.6),point(x+5.2,y-3)],d.trim,1.3);
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
 return {crop,bottom,hem:bottom-(crop?5:0),shoulder:design.shoulder*(warm?.97:.91),waist:design.waist*(warm?1.04:.87),top:pose.neck.y+.2};
}
function trainer(c,f,d,ink,sole){
 if(sole)path(c,sole,'#e5dfce',ink,.3);
 const w=.95+d.build*.18,px=(x,y)=>point(f.x+x*w,f.y+y);
 // Ribbed ankle sock, padded collar and tongue stay attached to the foot.
 path(c,[px(-1.3,-4.2),px(1.1,-4.2),px(1.2,-1.4),px(-1.5,-1.3)],'#e5dfce',ink,.3);
 line(c,[px(-1.2,-3.2),px(1.1,-3.2)],d.trim,.65);
 path(c,[px(-2.2,-2),px(-.9,-2.4),px(1.2,-2),px(2.1,-.8),px(3.6,.3),px(3.8,1.4),px(-2.6,1.4)],'#e5dfce',ink,.4);
 path(c,[px(-2.5,.9),px(3.7,.9),px(3.9,1.7),px(2.6,2),px(-2.6,1.9)],tone(d.trim,-.55),ink,.25);
 path(c,[px(-2.5,.6),px(3.6,.6),px(3.7,1.1),px(-2.5,1.2)],'#fff3df',null);
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
 oval(c,24,64,10+d.build*2,1.8,'#07151a45');
 hairTail(c,d,n.x,animeHeadCenter(n).y,phase,near,ink);
 for(const [index,chain] of p.legs.entries()){ribbon(c,chain,[body.thigh,body.calf,body.ankle],d.skin,ink,skin);const f=chain[2];
  trainer(c,f,d,ink,options.footTargets?.[index].sole);
 }
 function arm(i){const a=p.arms[i],width=2.6+d.build*1.2;ribbon(c,a,[width,width*.85,width*.5],d.skin,ink,skin);
  if(d.outfit==='polo'||(d.body==='male'&&d.outfit==='performance')){const end=point(a[0].x+(a[1].x-a[0].x)*.43,a[0].y+(a[1].y-a[0].y)*.43);ribbon(c,[a[0],end],[width+1.5,width+1],d.shirt,ink);line(c,[point(end.x-.7,end.y-.1),point(end.x+.8,end.y+.3)],d.trim,.55)}
  oval(c,a[2].x,a[2].y,width*.36,width*.48,d.skin);line(c,[point(a[2].x-.7,a[2].y-1.7),point(a[2].x+.8,a[2].y-1.5)],d.trim,.8);
 }
 function paddle(){const q=p.paddle;line(c,[p.hand,q],'#494047',1.5);c.save();c.translate(q.x,q.y);c.rotate(raw.angle);const wide=options.paddleShape==='wide'?1.15:options.paddleShape==='elongated'?.88:1,tall=options.paddleShape==='elongated'?1.14:1;oval(c,0,0,3.7*wide,5*tall,d.trim);oval(c,0,0,3.05*wide,4.3*tall,'#1c2430');line(c,[point(-1.7,-2.3),point(-.5,-3),point(.9,-2.8)],'#ffffff28',.4);c.restore()}
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
  path(c,[point(n.x-2.4,top),point(n.x-.5,top+2),point(n.x-2.3,top+3.8),point(n.x-3.2,top+1.1)],tone(d.trim,.12),ink,.25);
  path(c,[point(n.x+2.4,top),point(n.x+.5,top+2),point(n.x+2.3,top+3.8),point(n.x+3.2,top+1.1)],tone(d.trim,-.1),ink,.25);
  line(c,[point(n.x,top+2),point(n.x,top+5.2)],tone(d.shirt,-.3),.3);oval(c,n.x,top+3.6,.2,.2,d.trim);
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
  for(const offset of [-.7,-.3,.3,.7]){const end=skirt.ends[offset<0?0:1],sx=h.x+body.hip*offset;path(c,[point(sx,h.y+.5),point(end.x+(offset<0?-1:1),end.y+.6),point(end.x+(offset<0?-2:2),end.y+.6)],tone(d.shirt,-.16),null)}
  line(c,[point(skirt.left,skirt.ends[0].y+1),point(h.x,skirt.bottom),point(skirt.right,skirt.ends[1].y+1)],d.trim,.55);
 }else{
  const shorts=tone(d.shirt,-.48);for(const chain of p.legs){const g=thighGarment(chain,body.thigh+1);path(c,g.polygon.map(([x,y])=>point(x,y)),shorts,ink);line(c,[point(...g.polygon[1]),point(...g.polygon[2])],d.trim,.6)}
  path(c,[point(h.x-body.hip,h.y-1),point(h.x+body.hip,h.y-1),point(h.x+body.hip,h.y+2),point(h.x,h.y+3),point(h.x-body.hip,h.y+2)],shorts,ink);
 }
 if(crop)line(c,[point(h.x-waist,hem),point(h.x+waist,hem)],d.trim,.65);
 line(c,[point(h.x-waist,h.y-1),point(h.x+waist,h.y-1)],tone(d.shirt,-.35),.8);
 animeHead(c,d,n,near,warm,phase,ink,emotion);
 if((options.sweat??0)>.14&&Math.sin((options.emotionClock??0)*3)>.2){const h=animeHeadCenter(n);for(const sign of [-1,1]){const drop=(options.emotionClock??0)*2%1;oval(c,h.x+sign*5.4,h.y+1+drop*3,.38,.65,'#b5e6ef');}}
 layers.filter(a=>!a.back).forEach(a=>arm(a.i));if(raw.paddle.depth>=raw.neck.depth)paddle();c.restore();
}

