import {MOTIONS} from './pixel-character.js?v=102';
import {CHARACTER_CONCEPTS,HAIR_OPTIONS,conceptDimensions} from './character-concepts.js?v=102';
import {drawConceptAthlete} from './detailed-character.js?v=102';

const $=id=>document.getElementById(id);
const styles=[
 {id:'matte',name:'Matte athletic',note:'Full athletic proportions, matte colors and a much subtler nose. Fine hair strands, garment seams and cloth shadows add detail without shine.'},
 {id:'anime',name:'Sports anime',note:'Expressive layered eyes, a subtle nose, sculpted hair locks, jersey seams and restrained cel shading. Athletic proportions remain readable in motion.'},
 {id:'painted',name:'Warm storybook',note:'Ghibli-inspired warmth: earthy colors, gentle facial features, soft hair locks and quiet cloth shadows. A hand-drawn direction interpreted with the animated rig.'},
 {id:'compact',name:'Compact sports cartoon',note:'Shorter limbs, larger head and slightly larger shoes. A rounded sports-game silhouette with connected arms and legs.'},
 {id:'pixel',name:'Pixel miniature',note:'A richer pixel study with twice the source resolution, material-specific color ramps, layered eyes, hair locks and jersey detail. Still a procedural study rather than a finished authored sprite sheet.'},
 {id:'toy',name:'Super-deformed sports',note:'Power Pros-inspired oversized head, small torso, floating round hands and oversized shoes. Matte surfaces keep the toy proportions without the glossy finish.'}
];
$('athlete').innerHTML=CHARACTER_CONCEPTS.map(d=>`<option value="${d.id}">${d.name} · ${d.body}</option>`).join('');
$('motion').innerHTML=['idle',...MOTIONS].map(m=>`<option value="${m}">${m.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</option>`).join('');$('motion').value='forehand';
function updateHair(){const d=CHARACTER_CONCEPTS.find(d=>d.id===$('athlete').value);$('hair').innerHTML='<option value="design">As designed</option>'+HAIR_OPTIONS[d.body].map(h=>`<option value="${h.id}">${h.name}</option>`).join('')}
$('athlete').onchange=updateHair;updateHair();
const cards=styles.map(style=>{const article=document.createElement('article');article.className='design';article.innerHTML=`<div class="card-head"><h3>${style.name}</h3><span>0${styles.indexOf(style)+1}</span></div><canvas width="960" height="774" aria-label="${style.name} synchronized animation"></canvas><div class="card-copy"><p>${style.note}</p></div>`;$('designs').append(article);return {...style,canvas:article.querySelector('canvas')}});
const pixelBuffers=new Map();
function warm(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)),paper=[210,187,140];return '#'+rgb.map((v,i)=>Math.round(v*.82+paper[i]*.18).toString(16).padStart(2,'0')).join('')}
function draw(c,id,d,mode,phase,view,x,y,scale){
 if(id==='painted')d={...d,shirt:warm(d.shirt),skin:warm(d.skin),trim:warm(d.trim),hairColor:warm(d.hairColor)};
 if(id!=='pixel'){drawConceptAthlete(c,d,mode,phase,view,x,y,scale,{material:id==='reference'?'smooth':'matte',silhouette:id==='compact'||id==='toy'?id:undefined,faceStyle:id==='reference'||id==='toy'?undefined:id==='matte'?'soft':id==='painted'?'storybook':'anime',illustrated:id!=='reference'&&id!=='toy'});return}
 let buffer=pixelBuffers.get(view);if(!buffer){const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;buffer={canvas,context:canvas.getContext('2d',{willReadFrequently:true})};pixelBuffers.set(view,buffer)}
 const key=JSON.stringify([d,mode,phase,view]);if(buffer.key!==key){
  const pc=buffer.context;pc.clearRect(0,0,192,192);drawConceptAthlete(pc,d,mode,phase,view,96,168,2,{material:'matte',faceStyle:'anime',illustrated:true});
  const palette=[d.shirt,d.skin,d.hairColor,d.trim,'#182633','#171b25','#e5dfd0','#fff8ed'].flatMap(hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16));return [rgb,rgb.map(v=>Math.round(v*.65)),rgb.map(v=>Math.round(v*.84)),rgb.map(v=>Math.round(v+(255-v)*.2))]});
  const data=pc.getImageData(0,0,192,192);for(let i=0;i<data.data.length;i+=4){if(data.data[i+3]<160){data.data[i+3]=0;continue}data.data[i+3]=255;let best=palette[0],distance=Infinity;for(const rgb of palette){const delta=rgb.reduce((sum,v,j)=>sum+(v-data.data[i+j])**2,0);if(delta<distance){best=rgb;distance=delta}}for(let j=0;j<3;j++)data.data[i+j]=best[j]}pc.putImageData(data,0,0);buffer.key=key;
 }
 c.save();c.imageSmoothingEnabled=false;c.drawImage(buffer.canvas,x-48*scale,y-84*scale,96*scale,96*scale);c.restore();
}
let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,phase=0,last=0;
function syncPlay(){$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing))}syncPlay();
$('play').onclick=()=>{playing=!playing;syncPlay()};$('phase').oninput=()=>{playing=false;syncPlay();phase=Number($('phase').value)/1000};$('ready').onclick=()=>{playing=false;syncPlay();$('motion').value='idle';phase=0};$('impact').onclick=()=>{playing=false;syncPlay();if($('motion').value==='idle')$('motion').value='forehand';phase=.52};
$('reset').onclick=()=>{for(const id of ['height','build'])$(id).value=0;for(const id of ['hair','headwear','color'])$(id).value='design'};
function render(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(playing&&!document.hidden)phase=(phase+dt*Number($('speed').value)/1.4)%1;$('phase').value=Math.round(phase*1000);$('phase-value').textContent=`${Math.round(phase*100)}%`;
 const source=CHARACTER_CONCEPTS.find(d=>d.id===$('athlete').value),d=conceptDimensions(source,Number($('height').value),Number($('build').value)/100);if($('hair').value!=='design')d.hair=$('hair').value;if($('headwear').value!=='design')d.headwear=$('headwear').value;if($('color').value!=='design')d.shirt=$('color').value;
 const views=$('view').value==='both'?['far','near']:[$('view').value],mode=$('motion').value;
 for(const card of cards){const c=card.canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.fillStyle='#203740';c.fillRect(0,0,480,387);c.fillStyle='#29444a';c.fillRect(0,272,480,115);c.strokeStyle='#9aafa177';c.beginPath();c.moveTo(0,273);c.lineTo(480,273);c.stroke();
 for(const [i,v] of views.entries()){const x=views.length===1?240:125+i*230;c.textAlign='center';c.font='10px system-ui';c.fillStyle='#bdcecd';c.fillText(v==='far'?'FRONT':'BACK',x,22);draw(c,card.id,d,mode,phase,v,x,266,2.9);draw(c,card.id,d,mode,phase,v,x-30,367,.95);if($('reference').checked)draw(c,'reference',d,mode,phase,v,x+35,367,.95);c.font='9px system-ui';c.fillStyle='#bdcecd';c.fillText($('reference').checked?'STYLE     /     EXISTING':'SMALL COURT SAMPLE',x,382)}
 }requestAnimationFrame(render)}requestAnimationFrame(render);
