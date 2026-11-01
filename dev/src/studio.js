import {MOTIONS,CONTACT_PHASE,drawPixelCharacter,sampleCharacterPose} from './pixel-character.js?v=38';
import {CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS} from './roster.js?v=38';
const labels=['Running','Side-step','Volley','Forehand drive','Backhand drive','Forehand dink','Backhand dink','Forehand drop','Backhand drop','Overhead smash','Lob','Two-hand backhand drive'];
const notes=['Alternating planted feet','Lateral push & recovery','Compact blocking motion','Full side swing','Cross-body follow-through','Short, low lifting arc','Compact cross-body lift','Low to high, longer finish','Cross-body lifting drop','High reach, downward finish','Underhand lift & high finish','Both hands stay on the grip'];
const root=document.querySelector('#motions'),appearance={shirtColor:'green',paddleColor:'mint',hairColor:'brown',skinColor:'medium'};
for(const [id,items] of [['shirtColor',CLOTHING_COLORS],['paddleColor',PADDLE_COLORS],['hairColor',HAIR_COLORS],['skinColor',SKIN_COLORS]]){const select=document.getElementById(id);select.innerHTML=items.map(v=>`<option value="${v.id}">${v.name}</option>`).join('');select.value=appearance[id];select.onchange=()=>appearance[id]=select.value}
const canvases=MOTIONS.map((mode,i)=>{const section=document.createElement('article');section.className='motion';section.innerHTML=`<h2><span>${String(i+1).padStart(2,'0')}</span>${labels[i]}</h2><p>${notes[i]}</p><canvas width="440" height="210" aria-label="${labels[i]}, male and female"></canvas><div class="labels"><span>T-SHIRT + SHORTS</span><span>TENNIS DRESS</span></div>`;root.append(section);return section.querySelector('canvas')});
let playing=true,phase=0,last=0;
const play=document.querySelector('#play'),slider=document.querySelector('#phase');
function pause(){playing=false;play.textContent='Play'}
play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play'};
slider.oninput=()=>{pause();phase=Number(slider.value)/1000};
document.querySelector('#impact').onclick=()=>{pause();phase=CONTACT_PHASE};
function render(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(playing)phase=(phase+dt*Number(document.querySelector('#speed').value)/1.2)%1;
 slider.value=Math.round(phase*1000);document.querySelector('#phase-value').textContent=`${Math.round(phase*100)}%${Math.abs(phase-CONTACT_PHASE)<.025?' · IMPACT':''}`;
 const view=document.querySelector('#view').value;
 canvases.forEach((canvas,i)=>{const c=canvas.getContext('2d'),mode=MOTIONS[i];c.fillStyle='#183440';c.fillRect(0,0,440,210);c.fillStyle='#285058';c.fillRect(0,175,440,35);c.fillStyle='#74968a';c.fillRect(0,185,440,1);
  for(const [j,body] of ['male','female'].entries()){const x=32+j*220,y=12,width=156,height=164;c.fillStyle='#0d252b';c.beginPath();c.ellipse(x+width/2,173,23,5,0,0,Math.PI*2);c.fill();drawPixelCharacter(c,{appearance:{...appearance,body},mode,frame:phase*4,phase,x,y,width,height,view});
   if(i>1&&document.querySelector('#contact').checked){const p=sampleCharacterPose({mode,phase:CONTACT_PHASE}).paddle,hit={x:x+p.x*width/48,y:y+p.y*height/64};const before=phase<CONTACT_PHASE,dist=(phase-CONTACT_PHASE)*100;const bx=hit.x+(before?-dist:dist),by=hit.y+(before?-dist*.35:-dist*.7);c.strokeStyle='#8bdfb744';c.beginPath();c.moveTo(hit.x-6,hit.y);c.lineTo(hit.x+6,hit.y);c.moveTo(hit.x,hit.y-6);c.lineTo(hit.x,hit.y+6);c.stroke();c.fillStyle='#f6e982';c.fillRect(Math.round(bx)-3,Math.round(by)-3,6,6);if(Math.abs(phase-CONTACT_PHASE)<.035){c.strokeStyle='#fff6c3';c.strokeRect(Math.round(hit.x)-7,Math.round(hit.y)-7,14,14)}}
  }
 });requestAnimationFrame(render)}
requestAnimationFrame(render);
