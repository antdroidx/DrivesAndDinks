import {playerProfile} from './core.js?v=41';

// Development playtests use a skilled roster shared by every generated identity.
export const PLAYTEST_SKILLS=Object.freeze({control:1.42,serve:1.3,speed:1.18,acceleration:1.15,reaction:.72});
export const CHARACTERS = Object.freeze([
  {id:'avery',gender:'male',style:'All-rounder',description:'Reliable coverage, placement and serve with no severe weakness.',strengths:['Balanced movement','Stable placement'],tradeoffs:['No elite category'],abilities:{speed:12,acceleration:45,reach:1,control:1,reaction:.09,serve:1,power:1,spin:1}},
  {id:'remy',gender:'male',style:'Court runner',description:'Covers ground quickly and turns defense into another chance.',strengths:['Top-end speed','Quick acceleration'],tradeoffs:['Shorter reach','Less power'],abilities:{speed:13.6,acceleration:50,reach:.97,control:.97,reaction:.084,serve:.97,power:.95,spin:.98}},
  {id:'morgan',gender:'male',style:'Kitchen specialist',description:'Controls soft exchanges and reads close contact earlier.',strengths:['Best reactions','Strong spin'],tradeoffs:['Slow recovery','Low power'],abilities:{speed:11.1,acceleration:43,reach:1.01,control:1.06,reaction:.075,serve:1.02,power:.94,spin:1.1}},
  {id:'jordan',gender:'male',style:'Net pressure',description:'Uses extra reach and pace to crowd the kitchen and intercept.',strengths:['Long reach','Strong serve'],tradeoffs:['Slower reactions','Wider placement'],abilities:{speed:11.5,acceleration:41,reach:1.11,control:.97,reaction:.104,serve:1.06,power:1.05,spin:.94}},
  {id:'selena',gender:'female',style:'Counter-attacker',description:'Balances sharp placement with enough speed to reverse a rally.',strengths:['Accurate placement','Quick recovery'],tradeoffs:['Short reach','Moderate power'],abilities:{speed:12.3,acceleration:46,reach:.98,control:1.04,reaction:.085,serve:1.02,power:1.01,spin:1.03}},
  {id:'harper',gender:'female',style:'Speed specialist',description:'Explodes laterally and closes angles before opponents reset.',strengths:['Elite acceleration','Broad coverage'],tradeoffs:['Short reach','Lower power'],abilities:{speed:13.6,acceleration:53,reach:.96,control:.98,reaction:.078,serve:.95,power:.97,spin:1.02}},
  {id:'quinn',gender:'female',style:'Control specialist',description:'Places dinks and drops tightly while adding heavy spin.',strengths:['Top spin','Precise soft game'],tradeoffs:['Slowest runner','Low power'],abilities:{speed:11.2,acceleration:44,reach:1.02,control:1.1,reaction:.079,serve:1.06,power:.93,spin:1.12}},
  {id:'lena',gender:'female',style:'Power interceptor',description:'Reaches across the middle and finishes high balls with force.',strengths:['Long reach','Top power'],tradeoffs:['Slow reactions','Low spin'],abilities:{speed:11.7,acceleration:42,reach:1.12,control:.99,reaction:.102,serve:1.09,power:1.11,spin:.96}}
].map(character=>({...character,abilities:Object.fromEntries(Object.entries(character.abilities).map(([key,value])=>[key,value*(PLAYTEST_SKILLS[key]??1)]))})));

