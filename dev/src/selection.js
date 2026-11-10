import {CHARACTERS,PADDLES,PADDLE_SHAPES,CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS,COURT_PALETTES,RATING_KEYS,RATING_LABELS,PLAYTEST_BASE_RATING,normalizeSelection,selectionStats,effectiveRatings,skillAverage,buildProfile,createLineup,applyPhysique} from './roster.js?v=205';
import {normalizeStackingSelection} from './stacking.js?v=205';
import {HAIR_OPTIONS,HEADWEAR_OPTIONS,EYEWEAR_OPTIONS} from './character-concepts.js?v=205';

const DIFFICULTY_KEY='drives-dinks.difficulty.v1';
const STAT_LABELS=RATING_LABELS;

export function statRating(value){const number=Number(value);return Math.max(0,Math.min(100,Math.round(number>=0&&number<=100?number:50+(number-1)*100)))}

export function setupDialogBounds(viewport){
 const width=Math.max(1,Math.min(740,viewport.width-16)),height=Math.max(1,Math.min(900,viewport.height-16));
 return {width,height,left:(viewport.offsetLeft||0)+(viewport.width-width)/2,top:(viewport.offsetTop||0)+8,compact:width<650};
}

function fitSetupDialog(dialog){
 const fit=()=>{const visible=window.visualViewport,bounds=setupDialogBounds({width:visible?.width??innerWidth,height:visible?.height??innerHeight,offsetLeft:visible?.offsetLeft??0,offsetTop:visible?.offsetTop??0});
 Object.assign(dialog.style,{inset:'auto',margin:'0',width:bounds.width+'px',maxWidth:bounds.width+'px',height:bounds.height+'px',maxHeight:bounds.height+'px',left:bounds.left+'px',top:bounds.top+'px'});dialog.dataset.compact=String(bounds.compact);
 };
 window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);fit();return fit;
}

function field(text,control,className=''){
 const label=document.createElement('label');label.className=className;const caption=document.createElement('span');caption.textContent=text;label.append(caption,control);return label;
}
function select(name,items,ariaLabel){
 const control=document.createElement('select');control.name=name;control.setAttribute('aria-label',ariaLabel);
 for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.label??item.name??item.id;control.append(option)}
 return control;
}
function options(items,labeler=item=>item.name){return items.map(item=>({id:item.id,label:labeler(item)}))}

