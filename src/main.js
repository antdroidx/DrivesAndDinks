import {setupSelection} from './selection.js';
import {HAIR_COLORS,SKIN_TONES,CLOTHING_COLORS,PADDLE_COLORS,COURT_PALETTES,CHARACTERS} from './roster.js';
import {Game} from './game.js';
import {selectShot,serveAim} from './core.js';
import {ANIMATION_TEST_STROKES,SWING_SECONDS,ANIMATION_CYCLE_SECONDS,forceSpecialShot,applySpecialShotAnimation} from './animation-test.js';
import {sampleStrokeAnimation} from './stroke-animation.js';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),game=new Game();let last=0,acc=0;let selectionUI=null;
const pauseButton=document.querySelector('#pause-button');
const buildLabel=document.querySelector('#build-label'),buildNumber=globalThis.DRIVES_DINKS_BUILD||'dev';buildLabel.textContent=`BUILD ${buildNumber}`;buildLabel.setAttribute('aria-label',`Game build ${buildNumber}`);
const DIFFICULTY_KEY='drives-dinks.difficulty.v1',difficultyButton=document.querySelector('#difficulty');
function syncDifficultyButton(){const label=game.difficulty.toUpperCase();difficultyButton.textContent=`DIFFICULTY: ${label}`;difficultyButton.setAttribute('aria-label',`Difficulty: ${label}`)}
function setDifficulty(value,persist=true){game.setDifficulty(value);syncDifficultyButton();if(persist)try{localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}}
let savedDifficulty='normal';try{savedDifficulty=localStorage.getItem(DIFFICULTY_KEY)||'normal'}catch{}
setDifficulty(savedDifficulty,false);difficultyButton.onclick=()=>setDifficulty(game.difficulty==='easy'?'normal':'easy');
function syncPauseButton(){pauseButton.textContent=game.paused?'RESUME':'PAUSE';pauseButton.setAttribute('aria-pressed',String(game.paused));pauseButton.setAttribute('aria-label',game.paused?'Resume match':'Pause match');pauseButton.disabled=game.phase==='over'}
function setPaused(paused){game.setPaused(paused);last=0;acc=0;syncPauseButton();syncShotButtonsForPhase();render()}
pauseButton.onclick=()=>setPaused(!game.paused);
for(const gesture of ['gesturestart','gesturechange','gestureend'])document.addEventListener(gesture,event=>event.preventDefault(),{passive:false});
const animationQuery=new URLSearchParams(location.search),animationTestMode=animationQuery.get('test')==='animations';let animationTestPlayer=null,animationTestShot='overhead',animationTestCharacter='avery',animationTestStarted=0;
if(animationTestMode)window.addEventListener('error',e=>{const status=document.querySelector('#animation-test-status');if(status)status.textContent=`ANIMATION TEST ERROR: ${e.message}`});
// Short synthesized effects; audio is unlocked by the first user gesture.
let audioContext=null,soundEnabled=true;
const soundButton=document.querySelector('#sound');
async function unlockAudio(){if(!soundEnabled)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')await audioContext.resume();soundButton.dataset.audioState=audioContext.state}catch{soundButton.dataset.audioState='unavailable'}}
window.addEventListener('pointerdown',unlockAudio);window.addEventListener('keydown',unlockAudio);
soundButton.onclick=()=>{soundEnabled=!soundEnabled;soundButton.textContent=soundEnabled?'SOUND: ON':'SOUND: OFF';soundButton.setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)unlockAudio()};
function playEffect(event){if(!['hit','bounce','net'].includes(event.type))return;if(!soundEnabled||audioContext?.state!=='running')return;const t=audioContext.currentTime,gain=audioContext.createGain(),osc=audioContext.createOscillator();const hit=event.type==='hit',net=event.type==='net';osc.type=net?'sawtooth':hit?'triangle':'sine';osc.frequency.setValueAtTime(net?125:hit?(event.shot==='drive'?760:540):220,t);osc.frequency.exponentialRampToValueAtTime(net?60:hit?180:85,t+.065);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(hit?.075:.045,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+.09);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.1)}
const project=(x,y,z=0)=>({x:480+(x-10)*(13+y*.21),y:204+y*8.5-z*14});
function poly(points,fill,stroke='#f8edc7',width=2){ctx.beginPath();points.forEach(([x,y],i)=>{const p=project(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function line(a,b,color='#f8edc7',width=3){const p=project(...a),q=project(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}
// New eight-frame animation atlases. Solid chroma pixels are removed and marker colors
// are remapped in memory so every appearance shares one consistent athletic base.
const atlasPaths={
 'male-tee':'./assets/male-tshirt-atlas-v3.png',
 'male-polo':'./assets/male-polo-atlas-v3.png',
 'female-tee':'./assets/female-tshirt-atlas-v3.png',
 'female-dress':'./assets/female-dress-atlas-v3.png'
};
const atlases={};
for(const [key,path] of Object.entries(atlasPaths)){
 const sheet=new Image();sheet.onload=()=>{atlases[key]=sheet;selectionUI?.refreshPreview()};sheet.onerror=()=>console.warn('Character atlas load failed',path);sheet.src=path;
}
const colorRgb=(items,id,fallback)=>items.find(item=>item.id===id)?.rgb??items.find(item=>item.id===fallback)?.rgb??[255,255,255];
function atlasKey(p){return `${p.appearance.body}-${p.appearance.outfit}`}
function spriteAvailable(p){return Boolean(atlases[atlasKey(p)]?.complete)}
const frameCache=new Map();
function tintPixel(d,i,target,baseTotal){
 const sourceTotal=d[i]+d[i+1]+d[i+2],light=Math.max(.42,Math.min(1.24,sourceTotal/baseTotal));
 d[i]=Math.min(255,target[0]*light);d[i+1]=Math.min(255,target[1]*light);d[i+2]=Math.min(255,target[2]*light);
}
function equipmentFrame(p,row,col){
 const appearance=p.appearance,key=[atlasKey(p),row,col,appearance.hair,appearance.skin,appearance.shirtColor,appearance.bottomColor,appearance.paddleColor].join(':');if(frameCache.has(key))return frameCache.get(key);
 const sheet=atlases[atlasKey(p)];if(!sheet)return null;
 const cellW=sheet.naturalWidth/8,cellH=sheet.naturalHeight/8,c=document.createElement('canvas');c.width=160;c.height=160;
 const insetX=cellW*.015,insetTop=cellH*.045,insetBottom=cellH*.02;
 const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=false;x.drawImage(sheet,col*cellW+insetX,row*cellH+insetTop,cellW-insetX*2,cellH-insetTop-insetBottom,0,0,c.width,c.height);
 const image=x.getImageData(0,0,c.width,c.height),d=image.data;
 const hair=colorRgb(HAIR_COLORS,appearance.hair,'brown'),skin=colorRgb(SKIN_TONES,appearance.skin,'medium'),shirt=colorRgb(CLOTHING_COLORS,appearance.shirtColor,'green'),bottom=colorRgb(CLOTHING_COLORS,appearance.bottomColor,'black'),paddle=colorRgb(PADDLE_COLORS,appearance.paddleColor,'mint');
 for(let i=0;i<d.length;i+=4){
  const r=d[i],g=d[i+1],b=d[i+2];
  if(g>185&&b>185&&r<75){d[i+3]=0;continue}
  if(r>125&&b>65&&r>g*1.45&&b>g*1.15)tintPixel(d,i,hair,285);
  else if(g>95&&g>r*1.22&&g>b*1.45)tintPixel(d,i,shirt,205);
  else if(b>100&&b>g*1.15&&b>r*1.4)tintPixel(d,i,bottom,220);
  else if(r>165&&g>115&&b<85)tintPixel(d,i,paddle,390);
  else if(r>145&&b>62&&r>g*1.12&&g>b*.88)tintPixel(d,i,skin,420);
 }
 const width=c.width,height=c.height,visited=new Uint8Array(width*height),components=[];
 for(let start=0;start<visited.length;start++){
  if(visited[start]||d[start*4+3]===0)continue;const queue=[start],pixels=[];visited[start]=1;
  for(let at=0;at<queue.length;at++){
   const index=queue[at],px=index%width,py=Math.floor(index/width);pixels.push(index);
   for(const next of [index-1,index+1,index-width,index+width]){
    if(next<0||next>=visited.length||visited[next]||d[next*4+3]===0)continue;
    if((next===index-1||next===index+1)&&Math.floor(next/width)!==py)continue;
    visited[next]=1;queue.push(next);
   }
  }
  components.push(pixels);
 }
 const largest=Math.max(0,...components.map(component=>component.length)),minimum=Math.max(30,largest*.028);
 for(const component of components)if(component.length<minimum)for(const index of component)d[index*4+3]=0;
 x.putImageData(image,0,0);frameCache.set(key,c);return c;
}
function drawLoadoutPreview(selection){
 const c=document.querySelector('#player-preview');if(!c)return;const x=c.getContext('2d'),profile={appearance:{body:CHARACTERS.find(character=>character.id===selection.character).gender,outfit:selection.outfit,hair:selection.hair,skin:selection.skin,shirtColor:selection.shirtColor,bottomColor:selection.bottomColor,paddleColor:selection.paddleColor}};
 x.clearRect(0,0,c.width,c.height);x.fillStyle='#122f37';x.fillRect(0,0,c.width,c.height);x.fillStyle='#355e60';x.fillRect(0,160,c.width,40);x.fillStyle='#eff3cf66';x.fillRect(0,175,c.width,2);
 const frame=equipmentFrame(profile,0,0);if(frame){x.imageSmoothingEnabled=false;x.drawImage(frame,10,5,160,170)}
}
function drawSprite(p,q){
 const scale=.8+p.y/100,moving=p.motion!=='planted'&&Math.hypot(p.vx,p.vy)>1.2;
 const back=p.team===0,swinging=(p.windup>0||p.swing>0);
 const progress=p.swing/(p.swingDuration||.36);const gait=Math.floor((p.stride||0)/1.1),strokeAnimation=swinging?sampleStrokeAnimation(p,1-progress):null,kind=strokeAnimation?.kind;
 const strokeRow=kind==='backhand'?(back?3:2):kind==='overhead'?(back?5:4):(back?1:0),row=swinging?strokeRow:(back?7:6),col=swinging?strokeAnimation.frameColumn:(moving?gait%8:0);
 ctx.save();ctx.translate(Math.round(q.x),Math.round(q.y));ctx.scale(scale,scale);
 ctx.fillStyle='#101f1a80';ctx.beginPath();ctx.ellipse(0,0,18,6,0,0,Math.PI*2);ctx.fill();
 if(p.id===0&&game.mode==='play'){ctx.strokeStyle=game.canHumanHit()?'#fff':'#39d9f5';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,20,7,0,0,Math.PI*2);ctx.stroke()}
 if(p.swing>0&&progress>.7&&p.contactPoint){const point=project(p.contactPoint.x,p.contactPoint.y,p.contactPoint.z);ctx.translate(Math.max(-7,Math.min(7,(point.x-q.x)/scale-(p.swingSide||1)*23)),Math.max(-6,Math.min(6,(point.y-q.y)/scale+35)))}if(strokeAnimation){ctx.translate(0,strokeAnimation.offsetY);ctx.rotate(strokeAnimation.rotation);ctx.scale(1,strokeAnimation.scaleY);if(strokeAnimation.mirror)ctx.scale(-1,1)}ctx.imageSmoothingEnabled=false;
 const frame=equipmentFrame(p,row,col);if(frame)ctx.drawImage(frame,-35,-77,70,80);ctx.restore();
}
function drawSupportHand(animation){
 const x=animation.supportHandX,y=animation.supportHandY;
 ctx.lineCap='butt';ctx.strokeStyle='#5b3428';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-9,-47);ctx.lineTo(-3,-42);ctx.lineTo(x,y);ctx.stroke();
 ctx.strokeStyle='#d7926c';ctx.lineWidth=4;ctx.stroke();
 ctx.fillStyle='#5b3428';ctx.fillRect(x-3,y-3,7,6);ctx.fillStyle='#d7926c';ctx.fillRect(x-2,y-2,5,4);
}
// Each player is assembled from a small pixel grid; only the pose frames change.
function drawPlayer(p,q){
 const scale=.8+p.y/100, moving=p.motion!=='planted'&&Math.hypot(p.vx,p.vy)>1.2;
 const frame=moving?Math.floor(performance.now()/125+p.id)%2:0;
 const skin=['#e4a87e','#c7835e','#edbb91','#b47855'][p.id];
 const shade=['#a9674e','#92583f','#bd815f','#805039'][p.id];
 const shirt=['#f2bd43','#e76f53','#65a7e2','#af8bd6'][p.id];
 const dark=['#a67626','#a63f38','#3b689f','#715391'][p.id];
 const hair=['#4a3029','#362b27','#b18a61','#29272b'][p.id];
 ctx.save();ctx.translate(Math.round(q.x),Math.round(q.y));ctx.scale(scale,scale);
 ctx.fillStyle='#101f1a80';ctx.fillRect(-17,-3,34,5);ctx.fillRect(-12,-5,24,9);
 if(p.id===0&&game.mode==='play'){ctx.strokeStyle=game.canHumanHit()?'#fff':'#39d9f5';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,20,7,0,0,Math.PI*2);ctx.stroke()}
 const px=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x*2,y*2,w*2,h*2)};
 // Shoes and legs form separate alternating run frames.
 if(frame===0){px(-5,-5,4,4,skin);px(1,-5,4,4,skin);px(-6,-2,5,2,'#eef1db');px(1,-2,5,2,'#eef1db');px(-7,0,6,2,'#263642');px(1,0,6,2,'#263642')}
 else{px(-6,-5,4,4,skin);px(2,-6,4,4,skin);px(-7,-2,5,2,'#eef1db');px(2,-3,5,2,'#eef1db');px(-8,0,6,2,'#263642');px(2,-1,6,2,'#263642')}
 px(-6,-9,12,5,'#253846');px(-1,-8,2,4,'#162a36');px(-6,-14,12,6,shirt);px(-7,-13,14,3,shirt);px(-5,-14,10,1,'#fff2bd');px(4,-12,2,4,dark);
 // Forearms, neck, hair, face and headband are intentionally pixel-stepped.
 px(-8,-12,2,5,skin);px(-9,-8,2,2,shade);px(6,-12,2,4,skin);px(7,-9,2,2,shade);
 px(-2,-16,4,2,skin);px(-5,-22,10,7,skin);px(-6,-21,1,4,shade);px(5,-21,1,4,shade);px(-5,-23,10,2,hair);px(-6,-22,2,2,hair);px(-5,-22,10,1,'#f4ead4');
 if(p.team===1){px(-3,-19,1,1,'#332f30');px(2,-19,1,1,'#332f30');px(-1,-17,2,1,shade)}else{px(-5,-21,10,1,hair);px(-4,-18,8,2,shade)}
 // Three swing phases plus a buffered wind-up, mirrored toward contact.
 ctx.save();if((p.swingSide||1)<0)ctx.scale(-1,1);
 if(p.swing>.24){px(6,-12,5,2,skin);px(10,-13,3,2,skin);px(13,-16,2,4,'#6d4934');px(13,-20,6,6,'#f2ead5');px(14,-19,4,4,'#315c6f')}
 else if(p.swing>.11){px(5,-14,4,3,skin);px(8,-18,3,3,skin);px(10,-22,2,4,'#6d4934');px(8,-27,6,6,'#f2ead5');px(9,-26,4,4,'#315c6f')}
 else if(p.swing>0){px(4,-14,3,3,skin);px(5,-18,3,3,skin);px(5,-22,2,4,'#6d4934');px(3,-27,6,6,'#f2ead5');px(4,-26,4,4,'#315c6f')}
 else if(p.windup>0){px(7,-11,4,2,skin);px(11,-9,2,4,'#6d4934');px(10,-8,6,6,'#f2ead5');px(11,-7,4,4,'#315c6f')}
 else{px(8,-9,2,3,'#6d4934');px(7,-15,6,6,'#f2ead5');px(8,-14,4,4,'#315c6f')}
 ctx.restore();
 ctx.restore();
}

