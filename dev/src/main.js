import {seededRandom} from './competition.js?v=195';
import {createSideReplayRenderer,replayAngleFor} from './side-replay.js?v=195';
import {drawContactCue,replayContactAt} from './contact-cues.js?v=195';
import {playerFeet,footSole} from './player-feet.js?v=195';

import {ReplayClock,faultReplaySample,replayRateAt,highlightReplayCamera,drawFaultContact} from './fault-replay.js?v=195';

import {drawCourtNet,drawNetContact} from './court-net.js?v=195';

import {createCourtArtRenderer,createCourtSurfaceRenderer,retroCourtPalette} from './court-art.js?v=195';

import {createAnimeGameRenderer} from './anime-game.js?v=195';

import {COURT_VENUES,chooseCourtVenue,drawCourtBackdrop} from './court-venues.js?v=195';

import {setupCourtDisplay} from './court-display.js?v=195';

import {CHARACTER_CONCEPTS} from './character-concepts.js?v=195';

import {courtCamera,courtAim,padControl,gameProjection,gameLift,gameGroundSpan,setCourtSideSwitched,visibleCourtY,playerFeetForRig,visibleTravelSide} from './court-camera.js?v=195';
import {NEUTRAL_PLAYER_HEIGHT_CM,ANIME_CANONICAL_BODY_UNITS,ANIME_VISUAL_BODY_UNITS,playerBoxHeight} from './court-scale.js?v=195';

import {movingStance} from './detailed-character.js?v=195';

import {sampleMatchAnimation} from './match-animation.js?v=195';

import {setupSelection} from './selection.js?v=195';
import {readPendingMatch,writeMatchResult,clearPendingMatch,CAREER_MATCH_PARAM} from './career/handshake.js?v=195';import {setupStartScreen} from './start-screen.js?v=195';import {matchIntroTeams,INTRO_RATING_KEYS,INTRO_RATING_LABELS} from './match-intro.js?v=195';

import {COURT_PALETTES,CHARACTERS,levelLineup,SKILL_LEVELS} from './roster.js?v=195';

import {drawPixelCharacter,onCharacterSpritesReady,courtView} from './pixel-character.js?v=195';

import {Game} from './game.js?v=195';
import {C} from './core.js?v=195';

import {selectShot,serveAim,shotDepthTarget} from './core.js?v=195';import {playerEmotionState} from './player-emotion.js?v=195';import {PerformanceMonitor} from './performance-monitor.js?v=195';

import {ANIMATION_TEST_STROKES,SWING_SECONDS,ANIMATION_CYCLE_SECONDS,forceSpecialShot,applySpecialShotAnimation} from './animation-test.js?v=195';

const balanceQuery=new URLSearchParams(location.search),balanceLevel=(location.pathname.includes('/dev/')||['localhost','127.0.0.1'].includes(location.hostname))&&Object.hasOwn(SKILL_LEVELS,balanceQuery.get('level'))?balanceQuery.get('level'):null;
const scenarioType=balanceQuery.get('scenario'),scenarioSpeed=Math.max(.25,Math.min(1,Number(balanceQuery.get('speed'))||.65));

const project=gameProjection;
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),game=new Game(),RENDER_SCALE=2,performanceMonitor=new PerformanceMonitor({canvas});ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);ctx.imageSmoothingEnabled=false;let last=0,acc=0;let selectionUI=null,startScreen=null;

// The promoted release and DEV share the current character and court renderer.
const detailedArtAvailable=true;

let artPreferences={style:'anime',look:'storybook',outfit:'performance',venue:'random',courtStyle:'painted',courtColors:'venue',height:'',build:''};

try{const saved=JSON.parse(localStorage.getItem('drives-dinks.dev-art.v1')||'null');if(saved)for(const key of Object.keys(artPreferences))if(typeof saved[key]==='string')artPreferences[key]=saved[key]}catch{}

artPreferences.style='anime';
artPreferences.look='storybook';

if(!['performance','polo','shorts'].includes(artPreferences.outfit))artPreferences.outfit='performance';

if(artPreferences.venue==='garden')artPreferences.venue='outdoor';if(artPreferences.venue==='campus')artPreferences.venue='indoor';if(artPreferences.venue==='custom'){artPreferences.venue='outdoor';artPreferences.courtColors='custom'}

if(!['none','random',...COURT_VENUES.map(v=>v.id)].includes(artPreferences.venue))artPreferences.venue='random';

if(!['venue','custom'].includes(artPreferences.courtColors))artPreferences.courtColors='venue';

for(const key of ['height','build']){const value=Number(artPreferences[key]),min=key==='height'?145:0,max=key==='height'?210:100;if(artPreferences[key]!==''&&Number.isFinite(value))artPreferences[key]=String(Math.max(min,Math.min(max,value)));else artPreferences[key]=''}

artPreferences.courtStyle='painted';artPreferences.courtColors='custom';

const drawPaintedVenue=detailedArtAvailable?createCourtArtRenderer():null,drawSurface=createCourtSurfaceRenderer((x,y)=>project(x,y));

const drawAnimeGame=createAnimeGameRenderer();let activeVenue=null;

function refreshVenue(){activeVenue=detailedArtAvailable?(artPreferences.venue==='random'?chooseCourtVenue(activeVenue?.id):COURT_VENUES.find(v=>v.id===artPreferences.venue)??null):null;game.setVenue(activeVenue?.id??'outdoor')}refreshVenue();

function saveArtPreferences(){try{localStorage.setItem('drives-dinks.dev-art.v1',JSON.stringify(artPreferences))}catch{}}

const updateCourtHud=setupCourtDisplay();

let displayCamera=courtCamera(),replayCamera=null;

new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width&&height){displayCamera=courtCamera(width/height);const density=Math.min(2,window.devicePixelRatio||1),w=Math.round(width*density),h=Math.round(height*density);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false}}}).observe(canvas);

const currentCamera=()=>replayCamera??displayCamera;

const footPlants=new Map();let selectedDetailedDesign='';

function playerNameplate(name){return String(name||'').split(/\s+/)[0]}
function drawPlayerNameplate(p,q,height){
 const label=playerNameplate(p.name);if(!label)return;
 ctx.save();ctx.font='bold 9px monospace';ctx.textAlign='center';const width=Math.max(34,ctx.measureText(label).width+12),top=q.y-height-17;
 ctx.fillStyle='#10232de8';ctx.fillRect(q.x-width/2,top,width,14);ctx.fillStyle=p.id===0?'#fff8df':'#d8f0df';ctx.fillText(label,q.x,top+10);ctx.restore();
}
function drawPlayer(c,options){const custom=options.personalize?{customHeight:artPreferences.height===''?undefined:Number(artPreferences.height),customBuild:artPreferences.build===''?undefined:.05+Number(artPreferences.build)*.0105}:{};return detailedArtAvailable?drawAnimeGame(c,{...options,...custom,style:artPreferences.style,look:artPreferences.look,outfit:options.outfit??options.appearance?.outfit??artPreferences.outfit}):drawPixelCharacter(c,options)}

