import {CONTACT_PHASE,drawPixelCharacter} from './pixel-character.js?v=3';
import {drawSmoothCharacter} from './art-renderer.js?v=3';
const ids={current:document.querySelector('#current'),rounded:document.querySelector('#rounded'),volume:document.querySelector('#volume')};
const motion=document.querySelector('#motion'),view=document.querySelector('#view'),speed=document.querySelector('#speed'),phaseInput=document.querySelector('#phase'),phaseLabel=document.querySelector('#phase-value'),playButton=document.querySelector('#play');
let playing=true,phase=0,last=0;
const appearance=(body)=>({body,shirtColor:'green',paddleColor:'mint',hairColor:'brown',skinColor:'medium'});
function background(c){c.setTransform(2,0,0,2,0,0);c.imageSmoothingEnabled=true;c.fillStyle='#15333c';c.fillRect(0,0,380,210);const sky=c.createLinearGradient(0,0,0,165);sky.addColorStop(0,'#1c444a');sky.addColorStop(1,'#14343d');c.fillStyle=sky;c.fillRect(0,0,380,170);c.fillStyle='#2e5a5c';c.fillRect(0,164,380,46);c.fillStyle='#90b2a0';c.fillRect(0,174,380,1);c.fillStyle='#0a1b2044';c.beginPath();c.ellipse(190,184,150,16,0,0,Math.PI*2);c.fill();c.fillStyle='#8fc3b5';c.font='9px monospace';c.textAlign='center';c.fillText(view.value==='near'?'NET ↑ · BACK VIEW':'NET ↓ · FRONT VIEW',190,17)}
function renderPair(key,style){const canvas=ids[key],c=canvas.getContext('2d');background(c);for(const [body,cx] of [['male',110],['female',270]]){if(key==='current')drawPixelCharacter(c,{appearance:appearance(body),mode:motion.value,phase,frame:phase*4,x:cx,y:7,width:116,height:150,view:view.value});else drawSmoothCharacter(c,{appearance:appearance(body),mode:motion.value,phase,frame:phase*4,cx,top:7,width:128,height:170,view:view.value,style})}}
function draw(){for(const [key,style] of [['current','rounded'],['rounded','rounded'],['volume','volume']])renderPair(key,style)}
function pause(){playing=false;playButton.textContent='Play'}
playButton.onclick=()=>{playing=!playing;playButton.textContent=playing?'Pause':'Play'};
motion.onchange=draw;view.onchange=draw;speed.onchange=()=>{};
phaseInput.oninput=()=>{pause();phase=Number(phaseInput.value)/1000;draw()};
document.querySelector('#impact').onclick=()=>{pause();phase=CONTACT_PHASE;phaseInput.value=Math.round(phase*1000);draw()};
function tick(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(playing)phase=(phase+dt*Number(speed.value)/1.25)%1;phaseInput.value=Math.round(phase*1000);phaseLabel.textContent=`${Math.round(phase*100)}%${Math.abs(phase-CONTACT_PHASE)<.025?' · IMPACT':''}`;draw();requestAnimationFrame(tick)}
draw();requestAnimationFrame(tick);
