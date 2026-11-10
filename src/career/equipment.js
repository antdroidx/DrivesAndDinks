// Basic career equipment.
//
// Phase 1 uses the engine's existing paddle families and shapes. Seasonal
// brands, product generations and signature releases belong to a later phase.

import {recordFinance} from './finance.js';

export const EQUIPMENT_VERSION=1;
export const STARTER_EQUIPMENT_ID='allcourt-hybrid';

export const PADDLE_CATALOG=Object.freeze([
  {id:'allcourt-hybrid',label:'Allcourt Hybrid',family:'balanced',familyLabel:'Allcourt',shape:'hybrid',shapeLabel:'Hybrid',price:0,description:'Forgiving, balanced starter paddle.'},
  {id:'ignite-widebody',label:'Ignite Widebody',family:'power',familyLabel:'Ignite',shape:'widebody',shapeLabel:'Widebody',price:120,description:'Broad face with extra power and stability.'},
  {id:'touch-widebody',label:'Touch Widebody',family:'control',familyLabel:'Touch',shape:'widebody',shapeLabel:'Widebody',price:140,description:'Broad face built for control and spin.'},
  {id:'allcourt-elongated',label:'Allcourt Elongated',family:'balanced',familyLabel:'Allcourt',shape:'elongated',shapeLabel:'Elongated',price:160,description:'Added reach with a balanced face.'},
  {id:'ignite-elongated',label:'Ignite Elongated',family:'power',familyLabel:'Ignite',shape:'elongated',shapeLabel:'Elongated',price:190,description:'Long face for leverage and power.'},
  {id:'touch-elongated',label:'Touch Elongated',family:'control',familyLabel:'Touch',shape:'elongated',shapeLabel:'Elongated',price:210,description:'Long face with control and spin emphasis.'}
]);

const byId=id=>PADDLE_CATALOG.find(item=>item.id===id)??PADDLE_CATALOG[0];

export function emptyEquipment(){
  return {version:EQUIPMENT_VERSION,owned:[STARTER_EQUIPMENT_ID],equipped:STARTER_EQUIPMENT_ID,purchases:[]};
}

export function normalizeEquipment(value){
  const owned=[...new Set([STARTER_EQUIPMENT_ID,...(Array.isArray(value?.owned)?value.owned.filter(id=>PADDLE_CATALOG.some(item=>item.id===id)):[])])];
  const equipped=owned.includes(value?.equipped)?value.equipped:STARTER_EQUIPMENT_ID;
  return {
    version:EQUIPMENT_VERSION,
    owned,
    equipped,
    purchases:Array.isArray(value?.purchases)?value.purchases.slice(-16):[]
  };
}

export function equippedPaddle(state){
  return byId(normalizeEquipment(state?.equipment).equipped);
}

export function equipmentSelection(state){
  const item=equippedPaddle(state);
  return {paddle:item.family,shape:item.shape,item};
}

export function purchaseEquipment(state,itemId){
  const item=PADDLE_CATALOG.find(entry=>entry.id===itemId);
  if(!item)return {ok:false,state,message:'That paddle is not in the shop.'};
  const equipment=normalizeEquipment(state?.equipment);
  if(equipment.owned.includes(item.id))return {ok:false,state,message:`You already own the ${item.label}.`};
  if(Number(state?.money??0)<item.price)return {ok:false,state,message:`${item.label} costs $${item.price}. You have $${Number(state?.money??0)}.`};
  const charged=recordFinance(state,{
    week:state?.week??0,category:'equipment',label:`Paddle · ${item.label}`,amount:-item.price,
    reference:`equipment:${item.id}`
  });
  if(!charged.ok)return charged;
  const current=normalizeEquipment(charged.state.equipment);
  return {
    ok:true,
    state:{
      ...charged.state,
      equipment:{...current,owned:[...current.owned,item.id],purchases:[...current.purchases,{week:state?.week??0,itemId:item.id}].slice(-16)}
    },
    item,
    message:`Purchased the ${item.label} for $${item.price}.`
  };
}

export function equipPaddle(state,itemId){
  const item=PADDLE_CATALOG.find(entry=>entry.id===itemId);
  if(!item)return {ok:false,state,message:'That paddle is not in the shop.'};
  const equipment=normalizeEquipment(state?.equipment);
  if(!equipment.owned.includes(item.id))return {ok:false,state,message:`Buy the ${item.label} before equipping it.`};
  return {
    ok:true,
    state:{...state,equipment:{...equipment,equipped:item.id}},
    item,
    message:`Equipped the ${item.label}.`
  };
}

export function validateEquipment(state){
  const value=state?.equipment;
  if(!value||typeof value!=='object')return {ok:false,reason:'Equipment state is missing'};
  if(value.version!==EQUIPMENT_VERSION)return {ok:false,reason:'Equipment state version is invalid'};
  if(!Array.isArray(value.owned)||!value.owned.length)return {ok:false,reason:'Owned equipment is invalid'};
  if(value.owned.some(id=>!PADDLE_CATALOG.some(item=>item.id===id)))return {ok:false,reason:'Unknown owned equipment'};
  if(!value.owned.includes(value.equipped))return {ok:false,reason:'Equipped paddle is not owned'};
  if(!Array.isArray(value.purchases))return {ok:false,reason:'Equipment purchase history is invalid'};
  return {ok:true};
}