const matchIntroDialog=document.querySelector('#match-intro'),matchIntroTeamsRoot=document.querySelector('#match-intro-teams'),beginMatchButton=document.querySelector('#begin-match');
const sideSwitchDialog=document.querySelector('#side-switch-dialog'),sideSwitchContinue=document.querySelector('#side-switch-continue');
function showSideSwitchNotice(){if(sideSwitchDialog.open)return;game.setPaused(true);sideSwitchDialog.showModal()}
sideSwitchContinue.onclick=()=>{sideSwitchDialog.close();game.setPaused(false);syncPauseButton()};sideSwitchDialog.oncancel=event=>event.preventDefault();
function showMatchIntro(players,onBegin){
 matchIntroTeamsRoot.replaceChildren();
 const introTeams=matchIntroTeams(players);for(const team of introTeams){
  const section=document.createElement('section');section.className='intro-team';section.dataset.team=String(team.team);
  const heading=document.createElement('h3');heading.textContent=team.label;section.append(heading);
  for(const card of team.players){
   const article=document.createElement('article');article.className='intro-player';
   const portrait=document.createElement('canvas');portrait.width=264;portrait.height=316;portrait.setAttribute('aria-label',card.name+' character portrait');
   const info=document.createElement('div'),name=document.createElement('h4'),archetype=document.createElement('p'),paddle=document.createElement('p'),overall=document.createElement('div');
   name.textContent=card.name;archetype.className='intro-archetype';archetype.textContent=card.archetype;paddle.className='intro-paddle';paddle.textContent=card.paddleLabel;overall.className='intro-overall';
   const overallLabel=document.createElement('span'),overallValue=document.createElement('strong');overallLabel.textContent='OVERALL';overallValue.textContent=String(card.overall);overall.append(overallLabel,overallValue);
   info.append(name,archetype,paddle,overall);
   for(const key of INTRO_RATING_KEYS){const row=document.createElement('div');row.className='intro-rating';const label=document.createElement('span'),meter=document.createElement('span'),fill=document.createElement('i'),value=document.createElement('span');label.textContent=INTRO_RATING_LABELS[key];meter.className='intro-meter';fill.style.width=card.ratings[key]+'%';meter.append(fill);value.textContent=String(card.ratings[key]);row.append(label,meter,value);info.append(row)}
   article.append(portrait,info);section.append(article);
   try{const c=portrait.getContext('2d');c.setTransform(2,0,0,2,0,0);c.imageSmoothingEnabled=false;c.fillStyle='#173039';c.fillRect(0,0,132,158);drawPlayer(c,{personalize:card.id===0,designId:card.id===0?selectedDetailedDesign:'',appearance:card.appearance,characterId:card.characterId,handedness:card.handedness,mode:'idle',frame:0,phase:0,x:8,y:24,width:116,height:116,view:'far',side:card.handedness==='left'?-1:1,paddleShape:card.paddleShape,lighting:'depth'})}catch(error){console.error(error)}
  }
  matchIntroTeamsRoot.append(section);
  if(team.team===0&&introTeams.some(entry=>entry.team===1)){const versus=document.createElement('div');versus.className='intro-vs';versus.textContent='VS';matchIntroTeamsRoot.append(versus)}
 }
 matchIntroDialog.oncancel=event=>event.preventDefault();
 beginMatchButton.onclick=()=>{matchIntroDialog.close();onBegin()};
 matchIntroDialog.showModal();
  const introHeading=matchIntroDialog.querySelector('.intro-heading');introHeading.tabIndex=-1;introHeading.focus({preventScroll:true});matchIntroDialog.scrollTop=0;
}

if(detailedArtAvailable){

 const panel=document.createElement('div');panel.id='dev-art-options';panel.style.cssText='display:grid;gap:8px;margin:10px 0';

 panel.innerHTML=`<label>Outfit<select id="game-art-outfit" name="outfit"><option value="performance">Performance kit</option><option value="polo">Court polo</option><option value="shorts">Sleeveless + Shorts</option></select></label><label>Court setting<select id="game-art-venue"><option value="none">No background · court color theme</option><option value="random">Random each match</option>${COURT_VENUES.map(v=>`<option value="${v.id}">${v.name}</option>`).join('')}</select></label><label>Height (feet / inches)<input id="game-art-height" type="range" min="145" max="210" step="1"></label><label>Weight (lbs)<input id="game-art-weight" type="range" min="105" max="270" step="1"></label><details class="body-effects-info"><summary aria-label="Body effects information">i</summary><div><p>Taller: more reach and overhead coverage, slower first steps and harder rushed low contacts. Heavier: more power potential, slower acceleration and braking. Lighter / shorter: quicker changes of direction. Shot technique, swing speed and clean contact also generate power. Fitness and hand skill come from ratings.</p><output id="body-effects" aria-live="polite"></output></div></details><a href="style-lab.html">Character motion viewer ↗</a>`;

 document.querySelector('.setup-top').after(panel);

 const heightInput=panel.querySelector('#game-art-height'),weightInput=panel.querySelector('#game-art-weight'),clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||min));
 const weightFromBuild=build=>Math.round(105+clamp(build,0,100)*1.65),buildFromWeight=pounds=>Math.max(0,Math.min(100,(clamp(pounds,105,270)-105)/1.65));
 const sync=()=>{};
 const syncBodyOutputs=()=>{const inches=Math.round(Number(heightInput.value)/2.54);let output=heightInput.nextElementSibling;if(!output||output.tagName!=='OUTPUT'){output=document.createElement('output');heightInput.after(output)}output.textContent=Math.floor(inches/12)+' ft '+(inches%12)+' in';heightInput.setAttribute('aria-valuetext',output.textContent);let weightOutput=weightInput.nextElementSibling;if(!weightOutput||weightOutput.tagName!=='OUTPUT'){weightOutput=document.createElement('output');weightInput.after(weightOutput)}weightOutput.textContent=weightInput.value+' lb';weightInput.setAttribute('aria-valuetext',weightOutput.textContent)};
 for(const key of ['outfit','venue']){const select=panel.querySelector('#game-art-'+key);select.value=artPreferences[key]||'random';select.onchange=()=>{artPreferences[key]=select.value;if(key==='venue')refreshVenue();footPlants.clear();saveArtPreferences();sync();selectionUI?.refreshPreview()}}
 heightInput.value=String(clamp(artPreferences.height||177,145,210));weightInput.value=String(weightFromBuild(artPreferences.build||45));syncBodyOutputs();
 const updateBody=()=>{const height=clamp(heightInput.value,145,210),pounds=clamp(weightInput.value,105,270);heightInput.value=String(height);weightInput.value=String(pounds);artPreferences.height=String(height);artPreferences.build=String(buildFromWeight(pounds));game.setPhysique({height,build:.05+Number(artPreferences.build)*.0105});footPlants.clear();saveArtPreferences();syncBodyOutputs();sync();selectionUI?.refreshPreview()};
 heightInput.oninput=updateBody;weightInput.oninput=updateBody;

 document.querySelector('#match-setup form').addEventListener('change',event=>{if(event.target.name==='court'){artPreferences.courtColors='custom';saveArtPreferences()}});

 sync();

}

