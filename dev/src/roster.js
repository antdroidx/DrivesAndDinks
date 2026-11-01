import {playerProfile} from './core.js?v=36';

export const CHARACTERS = Object.freeze([
  {id:'avery',name:'Avery Lane',gender:'male',style:'All-rounder',description:'Steady movement, reach and placement. A versatile starting point.',abilities:{speed:12,acceleration:45,reach:1,control:1,reaction:.09,serve:1,power:1,spin:1}},
  {id:'remy',name:'Remy Cruz',gender:'male',style:'Court runner',description:'Quick coverage and recovery; shorter reach and less precise placement.',abilities:{speed:13.6,acceleration:51,reach:.96,control:.98,reaction:.082,serve:.96,power:.96,spin:.98}},
  {id:'morgan',name:'Morgan Reed',gender:'male',style:'Kitchen specialist',description:'Fast reactions and accurate soft shots; slower court coverage.',abilities:{speed:11.1,acceleration:43,reach:1.02,control:1.04,reaction:.082,serve:1.04,power:.97,spin:1.08}},
  {id:'jordan',name:'Jordan Vale',gender:'male',style:'Reach & pressure',description:'Extra reach for interceptions; slower reactions and wider shot spread.',abilities:{speed:11.5,acceleration:40,reach:1.12,control:.98,reaction:.1,serve:1.09,power:1.08,spin:.95}},
  {id:'selena',name:'Selena Ortiz',gender:'female',style:'All-rounder',description:'Balanced coverage and placement with quick recovery.',abilities:{speed:12.2,acceleration:47,reach:.99,control:1.03,reaction:.088,serve:1.02,power:1,spin:1.02}},
  {id:'harper',name:'Harper Brooks',gender:'female',style:'Court runner',description:'Explosive lateral coverage; slightly wider shot spread.',abilities:{speed:13.4,acceleration:52,reach:.96,control:.99,reaction:.078,serve:.95,power:.95,spin:1.04}},
  {id:'quinn',name:'Quinn Vásquez',gender:'female',style:'Kitchen specialist',description:'Fast reactions and precise soft play; slower recovery.',abilities:{speed:11,acceleration:44,reach:1.03,control:1.09,reaction:.081,serve:1.06,power:.94,spin:1.1}},
  {id:'lena',name:'Lena Park',gender:'female',style:'Reach & pressure',description:'Extended reach for interceptions; slower reactions.',abilities:{speed:11.6,acceleration:41,reach:1.11,control:.98,reaction:.105,serve:1.08,power:1.1,spin:.96}}
]);
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
export function buildProfile(input){
  const selection=normalizeSelection(input),character=CHARACTERS.find(c=>c.id===selection.character),paddle=PADDLES.find(p=>p.id===selection.paddle);
  return {...playerProfile(),characterId:character.id,name:character.name,gender:character.gender,abilities:{...character.abilities},paddle:{id:paddle.id,power:paddle.power,control:paddle.control,spin:paddle.spin},appearance:{body:character.gender,shirtColor:selection.shirtColor,paddleColor:selection.paddleColor,hairColor:selection.hairColor,skinColor:selection.skinColor,court:selection.court}};
}
export function createLineup(input){
  const selected=normalizeSelection(input),profile=CHARACTERS.find(c=>c.id===selected.character),same=CHARACTERS.filter(c=>c.gender===profile.gender&&c.id!==selected.character),other=CHARACTERS.filter(c=>c.gender!==profile.gender);
  const order=[selected.character,other[0].id,other[1].id,same[(CHARACTERS.indexOf(profile)+1)%same.length].id];
  return order.map((id,index)=>{
    const character=CHARACTERS.find(c=>c.id===id);
    if(index===0)return buildProfile(selected);
    return buildProfile({character:id,paddle:'balanced',shirtColor:CLOTHING_COLORS[(index+character.id.length)%CLOTHING_COLORS.length].id,paddleColor:PADDLE_COLORS[(index+3)%PADDLE_COLORS.length].id,hairColor:HAIR_COLORS[(index+3)%HAIR_COLORS.length].id,skinColor:SKIN_COLORS[(index+3)%SKIN_COLORS.length].id,court:selected.court});
  });
}
export function selectionStats(input){const p=buildProfile(input);return {serve:p.abilities.serve,speed:p.abilities.speed/12,reach:p.abilities.reach,reactions:.09/p.abilities.reaction,placement:p.abilities.control*p.paddle.control,power:p.abilities.power*p.paddle.power,spin:p.abilities.spin*p.paddle.spin}}
