// Career equipment, seasonal products and signature releases.
//
// Generated products use the engine's existing family and shape system. This
// keeps cosmetics independent from performance and prevents new products from
// exceeding the same bounded modifiers as the starter catalog.

import {recordFinance} from './finance.js?v=211';
import {seededRandom} from '../competition.js?v=211';
import {mixSeed} from './population.js?v=211';
import {PADDLES,PADDLE_SHAPES,PADDLE_COLORS,PADDLE_SHAPE_ALIASES} from '../roster.js?v=211';

export const EQUIPMENT_VERSION=4;
export const STARTER_EQUIPMENT_ID='allcourt-hybrid';

const STATIC_PADDLE_BASES=Object.freeze([
  {id:'allcourt-hybrid',label:'Allcourt Hybrid Flat',family:'balanced',familyLabel:'Allcourt',shape:'hybrid-flat',price:0,description:'Forgiving flat-top hybrid with predictable response.',status:'available',signature:false,thicknesses:[16],defaultThickness:16},
  {id:'ignite-widebody',label:'Ignite Widebody',family:'power',familyLabel:'Ignite',shape:'widebody',price:120,description:'Broad power face with extra stability and a forgiving center.',status:'available',signature:false,thicknesses:[16,14],defaultThickness:16},
  {id:'touch-widebody',label:'Touch Widebody',family:'control',familyLabel:'Touch',shape:'widebody',price:140,description:'Wide control face built for resets, blocks and spin.',status:'available',signature:false,thicknesses:[16,14],defaultThickness:16},
  {id:'allcourt-elongated',label:'Allcourt Elongated Flat',family:'balanced',familyLabel:'Allcourt',shape:'elongated-flat',price:160,description:'Flat-top elongated face with added reach.',status:'available',signature:false,thicknesses:[16],defaultThickness:16},
  {id:'ignite-elongated',label:'Ignite Elongated Aero',family:'power',familyLabel:'Ignite',shape:'elongated-aero',price:190,description:'Aerodynamic long face for leverage, reach and drive power.',status:'available',signature:false,thicknesses:[16,14],defaultThickness:16},
  {id:'touch-elongated-cutout',label:'Touch Elongated Cut-Out',family:'control',familyLabel:'Touch',shape:'elongated-cutout',price:210,description:'Control-first long face with sculpted throat cut-outs.',status:'available',signature:false,thicknesses:[16],defaultThickness:16},
  {id:'northline-aero',label:'Northline Aero Hybrid',family:'balanced',familyLabel:'Northline',shape:'hybrid-aero',price:175,description:'Rounded aero hybrid balancing hand speed and stability.',status:'available',signature:false,thicknesses:[16,14],defaultThickness:16},
  {id:'mesa-short-handle',label:'Mesa Short Handle',family:'power',familyLabel:'Mesa',shape:'elongated-short-handle',price:195,description:'Long hitting face with a compact short-handle design.',status:'available',signature:false,thicknesses:[16],defaultThickness:16},
  {id:'copper-wide-cutout',label:'Copper Wide Cut-Out',family:'control',familyLabel:'Copper',shape:'widebody-cutout',price:185,description:'Broad cut-out control face with unusually quick hands.',status:'available',signature:false,thicknesses:[14],defaultThickness:14},
  {id:'roundhouse-classic',label:'Roundhouse Classic',family:'control',familyLabel:'Roundhouse',shape:'round',price:135,description:'Round control face with a compact swing and centered sweet spot.',status:'available',signature:false,thicknesses:[14],defaultThickness:14},
  {id:'baseline-tennis',label:'Baseline Tennis Face',family:'balanced',familyLabel:'Baseline',shape:'tennis',price:165,description:'Oval tennis-inspired face with all-court response.',status:'available',signature:false,thicknesses:[16],defaultThickness:16},
  {id:'baseline-tennis-extended',label:'Baseline Tennis Extended',family:'power',familyLabel:'Baseline',shape:'tennis-extended-handle',price:205,description:'Extended-handle oval face built for reach and two-handed leverage.',status:'available',signature:false,thicknesses:[16,14],defaultThickness:16}
]);
const expandPaddleVariants=(base)=>base.thicknesses.map(thickness=>({
  ...base,
  id:thickness===base.defaultThickness?base.id:`${base.id}-${thickness}`,
  baseId:base.id,
  thickness,
  thicknessLabel:`${thickness} mm`
}));
export const PADDLE_CATALOG=Object.freeze(STATIC_PADDLE_BASES.flatMap(expandPaddleVariants));