const courtSpeckles=Array.from({length:160},(_,i)=>({x:((i*137)%1000)/1000*24-2,y:((i*269)%1000)/1000*48-2}));
function render(){const palette=COURT_PALETTES.find(item=>item.id===game.players[0]?.appearance?.court)??COURT_PALETTES[0];ctx.fillStyle=palette.background;ctx.fillRect(0,0,960,600);ctx.fillStyle=palette.stripe;for(let i=0;i<960;i+=40)ctx.fillRect(i,110,20,490);poly([[-3.6,-2.4],[23.6,-2.4],[23.6,47.1],[-3.6,47.1]],palette.outer,null);poly([[-3.4,-2.4],[23.4,-2.4],[23.4,46.4],[-3.4,46.4]],palette.outerLight,null);poly([[-3,-2],[23,-2],[23,46],[-3,46]],palette.apron,null);poly([[0,0],[20,0],[20,44],[0,44]],palette.court,palette.line);poly([[0,15],[20,15],[20,29],[0,29]],palette.kitchen,null,palette.line);ctx.fillStyle='#ffffff0b';for(const speck of courtSpeckles){const q=project(speck.x,speck.y);ctx.fillRect(q.x,q.y,2,1)}poly([[0,0],[20,0],[20,44],[0,44]],'transparent',palette.line,3);line([0,15],[20,15],palette.line);line([0,29],[20,29],palette.line);line([10,0],[10,15],palette.line);line([10,29],[10,44],palette.line);if(game.mode==='play'){const previewShot=game.phase==='serve'?'serve':selectShot(game.players[0],game.ball,game.shot),displayAim=game.phase==='serve'?serveAim(game.server,game.aim):game.aim,target=project(displayAim,game.phase==='serve'?(game.server.team===0?8:36):previewShot==='dink'?14:previewShot==='drop'?12:previewShot==='slice'?6:4);ctx.strokeStyle='#39d9f5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(target.x,target.y,13,6,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(target.x-17,target.y);ctx.lineTo(target.x+17,target.y);ctx.moveTo(target.x,target.y-10);ctx.lineTo(target.x,target.y+10);ctx.stroke()}
 const netL=project(-.5,22),netR=project(20.5,22);ctx.fillStyle='#25323c';ctx.fillRect(netL.x,netL.y-30,netR.x-netL.x,30);ctx.strokeStyle='#94a79e';ctx.lineWidth=1;for(let x=netL.x;x<netR.x;x+=10){ctx.beginPath();ctx.moveTo(x,netL.y-30);ctx.lineTo(x,netL.y);ctx.stroke()}for(let y=netL.y-24;y<netL.y;y+=7){ctx.beginPath();ctx.moveTo(netL.x,y);ctx.lineTo(netR.x,y);ctx.stroke()}ctx.fillStyle='#f9e6bd';ctx.fillRect(netL.x,netL.y-32,netR.x-netL.x,5);ctx.fillStyle='#bdc8bf';ctx.fillRect(netL.x-3,netL.y-36,5,39);ctx.fillRect(netR.x-2,netR.y-36,5,39);
 if(game.phase==='rally'){ctx.fillStyle='#fff1a744';for(let i=0;i<game.trail.length;i+=2){const t=game.trail[i],q=project(t.x,t.y,t.z);ctx.fillRect(q.x-2,q.y-2,4,4)}}if(game.bounceMark?.time>0){const q=project(game.bounceMark.x,game.bounceMark.y);ctx.strokeStyle='#fff5ab';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,10+(1-game.bounceMark.time/.35)*8,4,0,0,Math.PI*2);ctx.stroke()}
 const entities=[...game.players.map(p=>({kind:'player',y:p.y,p})),{kind:'ball',y:game.ball.y,p:game.ball}].sort((a,b)=>a.y-b.y);for(const e of entities){const p=e.p,q=project(p.x,p.y);if(e.kind==='ball'){ctx.fillStyle='#17312b88';ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(3,8-p.z*.35),Math.max(2,4-p.z*.1),0,0,7);ctx.fill();const b=project(p.x,p.y,p.z);ctx.fillStyle='#f9f36c';ctx.fillRect(b.x-4,b.y-4,8,8);continue}if(spriteAvailable(p))drawSprite(p,q);else drawPlayer(p,q)}
 if(game.contact&&game.contact.time>0){const c=project(game.contact.x,game.contact.y,game.contact.z);ctx.fillStyle='#fff9c9';ctx.fillRect(c.x-10,c.y-2,20,4);ctx.fillRect(c.x-2,c.y-10,4,20)}
 ctx.fillStyle='#1b2939';ctx.fillRect(20,15,500,85);ctx.fillStyle='#f9d46a';ctx.font='bold 17px monospace';ctx.fillText('DRIVES & DINKS  /  '+(game.mode==='play'?'PLAY':'WATCH')+' · '+game.difficulty.toUpperCase(),32,38);ctx.fillStyle='#fff8df';ctx.font='bold 20px monospace';ctx.fillText(`YOU ${game.score.points[0]}`,32,64);ctx.fillText(`CPU ${game.score.points[1]}`,270,64);ctx.font='bold 11px monospace';ctx.fillText(game.players.slice(0,2).map((p,i)=>p.name||`Player ${i+1}`).join(' / '),32,85,225);ctx.fillText(game.players.slice(2).map((p,i)=>p.name||`Player ${i+3}`).join(' / '),270,85,238);ctx.font='bold 16px monospace';ctx.fillStyle='#fff6d9';ctx.fillText(`SERVE ${game.score.team===0?'YOU':'CPU'}  ${game.score.call}`,560,35);ctx.fillStyle='#f9d46a';ctx.fillText(game.phase==='over'?(game.score.winner===0?'YOU WIN!':'CPU WINS!'):(game.canHumanHit()?'HIT NOW!':game.message),560,62);if(game.paused){ctx.fillStyle='#1b2939';ctx.fillRect(235,260,490,75);ctx.textAlign='center';ctx.fillStyle='#fff6d9';ctx.font='bold 19px monospace';ctx.fillText('MATCH PAUSED',480,288);ctx.fillStyle='#f9d46a';ctx.fillText('TAP RESUME TO CONTINUE',480,316);ctx.textAlign='start'}else if(game.phase==='pause'||game.phase==='over'){ctx.fillStyle='#1b2939';ctx.fillRect(235,260,490,75);ctx.textAlign='center';ctx.fillStyle='#fff6d9';ctx.font='bold 19px monospace';ctx.fillText(game.result,480,288);ctx.fillStyle='#f9d46a';ctx.fillText(game.outcome,480,316);ctx.textAlign='start'};ctx.fillStyle='#fff';ctx.font='13px monospace';ctx.fillText((game.phase==='serve'?'SERVE AIM: ':'TARGET: ')+(game.aim<7?'LEFT':game.aim>13?'RIGHT':'CENTER'),560,83)}
