// Generated population.
//
// Everything here is a pure function of (seed, identifier). Clubs and athletes
// are never stored in the save file: the career save holds a seed, and every
// athlete and club id is reproduced exactly on demand. That keeps saves small
// and guarantees the stable ids a career needs across weeks and seasons.

import {CHARACTERS,generateIdentity,skillAverage} from '../roster.js?v=203';
import {seededRandom} from '../competition.js?v=203';
import {REGIONS,regionById,allCities,citiesForArea,citizenshipFor,ratingFromSkill} from './geography.js?v=203';
import {FORMATS,ratingInFormat} from './rating.js?v=203';
import {attributeAgeFactor,createDevelopmentProfile} from './age.js?v=203';
import {trainingResponse,potentialForStartAge} from './career-lifecycle.js?v=203';

// The roadmap starts with a 10,000-player world. Each region receives a
// stable share based on its playable geography; the exact split remains
// configurable for the 25k and 50k scaling benchmarks.
export const WORLD_POPULATION_TARGET=10000;
export const REGION_POPULATION_TARGETS=Object.freeze({
  'north-america':5680,
  asia:4320
});

export const CLUB_TIERS=Object.freeze([
  {id:'recreational',label:'Recreational',skill:52,weight:.48},
  {id:'competitive',label:'Competitive',skill:63,weight:.37},
  {id:'elite',label:'Elite',skill:74,weight:.15}
]);
export const CLUB_TIER_BY_ID=Object.freeze(Object.fromEntries(CLUB_TIERS.map(tier=>[tier.id,tier])));
export const CLUB_SURFACES=Object.freeze([
  {id:'outdoor',label:'Outdoor hard court',weight:.55},
  {id:'indoor',label:'Indoor hall',weight:.28},
  {id:'hybrid',label:'Covered and open bays',weight:.17}
]);

const CLUB_PREFIXES=['Riverbend','Falcon','Granite','Harbor','Sunset','Cedar','Lakeside','Summit','Copper','Willow','Palmetto','Mesquite','Bayou','Marina','Foothill','Prairie','Sakura','Kowloon','Ganges','Han River','Sandy','Bluestone'];
const CLUB_SUFFIXES=['Pickleball Club','Racquet Club','Pickleball Association','Courts & Co.','Pickleball Center','Pickleball Society','Leagues & Club'];
const GENDERS=['male','female'];
const MIN_AGE=15,MAX_AGE=64;
const MIN_RATING=25,MAX_RATING=99;

// FNV-1a keeps the seed and the identifier independent, so one club's roster
// never changes when another club is added to the region.
export function mixSeed(seed,key){
  let hash=(Number(seed)>>>0)^0x811c9dc5;
  const text=String(key);
  for(let index=0;index<text.length;index++){hash^=text.charCodeAt(index);hash=Math.imul(hash,0x01000193)>>>0}
  return hash>>>0;
}
const pick=(items,random)=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
function weightedPick(entries,random){
  const total=entries.reduce((sum,[,weight])=>sum+weight,0);
  if(total<=0)return entries[0]?.[0]??null;
  let target=random()*total;
  for(const [value,weight] of entries){target-=weight;if(target<=0)return value}
  return entries.at(-1)?.[0]??null;
}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function clubId(cityId,index){return `${cityId}-${index}`}

// The full club index for one region. Metadata only, so building it is cheap
// enough to do on every browse.
export function buildClubIndex(seed,regionId,{populationTarget=REGION_POPULATION_TARGETS[regionId]??WORLD_POPULATION_TARGET}={}){
  const region=regionById(regionId);
  if(!region)return [];
  const random=seededRandom(mixSeed(seed,`region:${regionId}`));
  const clubs=[];
  for(const area of region.areas){
    for(const city of area.cities){
      const count=2+Math.floor(random()*3);
      for(let index=0;index<count;index++){
        const tier=weightedPick(CLUB_TIERS.map(entry=>[entry.id,entry.weight]),random);
        const surface=weightedPick(CLUB_SURFACES.map(entry=>[entry.id,entry.weight]),random);
        const prefix=pick(CLUB_PREFIXES,random);
        const suffix=pick(CLUB_SUFFIXES,random);
        const tierInfo=CLUB_TIER_BY_ID[tier];
        const memberWeight=(18+Math.floor(random()*9))*(tier==='elite'?1.55:1);
        clubs.push({
          id:clubId(city.id,index),
          name:`${prefix} ${suffix}`,
          regionId:region.id,
          areaId:area.id,
          areaLabel:area.label,
          cityId:city.id,
          cityLabel:city.label,
          country:city.country,
          cityTier:city.tier,
          tier,
          tierLabel:tierInfo.label,
          surface,
          skill:tierInfo.skill,
          memberWeight,
          founded:1996+Math.floor(random()*28)
        });
      }
    }
  }
  // Allocate the regional target proportionally to the generated club sizes
  // and tiers. Flooring followed by largest-remainder assignment makes the
  // total exact and deterministic without making every club the same size.
  const target=Math.max(clubs.length,Math.round(Number(populationTarget)||0));
  const totalWeight=clubs.reduce((sum,club)=>sum+club.memberWeight,0)||1;
  const allocations=clubs.map((club,index)=>{
    const exact=target*club.memberWeight/totalWeight;
    return {club,index,count:Math.max(1,Math.floor(exact)),fraction:exact-Math.floor(exact)};
  });
  let remaining=target-allocations.reduce((sum,entry)=>sum+entry.count,0);
  for(const entry of [...allocations].sort((a,b)=>(b.fraction-a.fraction)||(a.index-b.index))){
    if(remaining<=0)break;
    entry.count++;remaining--;
  }
  for(const entry of allocations){entry.club.memberCount=entry.count;delete entry.club.memberWeight}
  return clubs;
}

