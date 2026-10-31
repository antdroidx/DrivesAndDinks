import {setupSelection} from './selection.js?v=18';
import {PADDLE_DESIGNS,CHARACTERS} from './roster.js?v=18';
import {Game} from './game.js?v=18';
import {selectShot,serveAim} from './core.js?v=18';
import {ANIMATION_TEST_STROKES,SWING_SECONDS,ANIMATION_CYCLE_SECONDS,forceSpecialShot,applySpecialShotAnimation} from './animation-test.js?v=18';
import {sampleStrokeAnimation} from './stroke-animation.js?v=18';
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
// Original generated sprite sheet; recolor only the yellow jersey pixels per player.
let spriteVariants=[],swingVariants=[],femaleSpriteVariants=[];spriteVariants=Array.from({length:4},()=>null);swingVariants=Array.from({length:4},()=>null);femaleSpriteVariants=Array.from({length:4},()=>null);
const spritePaths=['./assets/player-sprites-v1.png','./assets/vertical-swings-v1.png','./assets/female-player-skirt-v2.png'];
const spriteTargets=[spriteVariants,swingVariants,femaleSpriteVariants];
function loadSpriteVariants(i){
 const path=spritePaths[i],variants=spriteTargets[i],sheet=new Image();
 sheet.onload=()=>{
  const colors=[[238,182,43],[226,102,79],[83,155,221],[164,126,205]];
  for(let colorIndex=0;colorIndex<4;colorIndex++){
   const canvas=document.createElement('canvas'),color=colors[colorIndex];
   canvas.width=sheet.width;canvas.height=sheet.height;
   const x=canvas.getContext('2d',{willReadFrequently:true});
   x.drawImage(sheet,0,0);
   const image=x.getImageData(0,0,canvas.width,canvas.height),d=image.data;
   for(let pixel=0;pixel<d.length;pixel+=4){
    const r=d[pixel],g=d[pixel+1],b=d[pixel+2];
    if(d[pixel+3]&&r>135&&g>85&&g>r*.48&&b<r*.35&&b<g*.52&&(g-b)/(r-b)>.5){
     const light=Math.min(1.25,(r+g)/(2*190));
     d[pixel]=Math.min(255,color[0]*light);
     d[pixel+1]=Math.min(255,color[1]*light);
     d[pixel+2]=Math.min(255,color[2]*light);
    }
   }
   x.putImageData(image,0,0);
   variants[colorIndex]=canvas;
  }
  selectionUI?.refreshPreview();
 };
 sheet.onerror=()=>console.warn('Sprite load failed',path);
 sheet.src=path;
}
function spriteAvailable(p){return (p.appearance.body==='female'?femaleSpriteVariants.every(Boolean):spriteVariants.every(Boolean)&&swingVariants.every(Boolean))}
function artFor(p){return p.appearance.body==='female'?[femaleSpriteVariants,null]:[spriteVariants,swingVariants]}
const frameCache=new Map();
function equipmentFrame(variants,jersey,row,col,sw,sh,design,swinging,body='male'){
 const key=[body,swinging,jersey,row,col,design].join(':');if(frameCache.has(key))return frameCache.get(key);
 const c=document.createElement('canvas');c.width=96;c.height=Math.round(96*sh/sw);const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=false;x.drawImage(variants[jersey],col*sw,row*sh,sw,sh,0,0,c.width,c.height);
 const face=PADDLE_DESIGNS.find(d=>d.id===design)||PADDLE_DESIGNS[0];
 const frontMasks=[[.36,.24,.67,.53],[.15,.32,.37,.83],[.32,.2,.68,.54],[.15,.32,.37,.83]],backMasks=[[.68,.22,.9,.67],[.74,.3,.98,.78],[.02,.08,.35,.55],[.68,.3,.98,.78]];
 const swingFront=[[.35,.28,.7,.7],[0,.02,.33,.4],[.7,.2,1,.58],[.65,0,1,.35]],swingBack=[[0,0,0,0],[.6,0,.98,.35],[.7,.2,1,.58],[0,0,.35,.4]];
 const reference=document.createElement('canvas');reference.width=c.width;reference.height=c.height;const rx=reference.getContext('2d',{willReadFrequently:true});rx.imageSmoothingEnabled=false;rx.drawImage(variants[0],col*sw,row*sh,sw,sh,0,0,c.width,c.height);const referencePixels=rx.getImageData(0,0,c.width,c.height).data;

 const box=(swinging?(row?swingBack:swingFront):(row%2?backMasks:frontMasks))[col];const image=x.getImageData(0,0,c.width,c.height),d=image.data;
 for(let y=Math.floor(box[1]*c.height);y<box[3]*c.height;y++)for(let xx=Math.floor(box[0]*c.width);xx<box[2]*c.width;xx++){const i=(y*c.width+xx)*4,r=referencePixels[i],g=referencePixels[i+1],b=referencePixels[i+2];if(d[i+3]>0&&b>r*1.4&&b>g*1.05){const shade=Math.max(.3,Math.min(1.15,(r+g+b)/210));d[i]=face.rgb[0]*shade;d[i+1]=face.rgb[1]*shade;d[i+2]=face.rgb[2]*shade}}
 x.putImageData(image,0,0);frameCache.set(key,c);return c;
}
function drawLoadoutPreview(selection){const c=document.querySelector('#player-preview');if(!c)return;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#122f37';x.fillRect(0,0,c.width,c.height);x.fillStyle='#355e60';x.fillRect(0,160,c.width,40);x.fillStyle='#eff3cf66';x.fillRect(0,175,c.width,2);const selectedBody=CHARACTERS.find(c=>c.id===selection.character).gender,baseline=selectedBody==='female'?femaleSpriteVariants:spriteVariants;if(baseline[selection.jersey]){x.imageSmoothingEnabled=false;const frame=equipmentFrame(baseline,selection.jersey,0,0,350.5,280.5,selection.design,false,selectedBody);x.drawImage(frame,12,12,156,170)}const face=PADDLE_DESIGNS.find(d=>d.id===selection.design);x.fillStyle=face.color;x.fillRect(145,130,18,25);x.fillStyle='#d8d0b7';x.fillRect(151,155,6,12)}
function drawSprite(p,q){
 const scale=.8+p.y/100,moving=p.motion!=='planted'&&Math.hypot(p.vx,p.vy)>1.2;
 const back=p.team===0,swinging=(p.windup>0||p.swing>0);
 const progress=p.swing/(p.swingDuration||.36);const gait=Math.floor((p.stride||0)/1.1);const row=back?1:0,strokeAnimation=swinging?sampleStrokeAnimation(p,1-progress):null,col=swinging?strokeAnimation.frameColumn:(moving?(p.motion==='shuffle'?(gait%2?1:3):1+gait%3):0);
 const female=p.appearance.body==='female',useSwingSheet=swinging&&!female&&strokeAnimation.useSwingSheet;
 const sw=useSwingSheet?384:350.5,sh=useSwingSheet?512:280.5,artRow=swinging&&!useSwingSheet?row+strokeAnimation.artRowOffset:row;
 ctx.save();ctx.translate(Math.round(q.x),Math.round(q.y));ctx.scale(scale,scale);
 ctx.fillStyle='#101f1a80';ctx.beginPath();ctx.ellipse(0,0,18,6,0,0,Math.PI*2);ctx.fill();
 if(p.id===0&&game.mode==='play'){ctx.strokeStyle=game.canHumanHit()?'#fff':'#39d9f5';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,20,7,0,0,Math.PI*2);ctx.stroke()}
 if(p.swing>0&&progress>.7&&p.contactPoint){const point=project(p.contactPoint.x,p.contactPoint.y,p.contactPoint.z);ctx.translate(Math.max(-7,Math.min(7,(point.x-q.x)/scale-(p.swingSide||1)*23)),Math.max(-6,Math.min(6,(point.y-q.y)/scale+35)))}if(strokeAnimation){ctx.translate(0,strokeAnimation.offsetY);ctx.rotate(strokeAnimation.rotation);ctx.scale(1,strokeAnimation.scaleY);if(strokeAnimation.mirror)ctx.scale(-1,1)}ctx.imageSmoothingEnabled=false;
 const [baseVariants,swingSet]=artFor(p),frame=equipmentFrame(useSwingSheet?swingSet:baseVariants,p.appearance.jersey%4,artRow,col,sw,sh,p.appearance.paddleDesign||'ocean',useSwingSheet,p.appearance.body);if(useSwingSheet)ctx.drawImage(frame,-29,-78,58,91);else ctx.drawImage(frame,-35,-77,70,80);if(strokeAnimation?.twoHanded)drawSupportHand(strokeAnimation);ctx.restore();
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

Promise.all(spritePaths.map((_,i)=>new Promise(resolve=>setTimeout(resolve,i*80)).then(()=>loadSpriteVariants(i))));
const courtSpeckles=Array.from({length:160},(_,i)=>({x:((i*137)%1000)/1000*24-2,y:((i*269)%1000)/1000*48-2}));
function render(){ctx.fillStyle='#163b3b';ctx.fillRect(0,0,960,600);ctx.fillStyle='#254d43';for(let i=0;i<960;i+=40)ctx.fillRect(i,110,20,490);poly([[-3.6,-2.4],[23.6,-2.4],[23.6,47.1],[-3.6,47.1]],'#122a29',null);poly([[-3.4,-2.4],[23.4,-2.4],[23.4,46.4],[-3.4,46.4]],'#263d3a',null);poly([[-3,-2],[23,-2],[23,46],[-3,46]],'#507b70',null);poly([[0,0],[20,0],[20,44],[0,44]],'#357282');poly([[0,15],[20,15],[20,29],[0,29]],'#bc755e',null);ctx.fillStyle='#ffffff0b';for(const speck of courtSpeckles){const q=project(speck.x,speck.y);ctx.fillRect(q.x,q.y,2,1)}poly([[0,0],[20,0],[20,44],[0,44]],'transparent','#e9eee0',3);line([0,15],[20,15]);line([0,29],[20,29]);line([10,0],[10,15]);line([10,29],[10,44]);if(game.mode==='play'){const previewShot=game.phase==='serve'?'serve':selectShot(game.players[0],game.ball,game.shot),displayAim=game.phase==='serve'?serveAim(game.server,game.aim):game.aim,target=project(displayAim,game.phase==='serve'?(game.server.team===0?8:36):previewShot==='dink'?14:previewShot==='drop'?12:previewShot==='slice'?6:4);ctx.strokeStyle='#39d9f5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(target.x,target.y,13,6,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(target.x-17,target.y);ctx.lineTo(target.x+17,target.y);ctx.moveTo(target.x,target.y-10);ctx.lineTo(target.x,target.y+10);ctx.stroke()}
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