let previousStatus='';function frame(t){if(animationTestMode){applySpecialShotAnimation(animationTestPlayer,(t-animationTestStarted)/1000);render();requestAnimationFrame(frame);return}if(selectionUI?.isOpen()){last=t;acc=0;render();requestAnimationFrame(frame);return}const status=game.paused?'MATCH PAUSED':game.phase==='pause'||game.phase==='over'?`${game.result} · ${game.outcome}`:`YOU ${game.score.points[0]} - ${game.score.points[1]} CPU | SERVE ${game.score.team===0?'YOU':'CPU'} ${game.score.call} | TARGET ${game.aim<7?'LEFT':game.aim>13?'RIGHT':'CENTER'} | ${game.difficulty.toUpperCase()} | ${game.canHumanHit()?'HIT NOW':game.message}`;if(status!==previousStatus){document.querySelector('#overlay').textContent=status;previousStatus=status}if(!last)last=t;if(game.paused){last=t;acc=0;syncPauseButton();syncShotButtonsForPhase();render();requestAnimationFrame(frame);return}acc+=Math.min(.1,(t-last)/1000);last=t;while(acc>=1/120){game.update(1/120);acc-=1/120}syncPauseButton();syncShotButtonsForPhase();for(const event of game.events.splice(0))playEffect(event);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
const aimPad=document.querySelector('#aim-pad'),aimThumb=document.querySelector('#aim-pad .aim-pad-thumb');
function syncAimPad(){const displayAim=game.phase==='serve'?serveAim(game.server,game.aim):game.aim,percent=((displayAim-1)/18)*100;aimThumb.style.left=`${percent}%`;aimPad.setAttribute('aria-valuenow',String(Math.round(displayAim*10)/10))}
function aimFromPad(event){const rect=aimPad.getBoundingClientRect();game.aim=Math.max(1,Math.min(19,1+(event.clientX-rect.left)/rect.width*18));syncAimPad()}
syncAimPad();
aimPad.addEventListener('pointerdown',event=>{if(game.paused)return;aimFromPad(event);aimPad.setPointerCapture(event.pointerId)});
aimPad.addEventListener('pointermove',event=>{if(!game.paused&&aimPad.hasPointerCapture(event.pointerId))aimFromPad(event)});
aimPad.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();game.nudgeAim(event.key==='ArrowLeft'?-1:1,event.shiftKey);syncAimPad()});
const attackButton=document.querySelector('[data-shot="attack"]'),softButton=document.querySelector('[data-shot="soft"]'),lobButton=document.querySelector('[data-shot="lob"]');let previousHumanServe=null,previousPaused=null;
function syncShotButtonsForPhase(){const humanServe=game.mode==='play'&&game.phase==='serve'&&game.server.id===0,paused=game.paused;if(humanServe===previousHumanServe&&paused===previousPaused)return;previousHumanServe=humanServe;previousPaused=paused;attackButton.querySelector('small').textContent=humanServe?'HARD SERVE':'DRIVE · HIGH';softButton.querySelector('small').textContent=humanServe?'SOFT SERVE':'DROP / DINK';lobButton.querySelector('small').textContent=humanServe?'NOT ON SERVE':'ANYWHERE';attackButton.disabled=paused;softButton.disabled=paused;lobButton.disabled=humanServe||paused}
syncShotButtonsForPhase();
function setShot(s){game.shot=s;document.querySelectorAll('[data-shot]').forEach(b=>{b.classList.toggle('active',b.dataset.shot===s);b.setAttribute('aria-pressed',String(b.dataset.shot===s))})}function triggerShot(s){if(game.paused)return;setShot(s);game.swing()}setShot('attack');document.querySelectorAll('[data-shot]').forEach(b=>{b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();triggerShot(b.dataset.shot)});b.addEventListener('click',e=>{if(e.detail===0)triggerShot(b.dataset.shot)})});for(const restartButton of document.querySelectorAll('#restart,#restart-top'))restartButton.onclick=()=>{setPaused(false);selectionUI.open()};document.querySelector('#mode').onclick=e=>{game.mode=game.mode==='play'?'watch':'play';e.target.textContent='MODE: '+game.mode.toUpperCase();game.reset();setShot('attack');syncPauseButton()};function aim(e){const rect=canvas.getBoundingClientRect();game.aim=Math.max(1,Math.min(19,(e.clientX-rect.left)/rect.width*20));syncAimPad()}canvas.addEventListener('pointerdown',e=>{if(game.paused)return;aim(e);if(e.pointerType==='mouse')game.swing();else canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!game.paused&&(e.pointerType==='mouse'||e.buttons))aim(e)});window.addEventListener('keydown',e=>{if(selectionUI?.isOpen())return;if(e.key==='p'||e.key==='P'||e.key==='Escape'){e.preventDefault();if(!e.repeat)setPaused(!game.paused);return}if(game.paused)return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)game.swing()}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();game.nudgeAim(e.key==='ArrowLeft'?-1:1,e.shiftKey);syncAimPad()}const s={1:'attack',2:'soft',3:'lob'}[e.key];if(s&&!(game.phase==='serve'&&game.server.id===0&&s==='lob')){if(!e.repeat)triggerShot(s)}});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!selectionUI?.isOpen())setPaused(true)});