export const EQUIPMENT_BRANDS=Object.freeze([
  {name:'Northline',series:['Vector','Signal','Northwind','Meridian']},
  {name:'Aftershock',series:['Volt','Pulse','Quake','Afterburn']},
  {name:'Arc & Alder',series:['Orbit','Grove','Canopy','Halo']},
  {name:'Mesa Point',series:['Ridge','Canyon','Sierra','Butte']},
  {name:'Copper Lane',series:['Forge','Anvil','Foundry','Smith']},
  {name:'Tidebreak',series:['Current','Harbor','Swell','Coast']}
]);

const FAMILIES=Object.freeze([
  {family:'balanced',familyLabel:'Allcourt'},{family:'power',familyLabel:'Ignite'},{family:'control',familyLabel:'Touch'}
]);
const SHAPE_IDS=Object.freeze(PADDLE_SHAPES.map(item=>item.id));

export const HEADWEAR_STYLES=Object.freeze([
  {headwear:'cap',label:'Cap',price:40},
  {headwear:'visor',label:'Visor',price:45},
  {headwear:'headband',label:'Headband',price:30}
]);
export const HEADWEAR_CATALOG=Object.freeze(HEADWEAR_STYLES.flatMap(style=>PADDLE_COLORS.map(color=>({
  id:`${style.headwear}-${color.id}`,
  label:`${color.name} ${style.label}`,
  headwear:style.headwear,
  headwearLabel:style.label,
  color:color.id,
  colorLabel:color.name,
  swatch:color.color,
  price:style.price,
  description:`${color.name} ${style.label.toLowerCase()} using the same game-renderer color palette.`,
  status:'available'
}))));
const staticById=id=>PADDLE_CATALOG.find(item=>item.id===id)??PADDLE_CATALOG[0];
const normalizeItem=item=>{
  const shape=PADDLE_SHAPE_ALIASES[item?.shape]??item?.shape,resolvedShape=SHAPE_IDS.includes(shape)?shape:'hybrid-flat';
  const shapeInfo=PADDLE_SHAPES.find(entry=>entry.id===resolvedShape)??PADDLE_SHAPES[0];
  const baseId=item?.baseId??String(item?.id??'').replace(/-14$/,''),thickness=[14,16].includes(Number(item?.thickness))?Number(item.thickness):16;
  return {...item,baseId,family:['balanced','power','control'].includes(item?.family)?item.family:'balanced',shape:resolvedShape,shapeLabel:shapeInfo.name,thickness,thicknessLabel:`${thickness} mm`,price:Math.max(0,Math.round(Number(item?.price)||0)),status:['announced','available','low-stock','discontinued','legacy'].includes(item?.status)?item.status:'available',color:PADDLE_COLORS.some(color=>color.id===item?.color)?item.color:null,signature:Boolean(item?.signature)};
};

export function emptyEquipment(){
  return {version:EQUIPMENT_VERSION,owned:[STARTER_EQUIPMENT_ID],equipped:STARTER_EQUIPMENT_ID,purchases:[],catalog:[],headwear:{owned:[],equipped:null}};
}

export function currentEquipmentYear(week=0){return Math.floor(Math.max(0,Number(week)||0)/52);}