const nameTagsButton=document.createElement('button');nameTagsButton.id='name-tags-button';nameTagsButton.type='button';
function syncNameTagsButton(){nameTagsButton.textContent=`NAME TAGS: ${game.showNameTags?'ON':'OFF'}`;nameTagsButton.setAttribute('aria-pressed',String(game.showNameTags))}
nameTagsButton.onclick=()=>{game.showNameTags=!game.showNameTags;try{localStorage.setItem('drives-dinks.name-tags.v1',String(game.showNameTags))}catch{}syncNameTagsButton()};
try{const savedNameTags=localStorage.getItem('drives-dinks.name-tags.v1');if(savedNameTags!==null)game.showNameTags=savedNameTags!=='false'}catch{}
 syncNameTagsButton();document.querySelector('.header-actions').append(nameTagsButton);
const pauseButton=document.querySelector('#pause-button');

const buildLabel=document.querySelector('#build-label'),buildNumber=globalThis.DRIVES_DINKS_BUILD||'dev';buildLabel.textContent=`BUILD ${buildNumber}`;buildLabel.setAttribute('aria-label',`Game build ${buildNumber}`);

const DIFFICULTY_KEY='drives-dinks.difficulty.v1',difficultyButton=document.querySelector('#difficulty');

function syncDifficultyButton(){const label=game.difficulty.toUpperCase();difficultyButton.textContent=`DIFFICULTY: ${label}`;difficultyButton.setAttribute('aria-label',`Difficulty: ${label}`)}

function setDifficulty(value,persist=true){game.setDifficulty(value);syncDifficultyButton();if(persist)try{localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}}

let savedDifficulty='normal';try{savedDifficulty=localStorage.getItem(DIFFICULTY_KEY)||'normal'}catch{}

setDifficulty(savedDifficulty,false);difficultyButton.onclick=()=>setDifficulty(({easy:'normal',normal:'hard',hard:'easy'})[game.difficulty]);

function syncPauseButton(){const paused=replayPlayback?replayClock.paused:game.paused,subject=replayPlayback?'replay':'match';pauseButton.textContent=paused?'RESUME':'PAUSE';pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.setAttribute('aria-label',`${paused?'Resume':'Pause'} ${subject}`);pauseButton.disabled=!replayPlayback&&game.phase==='over'}

function setPaused(paused){if(replayPlayback){replayClock.setPaused(paused,performance.now());syncPauseButton();return}game.setPaused(paused);last=0;acc=0;syncPauseButton();syncShotButtonsForPhase();render()}

pauseButton.onclick=()=>setPaused(replayPlayback?!replayClock.paused:!game.paused);

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