export function clubsForCity(clubs,cityId){return clubs.filter(club=>club.cityId===cityId)}
export function clubsForArea(clubs,areaId){return clubs.filter(club=>club.areaId===areaId)}
export function findClub(clubs,id){return clubs.find(club=>club.id===id)??null}

// A single athlete, reproduced exactly from its club id and index.
// The identity and the skill are drawn from separate streams so that a
// roster can be rebuilt for simulation without paying for names and
// appearance that nobody looks at.
function ageAtWeek(startAge,week){
  const base=Number.isFinite(Number(startAge))?Number(startAge):MIN_AGE;
  return Math.max(MIN_AGE,base+Math.floor((Number(week)||0)/52));
}

function developedRatings({baseRatings,peakRatings,age,development,maintenance}){
  const ratings={};
  for(const key of Object.keys(peakRatings)){
    const peak=peakRatings[key]??baseRatings[key]??MIN_RATING;
    const factor=attributeAgeFactor(key,age,development,maintenance?.[key]??0);
    const learning=age<25?trainingResponse(age,development):1;
    const target=age<(development?.peakAge??30)
      ?baseRatings[key]+(peak-baseRatings[key])*clamp((age-15)/Math.max(1,(development?.peakAge??30)-15),0,1)*learning
      :peak;
    ratings[key]=clamp(Math.round(Math.min(target,peak)*factor),MIN_RATING,MAX_RATING);
  }
  return ratings;
}

export function buildAthleteSkill(seed,club,index,week=0,startAgeOverride=null){
  const random=seededRandom(mixSeed(seed,`athlete:${club.id}:${index}:skill`));
  const archetype=CHARACTERS[Math.floor(random()*CHARACTERS.length)];
  const levelDelta=club.skill-70;
  const baseRatings={};
  for(const key of Object.keys(archetype.ratings)){
    const base=archetype.ratings[key]??70;
    baseRatings[key]=clamp(Math.round(base+levelDelta+(random()-.5)*9),MIN_RATING,MAX_RATING);
  }
  // A bias toward one format. Doubles rewards the soft game and the net,
  // singles rewards the serve and the feet.
  const formatBias=random()*10-5;
  // Gender belongs to the skill stream so the light world roster and the
  // fully detailed athlete always agree on it.
  const gender=pick(GENDERS,random);
  const hasAgeOverride=startAgeOverride!=null&&Number.isFinite(Number(startAgeOverride));
  const startAge=hasAgeOverride?Math.max(MIN_AGE,Math.min(MAX_AGE,Math.round(Number(startAgeOverride)))):MIN_AGE+Math.floor(random()*(MAX_AGE-MIN_AGE+1));
  const development=createDevelopmentProfile(mixSeed(seed,`athlete:${club.id}:${index}:development`),startAge);
  const generatedPotential=clamp(Math.round(skillAverage(baseRatings)+(random()*14-2)),MIN_RATING,MAX_RATING);
  const potential=potentialForStartAge(startAge,generatedPotential);
  const peakRatings={};
  for(const key of Object.keys(baseRatings)){
    peakRatings[key]=clamp(Math.round(baseRatings[key]+(potential-skillAverage(baseRatings))*(key==='aggression'?.35:.7)+(random()-.5)*4),MIN_RATING,MAX_RATING);
  }
  const age=ageAtWeek(startAge,week);
  const maintenance=Object.fromEntries(Object.keys(baseRatings).map(key=>[key,0]));
  const ratings=developedRatings({baseRatings,peakRatings,age,development,maintenance});
  return {archetype,baseRatings,peakRatings,maintenance,development,startAge,age,potential,ratings,average:skillAverage(ratings),formatBias,gender};
}

