import {Game} from './game.js';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),game=new Game();let last=0,acc=0;
// Short synthesized effects; audio is unlocked by the first user gesture.
let audioContext=null,soundEnabled=true;
const soundButton=document.querySelector('#sound');
async function unlockAudio(){if(!soundEnabled)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')await audioContext.resume();soundButton.dataset.audioState=audioContext.state}catch{soundButton.dataset.audioState='unavailable'}}
window.addEventListener('pointerdown',unlockAudio);window.addEventListener('keydown',unlockAudio);
soundButton.onclick=()=>{soundEnabled=!soundEnabled;soundButton.textContent=soundEnabled?'SOUND: ON':'SOUND: OFF';soundButton.setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)unlockAudio()};
function playEffect(event){if(!soundEnabled||audioContext?.state!=='running')return;const t=audioContext.currentTime,gain=audioContext.createGain(),osc=audioContext.createOscillator();const hit=event.type==='hit',net=event.type==='net';osc.type=net?'sawtooth':hit?'triangle':'sine';osc.frequency.setValueAtTime(net?125:hit?(event.shot==='drive'?760:540):220,t);osc.frequency.exponentialRampToValueAtTime(net?60:hit?180:85,t+.065);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(hit?.075:.045,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+.09);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.1)}
const project=(x,y,z=0)=>({x:480+(x-10)*(13+y*.21),y:145+y*8.5-z*14});
function poly(points,fill,stroke='#f8edc7',width=2){ctx.beginPath();points.forEach(([x,y],i)=>{const p=project(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function line(a,b,color='#f8edc7',width=3){const p=project(...a),q=project(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}
// Original generated sprite sheet; recolor only the yellow jersey pixels per player.
const spriteVariants=[],swingVariants=[];
function loadSpriteVariants(path,variants){const sheet=new Image();sheet.onload=()=>{const colors=[[238,182,43],[226,102,79],[83,155,221],[164,126,205]];for(const color of colors){const c=document.createElement('canvas');c.width=sheet.width;c.height=sheet.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(sheet,0,0);const image=x.getImageData(0,0,c.width,c.height),d=image.data;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(d[i+3]&&r>135&&g>85&&g>r*.48&&b<r*.35&&b<g*.52){const light=Math.min(1.25,(r+g)/(2*190));d[i]=Math.min(255,color[0]*light);d[i+1]=Math.min(255,color[1]*light);d[i+2]=Math.min(255,color[2]*light)}}x.putImageData(image,0,0);variants.push(c)}};sheet.src=path}
loadSpriteVariants('./assets/player-sprites-v1.png',spriteVariants);
loadSpriteVariants('./assets/vertical-swings-v1.png',swingVariants);
function drawSprite(p,q){
 const scale=.8+p.y/100,moving=p.motion!=='planted'&&Math.hypot(p.vx,p.vy)>1.2;
 const back=p.team===0,swinging=(p.windup>0||p.swing>0)&&swingVariants.length===4;
 const progress=p.swing/(p.swingDuration||.36);const gait=Math.floor((p.stride||0)/1.1);const row=back?1:0,col=swinging?(p.windup>0?1:progress>.7?2:progress>.3?3:0):(moving?(p.motion==='shuffle'?(gait%2?1:3):1+gait%3):0);
 const sw=swinging?384:350.5,sh=swinging?512:280.5,sx=col*sw,sy=row*sh;
 ctx.save();ctx.translate(Math.round(q.x),Math.round(q.y));ctx.scale(scale,scale);
 ctx.fillStyle='#101f1a80';ctx.beginPath();ctx.ellipse(0,0,18,6,0,0,Math.PI*2);ctx.fill();
 if(p.id===0&&game.mode==='play'){ctx.strokeStyle=game.canHumanHit()?'#fff':'#39d9f5';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,20,7,0,0,Math.PI*2);ctx.stroke()}
 if(p.swing>0&&progress>.7&&p.contactPoint){const point=project(p.contactPoint.x,p.contactPoint.y,p.contactPoint.z);ctx.translate(Math.max(-7,Math.min(7,(point.x-q.x)/scale-(p.swingSide||1)*23)),Math.max(-6,Math.min(6,(point.y-q.y)/scale+35)))}if(p.swing>0&&(p.swingSide||1)<0)ctx.scale(-1,1);if(p.stroke==='volley'&&swinging)ctx.scale(1,.96);ctx.imageSmoothingEnabled=false;
 if(swinging)ctx.drawImage(swingVariants[p.appearance.jersey%4],sx,sy,sw,sh,-29,-78,58,91);else ctx.drawImage(spriteVariants[p.appearance.jersey%4],sx,sy,sw,sh,-35,-77,70,80);ctx.restore();
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
function render(){ctx.fillStyle='#163b3b';ctx.fillRect(0,0,960,600);ctx.fillStyle='#254d43';for(let i=0;i<960;i+=40)ctx.fillRect(i,110,20,490);poly([[-3.6,-2.4],[23.6,-2.4],[23.6,47.1],[-3.6,47.1]],'#122a29',null);poly([[-3.4,-2.4],[23.4,-2.4],[23.4,46.4],[-3.4,46.4]],'#263d3a',null);poly([[-3,-2],[23,-2],[23,46],[-3,46]],'#507b70',null);poly([[0,0],[20,0],[20,44],[0,44]],'#357282');poly([[0,15],[20,15],[20,29],[0,29]],'#bc755e',null);ctx.fillStyle='#ffffff0b';for(const speck of courtSpeckles){const q=project(speck.x,speck.y);ctx.fillRect(q.x,q.y,2,1)}poly([[0,0],[20,0],[20,44],[0,44]],'transparent','#e9eee0',3);line([0,15],[20,15]);line([0,29],[20,29]);line([10,0],[10,15]);line([10,29],[10,44]);if(game.mode==='play'&&game.phase!=='serve'){const target=project(game.aim,game.shot==='dink'?14:game.shot==='drop'?12:4);ctx.strokeStyle='#39d9f5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(target.x,target.y,13,6,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(target.x-17,target.y);ctx.lineTo(target.x+17,target.y);ctx.moveTo(target.x,target.y-10);ctx.lineTo(target.x,target.y+10);ctx.stroke()}
 const netL=project(-.5,22),netR=project(20.5,22);ctx.fillStyle='#25323c';ctx.fillRect(netL.x,netL.y-30,netR.x-netL.x,30);ctx.strokeStyle='#94a79e';ctx.lineWidth=1;for(let x=netL.x;x<netR.x;x+=10){ctx.beginPath();ctx.moveTo(x,netL.y-30);ctx.lineTo(x,netL.y);ctx.stroke()}for(let y=netL.y-24;y<netL.y;y+=7){ctx.beginPath();ctx.moveTo(netL.x,y);ctx.lineTo(netR.x,y);ctx.stroke()}ctx.fillStyle='#f9e6bd';ctx.fillRect(netL.x,netL.y-32,netR.x-netL.x,5);ctx.fillStyle='#bdc8bf';ctx.fillRect(netL.x-3,netL.y-36,5,39);ctx.fillRect(netR.x-2,netR.y-36,5,39);
 if(game.phase==='rally'){ctx.fillStyle='#fff1a744';for(let i=0;i<game.trail.length;i+=2){const t=game.trail[i],q=project(t.x,t.y,t.z);ctx.fillRect(q.x-2,q.y-2,4,4)}}if(game.bounceMark?.time>0){const q=project(game.bounceMark.x,game.bounceMark.y);ctx.strokeStyle='#fff5ab';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,10+(1-game.bounceMark.time/.35)*8,4,0,0,Math.PI*2);ctx.stroke()}
 const entities=[...game.players.map(p=>({kind:'player',y:p.y,p})),{kind:'ball',y:game.ball.y,p:game.ball}].sort((a,b)=>a.y-b.y);for(const e of entities){const p=e.p,q=project(p.x,p.y);if(e.kind==='ball'){ctx.fillStyle='#17312b88';ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(3,8-p.z*.35),Math.max(2,4-p.z*.1),0,0,7);ctx.fill();const b=project(p.x,p.y,p.z);ctx.fillStyle='#f9f36c';ctx.fillRect(b.x-4,b.y-4,8,8);continue}if(spriteVariants.length===4)drawSprite(p,q);else drawPlayer(p,q)}
 if(game.contact&&game.contact.time>0){const c=project(game.contact.x,game.contact.y,game.contact.z);ctx.fillStyle='#fff9c9';ctx.fillRect(c.x-10,c.y-2,20,4);ctx.fillRect(c.x-2,c.y-10,4,20)}
 ctx.fillStyle='#1b2939';ctx.fillRect(20,15,365,77);ctx.fillStyle='#f9d46a';ctx.font='bold 17px monospace';ctx.fillText('DRIVES & DINKS  /  '+(game.mode==='play'?'PLAY':'WATCH'),32,38);ctx.fillStyle='#fff8df';ctx.font='bold 23px monospace';ctx.fillText(`YOU ${game.score.points[0]}   :   ${game.score.points[1]} CPU`,32,68);ctx.font='bold 16px monospace';ctx.fillStyle='#fff6d9';ctx.fillText(`SERVE ${game.score.team===0?'YOU':'CPU'}  ${game.score.call}`,560,35);ctx.fillStyle='#f9d46a';ctx.fillText(game.phase==='over'?(game.score.winner===0?'YOU WIN!':'CPU WINS!'):(game.canHumanHit()?'HIT NOW!':game.message),560,62);if(game.phase==='pause'||game.phase==='over'){ctx.fillStyle='#1b2939';ctx.fillRect(235,260,490,75);ctx.textAlign='center';ctx.fillStyle='#fff6d9';ctx.font='bold 19px monospace';ctx.fillText(game.result,480,288);ctx.fillStyle='#f9d46a';ctx.fillText(game.outcome,480,316);ctx.textAlign='start'};ctx.fillStyle='#fff';ctx.font='13px monospace';ctx.fillText(game.phase==='serve'?'SERVE: AUTO AIM':'TARGET: '+(game.aim<7?'LEFT':game.aim>13?'RIGHT':'CENTER'),560,83)}
let previousStatus='';function frame(t){const status=game.phase==='pause'||game.phase==='over'?`${game.result} · ${game.outcome}`:`YOU ${game.score.points[0]} - ${game.score.points[1]} CPU | SERVE ${game.score.team===0?'YOU':'CPU'} ${game.score.call} | TARGET ${game.aim<7?'LEFT':game.aim>13?'RIGHT':'CENTER'} | ${game.canHumanHit()?'HIT NOW':game.message}`;if(status!==previousStatus){document.querySelector('#overlay').textContent=status;previousStatus=status}if(!last)last=t;acc+=Math.min(.1,(t-last)/1000);last=t;while(acc>=1/120){game.update(1/120);acc-=1/120}for(const event of game.events.splice(0))playEffect(event);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
function setShot(s){game.shot=s;document.querySelectorAll('[data-shot]').forEach(b=>b.classList.toggle('active',b.dataset.shot===s))}setShot('drive');document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>setShot(b.dataset.shot));document.querySelector('#hit').onclick=()=>game.swing();document.querySelector('#restart').onclick=()=>{game.reset();setShot('drive')};document.querySelector('#mode').onclick=e=>{game.mode=game.mode==='play'?'watch':'play';e.target.textContent='MODE: '+game.mode.toUpperCase();game.reset();setShot('drive')};function aim(e){const rect=canvas.getBoundingClientRect();game.aim=Math.max(1,Math.min(19,(e.clientX-rect.left)/rect.width*20))}canvas.addEventListener('pointerdown',e=>{aim(e);if(e.pointerType==='mouse')game.swing();else canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)aim(e)});window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat)game.swing()}if(e.key==='ArrowLeft')game.aim=Math.max(1,game.aim-1);if(e.key==='ArrowRight')game.aim=Math.min(19,game.aim+1);const s={1:'drive',2:'drop',3:'dink',4:'lob'}[e.key];if(s)setShot(s)});