function poly(points,fill,stroke='#f8edc7',width=2){ctx.beginPath();points.forEach(([x,y],i)=>{const p=project(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}

function line(a,b,color='#f8edc7',width=3){const p=project(...a),q=project(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}

// One articulated rig projects anatomical right/left and forward depth

// separately for each end of the court.

function drawLoadoutPreview(selection,profile){

 const c=document.querySelector('#player-preview');if(!c)return;

 const x=c.getContext('2d'),character=CHARACTERS.find(item=>item.id===selection.character),appearance={...(profile?.appearance??{}),body:selection.gender??character.gender,shirtColor:selection.shirtColor,highlightColor:selection.highlightColor,paddleColor:selection.paddleColor,hairStyle:selection.hairStyle,hairColor:selection.hairColor,skinColor:selection.skinColor,headwear:selection.headwear,eyewear:selection.eyewear,outfit:selection.outfit};

 x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,c.width,c.height);x.setTransform(2,0,0,2,0,0);x.imageSmoothingEnabled=false;x.fillStyle='#122f37';x.fillRect(0,0,c.width,c.height);

 x.fillStyle='#355e60';x.fillRect(0,178,c.width,42);x.fillStyle='#eff3cf66';x.fillRect(0,195,c.width,2);

 for(let px=5;px<c.width;px+=20){x.fillStyle='#eff3cf12';x.fillRect(px,178,10,42)}

 try{const drawn=drawPlayer(x,{personalize:true,designId:selectedDetailedDesign,appearance,characterId:selection.character,handedness:selection.handedness,mode:'idle',frame:0,phase:0,x:6,y:22,width:168,height:168,view:'far',side:selection.handedness==='left'?-1:1,paddleShape:selection.paddleShape??'hybrid',lighting:'depth'});c.setAttribute('aria-label',drawn?'Selected player and paddle appearance':'Selected player preview waiting for sprites')}catch(error){c.setAttribute('aria-label',`Selected player preview error: ${error.message}`);console.error(error)}

}

function playerPresentation(p,game,animation){
 const state=playerEmotionState(p,{phase:game.phase,rallyShots:game.shots,incomingShot:game.ball?.shot??game.lastShot,lastPointWinner:game.lastPointWinner});
 return {emotion:state.expression,sweat:state.sweat,emotionIntensity:state.intensity,emotionMarks:state.marks,emotionClock:game.clock};
}
function drawWeatherEffects(c,camera){
 if(game.surfaceKind==='indoor'||!game.conditions?.wind)return;
 const wind=game.conditions.wind,humidity=game.conditions.humidity;
 c.save();c.globalAlpha=.025+humidity*.025;c.fillStyle='#d9eef0';c.fillRect(camera.x,camera.y,camera.width,camera.height);
 c.globalAlpha=.12;c.strokeStyle='#e5f5f2';c.lineWidth=1;
 for(let i=0;i<9;i++){const y=105+(i*43)%180,x=((game.clock*wind*8+i*137)%1120)-80;c.beginPath();c.moveTo(x,y);c.lineTo(x+55+wind*34,y-3);c.stroke()}
 c.restore();
}
function drawDust(dust){

 for(const particle of dust??[]){

  if(particle.life<=0)continue;const t=1-particle.life/.26,q=project(particle.x,particle.y,particle.z);

  ctx.save();ctx.globalAlpha=Math.max(0,(1-t)*.14*particle.strength*(activeVenue?.id==='indoor'?.25:1));

  ctx.fillStyle='#ded2b8';

  const spread=3+t*7;

  for(let i=0;i<particle.count||0;i++){const side=particle.direction*(i?-1:1);ctx.beginPath();ctx.ellipse(q.x+side*(2+i*3),q.y-t*3,spread*.65,spread*.35,0,0,Math.PI*2);ctx.fill()}

  ctx.restore();

 }

}

function drawSprite(p,q,game){

 const heightCm=p.appearance?.height??p.physique?.height??NEUTRAL_PLAYER_HEIGHT_CM,lift=gameLift(p.y),height=playerBoxHeight(heightCm,lift,ANIME_VISUAL_BODY_UNITS,ANIME_CANONICAL_BODY_UNITS),scale=height/94,stance=footPlants.get(p.id)??(footPlants.set(p.id,{}),footPlants.get(p.id)),moving=movingStance(stance,Math.hypot(p.vx,p.vy));

 const animation=sampleMatchAnimation(p,game);

 const mode=animation?.mode??(moving?(['backpedal','crossover'].includes(p.motion)?p.motion:p.motion==='run'?'run':'shuffle'):'idle'),phase=animation?.phase??0;

 const visualTeam=game.sideSwitched?1-p.team:p.team,contactDepthDirection=visualTeam===0?-1:1,width=70.5*scale,contact=p.animationContactStart&&p.swing>0&&p.contactPoint?project(p.contactPoint.x,p.contactPoint.y,p.contactPoint.z):null;

 // Lock the face to the real impact location at phase .52. Release smoothly;

 // only the arm follows the contact, never the feet or the whole character.

 const contactDepth=contact?contactDepthDirection*(p.contactPoint.y-p.y)*gameGroundSpan(p.y)/(height/ANIME_CANONICAL_BODY_UNITS):null;

 const alignStrength=animation?.alignStrength??0;

 ctx.save();ctx.translate(q.x,q.y);ctx.fillStyle='#0b171c66';ctx.beginPath();ctx.ellipse(0,0,16*scale,5*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();

 if(p.id===0&&game.mode==='play'){ctx.strokeStyle=game.canHumanHit()?'#fff':'#39d9f5';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,20,7,0,0,Math.PI*2);ctx.stroke()}

 const handSide=p.handedness==='left'||p.hand==='left'?-1:1;
 const feet=playerFeetForRig(playerFeet(p)).map(foot=>({...foot,screen:project(foot.x,foot.y,foot.z),sole:footSole(foot).map(([x,y])=>project(x,y,foot.z))})); drawPlayer(ctx,{feet,personalize:p.id===0,designId:p.id===0?selectedDetailedDesign:'',plantState:replayPlayback?null:(footPlants.get(p.id)??(footPlants.set(p.id,{}),footPlants.get(p.id))),appearance:p.appearance,characterId:p.characterId,handedness:p.handedness??'right',mode,frame:(p.stride||0)*1.35,phase,moving,x:q.x-width/2,y:q.y-height+2,width,height,view:courtView(visualTeam),side:handSide*(['resetBlock','counterVolley','halfVolley'].includes(mode)&&p.stroke==='backhand'?-1:1),travelSide:visibleTravelSide(p),alignTo:contact,alignStrength,contactDepth,paddleShape:p.paddle?.shapeId??'hybrid',lighting:'depth',...playerPresentation(p,game,animation)});
 if(game.showNameTags!==false)drawPlayerNameplate(p,q,height);

 if(p.id===0&&game.mode==='play'){

 ctx.save();ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle='#10232ded';ctx.fillRect(q.x-65,q.y+9,130,16);ctx.fillStyle='#fff8df';ctx.fillText(game.canHumanHit()?'HIT: 1 / 2 / 3':game.feedbackTime>0?game.message:game.teamPlan?.receiverId===1?'PARTNER BALL':'YOU: AIM + TIME SHOT',q.x,q.y+20);ctx.restore();

 }

}

function drawPixelBall(x,y,radius,squashX=1,squashY=1){

 const rx=Math.max(3,radius*squashX),ry=Math.max(3,radius*squashY),rows=Math.ceil(ry);

 for(let dy=-rows;dy<=rows;dy++){

  const span=Math.floor(rx*Math.sqrt(Math.max(0,1-(dy/ry)**2)));

  ctx.fillStyle=dy<-ry*.45?'#fff08a':dy>ry*.4?'#d2bf45':'#f7e86a';ctx.fillRect(Math.round(x-span),Math.round(y+dy),span*2+1,1);

 }

 ctx.fillStyle='#f9ffd0';ctx.fillRect(Math.round(x-rx*.4),Math.round(y-ry*.45),Math.max(1,Math.round(rx*.45)),1);

 ctx.fillStyle='#75672c';ctx.fillRect(Math.round(x-rx*.15),Math.round(y-ry),1,Math.max(2,Math.round(ry*.5)));ctx.fillRect(Math.round(x+rx*.55),Math.round(y-ry*.2),1,Math.max(2,Math.round(ry*.7)));

}

const courtSpeckles=Array.from({length:190},(_,i)=>({x:((i*137)%1000)/1000*30-5,y:((i*269)%1000)/1000*48-2}));

function drawNet(){const netY=C.net,netL=project(C.netPostLeft,netY),netR=project(C.netPostRight,netY),netPostHeight=Math.abs(project(C.netPostLeft,netY,C.netPostHeight).y-netL.y),netCenterHeight=Math.abs(project(C.width/2,netY,C.netCenterHeight).y-project(C.width/2,netY).y);drawCourtNet(ctx,netL,netR,netPostHeight,{centerHeight:netCenterHeight,retro:artPreferences.courtStyle==='retro'})}

function render(game=liveGame){performanceMonitor.renderStart();try{return renderFrame(game)}finally{performanceMonitor.renderEnd()}}
function renderFrame(game=liveGame){setCourtSideSwitched(Boolean(game.sideSwitched));const camera=currentCamera(),sx=canvas.width/camera.width,sy=canvas.height/camera.height;ctx.setTransform(sx,0,0,sy,-camera.x*sx,-camera.y*sy);

 const customPalette=COURT_PALETTES.find(item=>item.id===game.players[0]?.appearance?.court)??COURT_PALETTES[0],courtStyle=detailedArtAvailable?artPreferences.courtStyle:'painted',basePalette=artPreferences.courtColors==='custom'?customPalette:(activeVenue??customPalette),palette=courtStyle==='retro'&&artPreferences.courtColors!=='custom'?retroCourtPalette(basePalette):basePalette;

 const illustrated=activeVenue&&drawPaintedVenue?.(ctx,activeVenue,camera);
 drawWeatherEffects(ctx,camera);

 if(!illustrated){drawCourtBackdrop(ctx,palette,camera);poly([[-6,-2.4],[26,-2.4],[26,47.1],[-6,47.1]],palette.outer,null);poly([[-5.7,-2.4],[25.7,-2.4],[25.7,46.4],[-5.7,46.4]],palette.outerLight,null);poly([[-5.4,-2],[25.4,-2],[25.4,46],[-5.4,46]],palette.apron,null)}

 drawSurface(ctx,palette,courtStyle,activeVenue?.id??'outdoor');

 if(game.practice){const z=game.practice.targetAt();poly([[z.left,z.top],[z.right,z.top],[z.right,z.bottom],[z.left,z.bottom]],'#69e8bc28','#9cf2cc');const label=project((z.left+z.right)/2,(z.top+z.bottom)/2);ctx.fillStyle='#e5fff2';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('TARGET',label.x,label.y);ctx.textAlign='left'}

 if(game.mode==='play'){const previewShot=game.phase==='serve'?'serve':selectShot(game.players[0],game.ball,game.shot),displayAim=game.phase==='serve'?serveAim(game.server,game.aim):game.aim,target=project(displayAim,game.phase==='serve'?(game.server.team===0?8:36):shotDepthTarget(0,previewShot,game.depth??.5));ctx.strokeStyle='#39d9f5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(target.x,target.y,13,6,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(target.x-17,target.y);ctx.lineTo(target.x+17,target.y);ctx.moveTo(target.x,target.y-10);ctx.lineTo(target.x,target.y+10);ctx.stroke()}

 const ballSpeed=Math.hypot(game.ball.vx||0,game.ball.vy||0,game.ball.vz||0),contactPulse=game.contact?Math.max(0,1-game.contact.time/.12):0;

 if(game.phase==='rally'&&ballSpeed>27){ctx.fillStyle='#fff1a733';for(let i=Math.max(0,game.trail.length-6);i<game.trail.length;i+=1){const t=game.trail[i],q=project(t.x,t.y,t.z),fade=i/game.trail.length;ctx.fillRect(q.x-1-fade,q.y-1-fade,2+fade*2,2+fade*2)}}if(game.bounceMark?.time>0){const q=project(game.bounceMark.x,game.bounceMark.y);ctx.strokeStyle='#fff5ab';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,10+(1-game.bounceMark.time/.35)*8,4,0,0,Math.PI*2);ctx.stroke()}

 const entities=[{kind:'net',y:C.net},...game.players.map(p=>({kind:'player',y:p.y,p})),{kind:'ball',y:game.ball.y,p:game.ball}].sort((a,b)=>visibleCourtY(a.y)-visibleCourtY(b.y));for(const e of entities){if(e.kind==='net'){drawDust(game.dust);drawNet();continue}const p=e.p,q=project(p.x,p.y);if(e.kind==='ball'){ctx.fillStyle='#17312b88';ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(3,8-p.z*.35),Math.max(2,4-p.z*.1),0,0,7);ctx.fill();const b=project(p.x,p.y,p.z),squash=contactPulse>.65?1+(contactPulse-.65)*.9:1;drawPixelBall(b.x,b.y,Math.max(3,5.5-p.z*.22),squash,1/squash);continue}drawSprite(p,q,game)}

 if(game.faultFocus&&game.clock>=game.faultFocus.time)drawFaultContact(ctx,game.faultFocus,project);

 drawContactCue(ctx,game.contact,project,{labels:!!replayPlayback});drawNetContact(ctx,game.netMark,project,{scale:1,labels:true});

 updateCourtHud(game);

 if(game.paused||game.phase==='pause'||game.phase==='over'){const y=300;ctx.fillStyle='#1b2939ee';ctx.fillRect(235,y,490,65);ctx.textAlign='center';ctx.fillStyle='#fff8df';ctx.font='bold 16px monospace';ctx.fillText(game.paused?'MATCH PAUSED':game.result,480,y+25,465);ctx.fillStyle='#f9d46a';ctx.font='bold 14px monospace';ctx.fillText(game.paused?'TAP RESUME TO CONTINUE':game.outcome,480,y+49,465);ctx.textAlign='left'}

}

const liveGame=game;

let replayEnabled=true,replayPlayback=null,replayStarted=0,replayAngle='overview';
const drawSideReplay=createSideReplayRenderer(),replayClock=new ReplayClock();

const automaticallyReplayedPoints=new WeakSet();

const replayBar=document.createElement('div');replayBar.className='replay-banner';replayBar.hidden=true;

const replayLabel=document.createElement('strong'),skipReplay=document.createElement('button'),replayAngleButton=document.createElement('button');replayAngleButton.type='button';replayAngleButton.textContent='ANGLE: OVERVIEW';replayAngleButton.setAttribute('aria-label','Switch replay camera angle');replayAngleButton.onclick=()=>{replayAngle=replayAngle==='sideline'?'overview':'sideline';replayAngleButton.textContent='ANGLE: '+replayAngle.toUpperCase();replayAngleButton.setAttribute('aria-pressed',String(replayAngle==='sideline'))};skipReplay.textContent='SKIP REPLAY';replayBar.append(replayLabel,replayAngleButton,skipReplay);document.querySelector('.game').append(replayBar);

const pointActions=document.querySelector('#point-actions'),pointReplayLabel=document.querySelector('#point-replay-label'),watchPointReplay=document.querySelector('#watch-point-replay');

document.querySelector('.game').append(pointActions);

function beginReplay(clip,startedAt=performance.now(),automatic=false){

 if(!clip||clip.frames.length<=15)return false;

 if(automatic&&game.pointReplay)automaticallyReplayedPoints.add(game.pointReplay);

 replayAngle=replayAngleFor(clip,{aspect:canvas.width/canvas.height});replayAngleButton.textContent='ANGLE: '+replayAngle.toUpperCase();replayAngleButton.setAttribute('aria-pressed',String(replayAngle==='sideline'));replayPlayback=clip;replayStarted=startedAt;replayClock.start(startedAt);document.querySelector('.game').classList.add('replaying');syncPauseButton();replayLabel.textContent=`REPLAY · ${clip.label}`;replayBar.hidden=false;pointActions.hidden=true;return true;

}

function finishReplay(){replayPlayback=null;replayCamera=null;document.querySelector('.game').classList.remove('replaying');syncPauseButton();replayBar.hidden=true;last=0;acc=0;game.hitBuffer=0;}

function syncPointActions(){

 const available=game.phase==='pause'&&!automaticallyReplayedPoints.has(game.pointReplay)&&!replayPlayback&&!document.querySelector('#match-result')?.open&&game.pointReplay?.frames.length>15;

 pointActions.hidden=!available;

 if(available){pointReplayLabel.textContent=game.pointReplay.label;watchPointReplay.disabled=false}

}

watchPointReplay.onclick=()=>beginReplay(game.pointReplay);

skipReplay.onclick=finishReplay;

const replayToggle=document.createElement('button');replayToggle.id='replay-toggle';replayToggle.textContent='REPLAYS: ON';document.querySelector('.header-actions').append(replayToggle);replayToggle.onclick=()=>{replayEnabled=!replayEnabled;replayToggle.textContent=`REPLAYS: ${replayEnabled?'ON':'OFF'}`;finishReplay()};

function playReplay(t){

 if(!replayPlayback)return false;

 if(selectionUI?.isOpen()||game.phase==='serve'){finishReplay();return false;}

const replayProbe=balanceQuery.get('test')==='sideline-replay'&&balanceQuery.get('play')!=='1'&&(location.pathname.includes('/dev/')||['localhost','127.0.0.1'].includes(location.hostname));
 const elapsed=replayProbe?Math.max(0,Number(balanceQuery.get('at'))||1.5):replayClock.elapsed(t),snapshot=faultReplaySample(replayPlayback,elapsed,true);

 if(!snapshot){finishReplay();return false;}
 if(!replayProbe)replayLabel.textContent=`REPLAY · ${replayPlayback.label}${replayRateAt(replayPlayback,elapsed)<1?' · CLOSE CALL · SLOW-MO':''}`;

 if(replayAngle==='sideline'){
  replayCamera=null;const palette=COURT_PALETTES.find(item=>item.id===snapshot.players[0]?.appearance?.court)??COURT_PALETTES[0];
  drawSideReplay(ctx,{width:canvas.width,height:canvas.height},snapshot,replayPlayback,{palette,style:artPreferences.style,look:artPreferences.look,outfit:artPreferences.outfit,showNameTags:game.showNameTags!==false});updateCourtHud({...snapshot,score:{...snapshot.score,call:'REPLAY'}});last=t;acc=0;return true;
 }
 replayCamera=highlightReplayCamera(displayCamera,replayPlayback,project,snapshot);

 render({...snapshot,contact:replayContactAt(replayPlayback,snapshot.clock),score:{...snapshot.score,call:'REPLAY'},server:snapshot.players.find(p=>p.id===snapshot.serverId),canHumanHit:()=>false});last=t;acc=0;return true;

}

window.addEventListener('keydown',event=>{if(replayPlayback){if(event.key==='Tab'||(event.target===pauseButton||event.target.closest?.('.replay-banner button'))&&['Enter',' '].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();if(event.key==='p'||event.key==='P'){if(!event.repeat)setPaused(!replayClock.paused)}else if(event.code==='Space'||event.key==='Escape')finishReplay();}},true);

let previousStatus='',performancePanel=null,performanceRefresh=0;if(balanceQuery.get('test')==='performance'&&(location.pathname.includes('/dev/')||['localhost','127.0.0.1'].includes(location.hostname))){performancePanel=document.createElement('output');performancePanel.id='performance-panel';performancePanel.setAttribute('aria-live','off');document.querySelector('.game').append(performancePanel)}window.__DRIVES_DINKS_PERFORMANCE__=()=>performanceMonitor.snapshot();
function frame(t){performanceMonitor.frame(t);performanceMonitor.nextFrameAfterInput(t);if(performancePanel&&performanceRefresh++%120===0){const report=performanceMonitor.snapshot();performancePanel.textContent='PERF '+(report.fps?report.fps.toFixed(0):'--')+' FPS · RENDER '+(report.renderMs.p95?report.renderMs.p95.toFixed(1):'--')+' MS P95 · LONG '+report.longTasks.count}if(playReplay(t)){requestAnimationFrame(frame);return}if(matchIntroDialog.open){last=t;acc=0;render();requestAnimationFrame(frame);return}syncPointActions();syncMatchResult();if(animationTestMode){applySpecialShotAnimation(animationTestPlayer,(t-animationTestStarted)/1000);render();requestAnimationFrame(frame);return}if(startScreen?.isOpen()){last=t;acc=0;render();requestAnimationFrame(frame);return}if(selectionUI?.isOpen()){last=t;acc=0;render();requestAnimationFrame(frame);return}const status=game.paused?'MATCH PAUSED':game.phase==='pause'||game.phase==='over'?`${game.result} · ${game.outcome}`:`YOU ${game.score.points[0]} - ${game.score.points[1]} CPU | SERVE ${game.score.team===0?'YOU':'CPU'} ${game.score.call} | TARGET ${game.aim<7?'LEFT':game.aim>13?'RIGHT':'CENTER'} | ${game.difficulty.toUpperCase()} | ${game.feedbackTime>0&&game.humanFeedback?game.humanFeedback:game.canHumanHit()?'HIT NOW':game.message}`;if(status!==previousStatus){document.querySelector('#overlay').textContent=status;previousStatus=status}if(!last)last=t;if(game.paused){last=t;acc=0;syncPauseButton();syncShotButtonsForPhase();render();requestAnimationFrame(frame);return}acc+=Math.min(.1,(t-last)/1000);last=t;while(acc>=1/120){game.update(1/120*(scenarioType?scenarioSpeed:1));acc-=1/120;for(const event of game.events.splice(0)){if(event.type==='side-switch')showSideSwitchNotice();else playEffect(event)}if(game.replayClip){const clip=game.replayClip;game.replayClip=null;if(replayEnabled&&beginReplay(clip,t,true)){acc=0;break;}}}syncPauseButton();syncShotButtonsForPhase();render();requestAnimationFrame(frame)}requestAnimationFrame(frame);

const aimPad=document.querySelector('#aim-pad'),aimTrack=aimPad.querySelector('.aim-pad-track'),aimThumb=aimPad.querySelector('.aim-pad-thumb'),depthLabel=document.querySelector('#depth-label');

function syncAimPad(){const displayAim=game.phase==='serve'?serveAim(game.server,game.aim):game.aim,percent=((displayAim-1)/18)*100;const serving=game.phase==='serve',depth=serving?.5:game.depth,depthName=depth<.35?'SHORT':depth>.65?'DEEP':'NORMAL';aimThumb.style.left=`${percent}%`;aimThumb.style.top=`${(1-depth)*100}%`;aimPad.setAttribute('aria-valuenow',String(Math.round(displayAim*10)/10));aimPad.setAttribute('aria-valuetext',`Aim ${Math.round(displayAim)}, ${serving?'serve depth automatic':`${depthName.toLowerCase()} depth ${Math.round(depth*100)}%`}`);depthLabel.textContent=serving?'SERVE · AIM ONLY':`DEPTH ${depthName}`;aimPad.classList.toggle('serve-aim',serving)}

function aimFromPad(event){const target=padControl(event.clientX,event.clientY,aimTrack.getBoundingClientRect());game.aim=target.aim;if(game.phase!=='serve')game.setDepth(target.depth);syncAimPad()}

syncAimPad();

aimPad.addEventListener('pointerdown',event=>{performanceMonitor.input(event.timeStamp);if(game.paused)return;aimFromPad(event);aimPad.setPointerCapture(event.pointerId)});

aimPad.addEventListener('pointermove',event=>{if(!game.paused&&aimPad.hasPointerCapture(event.pointerId))aimFromPad(event)});

// Keyboard aim/depth is handled once by the shared window listener, including pad focus.

const attackButton=document.querySelector('[data-shot="attack"]'),softButton=document.querySelector('[data-shot="soft"]'),lobButton=document.querySelector('[data-shot="lob"]');let previousHumanServe=null,previousPaused=null;

function syncShotButtonsForPhase(){syncAimPad();const humanServe=game.mode==='play'&&game.phase==='serve'&&game.server.id===0,paused=game.paused;if(humanServe===previousHumanServe&&paused===previousPaused)return;previousHumanServe=humanServe;previousPaused=paused;attackButton.querySelector('small').textContent=humanServe?'HARD SERVE':'DRIVE · HIGH';softButton.querySelector('small').textContent=humanServe?'SOFT SERVE':'DROP / DINK';lobButton.querySelector('small').textContent=humanServe?'NOT ON SERVE':'ANYWHERE';attackButton.disabled=paused;softButton.disabled=paused;lobButton.disabled=humanServe||paused}

function setShot(s){game.shot=s;document.querySelectorAll('[data-shot]').forEach(b=>{b.classList.toggle('active',b.dataset.shot===s);b.setAttribute('aria-pressed',String(b.dataset.shot===s))})}function triggerShot(s){if(game.paused||replayPlayback)return;setShot(s);game.swing()}setShot('attack');document.querySelectorAll('[data-shot]').forEach(b=>{b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();triggerShot(b.dataset.shot)});b.addEventListener('click',e=>{if(e.detail===0)triggerShot(b.dataset.shot)})});for(const restartButton of document.querySelectorAll('#restart,#restart-top'))restartButton.onclick=()=>{setPaused(false);selectionUI.open()};document.querySelector('#mode').onclick=e=>{game.mode=game.mode==='play'?'watch':'play';e.target.textContent='MODE: '+game.mode.toUpperCase();game.reset();setShot('attack');syncPauseButton()};function aim(e){const rect=canvas.getBoundingClientRect();game.aim=courtAim(e.clientX,rect,currentCamera());syncAimPad()}canvas.addEventListener('pointerdown',e=>{performanceMonitor.input(e.timeStamp);if(game.paused||replayPlayback)return;aim(e);if(e.pointerType==='mouse')game.swing();else canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!game.paused&&(e.pointerType==='mouse'||e.buttons))aim(e)});window.addEventListener('keydown',e=>{performanceMonitor.input(e.timeStamp);if(selectionUI?.isOpen()||replayPlayback)return;if(e.key==='p'||e.key==='P'||e.key==='Escape'){e.preventDefault();if(!e.repeat)setPaused(!game.paused);return}if(game.paused)return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)game.swing()}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();game.nudgeAim(e.key==='ArrowLeft'?-1:1,e.shiftKey);syncAimPad()}if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();if(game.phase!=='serve')game.nudgeDepth(e.key==='ArrowUp'?1:-1,e.shiftKey);syncAimPad()}const s={1:'attack',2:'soft',3:'lob'}[e.key];

 if(s&&!(game.phase==='serve'&&game.server.id===0&&s==='lob')){if(!e.repeat)triggerShot(s)}});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!selectionUI?.isOpen())setPaused(true)});