export function equipmentStats(item){
  const family=PADDLES.find(entry=>entry.id===item?.family)??PADDLES[0];
  const shapeId=PADDLE_SHAPE_ALIASES[item?.shape]??item?.shape;
  const shape=PADDLE_SHAPES.find(entry=>entry.id===shapeId)??PADDLE_SHAPES.find(entry=>entry.id==='hybrid-flat')??PADDLE_SHAPES[0];
  const modifier=(entry,key)=>Number(entry?.ratingModifiers?.[key])||0;
  const thickness=Number(item?.thickness)===14?14:16,thicknessPower=thickness===14?3:-1,thicknessControl=thickness===14?-2:3;
  const clamp=(value)=>Math.max(35,Math.min(95,Math.round(value)));
  return {
    power:clamp(70+modifier(family,'power')+modifier(shape,'power')+thicknessPower),
    control:clamp(70+modifier(family,'control')+modifier(shape,'control')+thicknessControl),
    spin:clamp(70+(Number(family.spin)-1)*100+(Number(shape.sweetSpotSpinGain)-1)*40),
    reach:clamp(70+modifier(shape,'reach')),
    hands:clamp(70+modifier(shape,'volley')),
    sweetSpot:clamp(70+(Number(shape.sweetSpot)-1)*40+(thickness===16?1:0))
  };
}

export function generateSeasonCatalog(seed,week=0,{contract='none'}={}){
  const year=currentEquipmentYear(week);
  const random=seededRandom(mixSeed(seed,`equipment-catalog:${year}`));
  const brandOrder=[...EQUIPMENT_BRANDS];
  for(let index=brandOrder.length-1;index>0;index--){const swap=Math.floor(random()*(index+1));[brandOrder[index],brandOrder[swap]]=[brandOrder[swap],brandOrder[index]]}
  const items=[];
  for(let index=0;index<4;index++){
    const family=FAMILIES[Math.floor(random()*FAMILIES.length)];
    const shapeId=SHAPE_IDS[Math.floor(random()*SHAPE_IDS.length)];
    const shape=PADDLE_SHAPES.find(entry=>entry.id===shapeId)??PADDLE_SHAPES[0];
    const thickness=random()<.5?14:16;
    const brand=brandOrder[index%brandOrder.length];
    const series=brand.series[(year+index)%brand.series.length];
    const releaseWeek=year*52+4+index*10;
    const discontinueWeek=year*52+48+index;
    const status=week<releaseWeek?'announced':week>=discontinueWeek?'discontinued':week>=releaseWeek+7?'low-stock':'available';
    items.push(normalizeItem({
      id:`season:${year}:${index}`,label:`${brand.name} ${series} ${year+1}`,
      brand:brand.name,series,year,baseId:`season:${year}:${index}`,family:family.family,familyLabel:family.familyLabel,shape:shape.id,shapeLabel:shape.name,thickness,thicknessLabel:`${thickness} mm`,
      price:120+(family.family==='balanced'?20:40)+(shape.reach>1.03?60:0)+index*10,
      description:`${family.familyLabel} face in a ${shape.name.toLowerCase()} shape.`,
      releaseWeek,discontinueWeek,status,cosmetic:{brand:brand.name,series,year}
    }));
  }
  if(contract==='gold'){
    const family=FAMILIES[Math.floor(random()*FAMILIES.length)];
    const shapeId=SHAPE_IDS[Math.floor(random()*SHAPE_IDS.length)];
    const shape=PADDLE_SHAPES.find(entry=>entry.id===shapeId)??PADDLE_SHAPES[0];
    const thickness=random()<.5?14:16;
    const releaseWeek=year*52+30;
    items.push(normalizeItem({
      id:`signature:player:${year}`,label:'Player Signature Series',brand:'Signature',series:'Career',
      year,baseId:`signature:player:${year}`,family:family.family,familyLabel:family.familyLabel,shape:shape.id,shapeLabel:shape.name,thickness,thicknessLabel:`${thickness} mm`,price:250,
      description:'A personal signature release using the same bounded performance rules as the retail catalog.',
      releaseWeek,discontinueWeek:year*52+51,status:week<releaseWeek?'announced':'available',signature:true,athleteId:'player'
    }));
  }
  return items;
}

export function headwearById(id){return HEADWEAR_CATALOG.find(item=>item.id===id)??null}

