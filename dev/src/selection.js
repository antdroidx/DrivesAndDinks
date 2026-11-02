import {CHARACTERS,PADDLES,CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS,COURT_PALETTES,RATING_KEYS,RATING_LABELS,PLAYTEST_BASE_RATING,normalizeSelection,selectionStats,effectiveRatings,skillAverage,buildProfile,createLineup} from './roster.js?v=55';

const DIFFICULTY_KEY='drives-dinks.difficulty.v1';
const STAT_LABELS=RATING_LABELS;

export function statRating(value){const number=Number(value);return Math.max(0,Math.min(100,Math.round(number>=0&&number<=100?number:50+(number-1)*100)))}

export function setupSelection({game,onStart,drawPreview}){
  const dialog=document.querySelector('#match-setup'),form=dialog.querySelector('form');
  let draft=normalizeSelection(),started=false,previewLineup=[];
  try{draft=normalizeSelection(JSON.parse(localStorage.getItem('drives-dinks.selection.v1')||'null'))}catch{}
  function paddleCards(){return PADDLES.map(item=>{const labels=Object.entries(item.ratingModifiers).filter(([,delta])=>delta).map(([key,delta])=>`${RATING_LABELS[key]} ${delta>0?'+':''}${delta}`);if(item.spinModifier)labels.push(`Spin ${item.spinModifier>0?'+':''}${item.spinModifier}`);return `<label class="choice-card"><input type="radio" name="paddle" value="${item.id}"><span class="choice-title">${item.name}</span><span class="choice-style">${item.style}</span><span class="choice-description">${item.description} ${labels.join(' · ')}</span></label>`}).join('')}
  const swatches=(items,name)=>`<details class="color-menu" data-color="${name}"><summary><i></i><span></span></summary><div class="color-options">${items.map(item=>`<label><input type="radio" name="${name}" value="${item.id}"><i style="background:${item.color??item.court}"></i>${item.name}</label>`).join('')}</div></details>`;
  dialog.querySelector('#character-choices').innerHTML=`<select name="character" aria-label="Player archetype">${CHARACTERS.map(c=>`<option value="${c.id}">${c.style}</option>`).join('')}</select><label>Character<select name="gender"><option value="male">Male</option><option value="female">Female</option></select></label><label>Name (optional)<input name="customName" maxlength="40" placeholder="Generate a name"></label><p id="player-description" aria-live="polite"></p>`;
  dialog.querySelector('#paddle-choices').innerHTML=paddleCards();
  dialog.querySelector('#shirt-choices').innerHTML=swatches(CLOTHING_COLORS,'shirtColor');
  dialog.querySelector('#hair-choices').innerHTML=swatches(HAIR_COLORS,'hairColor');
  dialog.querySelector('#skin-choices').innerHTML=swatches(SKIN_COLORS,'skinColor');
  dialog.querySelector('#paddle-color-choices').innerHTML=swatches(PADDLE_COLORS,'paddleColor');
  dialog.querySelector('#court-choices').innerHTML=swatches(COURT_PALETTES,'court');
  function selected(name,value){form.querySelectorAll(`[name="${name}"]`).forEach(input=>{input.tagName==='SELECT'||input.type==='text'?input.value=String(value):input.checked=input.value===String(value)})}
  function appearanceSummary(selectionValue){
    const label=(items,id)=>items.find(item=>item.id===id)?.name??id;
    return `${label(CLOTHING_COLORS,selectionValue.shirtColor)} clothing · ${label(PADDLE_COLORS,selectionValue.paddleColor)} paddle · ${label(HAIR_COLORS,selectionValue.hairColor)} hair · ${label(SKIN_COLORS,selectionValue.skinColor)} skin · ${label(COURT_PALETTES,selectionValue.court)} court`;
  }
  function render(){
    for(const [key,value] of Object.entries(draft))selected(key,value);
    if(!previewLineup.length||previewLineup[0]?.characterId!==draft.character||previewLineup[0]?.gender!==draft.gender)previewLineup=createLineup(draft);
    else previewLineup[0]=buildProfile(draft,{identity:previewLineup[0]});
    const player=previewLineup[0];
    dialog.querySelector('#appearance-summary').textContent=appearanceSummary(draft);
    dialog.querySelector('#player-description').textContent=`${player.name} · ${player.archetype}. Pros: ${player.strengths.join(', ')}. Tradeoff: ${player.tradeoffs.join(', ')}.`;
    const stats=selectionStats(draft),effective=effectiveRatings(draft),average=skillAverage(stats);
    dialog.querySelector('.ratings-heading small').textContent=`DEV BASELINE ${average} · 70 IS NEUTRAL · PADDLE EFFECTS SHOWN`;
    dialog.querySelector('#loadout-stats').innerHTML=RATING_KEYS.map(key=>{const base=statRating(stats[key]),rating=statRating(effective[key]),delta=rating-base,deltaText=delta?`${delta>0?'+':''}${delta}`:'±0',tone=delta>0?'positive':delta<0?'negative':'neutral';return `<div class="stat-row" data-stat="${key}"><span>${STAT_LABELS[key]}</span><div class="stat-meter ${tone}" role="img" aria-label="${STAT_LABELS[key]} ${rating} out of 100; player ${base}, paddle ${deltaText}"><i style="width:${rating}%"></i><u style="left:${base}%"></u><b class="average-notch" style="left:${PLAYTEST_BASE_RATING}%" title="Playtest average"></b></div><strong>${rating}<em>${deltaText}</em></strong></div>`}).join('');
    dialog.querySelector('#team-preview').textContent=`Generated lineup — You: ${previewLineup[0].name} · Partner: ${previewLineup[1].name} · Opponents: ${previewLineup[2].name} & ${previewLineup[3].name}. Identities stay stable while you adjust equipment.`;
    for(const [key,items] of [['shirtColor',CLOTHING_COLORS],['hairColor',HAIR_COLORS],['skinColor',SKIN_COLORS],['paddleColor',PADDLE_COLORS],['court',COURT_PALETTES]]){const item=items.find(i=>i.id===draft[key]),menu=form.querySelector(`[data-color="${key}"]`);menu.querySelector('summary i').style.background=item.color??item.court;menu.querySelector('summary span').textContent=item.name;}
    drawPreview(draft);
  }
  form.addEventListener('change',event=>{
    const menu=event.target.closest('.color-menu');if(menu)menu.open=false;
    const values=new FormData(form);draft=normalizeSelection({character:values.get('character'),gender:values.get('gender'),customName:values.get('customName'),paddle:values.get('paddle'),shirtColor:values.get('shirtColor'),paddleColor:values.get('paddleColor'),hairColor:values.get('hairColor'),skinColor:values.get('skinColor'),court:values.get('court')});render();
  });
  form.addEventListener('submit',e=>{e.preventDefault();game.configure(draft);game.mode=form.elements.matchMode.value;game.setDifficulty(form.elements.difficulty.value);started=true;try{localStorage.setItem('drives-dinks.selection.v1',JSON.stringify(draft));localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}dialog.close();onStart()});
  dialog.querySelector('#resume-match').onclick=()=>dialog.close();
  dialog.addEventListener('cancel',e=>{if(!started)e.preventDefault()});
  function open(){dialog.querySelector('#resume-match').hidden=!started;dialog.querySelector('.start-match').textContent=started?'START NEW MATCH →':'START MATCH →';form.elements.matchMode.value=game.mode;form.elements.difficulty.value=game.difficulty;render();dialog.showModal()}
  open();return {open,isOpen:()=>dialog.open,refreshPreview:()=>drawPreview(draft)};
}
