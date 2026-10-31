import {CHARACTERS,PADDLES,JERSEYS,PADDLE_DESIGNS,normalizeSelection,selectionStats,createLineup} from './roster.js?v=18';

const DIFFICULTY_KEY='drives-dinks.difficulty.v1';

export function setupSelection({game,onStart,drawPreview}){
  const dialog=document.querySelector('#match-setup'),form=dialog.querySelector('form');
  let draft=normalizeSelection(),started=false;
  try{draft=normalizeSelection(JSON.parse(localStorage.getItem('drives-dinks.selection.v1')||'null'))}catch{}
  function cards(items,name){return items.map(item=>`<label class="choice-card"><input type="radio" name="${name}" value="${item.id}"><span class="choice-title">${item.name}</span><span class="choice-style">${item.style}</span><span class="choice-description">${item.description}</span></label>`).join('')}
  dialog.querySelector('#character-choices').innerHTML=cards(CHARACTERS,'character');
  dialog.querySelector('#paddle-choices').innerHTML=cards(PADDLES,'paddle');
  dialog.querySelector('#jersey-choices').innerHTML=JERSEYS.map((name,i)=>`<label class="swatch jersey-${i}"><input type="radio" name="jersey" value="${i}"><span>${name}</span></label>`).join('');
  dialog.querySelector('#design-choices').innerHTML=PADDLE_DESIGNS.map(d=>`<label class="swatch" style="--swatch:${d.color}"><input type="radio" name="design" value="${d.id}"><span>${d.name}</span></label>`).join('');
  function render(){for(const [key,value] of Object.entries(draft))form.elements[key].value=String(value);const stats=selectionStats(draft);dialog.querySelector('#loadout-stats').innerHTML=Object.entries(stats).map(([key,value])=>{const percent=Math.round((value-1)*100);return `<span data-stat="${key}"><b>${key==='reactions'?'Reaction speed':key==='serve'?'Serve accuracy':key[0].toUpperCase()+key.slice(1)}</b> ${percent===0?'Standard':`${percent>0?'+':''}${percent}%`}</span>`}).join('');const lineup=createLineup(draft);dialog.querySelector('#team-preview').textContent=`You: ${lineup[0].name} · Partner: ${lineup[1].name} · Opponents: ${lineup[2].name} & ${lineup[3].name}`;drawPreview(draft)}
  form.addEventListener('change',()=>{const values=new FormData(form),character=values.get('character');draft=normalizeSelection({character,paddle:values.get('paddle'),jersey:Number(values.get('jersey')),design:values.get('design')});render()});
  form.addEventListener('submit',e=>{e.preventDefault();game.configure(draft);game.mode=form.elements.matchMode.value;game.setDifficulty(form.elements.difficulty.value);started=true;try{localStorage.setItem('drives-dinks.selection.v1',JSON.stringify(draft));localStorage.setItem(DIFFICULTY_KEY,game.difficulty)}catch{}dialog.close();onStart()});
  dialog.querySelector('#resume-match').onclick=()=>dialog.close();
  dialog.addEventListener('cancel',e=>{if(!started)e.preventDefault()});
  function open(){dialog.querySelector('#resume-match').hidden=!started;dialog.querySelector('.start-match').textContent=started?'START NEW MATCH →':'START MATCH →';form.elements.matchMode.value=game.mode;form.elements.difficulty.value=game.difficulty;render();dialog.showModal()}
  open();return {open,isOpen:()=>dialog.open,refreshPreview:()=>drawPreview(draft)};
}
