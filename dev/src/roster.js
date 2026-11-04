import {competitionRecord} from './competition.js?v=112';
import {DEFAULT_ABILITIES,playerProfile} from './core.js?v=112';

// Ratings are the design-facing values. Internal simulation multipliers are
// derived from them so each shot category can influence play independently.
export const RATING_KEYS=Object.freeze(['serve','drive','volley','drop','dink','lob','smash','power','control','defense','agility','courtIQ','reach','aggression']);
export const RATING_LABELS=Object.freeze({serve:'Serve',drive:'Drive',volley:'Volley / Hands',drop:'Drop',dink:'Dink',lob:'Lob',smash:'Slam / Smash',power:'Power',control:'Control',defense:'Defense / Reset',agility:'Speed / Agility',courtIQ:'Court IQ',reach:'Reach',aggression:'Offense / Aggressiveness'});
export const PLAYTEST_BASE_RATING=70;
export const PLAYTEST_SKILLS=Object.freeze({control:1.42,serve:1.3,speed:1.18,acceleration:1.15,reaction:.72});

const PLAYSTYLE_RATINGS=Object.freeze({
  balanced:{serve:70,drive:70,volley:70,drop:70,dink:70,lob:70,smash:70,power:70,control:70,defense:70,agility:70,courtIQ:70,reach:70,aggression:70},
  speed:{serve:63,drive:61,volley:73,drop:67,dink:69,lob:73,smash:59,power:61,control:73,defense:85,agility:93,courtIQ:75,reach:61,aggression:57},
  soft:{serve:66,drive:68,volley:74,drop:82,dink:86,lob:70,smash:60,power:68,control:82,defense:84,agility:68,courtIQ:74,reach:66,aggression:48},
  banger:{serve:75,drive:86,volley:80,drop:55,dink:54,lob:62,smash:86,power:90,control:64,defense:56,agility:70,courtIQ:62,reach:74,aggression:90},
  net:{serve:62,drive:64,volley:90,drop:56,dink:64,lob:50,smash:86,power:76,control:70,defense:66,agility:68,courtIQ:76,reach:82,aggression:82}
});

export function ratingScale(rating){return 1+(Number(rating)-PLAYTEST_BASE_RATING)/100}
export function abilitiesFromRatings(ratings){
  const scale=key=>ratingScale(ratings[key]);
  return {
    ...DEFAULT_ABILITIES,
    speed:12*PLAYTEST_SKILLS.speed*scale('agility'),
    acceleration:45*PLAYTEST_SKILLS.acceleration*scale('agility'),
    reach:1.12*scale('reach'),
    control:PLAYTEST_SKILLS.control*scale('control'),
    reaction:Math.max(.045,(.09*PLAYTEST_SKILLS.reaction)/scale('agility')+Math.max(0,55-ratings.courtIQ)*.006),
    endurance:scale('agility'),
    serve:PLAYTEST_SKILLS.serve*scale('serve'),
    power:1.1*scale('power'),
    spin:1.05*scale('control'),
    drive:scale('drive'),
    volley:scale('volley'),
    drop:scale('drop'),
    dink:scale('dink'),
    lob:scale('lob'),
    smash:scale('smash'),
    defense:scale('defense'),
    courtIQ:scale('courtIQ'),
    aggression:scale('aggression')
  }
}

