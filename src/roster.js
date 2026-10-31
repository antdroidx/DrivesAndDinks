import {playerProfile} from './core.js';

export const CHARACTERS = Object.freeze([
  {id:'avery',name:'Avery Lane',style:'All-rounder',description:'Steady movement, reach and placement. A versatile starting point.',abilities:{speed:12,acceleration:45,reach:1,control:1,reaction:.09}},
  {id:'remy',name:'Remy Cruz',style:'Court runner',description:'Quick coverage and recovery; shorter reach and less precise placement.',abilities:{speed:13.6,acceleration:51,reach:.96,control:.98,reaction:.082}},
  {id:'morgan',name:'Morgan Reed',style:'Kitchen specialist',description:'Fast reactions and accurate soft shots; slower court coverage.',abilities:{speed:11.1,acceleration:43,reach:1.02,control:1.04,reaction:.082}},
  {id:'jordan',name:'Jordan Vale',style:'Reach & pressure',description:'Extra reach for interceptions; slower reactions and wider shot spread.',abilities:{speed:11.5,acceleration:40,reach:1.12,control:.98,reaction:.1}}
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
  return {
    character:CHARACTERS.some(c=>c.id===input?.character)?input.character:DEFAULT_SELECTION.character,
    paddle:PADDLES.some(p=>p.id===input?.paddle)?input.paddle:DEFAULT_SELECTION.paddle,
    jersey:Number.isInteger(input?.jersey)&&input.jersey>=0&&input.jersey<JERSEYS.length?input.jersey:0,
    design:PADDLE_DESIGNS.some(d=>d.id===input?.design)?input.design:'ocean'
  };
}
export function buildProfile(input){
  const selection=normalizeSelection(input),character=CHARACTERS.find(c=>c.id===selection.character),paddle=PADDLES.find(p=>p.id===selection.paddle);
  return {...playerProfile(),characterId:character.id,name:character.name,abilities:{...character.abilities},paddle:{id:paddle.id,power:paddle.power,control:paddle.control,spin:paddle.spin},appearance:{jersey:selection.jersey,paddleDesign:selection.design}};
}
export function createLineup(input){
  const selected=normalizeSelection(input),others=CHARACTERS.filter(c=>c.id!==selected.character);
  return [buildProfile(selected),...others.map((c,i)=>buildProfile({character:c.id,paddle:'balanced',jersey:(selected.jersey+i+1)%4,design:['mint','ocean','ember'][i]}))];
}
export function selectionStats(input){const p=buildProfile(input);return {speed:p.abilities.speed/12,reach:p.abilities.reach,reactions:.09/p.abilities.reaction,placement:p.abilities.control*p.paddle.control,power:p.paddle.power,spin:p.paddle.spin}}

