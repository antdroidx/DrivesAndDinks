import {sampleCharacterPose} from './pixel-character.js';
import {conceptPoint,thighGarment,skirtGarment} from './character-concepts.js';
import {conceptLegs,legDimensions} from './detailed-character.js';

export function tone(hex,f){return '#'+hex.slice(1).match(/../g).map(v=>{const n=parseInt(v,16);return Math.round(f<0?n*(1+f):n+(255-n)*f).toString(16).padStart(2,'0')}).join('')}
function path(c,points,color,ink='#302e35',width=.45){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(ink){c.strokeStyle=ink;c.lineWidth=width;c.stroke()}}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill()}
function line(c,points,color,width=.4){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke()}
const point=(x,y)=>({x,y});
function ribbon(c,chain,widths,color,ink){
 const sides=[[],[]];chain.forEach((p,i)=>{const a=chain[Math.max(0,i-1)],b=chain[Math.min(chain.length-1,i+1)],length=Math.hypot(b.x-a.x,b.y-a.y)||1;for(let side=0;side<2;side++){const sign=side?1:-1;sides[side].push(point(p.x-sign*(b.y-a.y)/length*widths[i]/2,p.y+sign*(b.x-a.x)/length*widths[i]/2))}});
 path(c,[...sides[0],...sides[1].toReversed()],color,ink);
 path(c,[...sides[1],...chain.toReversed()],tone(color,-.16),null);
}