// Eight visual identities share five clearly differentiated rating templates.
export const CHARACTERS = Object.freeze([
  {id:'avery',gender:'male',ratingStyle:'balanced',style:'All-rounder',description:'Reliable coverage, placement and serve with no severe weakness.',strengths:['Balanced attack and defense','Stable placement'],tradeoffs:['No elite category']},
  {id:'remy',gender:'male',ratingStyle:'speed',style:'Court runner',description:'Covers ground quickly and turns defense into another chance.',strengths:['Top-end movement','Strong defensive coverage'],tradeoffs:['Low smash power']},
  {id:'morgan',gender:'male',ratingStyle:'soft',style:'Kitchen specialist',description:'Controls soft exchanges and resets pressure with patient hands.',strengths:['Best soft game','Strong reset defense'],tradeoffs:['Low power and drive pace']},
  {id:'jordan',gender:'male',ratingStyle:'banger',style:'Net pressure',description:'Uses extra pace and a heavy attack to crowd the kitchen.',strengths:['Elite drive and power','Aggressive attack'],tradeoffs:['Weak dinks and resets']},
  {id:'selena',gender:'female',ratingStyle:'net',style:'Counter-attacker',description:'Controls the exchange at the net and reverses pressure with quick hands.',strengths:['Elite volleys','Long reach'],tradeoffs:['Weak lob and drop']},
  {id:'harper',gender:'female',ratingStyle:'speed',style:'Speed specialist',description:'Explodes laterally and closes angles before opponents reset.',strengths:['Elite acceleration','Broad coverage'],tradeoffs:['Low smash power']},
  {id:'quinn',gender:'female',ratingStyle:'soft',style:'Control specialist',description:'Places dinks and drops tightly while absorbing pace.',strengths:['Top control','Precise soft game'],tradeoffs:['Low power and drive pace']},
  {id:'lena',gender:'female',ratingStyle:'banger',style:'Power interceptor',description:'Reaches across the middle and finishes high balls with force.',strengths:['Elite power','Aggressive smash'],tradeoffs:['Weak dinks and resets']}
].map(character=>{const ratings={...PLAYSTYLE_RATINGS[character.ratingStyle]};return {...character,ratings,abilities:abilitiesFromRatings(ratings)}}));

export const PADDLES = Object.freeze([
  {id:'balanced',name:'Allcourt',style:'Balanced',description:'Even power, precision and spin.',power:1,control:1,spin:1,ratingModifiers:{power:0,control:0},spinModifier:0},
  {id:'power',name:'Ignite',style:'Power',description:'Faster drives and smashes; less control and spin.',power:1.12,control:.95,spin:.96,ratingModifiers:{power:10,control:-5},spinModifier:-4},
  {id:'control',name:'Touch',style:'Control',description:'Tighter placement and more spin; slower attacks.',power:.98,control:1.08,spin:1.1,ratingModifiers:{power:-4,control:8},spinModifier:10}
]);