function beginConfiguredMatch(){refreshVenue();if(balanceLevel&&!game.practice){game.configure({},levelLineup(balanceLevel,game.random));buildLabel.textContent=`BUILD ${buildNumber} · ${balanceLevel.toUpperCase()} TEST`;}document.querySelector('#active-loadout').textContent=game.practice?game.practice.drill.instruction:`${game.players[0].name} · ${game.players[0].paddle.id==='power'?'Ignite':game.players[0].paddle.id==='control'?'Touch':'Allcourt'} · ${game.players[0].paddle.shapeName??'Hybrid'} shape · First to 11, win by 2`;setShot(game.practice?(game.practice.step.shot==='lob'?'lob':game.practice.step.shot==='drive'?'attack':'soft'):'attack');document.querySelector('#mode').textContent='MODE: '+(game.practice?'PRACTICE':game.mode.toUpperCase());syncDifficultyButton();syncPauseButton();last=0;acc=0}
selectionUI=setupSelection({game,openOnStart:false,drawPreview:drawLoadoutPreview,getPhysique:()=>{const buildValue=Number(artPreferences.build===''?(Number(document.querySelector('#game-art-weight')?.value||179)-105)/1.65:artPreferences.build||45);return {height:Number(artPreferences.height||document.querySelector('#game-art-height')?.value||177),build:.05+Math.max(0,Math.min(100,buildValue))*.0105}},onStart:()=>game.practice?beginConfiguredMatch():showMatchIntro(game.players,beginConfiguredMatch)});document.querySelector('#setup-button').onclick=()=>selectionUI.open();onCharacterSpritesReady(()=>selectionUI?.refreshPreview());
startScreen=setupStartScreen({onPlay:()=>selectionUI.open(),version:'0.1.0',build:buildNumber});