export const PADDLES = Object.freeze([
  {id:'balanced',name:'Allcourt',style:'Balanced',description:'Even power, precision and spin.',power:1,control:1,spin:1},
  {id:'power',name:'Ignite',style:'Power',description:'Faster eligible drives; less control and spin.',power:1.12,control:.95,spin:.96},
  {id:'control',name:'Touch',style:'Control',description:'Tighter placement and more spin; slower drives.',power:.94,control:1.08,spin:1.1}
]);
export const CLOTHING_COLORS = Object.freeze([
  {id:'black',name:'Black',color:'#171a21',rgb:[23,26,33]},
  {id:'gray',name:'Gray',color:'#929a9e',rgb:[146,154,158]},
  {id:'white',name:'White',color:'#f2f0e9',rgb:[242,240,233]},
  {id:'blue',name:'Blue',color:'#3478c8',rgb:[52,120,200]},
  {id:'yellow',name:'Yellow',color:'#e6c63e',rgb:[230,198,62]},
  {id:'red',name:'Red',color:'#c7473f',rgb:[199,71,63]},
  {id:'green',name:'Green',color:'#4b9c62',rgb:[75,156,98]},
  {id:'purple',name:'Purple',color:'#7854ad',rgb:[120,84,173]},
  {id:'pink',name:'Pink',color:'#d56698',rgb:[213,102,152]},
  {id:'orange',name:'Orange',color:'#df873b',rgb:[223,135,59]}
]);
export const HAIR_COLORS = Object.freeze([
  {id:'brown',name:'Brown',color:'#9a6237',rgb:[154,98,55]},
  {id:'black',name:'Black',color:'#1f2024',rgb:[31,32,36]},
  {id:'dark',name:'Dark Brown',color:'#5c3a24',rgb:[92,58,36]},
  {id:'blonde',name:'Blonde',color:'#e0c474',rgb:[224,196,116]},
  {id:'red',name:'Red',color:'#a8402f',rgb:[168,64,47]},
  {id:'auburn',name:'Auburn',color:'#7d3d22',rgb:[125,61,34]},
  {id:'gray',name:'Gray',color:'#999ea0',rgb:[153,158,160]},
  {id:'white',name:'White',color:'#f3f0e7',rgb:[243,240,231]},
  {id:'pink',name:'Pink',color:'#e07fb2',rgb:[224,127,178]},
  {id:'blue',name:'Blue',color:'#5981d2',rgb:[89,129,210]}
]);
export const SKIN_COLORS = Object.freeze([
  {id:'pale',name:'Pale',color:'#ffdfc9',rgb:[255,223,201]},
  {id:'light',name:'Light',color:'#f8cb9f',rgb:[248,203,159]},
  {id:'medium',name:'Medium',color:'#daa06d',rgb:[218,160,109]},
  {id:'tan',name:'Tan',color:'#c5845a',rgb:[197,132,90]},
  {id:'dark',name:'Dark',color:'#8a5e40',rgb:[138,94,64]},
  {id:'deep',name:'Deep',color:'#5f3f28',rgb:[95,63,40]}
]);
export const PADDLE_COLORS = Object.freeze([
  {id:'mint',name:'Mint',color:'#4be3c2',edgeColor:'#4be3c2',interiorColor:'#0e1518',rgb:[75,227,194]},
  {id:'coral',name:'Coral',color:'#ff6b57',edgeColor:'#ff6b57',interiorColor:'#180f12',rgb:[255,107,87]},
  {id:'blue',name:'Blue',color:'#4c8fe8',edgeColor:'#4c8fe8',interiorColor:'#0d101d',rgb:[76,143,232]},
  {id:'yellow',name:'Yellow',color:'#f5cd55',edgeColor:'#f5cd55',interiorColor:'#151310',rgb:[245,205,85]},
  {id:'red',name:'Red',color:'#cf4444',edgeColor:'#cf4444',interiorColor:'#150e10',rgb:[207,68,68]},
  {id:'purple',name:'Purple',color:'#a06ad2',edgeColor:'#a06ad2',interiorColor:'#130e14',rgb:[160,106,210]},
  {id:'orange',name:'Orange',color:'#f5883d',edgeColor:'#f5883d',interiorColor:'#171008',rgb:[245,136,61]},
  {id:'white',name:'White',color:'#f6f1e9',edgeColor:'#f6f1e9',interiorColor:'#121213',rgb:[246,241,233]},
  {id:'black',name:'Black',color:'#33393f',edgeColor:'#33393f',interiorColor:'#0d0f11',rgb:[51,57,63]},
  {id:'teal',name:'Teal',color:'#2fc4e4',edgeColor:'#2fc4e4',interiorColor:'#0f1416',rgb:[47,196,228]},
  {id:'silver',name:'Silver',color:'#c5c8cc',edgeColor:'#c5c8cc',interiorColor:'#0e0f10',rgb:[197,200,204]},
  {id:'pink',name:'Pink',color:'#f078b8',edgeColor:'#f078b8',interiorColor:'#160d11',rgb:[240,120,184]}
]);
export const PADDLE_DESIGNS = PADDLE_COLORS;
export const COURT_PALETTES = Object.freeze([
  {id:'blue-gray',name:'Blue / Gray',background:'#163b3b',stripe:'#254d43',outer:'#122a29',outerLight:'#263d3a',apron:'#507b70',court:'#357282',kitchen:'#8f9799',line:'#e9eee0'},
  {id:'green-orange',name:'Green / Orange',background:'#17352b',stripe:'#24553a',outer:'#0d251a',outerLight:'#183b29',apron:'#477f59',court:'#2f7957',kitchen:'#d27a3e',line:'#ffe9bd'},
  {id:'pink-black',name:'Pink / Black',background:'#35232f',stripe:'#543047',outer:'#171219',outerLight:'#30212b',apron:'#75566e',court:'#a6577e',kitchen:'#201a22',line:'#ffe8e2'}
]);
// Identity pools provide varied names while archetype mechanics remain fixed.
// Tone weights are broad and overlapping so no group maps to one complexion.
export const NAME_CULTURES = Object.freeze({
  white_american:{label:'White American',tones:{pale:4,light:5,medium:1},names:{
    male:{first:['Mason','Ethan','Noah','Liam','Owen','Caleb','Logan','Ryan'],last:['Carter','Brooks','Bennett','Sullivan','Hayes','Foster','Turner','Parker']},
    female:{first:['Olivia','Emma','Chloe','Grace','Avery','Nora','Hannah','Maya'],last:['Collins','Hayes','Foster','Turner','Bennett','Parker','Sullivan','Carter']}
  }},
  latin:{label:'Latin',tones:{light:1,medium:2,tan:3,dark:2,deep:1},names:{
    male:{first:['Mateo','Santiago','Diego','Luis','Javier','Andres','Rafael','Nicolas'],last:['Alvarez','Ramirez','Morales','Torres','Castillo','Navarro','Vega','Reyes']},
    female:{first:['Sofia','Camila','Valentina','Lucia','Mariana','Isabela','Elena','Gabriela'],last:['Ramirez','Morales','Torres','Castillo','Navarro','Vega','Reyes','Alvarez']}
  }},
  asian:{label:'Asian',tones:{light:2,medium:4,tan:2},names:{
    male:{first:['Mei','Haruto','Min-Jun','Kenji','Wei','Minh','Jae','Arun'],last:['Lin','Tanaka','Kim','Nguyen','Chen','Sato','Park','Tran']},
    female:{first:['Hana','Yuna','Mina','Arisa','Linh','Soo-Jin','Mei','Anh'],last:['Tanaka','Kim','Nguyen','Chen','Sato','Park','Tran','Lin']}
  }},
  european:{label:'European',tones:{pale:4,light:5,medium:1},names:{
    male:{first:['Luca','Henrik','Elias','Tomas','Julien','Oliver','Matej','Anton'],last:['Moretti','Larsen','Novak','Dubois','Keller','Nielsen','Petrov','Laurent']},
    female:{first:['Elin','Amelie','Freya','Clara','Nadia','Sofia','Ingrid','Marta'],last:['Larsen','Novak','Dubois','Keller','Nielsen','Petrova','Moretti','Laurent']}
  }},
  indian:{label:'Indian',tones:{light:1,medium:2,tan:3,dark:3,deep:2},names:{
    male:{first:['Arjun','Rohan','Aditya','Vikram','Dev','Kiran','Nikhil','Ishaan'],last:['Mehta','Iyer','Shah','Nair','Rao','Desai','Kapoor','Menon']},
    female:{first:['Priya','Ananya','Kavya','Meera','Isha','Nisha','Aarohi','Riya'],last:['Nair','Rao','Desai','Mehta','Iyer','Shah','Menon','Kapoor']}
  }},
  middle_eastern:{label:'Middle Eastern',tones:{pale:1,light:2,medium:3,tan:3,dark:2,deep:1},names:{
    male:{first:['Omar','Karim','Samir','Yusuf','Tariq','Adam','Zain','Faris'],last:['Haddad','Mansour','Khalil','Saleh','Farah','Nasser','Rahman','Aziz']},
    female:{first:['Layla','Noor','Yasmin','Amira','Dalia','Sara','Rania','Leila'],last:['Rahman','Haddad','Mansour','Saleh','Farah','Nasser','Khalil','Aziz']}
  }}
});
const CULTURE_IDS=Object.freeze(Object.keys(NAME_CULTURES));
const randomItem=(items,random=Math.random)=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
function weightedPick(entries,random=Math.random){
  const total=entries.reduce((sum,[,weight])=>sum+weight,0);let target=random()*total;
  for(const [value,weight] of entries){target-=weight;if(target<=0)return value}
  return entries.at(-1)?.[0];
}
function shuffle(items,random=Math.random){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function compatibleCultures(skinColor){return CULTURE_IDS.map(id=>[id,NAME_CULTURES[id].tones[skinColor]??0]).filter(([,weight])=>weight>0)}
export function generateIdentity({gender='male',skinColor=null,culture=null,random=Math.random,usedNames=new Set()}={}){
  const compatible=compatibleCultures(skinColor),cultureIds=compatible.length?compatible:[[culture??randomItem(CULTURE_IDS,random),1]];
  const selectedCulture=NAME_CULTURES[culture]?culture:weightedPick(cultureIds,random);
  const group=NAME_CULTURES[selectedCulture],toneWeights=Object.entries(group.tones);
  const resolvedSkin=SKIN_COLORS.some(item=>item.id===skinColor)?skinColor:weightedPick(toneWeights,random);
  const pool=group.names[gender==='female'?'female':'male'];
  let name='';
  for(let attempt=0;attempt<80;attempt++){
    const candidate=`${randomItem(pool.first,random)} ${randomItem(pool.last,random)}`;
    if(!usedNames.has(candidate)){name=candidate;break}
  }
  if(!name)name=`${randomItem(pool.first,random)} ${randomItem(pool.last,random)} ${usedNames.size+1}`;
  usedNames.add(name);
  return {name,culture:selectedCulture,skinColor:resolvedSkin,hairColor:randomItem(HAIR_COLORS,random).id,shirtColor:randomItem(CLOTHING_COLORS,random).id,paddleColor:randomItem(PADDLE_COLORS,random).id};
}

export const DEFAULT_SELECTION = Object.freeze({character:'avery',paddle:'balanced',shirtColor:'green',paddleColor:'mint',hairColor:'brown',skinColor:'medium',court:'blue-gray'});
const valid=(items,id)=>items.some(item=>item.id===id)?id:null;
export function normalizeSelection(input={}){
  const character=CHARACTERS.some(c=>c.id===input?.character)?input.character:DEFAULT_SELECTION.character;
  const legacyPaddleColor=input?.paddleColor??(input?.design==='ocean'?'blue':input?.design);
  return {
    character,
    paddle:valid(PADDLES,input?.paddle)??DEFAULT_SELECTION.paddle,
    shirtColor:valid(CLOTHING_COLORS,input?.shirtColor)??DEFAULT_SELECTION.shirtColor,
    paddleColor:valid(PADDLE_COLORS,legacyPaddleColor)??DEFAULT_SELECTION.paddleColor,
    hairColor:valid(HAIR_COLORS,input?.hairColor)??DEFAULT_SELECTION.hairColor,
    skinColor:valid(SKIN_COLORS,input?.skinColor)??DEFAULT_SELECTION.skinColor,
    court:valid(COURT_PALETTES,input?.court)??DEFAULT_SELECTION.court
  };
}
export function buildProfile(input, options={}){
  const selection=normalizeSelection(input),character=CHARACTERS.find(c=>c.id===selection.character),paddle=PADDLES.find(p=>p.id===selection.paddle);
  const identity=options.identity??generateIdentity({gender:character.gender,skinColor:selection.skinColor,random:options.random??Math.random});
  return {...playerProfile(),characterId:character.id,archetypeId:character.id,archetype:character.style,name:identity.name,culture:identity.culture,gender:character.gender,strengths:[...character.strengths],tradeoffs:[...character.tradeoffs],abilities:{...character.abilities},paddle:{id:paddle.id,power:paddle.power,control:paddle.control,spin:paddle.spin},appearance:{body:character.gender,shirtColor:selection.shirtColor,paddleColor:selection.paddleColor,hairColor:selection.hairColor,skinColor:selection.skinColor,court:selection.court}};
}
export function createLineup(input,{random=Math.random}={}){
  const selected=normalizeSelection(input),player=CHARACTERS.find(c=>c.id===selected.character),usedNames=new Set();
  const playerCulture=weightedPick(compatibleCultures(selected.skinColor),random)??randomItem(CULTURE_IDS,random);
  const playerIdentity=generateIdentity({gender:player.gender,skinColor:selected.skinColor,culture:playerCulture,random,usedNames});
  const partner=randomItem(CHARACTERS.filter(c=>c.gender!==player.gender),random);
  const remaining=CHARACTERS.filter(c=>c.id!==player.id&&c.id!==partner.id);
  const opponents=[randomItem(remaining.filter(c=>c.gender==='male'),random),randomItem(remaining.filter(c=>c.gender==='female'),random)];
  if(random()<.5)opponents.reverse();
  const characters=[player,partner,...opponents];
  const cpuCultures=shuffle(CULTURE_IDS.filter(id=>id!==playerCulture),random).slice(0,3);
  return characters.map((character,index)=>{
    if(index===0)return buildProfile(selected,{identity:playerIdentity});
    const identity=generateIdentity({gender:character.gender,culture:cpuCultures[index-1],random,usedNames});
    return buildProfile({...selected,character:character.id,paddle:'balanced',shirtColor:identity.shirtColor,paddleColor:identity.paddleColor,hairColor:identity.hairColor,skinColor:identity.skinColor},{identity});
  });
}
export function selectionStats(input){const p=buildProfile(input);return {serve:p.abilities.serve,speed:p.abilities.speed/12,reach:p.abilities.reach,reactions:.09/p.abilities.reaction,placement:p.abilities.control*p.paddle.control,power:p.abilities.power*p.paddle.power,spin:p.abilities.spin*p.paddle.spin}}
