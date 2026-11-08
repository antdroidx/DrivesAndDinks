// Generated population.
//
// Everything here is a pure function of (seed, identifier). Clubs and athletes
// are never stored in the save file: the career save holds a seed, and every
// athlete and club id is reproduced exactly on demand. That keeps saves small
// and guarantees the stable ids a career needs across weeks and seasons.

import {CHARACTERS,generateIdentity,skillAverage} from '../roster.js';
import {seededRandom} from '../competition.js';
import {REGIONS,regionById,allCities,citiesForArea,citizenshipFor,ratingFromSkill} from './geography.js';

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
const MIN_AGE=18,MAX_AGE=54;
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
export function buildClubIndex(seed,regionId){
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
          memberCount:6+Math.floor(random()*5),
          founded:1996+Math.floor(random()*28)
        });
      }
    }
  }
  return clubs;
}

export function clubsForCity(clubs,cityId){return clubs.filter(club=>club.cityId===cityId)}
export function clubsForArea(clubs,areaId){return clubs.filter(club=>club.areaId===areaId)}
export function findClub(clubs,id){return clubs.find(club=>club.id===id)??null}

// A single athlete, reproduced exactly from its club id and index.
// The identity and the skill are drawn from separate streams so that a
// roster can be rebuilt for simulation without paying for names and
// appearance that nobody looks at.
export function buildAthleteSkill(seed,club,index){
  const random=seededRandom(mixSeed(seed,`athlete:${club.id}:${index}:skill`));
  const archetype=CHARACTERS[Math.floor(random()*CHARACTERS.length)];
  const levelDelta=club.skill-70;
  const ratings={};
  for(const key of Object.keys(archetype.ratings)){
    const base=archetype.ratings[key]??70;
    ratings[key]=clamp(Math.round(base+levelDelta+(random()-.5)*9),MIN_RATING,MAX_RATING);
  }
  return {archetype,ratings,average:skillAverage(ratings)};
}

export function buildAthlete(seed,club,index){
  const random=seededRandom(mixSeed(seed,`athlete:${club.id}:${index}:identity`));
  const region=regionById(club.regionId);
  const weights=Object.entries(region?.cultureWeights??{white_american:1});
  const culture=weightedPick(weights,random);
  const gender=pick(GENDERS,random);
  const identity=generateIdentity({gender,culture,random});
  const citizenship=citizenshipFor(club.regionId,{country:club.country},random);
  const handedness=random()<.13?'left':'right';
  const age=MIN_AGE+Math.floor(random()*(MAX_AGE-MIN_AGE+1));
  const {archetype,ratings,average}=buildAthleteSkill(seed,club,index);
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
    handedness,
    archetypeId:archetype.id,
    archetypeLabel:archetype.style,
    ratings,
    skillAverage:average,
    rating:ratingFromSkill(average),
    baseRating:ratingFromSkill(average),
    lastPlayed:0,
    potential:clamp(Math.round(average+(random()*14-2)),MIN_RATING,MAX_RATING),
    record:{value:1+average/15,confidence:0,matches:0,wins:0,losses:0}
  };
}

// A light roster for the world simulation. It carries ids and skill, not
// names, so a whole region can be rated in a few milliseconds.
export function buildRegionSkills(seed,regionId){
  const clubs=buildClubIndex(seed,regionId);
  const athletes=[];
  for(const club of clubs){
    for(let index=0;index<club.memberCount;index++){
      const {ratings,average}=buildAthleteSkill(seed,club,index);
      athletes.push({
        id:`${club.id}-a${index}`,
        clubId:club.id,
        cityId:club.cityId,
        areaId:club.areaId,
        index,
        club,
        skill:average,
        baseRating:ratingFromSkill(average),
        lastPlayed:0
      });
    }
  }
  return athletes;
}

export function buildClubRoster(seed,club){
  const athletes=[];
  for(let index=0;index<club.memberCount;index++)athletes.push(buildAthlete(seed,club,index));
  return athletes;
}

// Browsing a whole region is a full roster build. It stays cheap because
// nothing is memoized or stored, but the caller can scope it down.
export function buildRegionRoster(seed,regionId,filter={}){
  const clubs=buildClubIndex(seed,regionId).filter(club=>
    (!filter.areaId||club.areaId===filter.areaId)&&
    (!filter.cityId||club.cityId===filter.cityId)&&
    (!filter.clubId||club.id===filter.clubId));
  const athletes=[];
  for(const club of clubs){
    for(const athlete of buildClubRoster(seed,club))athletes.push(athlete);
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
