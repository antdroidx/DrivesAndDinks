import {sampleCharacterPose,appearancePalette,jointBetween,animationRootOffset,paddleOutline} from './pixel-character.js?v=183';
import {CHARACTER_CONCEPTS,conceptPoint,conceptHair,thighGarment,skirtGarment} from './character-concepts.js?v=183';

// Visual identities never alter the player's simulation abilities or hit range.
export function matchDesign(appearance={},characterId='',designId=''){
 const body=appearance.body==='female'?'female':'male',choices=CHARACTER_CONCEPTS.filter(d=>d.body===body),hash=[...characterId].reduce((n,c)=>n+c.charCodeAt(0),0),base=CHARACTER_CONCEPTS.find(d=>d.id===designId)??choices[hash%choices.length],palette=appearancePalette(appearance);
 return {...base,hair:conceptHair(body,appearance.hairStyle,base.hair),headwear:appearance.headwear??'none',eyewear:appearance.eyewear??'none',shirt:palette.shirt,skin:palette.skin,hairColor:palette.hair,trim:palette.highlight,paddleColor:palette.paddle};
}
// Limb mass and bone lengths are independent of the arm silhouette.
export function legDimensions(design){
 const build=Math.max(.05,Math.min(1.1,design.build)),height=design.height/177;
 return {thigh:3.1+build*4.2,calf:2.3+build*2.8,ankle:1.7+build*1.2,shoe: .9+build*.25,upper:9.15*height,lower:9.15*height};
}
// Hysteresis keeps small velocity corrections from starting a walking cycle.
export function movingStance(state,speed){
 state.moving=state.moving?speed>.35:speed>1.1;return state.moving;
}
// Render-only stance locks. The same anatomical bone lengths are used each frame.
export function plantFeet(pose,options,raw,cx,baseline,scale){
 const state=options.plantState;if(!state)return;
 const gait=['run','shuffle','backpedal','crossover'].includes(raw.mode),cycle=Math.sin((options.frame||0)*Math.PI/2),key=raw.mode+raw.view;
 if(state.key!==key||Math.hypot(cx-(state.cx??cx),baseline-(state.baseline??baseline))>scale*12){state.feet=[];state.key=key}
 state.cx=cx;state.baseline=baseline;state.feet??=[];
 pose.legs.forEach((chain,i)=>{const foot=chain[2],down=raw.jump<.05&&(gait?(i?cycle>=0:cycle<=0):!options.moving&&(raw.mode==='idle'||(raw.phase>=.28&&raw.phase<=.7))),world={x:cx+(foot.x-24)*scale,y:baseline+(foot.y-63)*scale};
  if(!down){state.feet[i]=null;return}const locked=state.feet[i]??world;
  if(Math.hypot(locked.x-world.x,locked.y-world.y)>scale*4){state.feet[i]=world;return}state.feet[i]=locked;
  // Leave a stationary pose untouched. Re-solving an almost straight knee is
  // numerically sensitive and used to make otherwise idle legs snap sideways.
  if(Math.hypot(locked.x-world.x,locked.y-world.y)<.01)return;
  const lengths=(Array.isArray(options.legLengths)?options.legLengths[i]:options.legLengths)??{upper:Math.hypot(chain[1].x-chain[0].x,chain[1].y-chain[0].y),lower:Math.hypot(foot.x-chain[1].x,foot.y-chain[1].y)};
  foot.x=24+(locked.x-cx)/scale;foot.y=63+(locked.y-baseline)/scale;
  chain[1]=jointBetween(chain[0],foot,lengths.upper,lengths.lower,i?-1:1);
 });
}
export function conceptLegs(raw,design){
 const dimensions=legDimensions(design),hips=conceptPoint(raw.hips,design);
 return raw.legs.map((chain,i)=>{const sign=i?1:-1,hip={x:hips.x+sign*Math.max(2,design.hip-dimensions.thigh*.3),y:hips.y},foot=conceptPoint(chain[2],design);
 foot.x+=sign*(design.hip-5)*.55;
 return [hip,jointBetween(hip,foot,dimensions.upper,dimensions.lower,i?-1:1),foot];
 });
}
export function drawDetailedCharacter(c,{appearance={},characterId='',mode='idle',phase=0,frame=0,view='near',x=0,y=0,width=96,height=128,alignTo=null,alignStrength=0,designId='',...options}={}){
 const d=matchDesign(appearance,characterId,designId),scale=height/64,cx=x+width/2,baseline=y+63*scale;
 // Undo height scaling before the shared IK solves the real ball contact.
 const contact=alignTo?{x:24+(alignTo.x-cx)/scale-animationRootOffset(mode,phase,options.travelSide??options.side??1),y:63+((alignTo.y-baseline)/scale)*177/d.height}:null;
 drawConceptAthlete(c,d,mode,phase,view,cx,baseline,scale,{...options,frame,contact,contactWeight:alignStrength});return true;
}
function shade(hex,f){const values=hex.slice(1).match(/../g).map(v=>parseInt(v,16));return '#'+values.map(v=>Math.max(0,Math.min(255,Math.round(f<0?v*(1+f):v+(255-v)*f))).toString(16).padStart(2,'0')).join('')}
const matteContexts=new WeakSet();
function gradient(c,color,x,y,width){if(matteContexts.has(c))return color;const g=c.createLinearGradient(x-width,y-width,x+width,y+width);g.addColorStop(0,shade(color,.28));g.addColorStop(.42,color);g.addColorStop(1,shade(color,-.32));return g}
function shape(c,points,fill,stroke='#182633',line=.65){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke()}}
function limb(c,a,b,width,color){c.lineCap='round';c.strokeStyle='#182633';c.lineWidth=width+1;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle=gradient(c,color,(a.x+b.x)/2,(a.y+b.y)/2,width);c.lineWidth=width;c.stroke()}
function contour(c,chain,widths,color){
 const edges=[[],[]];
 chain.forEach((p,i)=>{const a=chain[Math.max(0,i-1)],b=chain[Math.min(chain.length-1,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;for(let side=0;side<2;side++){const sign=side?1:-1;edges[side].push([p.x+sign*nx*widths[i]/2,p.y+sign*ny*widths[i]/2])}});
 const points=[...edges[0],...edges[1].reverse()];c.lineJoin='round';shape(c,points,gradient(c,color,chain[1].x,chain[1].y,widths[0]));
}
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill()}
function hairBack(c,x,y,d,phase,near){const hair=gradient(c,d.hairColor,x,y,7),sway=Math.sin(phase*Math.PI*2)*1.2;
 if(['bob','waves'].includes(d.hair)){c.fillStyle=hair;c.beginPath();c.ellipse(x,y+1,6.8,d.hair==='waves'?8.3:7.5,0,Math.PI,Math.PI*2);c.lineTo(x+7.2,y+8.8);c.quadraticCurveTo(x,y+11.8,x-7.2,y+8.8);c.closePath();c.fill()}
 if(d.hair==='ponytail'){limb(c,{x:x+4,y:y-2},{x:x+9+sway,y:y+7},3.2,d.hairColor);limb(c,{x:x+9+sway,y:y+7},{x:x+7+sway,y:y+13},2.3,d.hairColor);ellipse(c,x+4,y-2,1.5,1.1,d.trim)}
 if(d.hair==='long'){if(near)shape(c,[[x-5,y-3],[x-6,y+3],[x-5.5,y+12],[x-3.5,y+15],[x,x+16],[x+3.5,y+15],[x+5.5,y+12],[x+6,y+3],[x+5,y-3]],hair,null);else for(const side of [-1,1])shape(c,[[x+side*3.7,y-3],[x+side*6,y+1],[x+side*6.2,y+8],[x+side*5.2,y+13],[x+side*3.8,y+11],[x+side*4,y+3]],shade(d.hairColor,-.06),null)}
 if(d.hair==='braid'){const bx=near?x-5.15+sway*.16:x-3.35+sway*.22,startY=y-2.8;limb(c,{x:x-3.8,y:y-3.4},{x:bx,y:y-1.8},1.5,shade(d.hairColor,-.16));for(let i=0;i<10;i++)ellipse(c,bx+Math.sin(i*.72+phase*6)*.28,startY+i*1.45,1.18-i*.055,1.08-i*.025,shade(d.hairColor,i%2?.12:-.1));ellipse(c,near?x-4.5:x-3.5,y-2.9,1.05,.68,d.trim)}
 if(d.hair==='twinTails'){for(const sign of [-1,1]){const drift=sway*sign;limb(c,{x:x+sign*4.3,y:y-2.7},{x:x+sign*(7.1+drift),y:y+3.4},1.65,d.hairColor);limb(c,{x:x+sign*(7.1+drift),y:y+3.4},{x:x+sign*(6.5+drift),y:y+10.8},1.2,d.hairColor);ellipse(c,x+sign*4.7,y-2.8,.8,.55,d.trim)}}
 if(d.hair==='pixie')shape(c,[[x-5,y-1],[x-5.2,y-4],[x-3.8,y-5],[x-3.5,y-6.7],[x-2,y-5.5],[x-1,y-7.1],[x+.3,y-5.7],[x+1.6,y-7],[x+2.6,y-5.4],[x+4,y-6.2],[x+4.3,y-4.5],[x+5.2,y-3.5],[x+5,y-.5],[x+4.1,y+1.7],[x+2.2,y+2.8],[x,y+3],[x-2.2,y+2.8],[x-4.1,y+1.7]],hair,null)
}function head(c,pose,d,view,phase){const n=pose.neck,x=n.x,y=n.y-8,near=view==='near';
 ellipse(c,x,y,5.8,7.2,'#182633');ellipse(c,x,y,5.1,6.5,gradient(c,d.skin,x,y,5));ellipse(c,x-5,y+1,1.2,1.8,shade(d.skin,-.12));ellipse(c,x+5,y+1,1.2,1.8,shade(d.skin,-.16));
 if(!near){
  if(d.faceStyle==='anime'){
   // Small cel-shaded planes and large irises, without a projecting nose bridge.
   shape(c,[[x+3.7,y-2],[x+4.7,y+1],[x+2.7,y+4.8],[x,y+5.9],[x+1.4,y+3.6]],shade(d.skin,-.12),null);
   for(const sign of [-1,1]){const ex=x+sign*2.15;
    ellipse(c,ex,y+.1,1.48,1.67,'#fff8ed');ellipse(c,ex+sign*.12,y+.35,.88,1.24,shade(d.hairColor,.22));ellipse(c,ex+sign*.12,y+.55,.43,.87,'#202632');ellipse(c,ex-.28,y-.3,.32,.4,'#fffdf4');
    c.strokeStyle='#302b33';c.lineWidth=.48;c.beginPath();c.moveTo(ex-1.45,y-.3);c.quadraticCurveTo(ex,y-1.5,ex+1.45,y-.25);c.stroke();c.strokeStyle=shade(d.hairColor,.05);c.lineWidth=.35;c.beginPath();c.moveTo(ex-1.1,y-2);c.quadraticCurveTo(ex,y-2.45,ex+1,y-1.9);c.stroke();
   }
   ellipse(c,x+.3,y+2.45,.3,.23,shade(d.skin,-.22));
   c.strokeStyle=shade(d.skin,-.36);c.lineWidth=.35;c.beginPath();c.moveTo(x-.85,y+4);c.quadraticCurveTo(x,y+4.4,x+.9,y+4);c.stroke();
  }else if(d.faceStyle==='storybook'){
   shape(c,[[x+4,y],[x+3.8,y+3],[x+1.8,y+5],[x+.2,y+5.7],[x+2,y+3.5]],shade(d.skin,-.08),null);
   for(const sign of [-1,1]){const ex=x+sign*2.15;ellipse(c,ex,y+.2,1.05,1.3,'#f9edda');ellipse(c,ex,y+.4,.68,1.05,'#55412f');ellipse(c,ex,y+.5,.36,.7,'#302b27');ellipse(c,ex-.2,y-.1,.22,.28,'#fff8e6');c.strokeStyle='#534135';c.lineWidth=.35;c.beginPath();c.moveTo(ex-1,y-1.9);c.quadraticCurveTo(ex,y-2.2,ex+1,y-1.7);c.stroke()}
   ellipse(c,x+.35,y+2.45,.27,.22,shade(d.skin,-.18));c.strokeStyle=shade(d.skin,-.3);c.lineWidth=.3;c.beginPath();c.moveTo(x-.7,y+4);c.quadraticCurveTo(x,y+4.2,x+.8,y+3.9);c.stroke();
  }else if(d.faceStyle==='soft'){
   ellipse(c,x+.35,y+2.2,.28,.25,shade(d.skin,-.22));for(const sign of [-1,1]){ellipse(c,x+sign*2.2,y+.3,.65,.8,'#25313a');ellipse(c,x+sign*2.2-.12,y+.05,.17,.2,'#fff4dc')}
   c.strokeStyle=shade(d.skin,-.38);c.lineWidth=.45;c.beginPath();c.moveTo(x-1,y+4);c.quadraticCurveTo(x,y+4.5,x+1.2,y+4);c.stroke();
  }else{c.strokeStyle=shade(d.skin,-.35);c.lineWidth=.65;c.beginPath();c.moveTo(x+.6,y);c.lineTo(x+1.4,y+2.4);c.lineTo(x+.1,y+2.6);c.stroke();ellipse(c,x-2.2,y+.3,.65,.8,'#25313a');ellipse(c,x+2.2,y+.3,.65,.8,'#25313a');c.strokeStyle=shade(d.skin,-.45);c.beginPath();c.moveTo(x-1.3,y+4);c.quadraticCurveTo(x,y+4.8,x+1.6,y+4);c.stroke()}
 }

 const hair=gradient(c,d.hairColor,x,y-4,6);
 if(near&&d.hair!=='buzz'&&d.hair!=='bald'){const back=d.body==='male'&&!['afro','curls'].includes(d.hair)?2.7:d.hair==='pixie'?2.8:5;ellipse(c,x,y-1,5.6,6,hair);shape(c,[[x-5,y],[x+5,y],[x+4,y+back*.8],[x,y+back],[x-4,y+back*.8]],hair,null)}else if(d.hair!=='buzz'&&d.hair!=='bald'){c.fillStyle=hair;c.beginPath();c.moveTo(x-5.5,y);c.quadraticCurveTo(x-6,y-7,x,y-7);c.quadraticCurveTo(x+6,y-7,x+5.5,y-1);c.lineTo(x+2,y-3);c.lineTo(x-1,y-2);c.lineTo(x-3,y-3);c.closePath();c.fill()}
 if(d.hair==='afro'){shape(c,[[x-5.4,y+.3],[x-6,y-1.4],[x-5.7,y-3.6],[x-4.6,y-5.5],[x-3,y-6.6],[x-1,y-7],[x+1,y-6.9],[x+3,y-6.3],[x+4.7,y-5],[x+5.7,y-3.1],[x+5.8,y-1],[x+5.2,y+.4],[x+3,y+1.2],[x,y+1.5],[x-3,y+1.2]],hair,null);for(const [x1,y1,x2,y2] of [[-4,-2.8,-2.5,-4.8],[-2,-5,-.2,-5.9],[.7,-5.6,2.7,-4.6],[3,-2.6,4.4,-1.5]])limb(c,{x:x+x1,y:y+y1},{x:x+x2,y:y+y2},.3,shade(d.hairColor,.2))}
 if(d.hair==='curls'){shape(c,[[x-5,y-1],[x-5.5,y-3.5],[x-4.2,y-5.8],[x-2,y-6.8],[x,y-7],[x+2,y-6.5],[x+4.2,y-5.4],[x+5.4,y-3],[x+5,y-.5],[x+3.7,y+1.8],[x+2.2,y+.8],[x+1.5,y+2.6],[x,y+.8],[x-1.5,y+2.7],[x-2.4,y+.8],[x-4,y+1.8]],hair,null);for(const [x1,y1,x2,y2] of [[-3.7,-5,-2.3,-2],[-1.5,-6,-.3,-2.5],[.4,-6,1.4,-2.3],[2.5,-5.4,3.5,-2.2]])limb(c,{x:x+x1,y:y+y1},{x:x+x2,y:y+y2},.35,shade(d.hairColor,.2));for(const side of [-1,1])shape(c,[[x+side*3.7,y-4],[x+side*5.5,y-1.5],[x+side*5.2,y+2.2],[x+side*4.1,y+.4]],shade(d.hairColor,-.05),null)}
 if(d.hair==='crop'){shape(c,[[x-5,y-.4],[x-5.1,y-3.8],[x-3.5,y-5.4],[x-1.2,y-6],[x+1.2,y-5.9],[x+3.5,y-5.1],[x+5,y-3.5],[x+4.8,y-.5],[x+2,y-1.8],[x-1.8,y-1.7]],gradient(c,d.hairColor,x,y-3,6),null);for(const [x1,y1,x2,y2] of [[-3.7,-4.3,-2.4,-2.7],[-1.8,-5,-.4,-3.1],[.2,-5.1,1.5,-3.1],[2,-4.6,3.2,-2.8]])limb(c,{x:x+x1,y:y+y1},{x:x+x2,y:y+y2},.28,shade(d.hairColor,.22));}
if(d.hair==='sidePart'){shape(c,[[x-5.2,y-.3],[x-5.5,y-3.7],[x-4.4,y-5.8],[x-2.3,y-7.2],[x-.2,y-7.5],[x+2.1,y-6.8],[x+4.3,y-5.3],[x+5.3,y-3.2],[x+5,y-.4],[x+4.2,y-1.1],[x+3.6,y-2.8],[x+2.2,y-2.2],[x+.7,y-3.1],[x-.8,y-2.3],[x-2.4,y-3],[x-4,y-1.4]],gradient(c,d.hairColor,x,y-4,7),null);shape(c,[[x-4.3,y-5.2],[x-1.8,y-6.8],[x+.8,y-6.5],[x+3.8,y-4.4],[x+2.3,y-2.7],[x-.3,y-3.25],[x-2.7,y-2.8]],shade(d.hairColor,.1),null)}if(d.hair==='buzz'){ellipse(c,x,y-3.8,5.2,3.3,shade(d.hairColor,.08));for(let i=0;i<8;i++)ellipse(c,x-3.5+i,y-4.6+(i%2)*.8,.22,.22,shade(d.hairColor,.3))}
 if(d.hair==='pixie'){shape(c,[[x-5.2,y-.3],[x-5.3,y-3.8],[x-3.7,y-5.5],[x-3.4,y-7],[x-2,y-5.6],[x-.8,y-7.4],[x+.3,y-5.6],[x+1.6,y-7.2],[x+2.6,y-5.3],[x+4,y-6.2],[x+4.3,y-4.3],[x+5.2,y-3.3],[x+5,y-.3],[x+3.8,y-1.1],[x+3,y-3.4],[x+1,y-1.4],[x-1.2,y-3.3],[x-3,y-1.1]],gradient(c,d.hairColor,x,y-3,6),null);shape(c,[[x-4.8,y-3],[x+4.8,y-3],[x+4.3,y-.7],[x+2,y-1.5],[x+.3,y-.5],[x-1.8,y-1.5],[x-3.8,y-.6]],shade(d.hairColor,-.08),null)}
 if(d.hair==='crewCut'){shape(c,[[x-5.1,y-.4],[x-5.7,y-3.2],[x-4.8,y-5.8],[x-2.7,y-7.5],[x-.1,y-8.1],[x+2.5,y-7.3],[x+4.6,y-5.5],[x+5.5,y-3.1],[x+5.2,y-.4],[x+4.5,y-.8],[x+4.1,y-2.7],[x+2.7,y-3.4],[x+1.1,y-2.8],[x-.3,y-3.7],[x-1.8,y-2.6],[x-3.5,y-3.2],[x-4.5,y-1.2]],gradient(c,d.hairColor,x,y-4,7),null);shape(c,[[x-4.8,y-3.7],[x-3.6,y-6.2],[x-.8,y-7.5],[x+2.2,y-6.9],[x+4.5,y-4.8],[x+2.8,y-4.5],[x+.6,y-5.5],[x-1.5,y-4.7],[x-3.4,y-3.2]],shade(d.hairColor,.1),null);for(const [x1,y1,x2,y2] of [[-3.8,-5.8,-1.8,-6.8],[-2.3,-6.7,.1,-7.2],[-.3,-7.2,2.1,-6.5],[1.4,-6.5,3.5,-5.1]])limb(c,{x:x+x1,y:y+y1},{x:x+x2,y:y+y2},.28,shade(d.hairColor,.2))}if(d.hair==='long'){if(near){shape(c,[[x-5.2,y-.3],[x-5.5,y-3.8],[x-3.7,y-6.1],[x-1.1,y-7],[x+1.3,y-6.9],[x+3.8,y-5.8],[x+5.3,y-3.5],[x+5,y-.4],[x+2.5,y-1.5],[x,y-1.1],[x-2.5,y-1.5]],shade(d.hairColor,-.05),null)}else{shape(c,[[x-5.2,y-.2],[x-5.5,y-4],[x-3.8,y-6.3],[x-1.4,y-7.2],[x-.2,y-5.4],[x+.2,y-7.1],[x+1.6,y-5.3],[x+4,y-5.8],[x+5.4,y-3.5],[x+5,y-.4],[x+3.5,y-1.2],[x+2.7,y-3.7],[x+1.4,y-1.5],[x+.2,y-4.2],[x-.4,y-1.1],[x-2,y-3.8],[x-3.2,y-1.3]],hair,null);shape(c,[[x-3.5,y-4.6],[x-2.2,y-2],[x-1.2,y-1.8],[x-2.6,y-5.2]],shade(d.hairColor,-.15),null);shape(c,[[x+.4,y-4.8],[x+1.4,y-1.8],[x+2.4,y-2],[x+2,y-5.2]],shade(d.hairColor,-.1),null)}} if(d.hair==='bun'){ellipse(c,x-.5,y-7.1,2.4,2,shade(d.hairColor,.08));limb(c,{x:x-2,y:y-7.2},{x:x+.2,y:y-8.6},.45,shade(d.hairColor,.2));limb(c,{x:x+.2,y:y-8.6},{x:x+1.5,y:y-7},.4,shade(d.hairColor,-.12))}
 if(d.hair==='waves')for(const sign of [-1,1])for(let i=0;i<4;i++)ellipse(c,x+sign*(5.3+Math.sin(i*1.5)*.5),y-2+i*2.2,1.35,1.8,shade(d.hairColor,i%2?.13:-.06));
 if(d.hair==='bob'){shape(c,[[x-5.2,y-.2],[x-5.5,y-4],[x-3.8,y-6.4],[x-1,y-7.2],[x+1.5,y-7],[x+4,y-5.8],[x+5.4,y-3.6],[x+5.1,y-.2],[x+3.8,y-1],[x+3,y-3.5],[x+1.4,y-1.4],[x-.2,y-3.4],[x-1.8,y-1.3],[x-3.3,y-3.4]],hair,null);shape(c,[[x-4.7,y-3],[x+4.7,y-3],[x+4.2,y-.8],[x+2.5,y-1.5],[x+.7,y-.6],[x-1.2,y-1.5],[x-3.1,y-.7]],shade(d.hairColor,-.05),null)}
 if(d.hair==='spiky'&&d.headwear!=='cap'){if(near){shape(c,[[x-5,y-1],[x-5.2,y-3.4],[x-4,y-4.6],[x-4.2,y-6.5],[x-2.7,y-5.1],[x-2,y-7.4],[x-.7,y-5.3],[x+.3,y-8],[x+1.3,y-5.4],[x+3,y-6.8],[x+3.1,y-4.6],[x+4.5,y-5.5],[x+4.1,y-3.3],[x+5,y-2.5],[x+4.8,y-.6],[x+2.5,y+.6],[x,y+.9],[x-2.5,y+.6],[x-4.8,y-.6]],gradient(c,d.hairColor,x,y-4,7))}else{shape(c,[[x-5.4,y-1],[x-7,y-5],[x-3.9,y-4.5],[x-4.8,y-9],[x-1.6,y-6],[x+.3,y-11],[x+2,y-6],[x+5.4,y-9],[x+4.8,y-4.5],[x+7,y-6],[x+5.3,y-1],[x+2.5,y-3],[x,y-1.5],[x-2,y-3]],gradient(c,d.hairColor,x,y-4,7));limb(c,{x:x-2.7,y:y-5.6},{x:x-.6,y:y-7.4},.65,shade(d.hairColor,.3));limb(c,{x:x+2,y:y-3.8},{x:x+4,y:y-6},.65,shade(d.hairColor,.22))}}
 if(d.illustrated&&d.hair!=='buzz'){
  // Broad lock silhouettes plus fine strands read at different display sizes.
  if(!near&&!['spiky','pixie'].includes(d.hair)){
   for(const [i,offset] of [-4,-1.8,.5,2.8].entries())shape(c,[[x+offset-1.6,y-5.2],[x+offset+1.3,y-4.4],[x+offset+.6,y-1.4+(i%2)*1.2],[x+offset-.9,y-2.8]],shade(d.hairColor,i%2?.12:-.1),null);
  }
  for(let i=0;i<6;i++){const sx=x-4.3+i*1.65;c.strokeStyle=shade(d.hairColor,d.faceStyle==='storybook'?(i%2?.09:-.1):(i%2?.13:-.16));c.lineWidth=i%2?.25:.35;c.beginPath();c.moveTo(x+(sx-x)*.55,y-6.1);c.quadraticCurveTo(sx,y-5,sx+.6,y-(near?1.7:3));c.stroke()}
  c.strokeStyle=shade(d.hairColor,.16);c.lineWidth=.4;c.beginPath();c.moveTo(x-3.8,y-4.5);c.quadraticCurveTo(x-1.8,y-6,x+.2,y-5.2);c.stroke();
 }
 if(d.headwear==='cap'){c.fillStyle=gradient(c,d.trim,x,y-4,7);c.beginPath();c.moveTo(x-6,y-2);c.quadraticCurveTo(x-6,y-9,x,y-9);c.quadraticCurveTo(x+6,y-9,x+6,y-2);c.closePath();c.fill();c.strokeStyle=shade(d.trim,-.35);c.lineWidth=.6;c.beginPath();c.moveTo(x,y-8);c.lineTo(x+.5,y-2);c.stroke();if(near){shape(c,[[x-2,y-2],[x+2,y-2],[x+2,y],[x-2,y]],d.hairColor,null)}else{ellipse(c,x+.5,y-1.8,7.2,1.5,shade(d.trim,-.12));ellipse(c,x,y-5,.8,.8,d.shirt)}}
 if(d.headwear==='visor'){limb(c,{x:x-5.7,y:y-2},{x:x+5.7,y:y-2},1.6,d.trim);if(!near){shape(c,[[x-5.7,y-1.5],[x+5.7,y-1.5],[x+8,y+.2],[x+3,y+1],[x-5,y+.2]],gradient(c,d.trim,x,y,6))}}
 if(d.headwear==='headband'){limb(c,{x:x-5.2,y:y-2},{x:x+5.2,y:y-2},2.1,d.trim);if(near){limb(c,{x:x+4,y:y-1},{x:x+6,y:y+3},1.3,d.trim)}}
}
export function drawConceptAthlete(c,design,mode,phase,view,cx,baseline,scale,options={}){const matte=options.material==='matte',wasMatte=matteContexts.has(c);if(matte)matteContexts.add(c);const d={...design,faceStyle:options.faceStyle,illustrated:options.illustrated},raw=sampleCharacterPose({...options,mode,phase,frame:options.frame??phase*4,view}),convert=p=>conceptPoint(p,d),pose={...raw,neck:convert(raw.neck),hips:convert(raw.hips),paddle:convert(raw.paddle),hand:convert(raw.hand)};view=raw.view;
 pose.arms=raw.arms.map(chain=>chain.map((p,i)=>{const q=convert(p),sign=chain[0].x<24?-1:1;return {...q,x:q.x+sign*(d.shoulder-6)*(1-i*.3)*(1-(options.contactWeight||0))}}));pose.paddle.x+=pose.arms[raw.gripSide][2].x-pose.hand.x;pose.paddle.y+=pose.arms[raw.gripSide][2].y-pose.hand.y;pose.hand=pose.arms[raw.gripSide][2];pose.legs=conceptLegs(raw,d);
 c.save();c.translate(cx+(raw.rootOffset||0)*scale-24*scale,baseline-63*scale);c.scale(scale,scale);const {hips:h,neck:n}=pose,skin=d.skin,w=2.3+d.build*1.3,leg=legDimensions(d);
 const style=options.silhouette,compact=style==='compact'||style==='toy';
 if(compact){const compress=p=>{p.x=24+(p.x-24)*.88;p.y=63+(p.y-63)*.72};for(const p of [pose.neck,pose.hips,pose.paddle,...pose.arms.flat(),...pose.legs.flat()])compress(p);pose.hand=pose.arms[raw.gripSide][2]}

 plantFeet(pose,{...options,legLengths:leg},raw,cx,baseline,scale);
 if(!['bob','waves'].includes(d.hair)){c.save();if(compact){c.translate(n.x,n.y-8);c.scale(style==='toy'?1.8:1.35,style==='toy'?1.55:1.2);c.translate(-n.x,-(n.y-8))}hairBack(c,n.x,n.y-8,d,phase,view==='near');c.restore()}
 c.save();
 for(const chain of pose.legs){const start=d.body==='female'?thighGarment(chain,leg.thigh+1).end:chain[0];if(style!=='toy')contour(c,[start,chain[1],chain[2]],[leg.thigh,leg.calf,leg.ankle],skin);const f=chain[2];c.save();c.translate(f.x,f.y);c.scale(style==='toy'?1.8:compact?1.2:1,style==='toy'?1.5:1);c.translate(-f.x,-f.y);limb(c,{x:f.x,y:f.y-2.6},f,leg.ankle+.5,'#ede8db');shape(c,[[f.x-2.3*leg.shoe,f.y-.4],[f.x+1.8*leg.shoe,f.y-.7],[f.x+3.1*leg.shoe,f.y+1.2],[f.x+2.6*leg.shoe,f.y+2],[f.x-2.5*leg.shoe,f.y+1.8]],gradient(c,'#e5dfd0',f.x,f.y,3),null);
  shape(c,[[f.x-2.1*leg.shoe,f.y-.25],[f.x-.45*leg.shoe,f.y-.65],[f.x+.25*leg.shoe,f.y+.35],[f.x-1.3*leg.shoe,f.y+.75],[f.x-2.3*leg.shoe,f.y+.35]],shade('#e5dfd0',.2),null);
  shape(c,[[f.x+.65*leg.shoe,f.y-.45],[f.x+2.75*leg.shoe,f.y+.35],[f.x+2.5*leg.shoe,f.y+.95],[f.x+.7*leg.shoe,f.y+.55]],shade('#e5dfd0',-.16),null);
c.restore()}
 c.restore();
 if(['bob','waves'].includes(d.hair)){c.save();if(compact){c.translate(n.x,n.y-8);c.scale(style==='toy'?1.8:1.35,style==='toy'?1.55:1.2);c.translate(-n.x,-(n.y-8))}hairBack(c,n.x,n.y-8,d,phase,view==='near');c.restore()}
 function arm(index){const a=pose.arms[index];if(style==='toy'){ellipse(c,a[2].x,a[2].y,3.6,3.6,skin);return}contour(c,a,[w+.5,w*.85,w*.6],skin);if(d.body==='male'){limb(c,a[0],{x:a[0].x+(a[1].x-a[0].x)*.4,y:a[0].y+(a[1].y-a[0].y)*.4},w+1,d.shirt)}ellipse(c,a[2].x,a[2].y,w*.48,w*.55,shade(skin,.08));limb(c,{x:a[2].x-.8,y:a[2].y-1.6},{x:a[2].x+.8,y:a[2].y-1.6},.8,d.trim)}
 function paddle(){const p=pose.paddle,hand=pose.hand;limb(c,p,hand,1.5,'#353239');c.save();c.translate(p.x,p.y);c.rotate(raw.angle);const outline=paddleOutline(options.paddleShape??'hybrid'),scale=.76;for(const [factor,fill] of [[1,'#182633'],[.84,d.paddleColor??d.trim],[.62,'#171b25']]){shape(c,outline.map(([x,y])=>[x*factor*scale,y*factor*scale]),fill)}c.restore()}
 const behind=pose.arms.map((a,i)=>({i,depth:raw.arms[i][1].depth}));behind.filter(a=>a.depth<raw.neck.depth).forEach(a=>arm(a.i));if(raw.paddle.depth<raw.neck.depth)paddle();
 limb(c,{x:n.x,y:n.y-1},{x:n.x,y:n.y+3},3.8,skin);
 const shoulder=d.shoulder,waist=d.waist,hip=d.hip,top=n.y+1,hem=h.y-1;
 c.fillStyle=gradient(c,d.shirt,n.x,top+8,shoulder);c.strokeStyle='#182633';c.lineWidth=.8;c.beginPath();c.moveTo(n.x-3,top-1);c.lineTo(n.x-shoulder,top+2);c.quadraticCurveTo(n.x-shoulder-1,(top+hem)/2,h.x-waist,hem);c.quadraticCurveTo(h.x,hem+1,h.x+waist,hem);c.quadraticCurveTo(n.x+shoulder+1,(top+hem)/2,n.x+shoulder,top+2);c.lineTo(n.x+3,top-1);c.quadraticCurveTo(n.x,top+2,n.x-3,top-1);c.closePath();c.fill();c.stroke();
 shape(c,[[n.x+shoulder-2,top+3],[n.x+shoulder,top+3],[h.x+waist,hem],[h.x+waist-2,hem]],shade(d.shirt,-.2),null);if(view==='far'){limb(c,{x:n.x-2.8,y:top},{x:n.x,y:top+2},.75,d.trim);limb(c,{x:n.x,y:top+2},{x:n.x+2.8,y:top},.75,d.trim)}else limb(c,{x:n.x-2.8,y:top+.7},{x:n.x+2.8,y:top+.7},.75,d.trim);
 c.strokeStyle=shade(d.shirt,-.27);c.lineWidth=.45;c.beginPath();c.moveTo(h.x-waist+1,hem-1);c.quadraticCurveTo(n.x-shoulder+2,top+9,n.x-shoulder+1,top+4);c.moveTo(h.x-2,hem-1);c.lineTo(h.x+1.5,hem-3);c.stroke();
 if(d.illustrated){
  shape(c,[[n.x-shoulder+1,top+3],[n.x-shoulder+2.5,top+3],[h.x-waist+2,hem-1],[h.x-waist+.7,hem-1]],shade(d.shirt,.13),null);
  c.strokeStyle=shade(d.shirt,-.36);c.lineWidth=.3;
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(h.x+waist-3,hem-2-i*1.5);c.lineTo(h.x+waist-1,hem-2.8-i*1.5);c.stroke()}
  c.strokeStyle=d.trim;c.lineWidth=.4;c.beginPath();c.moveTo(n.x-shoulder+1,top+2);c.lineTo(n.x-3.5,top+.5);c.moveTo(n.x+3.5,top+.5);c.lineTo(n.x+shoulder-1,top+2);c.stroke();
  for(const chain of pose.legs){const f=chain[2];c.strokeStyle='#f8f2e8';c.lineWidth=.35;for(let i=0;i<3;i++){c.beginPath();c.moveTo(f.x-.7,f.y-.4+i*.5);c.lineTo(f.x+1,f.y-.7+i*.5);c.stroke()}}
 }
 if(view==='far'){ellipse(c,n.x-2.4,top+5,.8,1,d.trim)}else{limb(c,{x:n.x-2,y:top+4},{x:n.x+2,y:top+4},.8,d.trim)}
 if(d.body==='female'){
  const skirt=skirtGarment(h,pose.legs,hip,leg.thigh-1);c.beginPath();const outline=skirt.polygon;outline.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=gradient(c,d.shirt,h.x,hem,hip);c.fill();c.strokeStyle='#182633';c.lineWidth=.65;c.stroke();
  const pleats=d.outfit==='performance'?[-.86,-.67,-.48,-.29,-.1,.1,.29,.48,.67,.86]:[-.7,-.25,.25,.7];for(const [index,offset] of pleats.entries()){const side=offset<0?0:1,end=skirt.ends[side],x=h.x+hip*offset,toX=end.x+(offset-(side? .5:-.5))*hip;c.beginPath();c.moveTo(x,hem+1);c.quadraticCurveTo((x+toX)/2,hem+5,toX,end.y+1);c.strokeStyle=shade(d.shirt,index%2?-.25:.12);c.lineWidth=.65;c.stroke()}
  c.beginPath();c.moveTo(skirt.left,skirt.ends[0].y+1);c.quadraticCurveTo(h.x,skirt.bottom+1,skirt.right,skirt.ends[1].y+1);c.strokeStyle=d.trim;c.lineWidth=.65;c.stroke();
 }else{
  const cloth=shade(d.shirt,-.45);
  for(const chain of pose.legs){const panel=thighGarment(chain,leg.thigh+1.4);shape(c,panel.polygon,gradient(c,cloth,chain[0].x,hem+4,hip));const edge=panel.polygon;limb(c,{x:edge[1][0],y:edge[1][1]},{x:edge[2][0],y:edge[2][1]},.65,d.trim)}
  shape(c,[[h.x-hip,hem],[h.x+hip,hem],[h.x+hip,hem+3],[h.x,hem+4],[h.x-hip,hem+3]],gradient(c,cloth,h.x,hem+2,hip));
 }
 limb(c,{x:h.x-waist,y:hem},{x:h.x+waist,y:hem},1.1,shade(d.shirt,-.3));c.save();if(compact){c.translate(n.x,n.y-8);c.scale(style==='toy'?1.8:1.35,style==='toy'?1.55:1.2);c.translate(-n.x,-(n.y-8))}head(c,pose,d,view,phase);c.restore();behind.filter(a=>a.depth>=raw.neck.depth).forEach(a=>arm(a.i));if(raw.paddle.depth>=raw.neck.depth)paddle();c.restore();if(matte&&!wasMatte)matteContexts.delete(c);
}
