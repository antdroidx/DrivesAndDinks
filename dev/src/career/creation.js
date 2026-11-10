// Career character creation inputs.
//
// Archetype decides the skill shape. Experience sets the overall starting
// level, body size modifies physical traits, and one starting trait adds a
// small unique bonus. Age is applied afterward by the development model.

export const EXPERIENCE_OPTIONS=Object.freeze([
  {id:'new',label:'New to pickleball',rating:2.5,attributeModifier:-6,description:'First organized play. Fundamentals are still forming.'},
  {id:'casual',label:'Casual player',rating:3,attributeModifier:-3,description:'Occasional games and basic comfort with the sport.'},
  {id:'athlete',label:'General athlete',rating:3.5,attributeModifier:0,description:'Athletic background with limited pickleball experience.'},
  {id:'racket',label:'Racket-sport crossover',rating:4,attributeModifier:3,description:'Transferable hand-eye skill, movement and racket experience.'},
  {id:'competitive',label:'Competitive background',rating:4.5,attributeModifier:6,description:'High-level organized competition elsewhere or in pickleball.'}
]);

export const STARTING_TRAITS=Object.freeze([
  {id:'none',label:'No extra trait',description:'A clean baseline with no additional bonus.',modifiers:{}},
  {id:'quick_start',label:'Quick first step',description:'Exceptional initial movement and acceleration.',modifiers:{agility:4}},
  {id:'heavy_hands',label:'Heavy hands',description:'Natural power on drives and high balls.',modifiers:{power:4,smash:2}},
  {id:'soft_touch',label:'Soft touch',description:'Natural control around the kitchen.',modifiers:{dink:3,drop:3,control:2}},
  {id:'student',label:'Student of the game',description:'Reads patterns and learns tactics quickly.',modifiers:{courtIQ:4,control:2}},
  {id:'big_serve',label:'Big serve',description:'A stronger starting serve and drive.',modifiers:{serve:4,drive:2}},
  {id:'natural_athlete',label:'Natural athlete',description:'Broad physical competence across movement and power.',modifiers:{agility:2,power:2,reach:2}}
]);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const CM_PER_INCH=2.54;
const KG_PER_POUND=0.45359237;

export function centimetersToFeetInches(centimeters){
  const totalInches=Math.round((Number(centimeters)||0)/CM_PER_INCH);
  const feet=Math.floor(totalInches/12);
  return {feet,inches:totalInches-feet*12};
}

export function feetInchesToCentimeters(feet,inches,gender='male'){
  const totalInches=Math.max(0,Number(feet)||0)*12+Math.max(0,Number(inches)||0);
  return normalizeHeight(totalInches*CM_PER_INCH,gender);
}

export function kilogramsToPounds(kilograms){
  return Math.round((Number(kilograms)||0)/KG_PER_POUND);
}

export function poundsToKilograms(pounds,height=177,gender='male'){
  return normalizeWeight((Number(pounds)||0)*KG_PER_POUND,height,gender);
}

export function normalizeHeight(value,gender='male'){
  const fallback=gender==='female'?164:177;
  const number=Number(value);
  return Number.isFinite(number)?clamp(Math.round(number),145,210):fallback;
}

export function normalizeWeight(value,height=177,gender='male'){
  const fallback=gender==='female'?64:80;
  const number=Number(value);
  return Number.isFinite(number)?clamp(Math.round(number*100)/100,40,140):fallback;
}

export function experienceById(id){return EXPERIENCE_OPTIONS.find(option=>option.id===id)??EXPERIENCE_OPTIONS[2]}
export function traitById(id){return STARTING_TRAITS.find(option=>option.id===id)??STARTING_TRAITS[0]}

export function bodyAttributeModifiers({height=177,weight=80}={}){
  const heightZ=(Number(height)-177)/33;
  const bmi=Number(weight)/(Math.pow(Number(height)/100,2)||1);
  const massZ=(bmi-24)/8;
  return {
    reach:Math.round(heightZ*6-massZ*.4),
    power:Math.round(heightZ*1.5+massZ*3.5),
    smash:Math.round(heightZ*1.2+massZ*2),
    agility:-Math.max(0,Math.round(Math.abs(heightZ)*1.6+Math.max(0,massZ)*2.5))
  };
}

export function startingModifiers({experience='athlete',trait='none',height,weight}={}){
  const result={};
  const add=(key,value)=>{result[key]=(result[key]??0)+(Number(value)||0)};
  for(const [key,value] of Object.entries(bodyAttributeModifiers({height,weight})))add(key,value);
  const experienceOption=experienceById(experience);
  for(const key of ['serve','drive','volley','drop','dink','lob','smash','power','control','defense','agility','courtIQ','reach','aggression'])add(key,experienceOption.attributeModifier);
  for(const [key,value] of Object.entries(traitById(trait).modifiers))add(key,value);
  return result;
}