export function setupSelection({game,onStart,drawPreview,getPhysique=()=>({}),openOnStart=true}){
 const dialog=document.querySelector('#match-setup'),form=dialog.querySelector('form');
 const footer=form.querySelector('.setup-footer'),scroll=document.createElement('div');scroll.className='setup-scroll';
 for(const node of [...form.childNodes])if(node!==footer)scroll.append(node);form.prepend(scroll);
 const fitDialog=fitSetupDialog(dialog);
 const setupTop=form.querySelector('.setup-top'),preview=document.querySelector('.player-preview'),nameSlot=document.querySelector('#player-name-slot');
 const mainIdentity=document.querySelector('#main-identity');
 const designer=document.createElement('section');designer.id='character-designer';designer.hidden=true;
 const back=document.createElement('button');back.type='button';back.textContent='DONE · BACK TO MATCH SETUP';back.className='designer-back';
 const designButton=document.createElement('button');designButton.type='button';designButton.textContent='CHARACTER DESIGNER';designButton.className='designer-open';
 const playerDescription=document.createElement('p');playerDescription.id='player-description';playerDescription.setAttribute('aria-live','polite');
 const profileBox=document.createElement('section');profileBox.id='profile-options';profileBox.className='designer-box';
 const outfitBox=document.createElement('section');outfitBox.id='outfit-options';outfitBox.className='designer-box';
 profileBox.innerHTML='<h3>Character Profile</h3>';outfitBox.innerHTML='<h3>Outfit</h3>';
 const profileGrid=document.createElement('div');profileGrid.className='designer-grid';profileBox.append(profileGrid);
 const outfitGrid=document.createElement('div');outfitGrid.className='designer-grid';outfitBox.append(outfitGrid);

 const devPanel=document.querySelector('#dev-art-options');
 const outfitField=devPanel.querySelector('#game-art-outfit').closest('label');
 const venueField=devPanel.querySelector('#game-art-venue').closest('label');
 const heightField=devPanel.querySelector('#game-art-height').closest('label');
 const weightField=devPanel.querySelector('#game-art-weight').closest('label');
 const bodyInfo=devPanel.querySelector('.body-effects-info');
 const motionLink=devPanel.querySelector('a');
 for(const control of [heightField,weightField]){const input=control.querySelector('input'),output=input?.nextElementSibling;if(output?.tagName==='OUTPUT')control.append(output)}
 devPanel.remove();

 const nameInput=document.createElement('input');nameInput.name='customName';nameInput.id='player-name-input';nameInput.maxLength=40;nameInput.autocomplete='off';nameInput.spellcheck=false;nameInput.placeholder='Auto-generated name';nameInput.setAttribute('aria-label','User name');
 const nameField=field('Name',nameInput,'name-field preview-name-field');
 const archetypeSelect=select('character',options(CHARACTERS,item=>item.style),'Player archetype');const archetypeField=field('Archetype',archetypeSelect);
 const genderSelect=select('gender',[{id:'male',label:'Male'},{id:'female',label:'Female'}],'Character / gender');const genderField=field('Gender',genderSelect);
 const handSelect=select('handedness',[{id:'right',label:'Right-handed'},{id:'left',label:'Left-handed'}],'Preferred hand');const handField=field('Preferred hand',handSelect);
 const hairStyleSelect=select('hairStyle',[],'Hair style');const hairStyleField=field('Hair style',hairStyleSelect);
 const hairColorSelect=select('hairColor',options(HAIR_COLORS),'Hair color');const hairColorField=field('Hair color',hairColorSelect);
 const skinSelect=select('skinColor',options(SKIN_COLORS),'Skin tone');const skinField=field('Skin tone',skinSelect);
 const shirtColorSelect=select('shirtColor',options(CLOTHING_COLORS),'Outfit color');const shirtColorField=field('Outfit color',shirtColorSelect);const highlightColorSelect=select('highlightColor',options(PADDLE_COLORS),'Outfit highlight');const highlightColorField=field('Outfit highlight',highlightColorSelect);
 const headwearSelect=select('headwear',options(HEADWEAR_OPTIONS),'Headwear');const headwearField=field('Headwear',headwearSelect);
 const eyewearSelect=select('eyewear',options(EYEWEAR_OPTIONS),'Eyewear');const eyewearField=field('Eyewear',eyewearSelect);
 const paddleColorSelect=select('paddleColor',options(PADDLE_COLORS),'Paddle color');const paddleColorField=field('Paddle color',paddleColorSelect);
 const courtSelect=select('court',options(COURT_PALETTES),'Court colors');const courtField=field('Court colors',courtSelect);

 const paddleBrief=document.querySelector('#paddle-brief'),paddleSelects=paddleBrief.querySelector('.paddle-selects'),paddleDescription=document.querySelector('#paddle-description');
 const paddleFamily=select('paddle',options(PADDLES),'Paddle family'),paddleShape=select('paddleShape',options(PADDLE_SHAPES),'Paddle shape');
 paddleSelects.append(field('Paddle family',paddleFamily),field('Paddle shape',paddleShape),paddleColorField);

 mainIdentity.append(archetypeField,designButton,playerDescription);nameSlot.append(nameField);
 profileGrid.append(genderField,handField,hairStyleField,hairColorField,skinField,heightField,weightField,bodyInfo);
 outfitField.style.gridColumn='1 / -1';outfitGrid.append(outfitField,shirtColorField,highlightColorField,headwearField,eyewearField,motionLink);
 designer.append(back,preview,profileBox,outfitBox);
 const ratingsHeading=form.querySelector('.ratings-heading'),loadoutStats=form.querySelector('#loadout-stats');
 loadoutStats.after(designer);

 const footerControls=footer.querySelector('.footer-controls');
 const formatField=form.querySelector('label[for="match-format"]'),difficultyField=form.querySelector('label[for="match-difficulty"]'),matchModeField=form.querySelector('label[for="match-mode"]');
 for(const option of venueField.querySelector('select').options)option.textContent=({none:'No venue',random:'Random',outdoor:'Outdoor',indoor:'Indoor',stadium:'Stadium'})[option.value]??option.textContent;
 footerControls.append(formatField,difficultyField,matchModeField,venueField,courtField);

 let draft=normalizeSelection(),stackingDraft=normalizeStackingSelection(),started=false,previewLineup=[],editingName=false;
 try{const saved=JSON.parse(localStorage.getItem('drives-dinks.selection.v1')||'null');draft=normalizeSelection(saved);stackingDraft=normalizeStackingSelection()}catch{}
 const optionLabel=(items,id)=>items.find(item=>item.id===id)?.name??items.find(item=>item.id===id)?.style??id;
 function hairStyleOptions(body){return [{id:'design',name:'As designed'},...(HAIR_OPTIONS[body]??HAIR_OPTIONS.male)]}
 function appearanceSummary(selectionValue){
  return `${optionLabel(CLOTHING_COLORS,selectionValue.shirtColor)} outfit · ${optionLabel(PADDLE_COLORS,selectionValue.highlightColor)} highlight · ${optionLabel(PADDLE_COLORS,selectionValue.paddleColor)} paddle · ${optionLabel(HAIR_OPTIONS[selectionValue.gender]??HAIR_OPTIONS.male,selectionValue.hairStyle)} hair · ${optionLabel(HAIR_COLORS,selectionValue.hairColor)} color · ${optionLabel(SKIN_COLORS,selectionValue.skinColor)} skin · ${optionLabel(HEADWEAR_OPTIONS,selectionValue.headwear)} · ${optionLabel(EYEWEAR_OPTIONS,selectionValue.eyewear)}`;
 }
 function setOptions(control,items,value){control.replaceChildren(...items.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.label??item.name??item.id;return option}));control.value=String(value??'');if(!control.value&&control.options.length)control.value=control.options[0].value}
 function selected(name,value){form.querySelectorAll(`[name="${name}"]`).forEach(input=>{if(input===nameInput&&editingName)return;if(input.type==='checkbox')input.checked=Boolean(value);else input.tagName==='SELECT'||input.type==='text'?input.value=String(value):input.checked=input.value===String(value)})}
 function render(){
  setOptions(hairStyleSelect,hairStyleOptions(draft.gender),draft.hairStyle);setOptions(headwearSelect,options(HEADWEAR_OPTIONS),draft.headwear);setOptions(eyewearSelect,options(EYEWEAR_OPTIONS),draft.eyewear);
  for(const [key,value] of Object.entries(draft))selected(key,value);
  if(!previewLineup.length||previewLineup[0]?.characterId!==draft.character||previewLineup[0]?.gender!==draft.gender)previewLineup=createLineup(draft,{random:game.random});
  else {const appearance=previewLineup[0].appearance;previewLineup[0]=buildProfile(draft,{identity:previewLineup[0]});Object.assign(previewLineup[0].appearance,{height:appearance.height,build:appearance.build})}
  const body={...previewLineup[0].appearance,...getPhysique()};previewLineup[0]=applyPhysique(previewLineup[0],body);const player=previewLineup[0];
  if(!draft.customName&&player.name)draft.customName=player.name;
  if(!editingName)nameInput.value=draft.customName||player.name;
  const effects=document.querySelector('#body-effects');if(effects)effects.textContent=Object.entries(player.physique.modifiers).map(([key,value])=>key+': '+((value-1)*100>=0?'+':'')+Math.round((value-1)*100)+'%').join(' · ')+'. Power potential combines with shot technique and contact to determine pace.';
  playerDescription.textContent=`${player.name} · ${player.archetype} · ${player.gender==='female'?'Female':'Male'} · ${player.handedness==='left'?'Left-handed':'Right-handed'}. Pros: ${player.strengths.join(', ')}. Tradeoff: ${player.tradeoffs.join(', ')}.`;
  const paddle=PADDLES.find(item=>item.id===draft.paddle)??PADDLES[0],shape=PADDLE_SHAPES.find(item=>item.id===draft.paddleShape)??PADDLE_SHAPES[0];
  paddleDescription.textContent=`${paddle.name} · ${paddle.style} - ${paddle.description} ${shape.name} · ${shape.style} - ${shape.description}`;
  const stats=selectionStats(draft),effective=effectiveRatings(draft),average=skillAverage(stats);ratingsHeading.querySelector('small').textContent=`DEV BASELINE ${average} · 70 IS NEUTRAL · PADDLE + SHAPE EFFECTS SHOWN`;
  loadoutStats.innerHTML=RATING_KEYS.map(key=>{const base=statRating(stats[key]),rating=statRating(effective[key]),delta=rating-base,deltaText=delta?`${delta>0?'+':''}${delta}`:'±0',tone=delta>0?'positive':delta<0?'negative':'neutral';return `<div class="stat-row" data-stat="${key}"><span>${STAT_LABELS[key]}</span><div class="stat-meter ${tone}" role="img" aria-label="${STAT_LABELS[key]} ${rating} out of 100; player ${base}, paddle ${deltaText}"><i style="width:${rating}%"></i><u style="left:${base}%"></u><b class="average-notch" style="left:${PLAYTEST_BASE_RATING}%" title="Playtest average"></b></div><strong>${rating}<em>${deltaText}</em></strong></div>`}).join('');
  form.querySelector('#team-preview').textContent=`Generated lineup - You: ${previewLineup[0].name} · Partner: ${previewLineup[1].name} · Opponents: ${previewLineup[2].name} & ${previewLineup[3].name}. Identities stay stable while you adjust equipment.`;
  drawPreview(draft,previewLineup[0]);
 }
 function syncSessionOptions(){const practice=form.elements.matchMode.value.startsWith('practice-');form.elements.format.disabled=practice;if(practice)form.elements.format.value='singles';form.querySelector('.start-match').textContent=practice?'START PRACTICE →':started?'START NEW MATCH →':'START MATCH →'}
 const updateDraft=event=>{syncSessionOptions();const values=new FormData(form);draft=normalizeSelection({character:values.get('character'),gender:values.get('gender'),handedness:values.get('handedness'),customName:values.get('customName'),paddle:values.get('paddle'),paddleShape:values.get('paddleShape'),shirtColor:values.get('shirtColor'),highlightColor:values.get('highlightColor'),paddleColor:values.get('paddleColor'),hairStyle:values.get('hairStyle'),hairColor:values.get('hairColor'),headwear:values.get('headwear'),eyewear:values.get('eyewear'),outfit:values.get('outfit'),showNameTags:game.showNameTags,skinColor:values.get('skinColor'),court:values.get('court')});render();};
 nameInput.addEventListener('focus',()=>{editingName=true});
 nameInput.addEventListener('blur',()=>{editingName=false;updateDraft({target:nameInput})});
 form.addEventListener('change',updateDraft);form.addEventListener('input',updateDraft);
 function setDesigner(open){if(open){designer.append(preview);profileGrid.prepend(nameField,archetypeField);nameField.classList.remove('preview-name-field')}else{setupTop.prepend(preview);nameField.classList.add('preview-name-field');nameSlot.append(nameField);mainIdentity.prepend(archetypeField,designButton,playerDescription)}designer.hidden=!open;dialog.classList.toggle('designing',open);for(const node of [...scroll.children])if(node!==designer)node.hidden=open;footer.hidden=open;if(!open)syncSessionOptions();dialog.setAttribute('aria-label',open?'Character designer':'Match setup')}
 designButton.onclick=()=>setDesigner(true);back.onclick=()=>setDesigner(false);
 const freshMatchLineup=()=>{const lineup=createLineup(draft,{random:game.random});const human=previewLineup[0];if(human){lineup[0]=buildProfile(draft,{identity:human});Object.assign(lineup[0].appearance,human.appearance)}return lineup};
 form.addEventListener('submit',e=>{e.preventDefault();game.configure({...draft,showNameTags:game.showNameTags,stacking:stackingDraft,format:form.elements.format.value},freshMatchLineup());game.mode=form.elements.matchMode.value;game.setDifficulty(form.elements.difficulty.value);if(game.mode.startsWith('practice-'))game.startPractice(game.mode.slice(9));started=true;try{localStorage.setItem('drives-dinks.selection.v1',JSON.stringify({...draft,stacking:stackingDraft}));localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}dialog.close();onStart()});
 dialog.querySelector('#resume-match').onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(!started)e.preventDefault()});
 function open(){if(started)previewLineup=[];dialog.querySelector('#resume-match').hidden=!started;form.elements.format.value=game.format;form.elements.matchMode.value=game.practice?`practice-${game.practice.id}`:game.mode;syncSessionOptions();form.elements.difficulty.value=game.difficulty;setDesigner(false);render();fitDialog();dialog.showModal()}
 if(openOnStart)open();return {open,isOpen:()=>dialog.open,refreshPreview:render};
}