function normalizeHeadwear(value){
  const validIds=new Set(HEADWEAR_CATALOG.map(item=>item.id));
  const owned=[...new Set((Array.isArray(value?.owned)?value.owned:[]).filter(id=>validIds.has(id)))];
  return {owned,equipped:owned.includes(value?.equipped)?value.equipped:null};
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
    catalog,
    headwear:normalizeHeadwear(value?.headwear)
  };
}

export function equipmentCatalog(state){
  const equipment=normalizeEquipment(state?.equipment);
  const catalog=new Map(PADDLE_CATALOG.map(item=>[item.id,item]));
  for(const item of equipment.catalog)catalog.set(item.id,item);
  for(const item of generateSeasonCatalog(state?.seed??1,state?.week??0,{contract:state?.contract}))if(!catalog.has(item.id))catalog.set(item.id,item);
  return [...catalog.values()].map(normalizeItem);
}

export function equippedPaddle(state){
  const id=normalizeEquipment(state?.equipment).equipped;
  return equipmentCatalog(state).find(item=>item.id===id)??staticById(id);
}

export function equipmentSelection(state){
  const item=equippedPaddle(state);
  const equipment=normalizeEquipment(state?.equipment);
  return {
    paddle:item.family,shape:item.shape,color:item.color??state?.athlete?.paddleColor??'mint',item,
    headwear:headwearById(equipment.headwear.equipped)
  };
}

export function purchaseEquipment(state,itemId,{color=state?.athlete?.paddleColor??'mint'}={}){
  const catalog=equipmentCatalog(state);
  const baseItem=catalog.find(entry=>entry.id===itemId);
  if(!baseItem)return {ok:false,state,message:'That paddle is not in the shop.'};
  if(baseItem.status==='announced'||baseItem.status==='discontinued')return {ok:false,state,message:'That paddle is not currently available.'};
  const colorOption=PADDLE_COLORS.find(entry=>entry.id===color)??PADDLE_COLORS[0];
  const item=normalizeItem({...baseItem,color:colorOption.id});
  const equipment=normalizeEquipment(state?.equipment);
  if(equipment.owned.includes(item.id))return {ok:false,state,message:`You already own the ${item.label}.`};
  if(Number(state?.money??0)<item.price)return {ok:false,state,message:`${item.label} costs $${item.price}. You have $${Number(state?.money??0)}.`};
  const charged=recordFinance(state,{
    week:state?.week??0,category:'equipment',label:`Paddle · ${item.label} · ${colorOption.name}`,amount:-item.price,
    reference:`equipment:${item.id}:${colorOption.id}`
  });
  if(!charged.ok)return charged;
  const current=normalizeEquipment(charged.state.equipment);
  const catalogMap=new Map([...current.catalog,item].map(entry=>[entry.id,entry]));
  return {
    ok:true,
    state:{...charged.state,equipment:{...current,owned:[...current.owned,item.id],purchases:[...current.purchases,{week:state?.week??0,itemId:item.id,color:colorOption.id}].slice(-16),catalog:[...catalogMap.values()].slice(-96)}},
    item,message:`Purchased the ${item.label} in ${colorOption.name} for $${item.price}.`
  };
}

export function equipPaddle(state,itemId){
  const item=equipmentCatalog(state).find(entry=>entry.id===itemId);
  if(!item)return {ok:false,state,message:'That paddle is not in the shop.'};
  const equipment=normalizeEquipment(state?.equipment);
  if(!equipment.owned.includes(item.id))return {ok:false,state,message:`Buy the ${item.label} before equipping it.`};
  return {ok:true,state:{...state,equipment:{...equipment,equipped:item.id}},item,message:`Equipped the ${item.label}.`};
}

