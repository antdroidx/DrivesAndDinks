import {MOTIONS} from './pixel-character.js?v=198';
import {CHARACTER_CONCEPTS,HAIR_OPTIONS,conceptDimensions} from './character-concepts.js?v=198';
import {CLOTHING_COLORS,HAIR_COLORS,PADDLE_COLORS,SKIN_COLORS} from './roster.js?v=198';
import {appearancePalette} from './pixel-character.js?v=198';
import {drawAnimeAthlete,animePixelPalette} from './anime-character.js?v=198';

const $=id=>document.getElementById(id);
const styles=[
 {id:'anime',name:'Anime',note:'A separately drawn model: tapered body and limbs, shaped jaw and expressive eyes, layered hair silhouettes, contrast-panel jersey, pleated skort or court shorts, and detailed trainers. Switch the art direction above for sports anime or warmer storybook styling.'},
 {id:'pixel',name:'Anime Pixel',note:'The same anime body, face, hair and costume rendered on a crisp pixel grid with material color ramps. Uses the Fine pixel treatment. Shares the same art direction and animation as the smooth version.'}
];
$('athlete').innerHTML=CHARACTER_CONCEPTS.map(d=>`<option value="${d.id}">${d.name} · ${d.body}</option>`).join('');
$('motion').innerHTML=['idle',...MOTIONS].map(m=>`<option value="${m}">${m.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</option>`).join('');$('motion').value='forehand';
const PRESETS={baseline:{shirtColor:'green',hairColor:'brown',skinColor:'medium',paddleColor:'mint',highlightColor:'yellow'},stride:{shirtColor:'purple',hairColor:'black',skinColor:'dark',paddleColor:'silver',highlightColor:'pink'},anchor:{shirtColor:'orange',hairColor:'brown',skinColor:'tan',paddleColor:'coral',highlightColor:'yellow'},touch:{shirtColor:'white',hairColor:'brown',skinColor:'light',paddleColor:'blue',highlightColor:'teal'},reach:{shirtColor:'blue',hairColor:'black',skinColor:'dark',paddleColor:'black',highlightColor:'orange'},spark:{shirtColor:'green',hairColor:'red',skinColor:'pale',paddleColor:'pink',highlightColor:'yellow'}};function fillColors(){for(const [id,items] of [['hair-color',HAIR_COLORS],['color',CLOTHING_COLORS],['highlight',PADDLE_COLORS],['paddle',PADDLE_COLORS],['skin',SKIN_COLORS]]){$(id).innerHTML='<option value="design">As designed</option>'+items.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}}fillColors();function updateHair(){const d=CHARACTER_CONCEPTS.find(d=>d.id===$('athlete').value);
 $('outfit').querySelector('[value=shorts]').textContent=d.body==='female'?'Crop top + shorts':'Sleeveless + shorts';$('hair').innerHTML='<option value="design">As designed</option>'+HAIR_OPTIONS[d.body].map(h=>`<option value="${h.id}">${h.name}</option>`).join('')}
