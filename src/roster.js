import {playerProfile} from './core.js?v=14';

export const CHARACTERS = Object.freeze([
  {id:'avery',name:'Avery Lane',gender:'male',style:'All-rounder',description:'Steady movement, reach and placement. A versatile starting point.',abilities:{speed:12,acceleration:45,reach:1,control:1,reaction:.09,serve:1,power:1,spin:1}},
  {id:'remy',name:'Remy Cruz',gender:'male',style:'Court runner',description:'Quick coverage and recovery; shorter reach and less precise placement.',abilities:{speed:13.6,acceleration:51,reach:.96,control:.98,reaction:.082,serve:.96,power:.96,spin:.98}},
  {id:'morgan',name:'Morgan Reed',gender:'male',style:'Kitchen specialist',description:'Fast reactions and accurate soft shots; slower court coverage.',abilities:{speed:11.1,acceleration:43,reach:1.02,control:1.04,reaction:.082,serve:1.04,power:.97,spin:1.08}},
  {id:'jordan',name:'Jordan Vale',gender:'male',style:'Reach & pressure',description:'Extra reach for interceptions; slower reactions and wider shot spread.',abilities:{speed:11.5,acceleration:40,reach:1.12,control:.98,reaction:.1,serve:1.09,power:1.08,spin:.95}}
,{id:'selena',name:'Selena Ortiz',gender:'female',style:'All-rounder',description:'Balanced coverage and placement with quick recovery.',abilities:{speed:12.2,acceleration:47,reach:.99,control:1.03,reaction:.088,serve:1.02,power:1,spin:1.02}},
  {id:'harper',name:'Harper Brooks',gender:'female',style:'Court runner',description:'Explosive lateral coverage; slightly wider shot spread.',abilities:{speed:13.4,acceleration:52,reach:.96,control:.99,reaction:.078,serve:.95,power:.95,spin:1.04}},
  {id:'quinn',name:'Quinn Vásquez',gender:'female',style:'Kitchen specialist',description:'Fast reactions and precise soft play; slower recovery.',abilities:{speed:11,acceleration:44,reach:1.03,control:1.09,reaction:.081,serve:1.06,power:.94,spin:1.1}},
  {id:'lena',name:'Lena Park',gender:'female',style:'Reach & pressure',description:'Extended reach for interceptions; slower reactions.',abilities:{speed:11.6,acceleration:41,reach:1.11,control:.98,reaction:.105,serve:1.08,power:1.1,spin:.96}}
]);
export const PADDLES = Object.freeze([
  {id:'balanced',name:'Allcourt',style:'Balanced',description:'Even power, precision and spin.',power:1,control:1,spin:1},
  {id:'power',name:'Ignite',style:'Power',description:'Faster eligible drives; less control and spin.',power:1.12,control:.95,spin:.96},
  {id:'control',name:'Touch',style:'Control',description:'Tighter placement and more spin; slower drives.',power:.94,control:1.08,spin:1.1}
]);
export const JERSEYS = Object.freeze(['Gold','Coral','Blue','Violet']);
export const PADDLE_DESIGNS = Object.freeze([
  {id:'ocean',name:'Ocean',color:'#3b90d3',rgb:[59,144,211]},
  {id:'ember',name:'Ember',color:'#ed7750',rgb:[237,119,80]},
  {id:'mint',name:'Mint',color:'#66c5aa',rgb:[102,197,170]}
]);
export const DEFAULT_SELECTION = Object.freeze({character:'avery',paddle:'balanced',jersey:0,design:'ocean'});
export function normalizeSelection(input={}){
  const character=CHARACTERS.some(c=>c.id===input?.character)?input.character:DEFAULT_SELECTION.character;
  return {
    character,
    paddle:PADDLES.some(p=>p.id===input?.paddle)?input.paddle:DEFAULT_SELECTION.paddle,
    jersey:Number.isInteger(input?.jersey)&&input.jersey>=0&&input.jersey<JERSEYS.length?input.jersey:0,
    design:PADDLE_DESIGNS.some(d=>d.id===input?.design)?input.design:'ocean'
  };
}
export function buildProfile(input){
  const selection=normalizeSelection(input),character=CHARACTERS.find(c=>c.id===selection.character),paddle=PADDLES.find(p=>p.id===selection.paddle);
  return {...playerProfile(),characterId:character.id,name:character.name,gender:character.gender,abilities:{...character.abilities},paddle:{id:paddle.id,power:paddle.power,control:paddle.control,spin:paddle.spin},appearance:{jersey:selection.jersey,body:character.gender,paddleDesign:selection.design}};
}
export function createLineup(input){
  const selected=normalizeSelection(input),profile=CHARACTERS.find(c=>c.id===selected.character),same=CHARACTERS.filter(c=>c.gender===profile.gender&&c.id!==selected.character),other=CHARACTERS.filter(c=>c.gender!==profile.gender);
  const order=[selected.character,other[0].id,other[1].id,same[(CHARACTERS.indexOf(profile)+1)%same.length].id],designs=['mint','ocean','ember'];
  return order.map((id,index)=>buildProfile({character:id,paddle:index===0?selected.paddle:'balanced',jersey:(selected.jersey+index)%4,design:index===0?selected.design:designs[index%3]}));
}
export function selectionStats(input){const p=buildProfile(input);return {serve:p.abilities.serve,speed:p.abilities.speed/12,reach:p.abilities.reach,reactions:.09/p.abilities.reaction,placement:p.abilities.control*p.paddle.control,power:p.abilities.power*p.paddle.power,spin:p.abilities.spin*p.paddle.spin}}