// Shape is independent from the paddle performance profile. The guide used
// for this tuning describes elongated paddles as higher swing-weight and
// higher reach, while wide shapes prioritize forgiveness and quick hands.
export const PADDLE_SHAPES = Object.freeze([
  {id:'wide',name:'Wide',style:'Fast hands · forgiving',description:'A larger side-to-side sweet spot and quicker hands; slightly less reach and power.',reach:.96,power:.96,control:1.06,handSpeed:1.1,sweetSpot:1.15,ratingModifiers:{volley:6,power:-4,reach:-3}},
  {id:'elongated',name:'Elongated',style:'Reach · power',description:'More leverage and reach; slower hands and a narrower side-to-side sweet spot.',reach:1.07,power:1.05,control:.97,handSpeed:.92,sweetSpot:.9,ratingModifiers:{power:6,reach:6,volley:-5}},
  {id:'hybrid',name:'Hybrid',style:'Balanced',description:'Balanced reach, power, sweet spot and hand speed.',reach:1,power:1,control:1,handSpeed:1,sweetSpot:1,ratingModifiers:{power:0,reach:0,volley:0}}
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
  {id:'pink-black',name:'Pink / Black',background:'#35232f',stripe:'#543047',outer:'#171219',outerLight:'#30212b',apron:'#75566e',court:'#a6577e',kitchen:'#201a22',line:'#ffe8e2'},
  {id:'black-gray',name:'Black / Gray',background:'#11151a',stripe:'#20262d',outer:'#090c10',outerLight:'#282e35',apron:'#484f56',court:'#292f35',kitchen:'#969da2',line:'#f5f1e7'},
  {id:'violet-blue',name:'Violet / Blue',background:'#17172f',stripe:'#29254f',outer:'#0b0b18',outerLight:'#29244d',apron:'#514d83',court:'#3e52a8',kitchen:'#7169df',line:'#f0ecff'},
  {id:'gray-red',name:'Gray / Red',background:'#27292d',stripe:'#3d4146',outer:'#141619',outerLight:'#35393e',apron:'#626970',court:'#565d63',kitchen:'#a43b45',line:'#eee7dc'}
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

export const DEFAULT_SELECTION = Object.freeze({character:'avery',paddle:'balanced',paddleShape:'hybrid',shirtColor:'green',paddleColor:'mint',hairColor:'brown',skinColor:'medium',court:'blue-gray'});
const valid=(items,id)=>items.some(item=>item.id===id)?id:null;
export function normalizeSelection(input={}){
  const character=CHARACTERS.some(c=>c.id===input?.character)?input.character:DEFAULT_SELECTION.character;
  const legacyPaddleColor=input?.paddleColor??(input?.design==='ocean'?'blue':input?.design);
  return {
    character,
    gender:input?.gender==='male'||input?.gender==='female'?input.gender:CHARACTERS.find(c=>c.id===character).gender,
    customName:String(input?.customName??'').trim().slice(0,40),
    paddle:valid(PADDLES,input?.paddle)??DEFAULT_SELECTION.paddle,
    paddleShape:valid(PADDLE_SHAPES,input?.paddleShape)??DEFAULT_SELECTION.paddleShape,
    shirtColor:valid(CLOTHING_COLORS,input?.shirtColor)??DEFAULT_SELECTION.shirtColor,
    paddleColor:valid(PADDLE_COLORS,legacyPaddleColor)??DEFAULT_SELECTION.paddleColor,
    hairColor:valid(HAIR_COLORS,input?.hairColor)??DEFAULT_SELECTION.hairColor,
    skinColor:valid(SKIN_COLORS,input?.skinColor)??DEFAULT_SELECTION.skinColor,
    court:valid(COURT_PALETTES,['red-white','red-gray'].includes(input?.court)?'gray-red':input?.court)??DEFAULT_SELECTION.court
  };
}
export function buildProfile(input, options={}){
  const selection=normalizeSelection(input),character=CHARACTERS.find(c=>c.id===selection.character),paddle=PADDLES.find(p=>p.id===selection.paddle),shape=PADDLE_SHAPES.find(item=>item.id===selection.paddleShape);
  const identity=options.identity??generateIdentity({gender:selection.gender,skinColor:selection.skinColor,random:options.random??Math.random});
  const attributes=Object.fromEntries(RATING_KEYS.map(key=>[key,Math.max(10,Math.min(95,Number.isFinite(options.attributes?.[key])?options.attributes[key]:character.ratings[key]))])),abilities=abilitiesFromRatings(attributes);
  return {...playerProfile(),attributes,competition:competitionRecord(options.competitiveRating??3),playstyle:{aggression:attributes.aggression/100,patience:attributes.courtIQ/100},characterId:character.id,archetypeId:character.id,backhandStyle:({balanced:'mixed',speed:'one',soft:'mixed',banger:'two',net:'one'})[character.ratingStyle],ratingStyle:character.ratingStyle,archetype:character.style,name:selection.customName||identity.name,culture:identity.culture,gender:selection.gender,strengths:[...character.strengths],tradeoffs:[...character.tradeoffs],ratings:{...attributes},abilities,paddle:{id:paddle.id,power:paddle.power,control:paddle.control,spin:paddle.spin,ratingModifiers:{...paddle.ratingModifiers},spinModifier:paddle.spinModifier,shapeId:shape.id,shapeName:shape.name,shapePower:shape.power,shapeControl:shape.control,shapeReach:shape.reach,shapeHandSpeed:shape.handSpeed,shapeSweetSpot:shape.sweetSpot,shapeRatingModifiers:{...shape.ratingModifiers}},appearance:{body:selection.gender,shirtColor:selection.shirtColor,paddleColor:selection.paddleColor,hairColor:selection.hairColor,skinColor:selection.skinColor,court:selection.court}};
}
export function createLineup(input,{random=Math.random}={}){
  const selected=normalizeSelection(input),player=CHARACTERS.find(c=>c.id===selected.character),usedNames=new Set();
  const playerCulture=weightedPick(compatibleCultures(selected.skinColor),random)??randomItem(CULTURE_IDS,random);
  const playerIdentity=generateIdentity({gender:selected.gender,skinColor:selected.skinColor,culture:playerCulture,random,usedNames});
  const remaining=shuffle(CHARACTERS.filter(c=>c.id!==player.id),random);
  const characters=[player,...remaining.slice(0,3)];
  const cpuCultures=shuffle(CULTURE_IDS.filter(id=>id!==playerCulture),random).slice(0,3);
  return characters.map((character,index)=>{
    if(index===0){const p=buildProfile(selected,{identity:playerIdentity});p.appearance.height=160+Math.floor(random()*34);p.appearance.build=.15+random()*.7;p.appearance.hairStyle=randomItem(['crop','sidePart','waves','ponytail','buzz'],random);return p;}
    const gender=random()<.5?'male':'female',identity=generateIdentity({gender,culture:cpuCultures[index-1],random,usedNames});
    const profile=buildProfile({...selected,character:character.id,gender,customName:'',paddle:randomItem(PADDLES,random).id,paddleShape:randomItem(PADDLE_SHAPES,random).id,shirtColor:index===1?(selected.shirtColor==='white'?'blue':'white'):identity.shirtColor,paddleColor:identity.paddleColor,hairColor:identity.hairColor,skinColor:identity.skinColor},{identity});profile.appearance.height=160+Math.floor(random()*34);profile.appearance.build=.15+random()*.7;profile.appearance.hairStyle=randomItem(['crop','sidePart','waves','ponytail','buzz'],random);return profile;
  });
}
export function selectionStats(input){
 const selection=normalizeSelection(input),character=CHARACTERS.find(c=>c.id===selection.character);
 return {...character.ratings};
}
export function effectiveRatings(input){
 const selection=normalizeSelection(input),character=CHARACTERS.find(c=>c.id===selection.character),paddle=PADDLES.find(p=>p.id===selection.paddle),shape=PADDLE_SHAPES.find(item=>item.id===selection.paddleShape),ratings={...character.ratings};
 for(const modifiers of [paddle.ratingModifiers,shape.ratingModifiers])for(const [key,delta] of Object.entries(modifiers??{}))ratings[key]=Math.max(0,Math.min(100,ratings[key]+delta));
 return ratings;
}
export function skillAverage(ratings){const keys=RATING_KEYS.filter(key=>key!=='aggression');return Math.round(keys.reduce((sum,key)=>sum+(Number(ratings[key])||0),0)/keys.length)}

// Internal balance profiles: presentation/demo selections remain unchanged.
export const SKILL_LEVELS=Object.freeze({beginner:35,intermediate:55,demo:70,advanced:85});
export function levelLineup(level='demo',random=Math.random){
 const baseline=SKILL_LEVELS[level];if(baseline===undefined)throw new Error('Unknown skill level');
 return ['avery','remy','jordan','selena'].map((character,index)=>{
  const source=CHARACTERS.find(c=>c.id===character),attributes=Object.fromEntries(RATING_KEYS.map(key=>[key,Math.max(10,Math.min(95,baseline+(source.ratings[key]-70)*.45))]));
  return buildProfile({character,shirtColor:['green','white','orange','purple'][index],paddleColor:['mint','blue','yellow','coral'][index]},{attributes,random});
 });
}
