import {CHARACTERS,PADDLES,CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS,COURT_PALETTES,normalizeSelection,selectionStats,createLineup} from './roster.js';

const DIFFICULTY_KEY='drives-dinks.difficulty.v1';
const STAT_LABELS={serve:'Serve',speed:'Speed',reach:'Reach',reactions:'Reactions',placement:'Placement',power:'Power',spin:'Spin'};

export function statRating(value){return Math.max(0,Math.min(100,Math.round(50+(Number(value)-1)*100)))}

export function setupSelection({game,onStart,drawPreview}){
  const dialog=document.querySelector('#match-setup'),form=dialog.querySelector('form');
  let draft=normalizeSelection(),started=false;
  try{draft=normalizeSelection(JSON.parse(localStorage.getItem('drives-dinks.selection.v1')||'null'))}catch{}
  function cards(items,name){return items.map(item=>`<label class="choice-card"><input type="radio" name="${name}" value="${item.id}"><span class="choice-title">${item.name}</span><span class="choice-style">${item.style}</span><span class="choice-description">${item.description}</span></label>`).join('')}
  const swatches=(items,name,colorKey='color')=>items.map(item=>`<label class="swatch color-swatch" style="--swatch:${item[colorKey]}"><input type="radio" name="${name}" value="${item.id}"><span>${item.name}</span></label>`).join('');
  dialog.querySelector('#character-choices').innerHTML=cards(CHARACTERS,'character');
  dialog.querySelector('#paddle-choices').innerHTML=cards(PADDLES,'paddle');
  dialog.querySelector('#shirt-choices').innerHTML=swatches(CLOTHING_COLORS,'shirtColor');
  dialog.querySelector('#hair-choices').innerHTML=swatches(HAIR_COLORS,'hairColor');
  dialog.querySelector('#skin-choices').innerHTML=swatches(SKIN_COLORS,'skinColor');
  dialog.querySelector('#paddle-color-choices').innerHTML=swatches(PADDLE_COLORS,'paddleColor');
  dialog.querySelector('#court-choices').innerHTML=COURT_PALETTES.map(item=>`<label class="swatch court-swatch" style="--swatch:${item.court};--court-kitchen:${item.kitchen}"><input type="radio" name="court" value="${item.id}"><span>${item.name}</span></label>`).join('');
  function selected(name,value){form.querySelectorAll(`[name="${name}"]`).forEach(input=>{input.checked=input.value===String(value)})}
  function appearanceSummary(selectionValue){
    const label=(items,id)=>items.find(item=>item.id===id)?.name??id;
    return `${label(CLOTHING_COLORS,selectionValue.shirtColor)} clothing · ${label(PADDLE_COLORS,selectionValue.paddleColor)} paddle · ${label(HAIR_COLORS,selectionValue.hairColor)} hair · ${label(SKIN_COLORS,selectionValue.skinColor)} skin · ${label(COURT_PALETTES,selectionValue.court)} court`;
  }
  function render(){
    for(const [key,value] of Object.entries(draft))selected(key,value);
    dialog.querySelector('#appearance-summary').textContent=appearanceSummary(draft);
    const stats=selectionStats(draft);dialog.querySelector('#loadout-stats').innerHTML=Object.entries(stats).map(([key,value])=>{const rating=statRating(value);return `<div class="stat-row" data-stat="${key}"><span>${STAT_LABELS[key]}</span><div class="stat-meter" role="img" aria-label="${STAT_LABELS[key]} ${rating} out of 100"><i style="width:${rating}%"></i></div><strong>${rating}</strong></div>`}).join('');
    const lineup=createLineup(draft);dialog.querySelector('#team-preview').textContent=`You: ${lineup[0].name} · Partner: ${lineup[1].name} · Opponents: ${lineup[2].name} & ${lineup[3].name}`;drawPreview(draft);
  }
  form.addEventListener('change',()=>{
    const values=new FormData(form);draft=normalizeSelection({character:values.get('character'),paddle:values.get('paddle'),shirtColor:values.get('shirtColor'),paddleColor:values.get('paddleColor'),hairColor:values.get('hairColor'),skinColor:values.get('skinColor'),court:values.get('court')});render();
  });
  form.addEventListener('submit',e=>{e.preventDefault();game.configure(draft);game.mode=form.elements.matchMode.value;game.setDifficulty(form.elements.difficulty.value);started=true;try{localStorage.setItem('drives-dinks.selection.v1',JSON.stringify(draft));localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}dialog.close();onStart()});
  dialog.querySelector('#resume-match').onclick=()=>dialog.close();
  dialog.addEventListener('cancel',e=>{if(!started)e.preventDefault()});
  function open(){dialog.querySelector('#resume-match').hidden=!started;dialog.querySelector('.start-match').textContent=started?'START NEW MATCH →':'START MATCH →';form.elements.matchMode.value=game.mode;form.elements.difficulty.value=game.difficulty;render();dialog.showModal()}
  open();return {open,isOpen:()=>dialog.open,refreshPreview:()=>drawPreview(draft)};
}
