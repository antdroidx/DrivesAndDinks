import {CHARACTERS,PADDLES,HAIR_COLORS,SKIN_TONES,CLOTHING_COLORS,PADDLE_COLORS,COURT_PALETTES,OUTFITS,normalizeSelection,selectionStats,createLineup} from './roster.js?v=20';

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
  dialog.querySelector('#hair-choices').innerHTML=swatches(HAIR_COLORS,'hair');
  dialog.querySelector('#skin-choices').innerHTML=swatches(SKIN_TONES,'skin');
  dialog.querySelector('#shirt-choices').innerHTML=swatches(CLOTHING_COLORS,'shirtColor');
  dialog.querySelector('#bottom-choices').innerHTML=swatches(CLOTHING_COLORS,'bottomColor');
  dialog.querySelector('#paddle-color-choices').innerHTML=swatches(PADDLE_COLORS,'paddleColor');
  dialog.querySelector('#court-choices').innerHTML=COURT_PALETTES.map(item=>`<label class="swatch court-swatch" style="--swatch:${item.court};--court-kitchen:${item.kitchen}"><input type="radio" name="court" value="${item.id}"><span>${item.name}</span></label>`).join('');
  function selected(name,value){form.querySelectorAll(`[name="${name}"]`).forEach(input=>{input.checked=input.value===String(value)})}
  function renderOutfits(){
    const gender=CHARACTERS.find(character=>character.id===draft.character).gender;
    const choices=OUTFITS[gender];
    if(!choices.some(choice=>choice.id===draft.outfit))draft=normalizeSelection({...draft,outfit:choices[0].id});
    dialog.querySelector('#outfit-choices').innerHTML=swatches(choices,'outfit');
  }
  function render(){
    renderOutfits();
    for(const [key,value] of Object.entries(draft))selected(key,value);
    const stats=selectionStats(draft);dialog.querySelector('#loadout-stats').innerHTML=Object.entries(stats).map(([key,value])=>{const rating=statRating(value);return `<div class="stat-row" data-stat="${key}"><span>${STAT_LABELS[key]}</span><div class="stat-meter" role="img" aria-label="${STAT_LABELS[key]} ${rating} out of 100"><i style="width:${rating}%"></i></div><strong>${rating}</strong></div>`}).join('');
    const lineup=createLineup(draft);dialog.querySelector('#team-preview').textContent=`You: ${lineup[0].name} · Partner: ${lineup[1].name} · Opponents: ${lineup[2].name} & ${lineup[3].name}`;drawPreview(draft);
  }
  form.addEventListener('change',()=>{
    const values=new FormData(form);draft=normalizeSelection({character:values.get('character'),paddle:values.get('paddle'),hair:values.get('hair'),skin:values.get('skin'),outfit:values.get('outfit'),shirtColor:values.get('shirtColor'),bottomColor:values.get('bottomColor'),paddleColor:values.get('paddleColor'),court:values.get('court')});render();
  });
  form.addEventListener('submit',e=>{e.preventDefault();game.configure(draft);game.mode=form.elements.matchMode.value;game.setDifficulty(form.elements.difficulty.value);started=true;try{localStorage.setItem('drives-dinks.selection.v1',JSON.stringify(draft));localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}dialog.close();onStart()});
  dialog.querySelector('#resume-match').onclick=()=>dialog.close();
  dialog.addEventListener('cancel',e=>{if(!started)e.preventDefault()});
  function open(){dialog.querySelector('#resume-match').hidden=!started;dialog.querySelector('.start-match').textContent=started?'START NEW MATCH →':'START MATCH →';form.elements.matchMode.value=game.mode;form.elements.difficulty.value=game.difficulty;render();dialog.showModal()}
  open();return {open,isOpen:()=>dialog.open,refreshPreview:()=>drawPreview(draft)};
}
