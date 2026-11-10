// Career equipment, seasonal products and signature releases.
//
// Generated products use the engine's existing family and shape system. This
// keeps cosmetics independent from performance and prevents new products from
// exceeding the same bounded modifiers as the starter catalog.

import {recordFinance} from './finance.js';
import {seededRandom} from '../competition.js';
import {mixSeed} from './population.js';

export const EQUIPMENT_VERSION=2;
export const STARTER_EQUIPMENT_ID='allcourt-hybrid';

export const PADDLE_CATALOG=Object.freeze([
  {id:'allcourt-hybrid',label:'Allcourt Hybrid',family:'balanced',familyLabel:'Allcourt',shape:'hybrid',shapeLabel:'Hybrid',price:0,description:'Forgiving, balanced starter paddle.',status:'available',signature:false},
  {id:'ignite-widebody',label:'Ignite Widebody',family:'power',familyLabel:'Ignite',shape:'widebody',shapeLabel:'Widebody',price:120,description:'Broad face with extra power and stability.',status:'available',signature:false},
  {id:'touch-widebody',label:'Touch Widebody',family:'control',familyLabel:'Touch',shape:'widebody',shapeLabel:'Widebody',price:140,description:'Broad face built for control and spin.',status:'available',signature:false},
  {id:'allcourt-elongated',label:'Allcourt Elongated',family:'balanced',familyLabel:'Allcourt',shape:'elongated',shapeLabel:'Elongated',price:160,description:'Added reach with a balanced face.',status:'available',signature:false},
  {id:'ignite-elongated',label:'Ignite Elongated',family:'power',familyLabel:'Ignite',shape:'elongated',shapeLabel:'Elongated',price:190,description:'Long face for leverage and power.',status:'available',signature:false},
  {id:'touch-elongated',label:'Touch Elongated',family:'control',familyLabel:'Touch',shape:'elongated',shapeLabel:'Elongated',price:210,description:'Long face with control and spin emphasis.',status:'available',signature:false}
]);

export const EQUIPMENT_BRANDS=Object.freeze(['Northline','Aftershock','Arc & Alder','Mesa Point','Copper Lane','Tidebreak']);
export const EQUIPMENT_SERIES=Object.freeze(['Signal','Orbit','Atlas','Current','Forge','Vector']);

const FAMILIES=Object.freeze([
  {family:'balanced',familyLabel:'Allcourt'},{family:'power',familyLabel:'Ignite'},{family:'control',familyLabel:'Touch'}
]);
const SHAPES=Object.freeze([
  {shape:'widebody',shapeLabel:'Widebody'},{shape:'hybrid',shapeLabel:'Hybrid'},{shape:'elongated',shapeLabel:'Elongated'}
]);

const staticById=id=>PADDLE_CATALOG.find(item=>item.id===id)??PADDLE_CATALOG[0];
const normalizeItem=item=>({
  ...item,
  family:['balanced','power','control'].includes(item?.family)?item.family:'balanced',
  shape:['widebody','hybrid','elongated'].includes(item?.shape)?item.shape:'hybrid',
  price:Math.max(0,Math.round(Number(item?.price)||0)),
  status:['announced','available','low-stock','discontinued','legacy'].includes(item?.status)?item.status:'available',
  signature:Boolean(item?.signature)
});

export function emptyEquipment(){
  return {version:EQUIPMENT_VERSION,owned:[STARTER_EQUIPMENT_ID],equipped:STARTER_EQUIPMENT_ID,purchases:[],catalog:[]};
}

export function currentEquipmentYear(week=0){return Math.floor(Math.max(0,Number(week)||0)/52);}

export function generateSeasonCatalog(seed,week=0,{contract='none'}={}){
  const year=currentEquipmentYear(week);
  const random=seededRandom(mixSeed(seed,`equipment-catalog:${year}`));
  const items=[];
  for(let index=0;index<4;index++){
    const family=FAMILIES[Math.floor(random()*FAMILIES.length)];
    const shape=SHAPES[Math.floor(random()*SHAPES.length)];
    const brand=EQUIPMENT_BRANDS[Math.floor(random()*EQUIPMENT_BRANDS.length)];
    const series=EQUIPMENT_SERIES[Math.floor(random()*EQUIPMENT_SERIES.length)];
    const releaseWeek=year*52+4+index*10;
    const discontinueWeek=year*52+48+index;
    const status=week<releaseWeek?'announced':week>=discontinueWeek?'discontinued':week>=releaseWeek+7?'low-stock':'available';
    items.push(normalizeItem({
      id:`season:${year}:${index}`,label:`${brand} ${series} ${index+1}`,
      brand,series,year,family:family.family,familyLabel:family.familyLabel,shape:shape.shape,shapeLabel:shape.shapeLabel,
      price:120+(family.family==='balanced'?20:40)+(shape.shape==='elongated'?60:0)+index*10,
      description:`${family.familyLabel} face in a ${shape.shapeLabel.toLowerCase()} shape.`,
      releaseWeek,discontinueWeek,status,cosmetic:{brand,series}
    }));
  }
  if(contract==='gold'){
    const family=FAMILIES[Math.floor(random()*FAMILIES.length)];
    const shape=SHAPES[Math.floor(random()*SHAPES.length)];
    const releaseWeek=year*52+30;
    items.push(normalizeItem({
      id:`signature:player:${year}`,label:'Player Signature Series',brand:'Signature',series:'Career',
      year,family:family.family,familyLabel:family.familyLabel,shape:shape.shape,shapeLabel:shape.shapeLabel,price:250,
      description:'A personal signature release using the same bounded performance rules as the retail catalog.',
      releaseWeek,discontinueWeek:year*52+51,status:week<releaseWeek?'announced':'available',signature:true,athleteId:'player'
    }));
  }
  return items;
}