selectionUI=setupSelection({game,drawPreview:drawLoadoutPreview,onStart:()=>{document.querySelector('#active-loadout').textContent=`${game.players[0].name} · ${game.players[0].paddle.id==='power'?'Ignite':game.players[0].paddle.id==='control'?'Touch':'Allcourt'} · First to 11, win by 2`;setShot('attack');document.querySelector('#mode').textContent='MODE: '+game.mode.toUpperCase();syncDifficultyButton();syncPauseButton();last=0;acc=0}});document.querySelector('#setup-button').onclick=()=>selectionUI.open();
if(animationTestMode){
 const panel=document.querySelector('#animation-test'),status=document.querySelector('#animation-test-status');
 const requestedShot=animationQuery.get('shot'),requestedCharacter=animationQuery.get('character');
 animationTestShot=ANIMATION_TEST_STROKES.includes(requestedShot)?requestedShot:'overhead';
 animationTestCharacter=['avery','selena'].includes(requestedCharacter)?requestedCharacter:'avery';
 document.querySelector('#match-setup').close();panel.hidden=false;document.querySelector('.controls').hidden=true;document.querySelector('footer').hidden=true;document.querySelector('#setup-button').hidden=true;
 function activateAnimationTest(shot=animationTestShot,character=animationTestCharacter){animationTestShot=shot;animationTestCharacter=character;animationTestPlayer=forceSpecialShot(game,{shot,character});animationTestStarted=performance.now();panel.querySelectorAll('[data-animation-shot]').forEach(b=>b.classList.toggle('active',b.dataset.animationShot===shot));panel.querySelectorAll('[data-animation-character]').forEach(b=>b.classList.toggle('active',b.dataset.animationCharacter===character));const twoHanded=character==='selena'&&shot==='backhand';status.textContent=`${character==='selena'?'Female':'Male'} · ${shot.toUpperCase()}${twoHanded?' · TWO-HANDED':''} · ${SWING_SECONDS.toFixed(1)}s swing, ${ANIMATION_CYCLE_SECONDS.toFixed(1)}s loop`}
 panel.querySelectorAll('[data-animation-shot]').forEach(b=>b.onclick=()=>activateAnimationTest(b.dataset.animationShot,animationTestCharacter));
 panel.querySelectorAll('[data-animation-character]').forEach(b=>b.onclick=()=>activateAnimationTest(animationTestShot,b.dataset.animationCharacter));
 try{activateAnimationTest()}catch(error){console.error(error);status.textContent=`ANIMATION TEST ERROR: ${error.message}`}
}
