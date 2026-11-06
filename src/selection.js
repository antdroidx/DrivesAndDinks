import {CHARACTERS,PADDLES,PADDLE_SHAPES,CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS,COURT_PALETTES,RATING_KEYS,RATING_LABELS,PLAYTEST_BASE_RATING,normalizeSelection,selectionStats,effectiveRatings,skillAverage,buildProfile,createLineup,applyPhysique} from './roster.js';
import {normalizeStackingSelection} from './stacking.js';
import {HAIR_OPTIONS} from './character-concepts.js';

const DIFFICULTY_KEY='drives-dinks.difficulty.v1';
const STAT_LABELS=RATING_LABELS;

export function statRating(value){const number=Number(value);return Math.max(0,Math.min(100,Math.round(number>=0&&number<=100?number:50+(number-1)*100)))}

// Use the visible viewport, including browser zoom, keyboard and orientation changes.
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

export function setupSelection({game,onStart,drawPreview,getPhysique=()=>({})}){
  const dialog=document.querySelector('#match-setup'),form=dialog.querySelector('form');
  const footer=form.querySelector('.setup-footer'),scroll=document.createElement('div');scroll.className='setup-scroll';
  for(const node of [...form.childNodes])if(node!==footer)scroll.append(node);form.prepend(scroll);
  const fitDialog=fitSetupDialog(dialog);
  const designer=document.createElement('section');designer.id='character-designer';designer.hidden=true;
  const designButton=document.createElement('button');designButton.type='button';designButton.textContent='CHARACTER DESIGNER';designButton.className='designer-open';
  const back=document.createElement('button');back.type='button';back.textContent='DONE · BACK TO MATCH SETUP';
  const advanced=document.createElement('section');advanced.className='paddle-options';
  const courts=document.createElement('section');courts.id='court-options';courts.innerHTML='<h3>Court options</h3>';
  const venue=document.querySelector('#game-art-venue');if(venue)courts.append(venue.closest('label'));
  courts.append(document.querySelector('#court-choices').closest('fieldset'));
  document.querySelector('.equipment-panel').append(document.querySelector('#paddle-color-choices').closest('fieldset'));
  const appearance=document.querySelector('#appearance-options');
  const expanded=document.createElement('section');expanded.id=appearance.id;expanded.className=appearance.className;
  while(appearance.firstChild)expanded.append(appearance.firstChild);appearance.replaceWith(expanded);

  const setDesigner=open=>{const preview=document.querySelector('.player-preview');if(open)designer.append(preview);else document.querySelector('.setup-top').prepend(preview);designer.hidden=!open;dialog.classList.toggle('designing',open);for(const node of [...scroll.children])if(node!==designer)node.hidden=open;footer.hidden=open;if(!open)syncSessionOptions();dialog.setAttribute('aria-label',open?'Character designer':'Match setup')};
  designButton.onclick=()=>setDesigner(true);back.onclick=()=>setDesigner(false);
  for(const node of [...scroll.children]){
   if(node.matches('#dev-art-options,#appearance-options'))designer.append(node);
   else if(node.matches('.equipment-panel'))advanced.append(node);
  }
  designer.prepend(back);designer.append(document.querySelector('.player-preview'));scroll.append(designButton,advanced,courts,designer);

  let draft=normalizeSelection(),stackingDraft=normalizeStackingSelection(),started=false,previewLineup=[];
  try{const saved=JSON.parse(localStorage.getItem('drives-dinks.selection.v1')||'null');draft=normalizeSelection(saved);stackingDraft=normalizeStackingSelection(saved?.stacking)}catch{}
  function equipmentCards(items,name,detail){return items.map(item=>{const labels=Object.entries(item.ratingModifiers??{}).filter(([,delta])=>delta).map(([key,delta])=>`${RATING_LABELS[key]} ${delta>0?'+':''}${delta}`);if(item.spinModifier)labels.push(`Spin ${item.spinModifier>0?'+':''}${item.spinModifier}`);if(item.sweetSpot&&item.sweetSpot!==1)labels.push(`Sweet spot ${item.sweetSpot>1?'+':''}${Math.round((item.sweetSpot-1)*100)}%`);return `<label class="choice-card"><input type="radio" name="${name}" value="${item.id}"><span class="choice-title">${item.name}</span><span class="choice-style">${item.style}</span><span class="choice-description">${detail(item)} ${labels.join(' · ')}</span></label>`}).join('')}
  function paddleCards(){return equipmentCards(PADDLES,'paddle',item=>item.description)}
  const swatches=(items,name)=>`<${['court','paddleColor'].includes(name)?'details':'div'} class="color-menu" data-color="${name}"><summary><i></i><span></span></summary><div class="color-options">${items.map(item=>`<label><input type="radio" name="${name}" value="${item.id}"><i style="background:${item.color??item.court}"></i>${item.name}</label>`).join('')}</div></${['court','paddleColor'].includes(name)?'details':'div'}>`;
  dialog.querySelector('#character-choices').innerHTML=`<select name="character" aria-label="Player archetype">${CHARACTERS.map(c=>`<option value="${c.id}">${c.style}</option>`).join('')}</select><label>Character<select name="gender"><option value="male">Male</option><option value="female">Female</option></select></label><label>Hand<select name="handedness"><option value="right">Right-handed</option><option value="left">Left-handed</option></select></label><label>Name (optional)<input name="customName" maxlength="40" placeholder="Generate a name"></label><p id="player-description" aria-live="polite"></p>`;
  dialog.querySelector('#paddle-choices').innerHTML=paddleCards();
  dialog.querySelector('#paddle-shape-choices').innerHTML=equipmentCards(PADDLE_SHAPES,'paddleShape',item=>item.description);
  dialog.querySelector('#shirt-choices').innerHTML=swatches(CLOTHING_COLORS,'shirtColor');
  dialog.querySelector('#hair-choices').innerHTML=swatches(HAIR_COLORS,'hairColor');
  dialog.querySelector('#skin-choices').innerHTML=swatches(SKIN_COLORS,'skinColor');
  dialog.querySelector('#paddle-color-choices').innerHTML=swatches(PADDLE_COLORS,'paddleColor');
  dialog.querySelector('#court-choices').innerHTML=swatches(COURT_PALETTES,'court');
  function selected(name,value){form.querySelectorAll(`[name="${name}"]`).forEach(input=>{input.tagName==='SELECT'||input.type==='text'?input.value=String(value):input.checked=input.value===String(value)})}
  function hairStyleOptions(body){return [{id:'design',name:'As designed'},...(HAIR_OPTIONS[body]??HAIR_OPTIONS.male)]}
  function appearanceSummary(selectionValue){
    const label=(items,id)=>items.find(item=>item.id===id)?.name??id;
    const hairStyle=label(hairStyleOptions(selectionValue.gender),selectionValue.hairStyle);
    return `${label(CLOTHING_COLORS,selectionValue.shirtColor)} clothing · ${label(PADDLE_COLORS,selectionValue.paddleColor)} paddle · ${hairStyle} · ${label(HAIR_COLORS,selectionValue.hairColor)} hair · ${label(SKIN_COLORS,selectionValue.skinColor)} skin · ${label(COURT_PALETTES,selectionValue.court)} court`;
  }
  function render(){
    dialog.querySelector('#hair-style').innerHTML=hairStyleOptions(draft.gender).map(item=>`<option value="${item.id}">${item.name}</option>`).join('');
    for(const [key,value] of Object.entries(draft))selected(key,value);
    if(!previewLineup.length||previewLineup[0]?.characterId!==draft.character||previewLineup[0]?.gender!==draft.gender)previewLineup=createLineup(draft);
    else {const appearance=previewLineup[0].appearance;previewLineup[0]=buildProfile(draft,{identity:previewLineup[0]});Object.assign(previewLineup[0].appearance,{height:appearance.height,build:appearance.build})}
    const body={...previewLineup[0].appearance,...getPhysique()};
    previewLineup[0]=applyPhysique(previewLineup[0],body);
    const player=previewLineup[0];
    const effects=document.querySelector('#body-effects');if(effects)effects.textContent=Object.entries(player.physique.modifiers).map(([key,value])=>key+': '+((value-1)*100>=0?'+':'')+Math.round((value-1)*100)+'%').join(' · ')+'. Power potential combines with shot technique and contact to determine pace.';
    dialog.querySelector('#appearance-summary').textContent=appearanceSummary(draft);
    dialog.querySelector('#player-description').textContent=`${player.name} · ${player.archetype}. Pros: ${player.strengths.join(', ')}. Tradeoff: ${player.tradeoffs.join(', ')}.`;
    const stats=selectionStats(draft),effective=effectiveRatings(draft),average=skillAverage(stats);
    dialog.querySelector('.ratings-heading small').textContent=`DEV BASELINE ${average} · 70 IS NEUTRAL · PADDLE + SHAPE EFFECTS SHOWN`;
    dialog.querySelector('#loadout-stats').innerHTML=RATING_KEYS.map(key=>{const base=statRating(stats[key]),rating=statRating(effective[key]),delta=rating-base,deltaText=delta?`${delta>0?'+':''}${delta}`:'±0',tone=delta>0?'positive':delta<0?'negative':'neutral';return `<div class="stat-row" data-stat="${key}"><span>${STAT_LABELS[key]}</span><div class="stat-meter ${tone}" role="img" aria-label="${STAT_LABELS[key]} ${rating} out of 100; player ${base}, paddle ${deltaText}"><i style="width:${rating}%"></i><u style="left:${base}%"></u><b class="average-notch" style="left:${PLAYTEST_BASE_RATING}%" title="Playtest average"></b></div><strong>${rating}<em>${deltaText}</em></strong></div>`}).join('');
    dialog.querySelector('#team-preview').textContent=`Generated lineup — You: ${previewLineup[0].name} · Partner: ${previewLineup[1].name} · Opponents: ${previewLineup[2].name} & ${previewLineup[3].name}. Identities stay stable while you adjust equipment.`;
    for(const [key,items] of [['shirtColor',CLOTHING_COLORS],['hairColor',HAIR_COLORS],['skinColor',SKIN_COLORS],['paddleColor',PADDLE_COLORS],['court',COURT_PALETTES]]){const item=items.find(i=>i.id===draft[key]),menu=form.querySelector(`[data-color="${key}"]`);menu.querySelector('summary i').style.background=item.color??item.court;menu.querySelector('summary span').textContent=item.name;}
    drawPreview(draft,previewLineup[0]);
  }
  function syncStackingControls(){for(const [index,prefix] of [[0,'stack0'],[1,'stack1']]){form.elements[prefix].value=stackingDraft.teams[index].mode;form.elements[prefix+'Side'].value=stackingDraft.teams[index].preferredSide}}
  function syncSessionOptions(){const practice=form.elements.matchMode.value.startsWith('practice-');form.elements.format.disabled=practice;if(practice)form.elements.format.value='singles';const stackingOptions=form.querySelector('#stacking-options'),doubles=form.elements.format.value==='doubles'&&!practice;stackingOptions.hidden=!doubles;for(const name of ['stack0','stack0Side','stack1','stack1Side'])form.elements[name].disabled=!doubles;syncStackingControls();dialog.querySelector('.start-match').textContent=practice?'START PRACTICE →':started?'START NEW MATCH →':'START MATCH →'}
  form.addEventListener('change',event=>{stackingDraft={teams:[{mode:form.elements.stack0.value,preferredSide:form.elements.stack0Side.value},{mode:form.elements.stack1.value,preferredSide:form.elements.stack1Side.value}]};syncSessionOptions();
    const menu=event.target.closest('.color-menu');if(menu)menu.open=false;
    const values=new FormData(form);draft=normalizeSelection({character:values.get('character'),gender:values.get('gender'),handedness:values.get('handedness'),customName:values.get('customName'),paddle:values.get('paddle'),paddleShape:values.get('paddleShape'),shirtColor:values.get('shirtColor'),paddleColor:values.get('paddleColor'),hairStyle:values.get('hairStyle'),hairColor:values.get('hairColor'),skinColor:values.get('skinColor'),court:values.get('court')});render();
  });
  form.addEventListener('submit',e=>{e.preventDefault();game.configure({...draft,stacking:stackingDraft,format:form.elements.format.value},previewLineup);game.mode=form.elements.matchMode.value;game.setDifficulty(form.elements.difficulty.value);if(game.mode.startsWith('practice-'))game.startPractice(game.mode.slice(9));started=true;try{localStorage.setItem('drives-dinks.selection.v1',JSON.stringify({...draft,stacking:stackingDraft}));localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}dialog.close();onStart()});
  dialog.querySelector('#resume-match').onclick=()=>dialog.close();
  dialog.addEventListener('cancel',e=>{if(!started)e.preventDefault()});
  function open(){dialog.querySelector('#resume-match').hidden=!started;dialog.querySelector('.start-match').textContent=started?'START NEW MATCH →':'START MATCH →';form.elements.format.value=game.format;form.elements.matchMode.value=game.practice?`practice-${game.practice.id}`:game.mode;syncSessionOptions();form.elements.difficulty.value=game.difficulty;syncStackingControls();setDesigner(false);render();fitDialog();dialog.showModal()}
  open();return {open,isOpen:()=>dialog.open,refreshPreview:render};
}