export function setPaddleColor(state,itemId,color){
  const equipment=normalizeEquipment(state?.equipment);
  if(!equipment.owned.includes(itemId))return {ok:false,state,message:'Buy that paddle before changing its color.'};
  const colorOption=PADDLE_COLORS.find(entry=>entry.id===color)??PADDLE_COLORS[0];
  const item=(equipment.catalog.find(entry=>entry.id===itemId)??staticById(itemId));
  const updated=normalizeItem({...item,color:colorOption.id});
  const catalogMap=new Map([...equipment.catalog.filter(entry=>entry.id!==itemId),updated].map(entry=>[entry.id,entry]));
  return {ok:true,state:{...state,equipment:{...equipment,catalog:[...catalogMap.values()].slice(-96)}},item:updated,message:`Set ${updated.label} to ${colorOption.name}.`};
}

export function buyHeadwear(state,itemId){
  const item=headwearById(itemId);
  if(!item)return {ok:false,state,message:'That headwear is not in the shop.'};
  const equipment=normalizeEquipment(state?.equipment);
  if(equipment.headwear.owned.includes(item.id))return {ok:false,state,message:`You already own the ${item.label}.`};
  if(Number(state?.money??0)<item.price)return {ok:false,state,message:`${item.label} costs $${item.price}. You have $${Number(state?.money??0)}.`};
  const charged=recordFinance(state,{week:state?.week??0,category:'equipment',label:`Headwear · ${item.label}`,amount:-item.price,reference:`headwear:${item.id}`});
  if(!charged.ok)return charged;
  const current=normalizeEquipment(charged.state.equipment);
  return {ok:true,state:{...charged.state,equipment:{...current,headwear:{...current.headwear,owned:[...current.headwear.owned,item.id],equipped:item.id}}},item,message:`Purchased and equipped the ${item.label} for $${item.price}.`};
}

export function equipHeadwear(state,itemId){
  const item=headwearById(itemId);
  if(!item)return {ok:false,state,message:'That headwear is unavailable.'};
  const equipment=normalizeEquipment(state?.equipment);
  if(!equipment.headwear.owned.includes(item.id))return {ok:false,state,message:`Buy the ${item.label} before equipping it.`};
  return {ok:true,state:{...state,equipment:{...equipment,headwear:{...equipment.headwear,equipped:item.id}}},item,message:`Equipped the ${item.label}.`};
}

export function clearHeadwear(state){
  const equipment=normalizeEquipment(state?.equipment);
  return {ok:true,state:{...state,equipment:{...equipment,headwear:{...equipment.headwear,equipped:null}}},message:'Removed headwear.'};
}

export function signatureEligible(state){
  return state?.contract==='gold';
}

export function createSignaturePaddle(state,{label='Player Signature Series'}={}){
  if(!signatureEligible(state))return {ok:false,state,message:'A Gold contract is required to design a signature paddle.'};
  const year=currentEquipmentYear(state.week);
  const family=FAMILIES[(state.athlete?.ratings?.power??50)>(state.athlete?.ratings?.control??50)?1:2];
  const shape=PADDLE_SHAPES.find(entry=>entry.id===((state.athlete?.ratings?.reach??50)>(state.athlete?.ratings?.agility??50)?'elongated-flat':'widebody'))??PADDLE_SHAPES[0];
  const item=normalizeItem({
    id:`signature:player:${year}:designed`,label:String(label).slice(0,48)||'Player Signature Series',
    brand:'Signature',series:'Career',year,family:family.family,familyLabel:family.familyLabel,
    shape:shape.id,shapeLabel:shape.name,thickness:16,thicknessLabel:"16 mm",price:0,description:'A player-designed signature paddle within the standard bounded modifiers.',
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
  if(!value.headwear||typeof value.headwear!=='object'||!Array.isArray(value.headwear.owned))return {ok:false,reason:'Headwear state is invalid'};
  const headwearIds=new Set(HEADWEAR_CATALOG.map(item=>item.id));
  if(value.headwear.owned.some(id=>!headwearIds.has(id)))return {ok:false,reason:'Unknown owned headwear'};
  if(value.headwear.equipped!=null&&!value.headwear.owned.includes(value.headwear.equipped))return {ok:false,reason:'Equipped headwear is not owned'};
  return {ok:true};
}