// A career match arrives from the career mode with its field already drawn
// and its lineup already built from the career athlete's own attributes.
const careerMatch=readPendingMatch()&&new URLSearchParams(location.search).has(CAREER_MATCH_PARAM)?readPendingMatch():null;
if(careerMatch){
  const screen=document.querySelector('#game-start');
  if(screen)screen.hidden=true;
  document.querySelector('#match-setup').close();
  game.configure({format:careerMatch.matchup.format,showNameTags:true,rules:careerMatch.rules,learning:careerMatch.learning},careerMatch.matchup.lineup);
  game.mode='play';
  game.setDifficulty(careerMatch.difficulty??'normal');
  for(const id of ['setup-button','difficulty','mode','restart','restart-top']){
    const control=document.getElementById(id);
    if(control){control.hidden=true;control.disabled=true;}
  }
  refreshVenue();
  const scoringLabel=careerMatch.rules?`First to ${careerMatch.rules.targetScore}, ${careerMatch.rules.scoring==='rally'?'rally scoring':'side-out'}, win by ${careerMatch.rules.winBy}`:'First to 11, side-out, win by 2';
  document.querySelector('#active-loadout').textContent='CAREER MATCH \u00b7 '+careerMatch.bracket+' '+careerMatch.format+' \u00b7 '+scoringLabel;
  last=0;acc=0;
}