$('athlete').onchange=updateHair;updateHair();
const cards=styles.map(style=>{const article=document.createElement('article');article.className='design';article.innerHTML=`<div class="card-head"><h3>${style.name}</h3><span>0${styles.indexOf(style)+1}</span></div><canvas width="960" height="774" aria-label="${style.name} synchronized animation"></canvas><div class="card-copy"><p>${style.note}</p></div>`;$('designs').append(article);const canvas=article.querySelector('canvas');if(style.id==='pixel')canvas.style.imageRendering='pixelated';return {...style,canvas}});
const pixelBuffers=new Map();
function warm(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)),paper=[210,187,140];return '#'+rgb.map((v,i)=>Math.round(v*.82+paper[i]*.18).toString(16).padStart(2,'0')).join('')}
function draw(c,id,d,mode,phase,view,x,y,scale){
 const look=$('look').value;
 if(id==='anime'||id==='pixel'){const preset=PRESETS[d.id]??PRESETS.baseline,selection={...preset,hairColor:$('hair-color').value==='design'?preset.hairColor:$('hair-color').value,shirtColor:$('color').value==='design'?preset.shirtColor:$('color').value,highlightColor:$('highlight').value==='design'?preset.highlightColor:$('highlight').value,paddleColor:$('paddle').value==='design'?preset.paddleColor:$('paddle').value,skinColor:$('skin').value==='design'?preset.skinColor:$('skin').value},palette=appearancePalette(selection);d={...d,outfit:$('outfit').value,eyewear:$('eyewear').value,shirt:palette.shirt,hairColor:palette.hair,skin:palette.skin,trim:palette.highlight,paddleColor:palette.paddle}}
 if((id==='anime'||id==='pixel')&&look==='storybook')d={...d,shirt:warm(d.shirt),skin:warm(d.skin),trim:warm(d.trim),hairColor:warm(d.hairColor)};
 if(id==='anime'){drawAnimeAthlete(c,d,mode,phase,view,x,y,scale,{look});return}
 const resolution=144,rasterScale=resolution/96;
 let buffer=pixelBuffers.get(view);if(!buffer){const canvas=document.createElement('canvas');canvas.width=resolution;canvas.height=resolution;buffer={canvas,context:canvas.getContext('2d',{willReadFrequently:true})};pixelBuffers.set(view,buffer)}
 const key=JSON.stringify([d,mode,phase,view,look,resolution]);if(buffer.key!==key){
  const pc=buffer.context;if(buffer.canvas.width!==resolution){buffer.canvas.width=resolution;buffer.canvas.height=resolution}pc.clearRect(0,0,resolution,resolution);drawAnimeAthlete(pc,d,mode,phase,view,48*rasterScale,84*rasterScale,rasterScale,{look});
  const palette=animePixelPalette(d);
  const data=pc.getImageData(0,0,resolution,resolution);for(let i=0;i<data.data.length;i+=4){if(data.data[i+3]<160){data.data[i+3]=0;continue}data.data[i+3]=255;let best=palette[0],distance=Infinity;for(const rgb of palette){const delta=rgb.reduce((sum,v,j)=>sum+(v-data.data[i+j])**2,0);if(delta<distance){best=rgb;distance=delta}}for(let j=0;j<3;j++)data.data[i+j]=best[j]}pc.putImageData(data,0,0);buffer.key=key;
 }
 c.save();c.imageSmoothingEnabled=false;c.drawImage(buffer.canvas,x-48*scale,y-84*scale,96*scale,96*scale);c.restore();
}
let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,phase=0,last=0;
function syncPlay(){$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing))}syncPlay();
$('play').onclick=()=>{playing=!playing;syncPlay()};$('phase').oninput=()=>{playing=false;syncPlay();phase=Number($('phase').value)/1000};$('ready').onclick=()=>{playing=false;syncPlay();$('motion').value='idle';phase=0};$('impact').onclick=()=>{playing=false;syncPlay();if($('motion').value==='idle')$('motion').value='forehand';phase=.52};
$('reset').onclick=()=>{for(const id of ['height','build'])$(id).value=0;for(const id of ['hair','headwear','color','hair-color','highlight','paddle','skin'])$(id).value='design';$('outfit').value='performance';$('eyewear').value='none'};
function render(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(playing&&!document.hidden)phase=(phase+dt*Number($('speed').value)/1.4)%1;$('phase').value=Math.round(phase*1000);$('phase-value').textContent=`${Math.round(phase*100)}%`;
 const source=CHARACTER_CONCEPTS.find(d=>d.id===$('athlete').value),d=conceptDimensions(source,Number($('height').value),Number($('build').value)/100);if($('hair').value!=='design')d.hair=$('hair').value;if($('headwear').value!=='design')d.headwear=$('headwear').value;if($('color').value!=='design')d.shirt=$('color').value;
 const views=$('view').value==='both'?['far','near']:[$('view').value],mode=$('motion').value;
 for(const card of cards){const c=card.canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.fillStyle='#203740';c.fillRect(0,0,480,387);c.fillStyle='#29444a';c.fillRect(0,272,480,115);c.strokeStyle='#9aafa177';c.beginPath();c.moveTo(0,273);c.lineTo(480,273);c.stroke();
 for(const [i,v] of views.entries()){const x=views.length===1?240:125+i*230;c.textAlign='center';c.font='10px system-ui';c.fillStyle='#bdcecd';c.fillText(v==='far'?'FRONT':'BACK',x,22);draw(c,card.id,d,mode,phase,v,x,266,2.9);draw(c,card.id,d,mode,phase,v,x,367,.95);c.font='9px system-ui';c.fillStyle='#bdcecd';c.fillText('SMALL COURT SAMPLE',x,382)}
 }requestAnimationFrame(render)}requestAnimationFrame(render);