// Same motion/contact language, independently authored body and costume silhouettes.
export function animePose(design,mode,phase,view){
 const raw=sampleCharacterPose({mode,phase,view,frame:phase*4}),convert=p=>conceptPoint(p,design);
 const arms=raw.arms.map(chain=>chain.map(convert)),legs=conceptLegs(raw,design);
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
function animeHead(c,d,n,near,warm,phase,ink){
 const x=n.x,y=n.y-7.8,skin=d.skin,hair=d.hairColor;
 // Tapered jaw, small ears and a tiny implied nose replace the round toy face.
 c.beginPath();c.moveTo(x-4.9,y-3.6);c.quadraticCurveTo(x-6,y+1,x-3.5,y+4.4);c.quadraticCurveTo(x-1,y+6,x,y+6.1);c.quadraticCurveTo(x+2.3,y+5.3,x+4.1,y+3.5);c.quadraticCurveTo(x+5.6,y,x+4.8,y-3.8);c.closePath();c.fillStyle=skin;c.fill();c.strokeStyle=ink;c.lineWidth=.4;c.stroke();
 for(const sign of [-1,1]){oval(c,x+sign*4.8,y+.6,.9,1.35,skin);line(c,[point(x+sign*4.8,y+.1),point(x+sign*5,y+1)],tone(skin,-.18),.3)}
 if(!near){
  path(c,[point(x+3.9,y-.2),point(x+4,y+2.5),point(x+1.4,y+5),point(x+.5,y+5.3),point(x+2.6,y+2)],tone(skin,warm?-.08:-.14),null);
  for(const sign of [-1,1]){const ex=x+sign*2.1,ey=y+.4,eyeWidth=warm?1.03:1.28,eyeHeight=warm?1.2:1.36;
   oval(c,ex,ey,eyeWidth,eyeHeight,'#fff3df');oval(c,ex+sign*.08,ey+.15,.66,1.02,warm?'#68513a':tone(hair,.2));oval(c,ex+sign*.08,ey+.27,.32,.73,ink);oval(c,ex-.2,ey-.27,.24,.32,'#fffdf2');
   c.beginPath();c.moveTo(ex-eyeWidth,ey-.38);c.quadraticCurveTo(ex,ey-1.3,ex+eyeWidth,ey-.4);c.strokeStyle=ink;c.lineWidth=warm?.3:.48;c.stroke();
   line(c,[point(ex-1,y-1.8),point(ex,y-2.05),point(ex+.9,y-1.8)],tone(hair,.04),.3);
  }
  oval(c,x+.25,y+2.55,.22,.17,tone(skin,-.23));line(c,[point(x-.65,y+4),point(x+.2,y+4.12),point(x+.85,y+3.95)],tone(skin,-.36),.3);
 }
 const spiky=['spiky','pixie'].includes(d.hair),buzz=d.hair==='buzz';
 if(spiky){path(c,[[-5,0],[-6.5,-3],[-5,-3],[-6,-6],[-3,-5],[-3.8,-8],[-.8,-6.4],[1,-9],[2.1,-6],[5,-7],[4.6,-4],[7,-4.4],[5.1,.6],[3.2,-1.5],[1.9,-.3],[.2,-2.4],[-1.5,-.5],[-3.1,-2.4]].map(([a,b])=>point(x+a,y+b)),hair,ink)}
 else{
  c.beginPath();c.moveTo(x-5.2,y+1.4);c.bezierCurveTo(x-7,y-3,x-4.7,y-7.8,x,y-7.4);c.bezierCurveTo(x+5.5,y-8,x+7.1,y-2.5,x+5,y+1.7);
  if(near||buzz){c.quadraticCurveTo(x,y+(buzz?-2:5),x-5.2,y+1.4)}else{
   const swept=d.hair==='sidePart';c.lineTo(x+4.2,y-2.7);c.quadraticCurveTo(x+3.7,y-.3,x+2.5,y+.2);c.lineTo(x+2.8,y-3.9);c.quadraticCurveTo(x+.6,y-.2,x-.7,y+.9);c.lineTo(x-.5,y-3.1);c.quadraticCurveTo(x-2,y+(swept?-1.5:.1),x-3.4,y+.6);c.lineTo(x-3.4,y-2);c.lineTo(x-5.2,y+1.4)
  }c.closePath();c.fillStyle=hair;c.fill();c.strokeStyle=ink;c.lineWidth=.45;c.stroke();
 }
 if(d.hair==='curls'){for(let i=0;i<6;i++)oval(c,x-4.6+i*1.8,y-4.5-Math.sin(i/5*Math.PI)*2,1.7,1.6,tone(hair,i%2?.07:-.07))}
 if(!buzz){
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
}
export function drawAnimeAthlete(c,design,mode,phase,view,cx,baseline,scale,{look='sports'}={}){
 const d=design,p=animePose(d,mode,phase,view),{raw,neck:n,hips:h}=p,near=raw.view==='near',warm=look==='storybook',ink=warm?'#443b35':'#302e35',leg=legDimensions(d);
 c.save();c.translate(cx-24*scale+(raw.rootOffset||0)*scale,baseline-63*scale);c.scale(scale,scale);
 oval(c,24,64,10+d.build*2,1.8,'#07151a45');
 hairTail(c,d,n.x,n.y-7.8,phase,near,ink);
 for(const chain of p.legs){ribbon(c,chain,[leg.thigh*.83,leg.calf*.88,leg.ankle*.86],d.skin,ink);const f=chain[2];
  path(c,[point(f.x-2.1,f.y-1.9),point(f.x+1.4,f.y-2.1),point(f.x+3.4,f.y+.5),point(f.x+3.7,f.y+1.6),point(f.x-2.6,f.y+1.6)],'#e5dfce',ink);
  path(c,[point(f.x-2.4,f.y),point(f.x-.4,f.y+.2),point(f.x+1.8,f.y-.8),point(f.x+3.2,f.y+.5),point(f.x+1,f.y+.8),point(f.x-2.5,f.y+.7)],d.trim,null);line(c,[point(f.x-2.4,f.y+1.2),point(f.x+3.4,f.y+1.2)],ink,.3);
  for(let i=0;i<3;i++)line(c,[point(f.x-.3,f.y-1.4+i*.45),point(f.x+1.2,f.y-1.1+i*.45)],'#fff7e5',.28);
 }
 function arm(i){const a=p.arms[i],width=2.6+d.build*1.2;ribbon(c,a,[width,width*.85,width*.5],d.skin,ink);
  if(d.body==='male'){const end=point(a[0].x+(a[1].x-a[0].x)*.43,a[0].y+(a[1].y-a[0].y)*.43);ribbon(c,[a[0],end],[width+1.5,width+1],d.shirt,ink);line(c,[point(end.x-.7,end.y-.1),point(end.x+.8,end.y+.3)],d.trim,.55)}
  oval(c,a[2].x,a[2].y,width*.36,width*.48,d.skin);line(c,[point(a[2].x-.7,a[2].y-1.7),point(a[2].x+.8,a[2].y-1.5)],d.trim,.8);
 }
 function paddle(){const q=p.paddle;line(c,[p.hand,q],'#494047',1.5);c.save();c.translate(q.x,q.y);c.rotate(raw.angle);oval(c,0,0,3.7,5,d.trim);oval(c,0,0,3.05,4.3,'#1c2430');line(c,[point(-1.7,-2.3),point(-.5,-3),point(.9,-2.8)],'#ffffff28',.4);c.restore()}
 const layers=raw.arms.map((chain,i)=>({i,back:chain[1].depth<raw.neck.depth}));layers.filter(a=>a.back).forEach(a=>arm(a.i));if(raw.paddle.depth<raw.neck.depth)paddle();
 ribbon(c,[point(n.x,n.y-2),point(n.x,n.y+3)],[3.2,3.6],d.skin,ink);
 const shoulder=d.shoulder*(warm?.97:.91),waist=d.waist*(warm?1.04:.87),top=n.y+1,hem=h.y-.5;
 c.beginPath();c.moveTo(n.x-2.5,top);c.lineTo(n.x-shoulder,top+2.1);c.quadraticCurveTo(n.x-shoulder+.5,top+6,h.x-waist,hem);c.quadraticCurveTo(h.x,hem+1,h.x+waist,hem);c.quadraticCurveTo(n.x+shoulder-1,top+6,n.x+shoulder,top+2.1);c.lineTo(n.x+2.5,top);c.quadraticCurveTo(n.x,top+3.4,n.x-2.5,top);c.closePath();c.fillStyle=d.shirt;c.fill();c.strokeStyle=ink;c.lineWidth=.45;c.stroke();
 path(c,[point(n.x+shoulder-1.5,top+2.8),point(n.x+shoulder,top+2.2),point(h.x+waist,hem),point(h.x+waist-2,hem),point(h.x+waist-1.8,hem-6)],tone(d.shirt,-.2),null);
 path(c,[point(n.x-shoulder+1,top+3),point(n.x-shoulder+2.2,top+3.5),point(h.x-waist+1.8,hem),point(h.x-waist+.6,hem)],d.trim,null);
 line(c,[point(n.x-2.6,top+.1),point(n.x,top+2.2),point(n.x+2.5,top+.1)],d.trim,.75);
 for(let i=0;i<3;i++)line(c,[point(h.x+waist-3.2,hem-1.8-i*1.7),point(h.x+waist-1,hem-2.6-i*1.7)],tone(d.shirt,-.3),.35);
 if(!near){path(c,[point(n.x-1,top+5),point(n.x+1.4,top+5),point(n.x+.4,top+6.3),point(n.x+1.2,top+8),point(n.x-1,top+7.2)],d.trim,null)}else{line(c,[point(n.x-1.6,top+4),point(n.x+1.6,top+4)],d.trim,.6)}
 if(d.body==='female'){
  const skirt=skirtGarment(h,p.legs,d.hip,leg.thigh-1.2);path(c,skirt.polygon.map(([x,y])=>point(x,y)),tone(d.shirt,.1),ink);
  for(const offset of [-.7,-.3,.3,.7]){const end=skirt.ends[offset<0?0:1],sx=h.x+d.hip*offset;path(c,[point(sx,h.y+.5),point(end.x+(offset<0?-1:1),end.y+.6),point(end.x+(offset<0?-2:2),end.y+.6)],tone(d.shirt,-.16),null)}
  line(c,[point(skirt.left,skirt.ends[0].y+1),point(h.x,skirt.bottom),point(skirt.right,skirt.ends[1].y+1)],d.trim,.55);
 }else{
  const shorts=tone(d.shirt,-.48);for(const chain of p.legs){const g=thighGarment(chain,leg.thigh+1);path(c,g.polygon.map(([x,y])=>point(x,y)),shorts,ink);line(c,[point(...g.polygon[1]),point(...g.polygon[2])],d.trim,.6)}
  path(c,[point(h.x-d.hip,h.y-1),point(h.x+d.hip,h.y-1),point(h.x+d.hip,h.y+2),point(h.x,h.y+3),point(h.x-d.hip,h.y+2)],shorts,ink);
 }
 line(c,[point(h.x-waist,h.y-1),point(h.x+waist,h.y-1)],tone(d.shirt,-.35),.8);
 animeHead(c,d,n,near,warm,phase,ink);layers.filter(a=>!a.back).forEach(a=>arm(a.i));if(raw.paddle.depth>=raw.neck.depth)paddle();c.restore();
}