if(['erne','atp'].includes(scenarioType)){document.querySelector('#match-setup').close();game.configure();game.startScenario(scenarioType);document.querySelector('#active-loadout').textContent=`DEV SCENARIO · ${scenarioType.toUpperCase()} · ${Math.round(scenarioSpeed*100)}% SPEED · ADD ?speed=1 FOR REAL TIME`;document.querySelector('#mode').textContent='MODE: DEV SCENARIO';last=0;acc=0;syncPauseButton();}

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

const resultDialog=document.querySelector('#match-result');

function syncMatchResult(){if(game.phase==='over'&&!replayPlayback&&!resultDialog.open&&!selectionUI?.isOpen()){
  if(careerMatch){
    if(writeMatchResult(game.matchReport(),careerMatch.matchId)){
      clearPendingMatch();resultDialog.close();location.href='./career-mode/';
    }
    return;
  }
 const practice=game.practice;resultDialog.querySelector('h2').textContent=practice?'Practice complete':'Match ended';document.querySelector('#rematch').textContent=practice?'REPEAT DRILL':'REMATCH';
 document.querySelector('#match-winner').textContent=practice?practice.drill.name:game.score.winner===0?'Your team wins!':'Opponents win!';
 document.querySelector('#match-score').textContent=practice?`${practice.successes} of ${practice.total} sequences hit`:`Your team ${game.score.points[0]} – ${game.score.points[1]} Opponents`;
 const contacts=game.stats.teams.reduce((n,t)=>n+t.hits,0),mishits=game.stats.teams.reduce((n,t)=>n+t.mishits,0);
 document.querySelector('#match-analysis').textContent=practice?`${practice.results.reduce((n,r)=>n+(r.steps?.length??(r.shot?1:0)),0)} scored contacts · ${practice.drill.sequence?.length??1}-contact sequences · Repeat uses the same feeds. The summary lists every step.`:`${game.stats.rallies} rallies · ${contacts} rally contacts · ${mishits} mishits · Longest rally ${Math.max(0,...game.journal.rallies.map(r=>r.shots??0))} shots`;
 resultDialog.showModal();}}

