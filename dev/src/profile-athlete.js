import {sampleCharacterPose,solveArm3D} from './pixel-character.js?v=135';
import {animeBodyDimensions,skinPalette,tone,animePixelPalette,drawAnimeRibbon} from './anime-character.js?v=135';
import {thighGarment} from './character-concepts.js?v=135';

function polygon(c,points,color,ink='#4c453d'){
 c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(ink){c.strokeStyle=ink;c.lineWidth=.35;c.stroke()}
}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill()}
function line(c,points,color,width=.4){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke()}
function limb(c,chain,width,color,shadow){
 drawAnimeRibbon(c,chain,Array.isArray(width)?width:chain.map(()=>width),color,'#4c453d',{shadow,light:tone(color,.1)});
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

function profileHead(c,d,neck,direction,emotion,sweat,clock){
 const y=neck.y-6,skin=skinPalette(d.skin),hair=d.hairColor,ink='#4c453d';
 c.save();c.translate(neck.x,y);c.scale(direction,1);
 if(['ponytail','braid','twinTails'].includes(d.hair)){
  const sway=Math.sin(clock*3)*.7;polygon(c,[{x:-4,y:-4},{x:-10,y:-5},{x:-12-sway,y:5},{x:-8,y:10},{x:-7,y:0}],hair);oval(c,-5,-3,1,1,d.trim);
 }
 // Authored half-profile: forehead, nose, lips, chin and one readable eye.
 polygon(c,[{x:-4.5,y:-4},{x:-1,y:-6.5},{x:2.8,y:-5.2},{x:3.7,y:-1.1},{x:5.5,y:.8},{x:3.7,y:1.4},{x:3.4,y:3.8},{x:1.1,y:5.8},{x:-2.8,y:4.7},{x:-4.6,y:1.7}],d.skin);
 polygon(c,[{x:-3.8,y:-3},{x:-2.6,y:2.8},{x:1,y:5.5},{x:-2.5,y:4.5},{x:-4.2,y:1.3}],skin.shadow,null);
 const eyeY=emotion==='reaction'?-.2:.1;
 oval(c,2,eyeY,.85,emotion==='smile'?.35:.8,'#fff3df');oval(c,2.25,eyeY,.36,.54,tone(hair,.14));
 line(c,[{x:.9,y:-1.5},{x:2.8,y:emotion==='effort'?-1:-1.7}],ink,.35);
 if(emotion==='reaction')oval(c,3.1,3.2,.45,.65,skin.deep);
 else line(c,[{x:2.2,y:3.6},{x:3.4,y:emotion==='smile'?3.15:3.5}],skin.deep,.3);
 oval(c,-1.4,.9,.9,1.25,d.skin);line(c,[{x:-1.6,y:.3},{x:-.9,y:1.1}],skin.shadow,.3);
 if(d.hair!=='bald'){
  const buzz=d.hair==='buzz',spiky=['spiky','pixie'].includes(d.hair);
  const points=spiky?[[-4,2],[-6,-2],[-5,-4],[-6,-7],[-3,-6],[-1,-9],[1,-7],[4,-7],[3,-4],[4,-2],[1,-3],[0,-1],[-2,-2]]:[[-4,2],[-5.5,-2],[-4,-6],[-1,-7.6],[2.8,-6.7],[4,-4],[3.3,-2],[1.6,-3.8],[-.8,-2.3],[-2,2.8]];
  polygon(c,points.map(([x,y])=>({x,y:y+(buzz?1:0)})),hair);
  line(c,[{x:-3.9,y:-4},{x:-1.8,y:-6},{x:1.7,y:-5.6}],tone(hair,.18),.65);
  if(['bob','waves'].includes(d.hair))polygon(c,[{x:-4.5,y:-3},{x:-5.6,y:5},{x:-2.7,y:7},{x:-2.3,y:1}],hair);
  if(d.hair==='curls')for(let i=0;i<5;i++)oval(c,-3.8+i*1.6,-5.4-Math.sin(i/4*Math.PI)*1.5,1.4,1.3,tone(hair,i%2?.07:-.07));
  if(d.hair==='braid')for(let i=0;i<6;i++)oval(c,-8.4+Math.sin(i)*.4,-1+i*1.5,1.3,1.2,tone(hair,i%2?.08:-.1));
 }
 if(d.headwear==='cap'){polygon(c,[{x:-5.3,y:-3.3},{x:-4.8,y:-8},{x:0,y:-9},{x:4.3,y:-6},{x:4.6,y:-3}],d.trim);polygon(c,[{x:1,y:-3.5},{x:7.6,y:-2.7},{x:8,y:-1.5},{x:2,y:-2}],tone(d.trim,-.12))}
 else if(d.headwear==='visor')polygon(c,[{x:-4.8,y:-4},{x:3.9,y:-4},{x:7.5,y:-2.7},{x:2.4,y:-2.5},{x:-4.5,y:-2.7}],d.trim);
 else if(d.headwear==='headband')line(c,[{x:-5,y:-3.4},{x:3.2,y:-4}],d.trim,1.1);
 if(d.eyewear==='glasses'){c.strokeStyle=ink;c.lineWidth=.45;c.beginPath();c.ellipse(2,.2,1.5,1.5,0,0,Math.PI*2);c.stroke();line(c,[{x:-2.7,y:-.1},{x:.8,y:.1}],ink,.45)}
 if(sweat>.14&&Math.sin(clock*3)>.2)oval(c,-3.2,2+(clock*2%1)*2,.3,.65,'#b5e6ef');
 c.restore();
}

export function drawProfileAthlete(c,d,mode,phase,cx,baseline,scale,options={}){
 const p=profilePose(d,mode,phase,options),body=animeBodyDimensions(d),skin=skinPalette(d.skin),ink='#4c453d',n=p.neck,h=p.hips,dir=p.direction;
 c.save();c.translate(cx-24*scale,baseline-63*scale);c.scale(scale,scale);
 const arm=i=>{const chain=p.arms[i],width=2.5+d.build;limb(c,chain,[width,width*.85,width*.5],d.skin,skin.deep);
  if(d.outfit==='polo'||d.body==='male'&&d.outfit==='performance')limb(c,[chain[0],{x:chain[0].x+(chain[1].x-chain[0].x)*.43,y:chain[0].y+(chain[1].y-chain[0].y)*.43}],width+1,d.shirt,tone(d.shirt,-.2));
  oval(c,chain[2].x,chain[2].y,.8,1.05,d.skin);
 };
 const drawPaddle=()=>{line(c,[p.hand,p.paddle],'#494047',1.25);c.save();c.translate(p.paddle.x,p.paddle.y);c.rotate(Math.atan2(-(p.hand.x-p.paddle.x),p.hand.y-p.paddle.y));oval(c,0,0,options.paddleShape==='wide'?3.4:2.7,options.paddleShape==='elongated'?5.7:5,d.trim);oval(c,0,0,2.1,4.1,'#1c2430');c.restore()};
 const layers=p.arms.map((chain,i)=>({i,back:chain[1].depth<p.neck.depth}));layers.filter(a=>a.back).forEach(a=>arm(a.i));if(p.paddle.depth<p.neck.depth)drawPaddle();
 for(const chain of p.legs.toSorted((a,b)=>a[0].depth-b[0].depth)){
  limb(c,chain,[body.thigh*.85,body.calf*.9,body.ankle*.9],d.skin,skin.shadow);const f=chain[2];
  polygon(c,[{x:f.x-1.2,y:f.y-2.8},{x:f.x+1.2,y:f.y-2.8},{x:f.x+1.3,y:f.y+.2},{x:f.x-1.3,y:f.y+.2}],'#e5dfce');
  polygon(c,[{x:f.x-dir*2,y:f.y-.5},{x:f.x+dir*2,y:f.y-.5},{x:f.x+dir*4,y:f.y+1.1},{x:f.x+dir*4,y:f.y+2},{x:f.x-dir*2,y:f.y+2}],'#e5dfce');line(c,[{x:f.x-dir*1.8,y:f.y+1.6},{x:f.x+dir*3.7,y:f.y+1.6}],d.trim,.65);
 }
 const waist=body.waist*.7,shoulder=d.shoulder*.55,top=n.y+.8,hem=h.y-(d.body==='female'&&d.outfit==='shorts'?5:.5);
 line(c,[{x:n.x,y:n.y-1},{x:n.x,y:top+2}],d.skin,3.2);
 if(hem<h.y-1)polygon(c,[{x:h.x-waist,y:hem},{x:h.x+waist,y:hem},{x:h.x+waist,y:h.y},{x:h.x-waist,y:h.y}],d.skin);
 polygon(c,[{x:n.x-shoulder,y:top},{x:n.x+shoulder,y:top+1.3},{x:h.x+waist,y:hem},{x:h.x-waist,y:hem}],d.shirt);
 polygon(c,[{x:n.x-shoulder,y:top},{x:n.x-shoulder+1.3,y:top+.5},{x:h.x-waist+1.4,y:hem},{x:h.x-waist,y:hem}],tone(d.shirt,-.2),null);
 line(c,[{x:n.x+dir*shoulder*.7,y:top+2},{x:h.x+dir*(waist-.4),y:hem-1}],tone(d.shirt,.14),.75);
 line(c,[{x:n.x-dir*1.8,y:top+.1},{x:n.x+dir*2,y:top+1.2}],d.trim,.7);
 if(d.outfit==='polo')polygon(c,[{x:n.x-dir*1.7,y:top},{x:n.x+dir*1.7,y:top+.6},{x:n.x+dir*2.8,y:top+3.1},{x:n.x,y:top+1.8}],d.trim);
 if(d.body==='female'&&d.outfit!=='shorts')polygon(c,[{x:h.x-waist,y:h.y-1},{x:h.x+waist,y:h.y-1},{x:h.x+waist+1.3,y:h.y+9},{x:h.x-waist-1.5,y:h.y+9}],tone(d.shirt,-.12));
 else for(const chain of p.legs){const g=thighGarment(chain,body.thigh*.85+1);polygon(c,g.polygon.map(([x,y])=>({x,y})),tone(d.shirt,-.48));}
 line(c,[{x:h.x-waist,y:h.y-1},{x:h.x+waist,y:h.y-1}],d.trim,.65);
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