export function normalizeEquipment(value){
  const catalog=Array.isArray(value?.catalog)?value.catalog.map(normalizeItem).slice(-96):[];
  const validIds=new Set([...PADDLE_CATALOG,...catalog].map(item=>item.id));
  const owned=[...new Set([STARTER_EQUIPMENT_ID,...(Array.isArray(value?.owned)?value.owned.filter(id=>validIds.has(id)):[])])];
  const equipped=owned.includes(value?.equipped)?value.equipped:STARTER_EQUIPMENT_ID;
  return {
    version:EQUIPMENT_VERSION,
    owned,
    equipped,
    purchases:Array.isArray(value?.purchases)?value.purchases.slice(-16):[],
    catalog
  };
}

export function equipmentCatalog(state){
  const equipment=normalizeEquipment(state?.equipment);
  const remembered=new Map(equipment.catalog.map(item=>[item.id,item]));
  for(const item of generateSeasonCatalog(state?.seed??1,state?.week??0,{contract:state?.contract}))remembered.set(item.id,item);
  return [...PADDLE_CATALOG,...remembered.values()].map(normalizeItem);
}

export function equippedPaddle(state){
  const id=normalizeEquipment(state?.equipment).equipped;
  return equipmentCatalog(state).find(item=>item.id===id)??staticById(id);
}

export function equipmentSelection(state){
  const item=equippedPaddle(state);
  return {paddle:item.family,shape:item.shape,item};
}

export function purchaseEquipment(state,itemId){
  const catalog=equipmentCatalog(state);
  const item=catalog.find(entry=>entry.id===itemId);
  if(!item)return {ok:false,state,message:'That paddle is not in the shop.'};
  if(item.status==='announced'||item.status==='discontinued')return {ok:false,state,message:'That paddle is not currently available.'};
  const equipment=normalizeEquipment(state?.equipment);
  if(equipment.owned.includes(item.id))return {ok:false,state,message:`You already own the ${item.label}.`};
  if(Number(state?.money??0)<item.price)return {ok:false,state,message:`${item.label} costs $${item.price}. You have $${Number(state?.money??0)}.`};
  const charged=recordFinance(state,{
    week:state?.week??0,category:'equipment',label:`Paddle · ${item.label}`,amount:-item.price,
    reference:`equipment:${item.id}`
  });
  if(!charged.ok)return charged;
  const current=normalizeEquipment(charged.state.equipment);
  const catalogMap=new Map([...current.catalog,item].map(entry=>[entry.id,entry]));
  return {
    ok:true,
    state:{...charged.state,equipment:{...current,owned:[...current.owned,item.id],purchases:[...current.purchases,{week:state?.week??0,itemId:item.id}].slice(-16),catalog:[...catalogMap.values()].slice(-96)}},
    item,message:`Purchased the ${item.label} for $${item.price}.`
  };
}

export function equipPaddle(state,itemId){
  const item=equipmentCatalog(state).find(entry=>entry.id===itemId);
  if(!item)return {ok:false,state,message:'That paddle is not in the shop.'};
  const equipment=normalizeEquipment(state?.equipment);
  if(!equipment.owned.includes(item.id))return {ok:false,state,message:`Buy the ${item.label} before equipping it.`};
  return {ok:true,state:{...state,equipment:{...equipment,equipped:item.id}},item,message:`Equipped the ${item.label}.`};
}

export function signatureEligible(state){
  return state?.contract==='gold';
}

export function createSignaturePaddle(state,{label='Player Signature Series'}={}){
  if(!signatureEligible(state))return {ok:false,state,message:'A Gold contract is required to design a signature paddle.'};
  const year=currentEquipmentYear(state.week);
  const family=FAMILIES[(state.athlete?.ratings?.power??50)>(state.athlete?.ratings?.control??50)?1:2];
  const shape=SHAPES[(state.athlete?.ratings?.reach??50)>(state.athlete?.ratings?.agility??50)?2:0];
  const item=normalizeItem({
    id:`signature:player:${year}:designed`,label:String(label).slice(0,48)||'Player Signature Series',
    brand:'Signature',series:'Career',year,family:family.family,familyLabel:family.familyLabel,
    shape:shape.shape,shapeLabel:shape.shapeLabel,price:0,description:'A player-designed signature paddle within the standard bounded modifiers.',
    releaseWeek:state.week,discontinueWeek:year*52+120,status:'legacy',signature:true,athleteId:'player'
  });
  const equipment=normalizeEquipment(state.equipment);
  return {
    ok:true,
    state:{...state,equipment:{...equipment,owned:[...equipment.owned,item.id],equipped:item.id,catalog:[...equipment.catalog,item].slice(-96)}},
    item,message:`Created and equipped ${item.label}.`
  };
}

export function validateEquipment(state){
  const value=state?.equipment;
  if(!value||typeof value!=='object')return {ok:false,reason:'Equipment state is missing'};
  if(value.version!==EQUIPMENT_VERSION)return {ok:false,reason:'Equipment state version is invalid'};
  if(!Array.isArray(value.owned)||!value.owned.length)return {ok:false,reason:'Owned equipment is invalid'};
  if(!Array.isArray(value.purchases))return {ok:false,reason:'Equipment purchase history is invalid'};
  if(!Array.isArray(value.catalog))return {ok:false,reason:'Equipment catalog is invalid'};
  const validIds=new Set([...PADDLE_CATALOG,...value.catalog].map(item=>item.id));
  if(value.owned.some(id=>!validIds.has(id)))return {ok:false,reason:'Unknown owned equipment'};
  if(!value.owned.includes(value.equipped))return {ok:false,reason:'Equipped paddle is not owned'};
  return {ok:true};
}