resultDialog.addEventListener('cancel',e=>e.preventDefault());

document.querySelector('#rematch').onclick=()=>{resultDialog.close();if(game.practice){const {id,seed}=game.practice;game.startPractice(id,seed)}else game.reset();last=0;acc=0;setShot(game.practice?(game.practice.step.shot==='lob'?'lob':game.practice.step.shot==='drive'?'attack':'soft'):'attack');syncPauseButton()};

document.querySelector('#return-selection').onclick=()=>{resultDialog.close();selectionUI.open()};

const lesson=document.createElement("p");lesson.className="control-lesson";lesson.textContent="Movement is automatic | ← → aim · ↑ ↓ depth · Shift fine control | 1 Attack, 2 Soft, 3 Lob select AND hit | Space repeats shot | White ring = hit now";canvas.insertAdjacentElement("afterend",lesson);

// Deterministic DEV visual regression: a grounded shoe enters the kitchen after a volley.

if(detailedArtAvailable&&balanceQuery.get('test')==='kitchen-fault'){

 document.querySelector('#match-setup').close();game.mode='watch';game.phase='rally';game.shots=4;

 const offender=game.players[0];offender.x=7;offender.volleyMomentum=true;offender.vx=0;offender.vy=-.55;

 game.players[1].y=35;game.players[2].y=10;game.players[3].y=8;

 for(let i=0;i<=90;i++){game.clock=i/30;offender.y=31-i/90*1.7;game.replayTick=0;game.recordReplay()}

 game.fault(0,'Kitchen momentum fault',offender);game.setPaused(true);beginReplay(game.replayClip,performance.now(),true);syncPauseButton();

}

// A frozen, genuinely simulated replay for checking the new camera and artwork.
if(balanceQuery.get('test')==='sideline-replay'&&(location.pathname.includes('/dev/')||['localhost','127.0.0.1'].includes(location.hostname))){
 document.querySelector('#match-setup').close();game.random=seededRandom(37);game.configure({format:'singles'});game.mode='watch';
 for(let tick=0;tick<120*180;tick++){game.update(1/120);if(game.phase==='pause'&&game.pointReplay?.frames.length>15&&game.pointReplay.focus?.boundary===undefined)break;if(game.phase==='over')break}
 game.setPaused(true);if(game.pointReplay){beginReplay(game.pointReplay,performance.now(),true);if(balanceQuery.get('play')!=='1')replayLabel.textContent='REPLAY INSPECTOR · FROZEN FRAME'}
}

// Suppress game-surface browser gestures; dialogs retain normal scrolling.

canvas.addEventListener('wheel',e=>e.preventDefault(),{passive:false});

canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

window.addEventListener('keydown',e=>{if(!document.querySelector('dialog[open]')&&(e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key))e.preventDefault()},{capture:true});

// Keep persistent play controls together, followed by setup, gameplay and presentation settings.
const settingsActions=document.querySelector('.header-actions');
for(const id of ['fullscreen-button','pause-button','setup-button','mode','difficulty','name-tags-button','replay-toggle','sound']){
 const control=document.getElementById(id);if(control)settingsActions.append(control);
}