export function buildAthlete(seed,club,index,week=0,startAgeOverride=null){
  const random=seededRandom(mixSeed(seed,`athlete:${club.id}:${index}:identity`));
  const {archetype,baseRatings,peakRatings,maintenance,development,startAge,age,potential,ratings,average,formatBias,gender}=buildAthleteSkill(seed,club,index,week,startAgeOverride);
  const region=regionById(club.regionId);
  const weights=Object.entries(region?.cultureWeights??{white_american:1});
  const culture=weightedPick(weights,random);
  const identity=generateIdentity({gender,culture,random});
  const citizenship=citizenshipFor(club.regionId,{country:club.country},random);
  const handedness=random()<.13?'left':'right';
  const formats={};
  for(const format of FORMATS){
    const bias=format==='doubles'?formatBias:-formatBias;
    formats[format]=ratingInFormat(ratings,format,bias);
  }
  return {
    id:`${club.id}-a${index}`,
    clubId:club.id,
    clubName:club.name,
    regionId:club.regionId,
    areaId:club.areaId,
    cityId:club.cityId,
    cityLabel:club.cityLabel,
    name:identity.name,
    citizenship,
    gender,
    age,
    startAge,
    development,
    peakRatings,
    maintenance,
    potential,
    handedness,
    archetypeId:archetype.id,
    archetypeLabel:archetype.style,
    ratings,
    skillAverage:average,
    formats,
    formatBias,
    baseFormats:{...formats},
    lastPlayed:0,
    record:{value:1+average/15,confidence:0,matches:0,wins:0,losses:0}
  };
}

// A light roster for the world simulation. It carries ids and skill, not
// names, so a whole region can be rated in a few milliseconds.
export function buildRegionSkills(seed,regionId,week=0){
  const clubs=buildClubIndex(seed,regionId);
  const athletes=[];
  for(const club of clubs){
    for(let index=0;index<club.memberCount;index++){
      const {ratings,average,formatBias,gender,startAge,age,development,peakRatings,maintenance,potential}=buildAthleteSkill(seed,club,index,week);
      const formats={};
      for(const format of FORMATS){
        const bias=format==='doubles'?formatBias:-formatBias;
        formats[format]=ratingInFormat(ratings,format,bias);
      }
      athletes.push({
        id:`${club.id}-a${index}`,
        clubId:club.id,
        cityId:club.cityId,
        areaId:club.areaId,
        index,
        club,
        skill:average,
        gender,
        startAge,
        age,
        development,
        peakRatings,
        maintenance,
        potential,
        formats,
        baseFormats:{...formats},
        lastPlayed:0
      });
    }
  }
  return athletes;
}

export function buildClubRoster(seed,club,week=0){
  const athletes=[];
  for(let index=0;index<club.memberCount;index++)athletes.push(buildAthlete(seed,club,index,week));
  return athletes;
}

// Browsing a whole region is a full roster build. It stays cheap because
// nothing is memoized or stored, but the caller can scope it down.
export function buildRegionRoster(seed,regionId,filter={},week=0){
  const clubs=buildClubIndex(seed,regionId).filter(club=>
    (!filter.areaId||club.areaId===filter.areaId)&&
    (!filter.cityId||club.cityId===filter.cityId)&&
    (!filter.clubId||club.id===filter.clubId));
  const athletes=[];
  for(const club of clubs){
    for(const athlete of buildClubRoster(seed,club,week))athletes.push(athlete);
  }
  return {clubs,athletes};
}

export function searchAthletes(seed,regionId,query,{limit=60}={}){
  const term=String(query??'').trim().toLowerCase();
  if(!term)return [];
  const {athletes}=buildRegionRoster(seed,regionId);
  return athletes.filter(athlete=>athlete.name.toLowerCase().includes(term)).slice(0,limit);
}

export function summarizeClub(athletes){
  if(!athletes.length)return {count:0,average:0,top:null};
  const sorted=[...athletes].sort((a,b)=>b.skillAverage-a.skillAverage);
  const average=Math.round(athletes.reduce((sum,athlete)=>sum+athlete.skillAverage,0)/athletes.length);
  return {count:athletes.length,average,top:sorted[0]};
}

export const GEOGRAPHY_REGIONS=REGIONS;
export const GEOGRAPHY_CITIES=Object.freeze(Object.fromEntries(REGIONS.map(region=>[region.id,allCities(region.id)])));
export const GEOGRAPHY_AREA_CITIES=Object.freeze(Object.fromEntries(REGIONS.flatMap(region=>region.areas.map(area=>[area.id,citiesForArea(region.id,area.id)]))));
