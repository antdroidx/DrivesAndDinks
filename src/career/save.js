// Career save schema.
//
// The career file is a versioned envelope around the state. Migrations move a
// payload from an older schema forward one step at a time; a payload from a
// newer schema is refused rather than guessed at. A corrupt or truncated file
// never silently resets a career: it falls back to the last good save, and
// the unreadable payload is kept aside for recovery.

import {NAME_CULTURES,RATING_KEYS,skillAverage} from '../roster.js';
import {RATING_MAX,RATING_MIN,ratingFromSkill,NEW_PLAYER_RATING} from './rating.js';
import {REGIONS} from './geography.js';

export const CAREER_SAVE_VERSION=6;
export const CAREER_SAVE_KEY='drives-dinks:career';
export const CAREER_BACKUP_KEY='drives-dinks:career:backup';
export const CAREER_QUARANTINE_KEY='drives-dinks:career:quarantine';

const REGION_IDS=REGIONS.map(region=>region.id);

// Migrations are keyed by the version they upgrade from. Each one receives the
// state and returns the next version's state.
export const CAREER_MIGRATIONS=Object.freeze({
  // v1 stored the raw culture id in cultureLabel. Repaint it from the shared
  // culture table so a career saved before the label fix reads correctly.
  1:state=>({
    ...state,
    athlete:{
      ...state.athlete,
      cultureLabel:NAME_CULTURES[state.athlete?.culture]?.label??state.athlete?.culture
    }
  }),
  // v2 carried the career rating as a raw 0-5000 number under careerRating.
  // v3 moved the career rating onto the 2.000 to 8.000 scale.
  2:state=>{
    const athlete={...state.athlete};
    delete athlete.careerRating;
    return {...state,athlete:{...athlete,rating:ratingFromSkill(skillAverage(athlete.ratings??{}))}};
  },
  // v4 added the tour standing: points earned and the rolling window.
  3:state=>({
    ...state,
    athlete:{
      ...state.athlete,
      tourPoints:state.athlete?.tourPoints??0,
      tourPointsHistory:state.athlete?.tourPointsHistory??[]
    }
  }),
  // v5 renamed the athlete field from dupr to rating.
  4:state=>{
    const athlete={...state.athlete};
    if(athlete.dupr!=null&&athlete.rating==null)athlete.rating=athlete.dupr;
    delete athlete.dupr;
    return {...state,athlete};
  },
  // v6 replaced the culture label with a citizenship and added the world's
  // ratings and the player's match history.
  5:state=>{
    const athlete={...state.athlete,citizenship:state.athlete?.citizenship??state.country??''};
    // A career with no rated matches is still provisional, so it starts on
    // the provisional rating rather than anything derived from skill.
    if(!athlete.record?.matches)athlete.rating=NEW_PLAYER_RATING;
    return {...state,worldRatings:state.worldRatings??{},matches:state.matches??[],athlete};
  }
});

export function careerStorage(){
  try{
    const storage=globalThis.localStorage;
    return storage??null;
  }catch{
    return null;
  }
}

export function serializeCareer(state,savedAt=new Date().toISOString()){
  return JSON.stringify({version:CAREER_SAVE_VERSION,savedAt,state});
}

export function parseCareer(text){
  if(typeof text!=='string'||!text.trim())return {ok:false,reason:'Save file is empty'};
  let payload;
  try{payload=JSON.parse(text)}catch{return {ok:false,reason:'Save file is not valid JSON'}}
  if(!payload||typeof payload!=='object')return {ok:false,reason:'Save file has no payload'};
  if(!Number.isInteger(payload.version))return {ok:false,reason:'Save file has no schema version'};
  if(payload.version>CAREER_SAVE_VERSION)return {ok:false,reason:`Save file is from a newer schema (${payload.version})`};
  if(payload.version<1)return {ok:false,reason:`Save file has an unknown schema (${payload.version})`};
  return {ok:true,payload};
}

// Steps a payload forward through the migration chain.
export function migrateCareer(payload){
  if(!payload||typeof payload!=='object')return {ok:false,reason:'Save file has no payload'};
  let state=payload.state;
  let version=payload.version;
  while(version<CAREER_SAVE_VERSION){
    const migration=CAREER_MIGRATIONS[version];
    if(!migration)return {ok:false,reason:`No migration from schema ${version}`};
    const next=migration(state);
    if(!next||typeof next!=='object')return {ok:false,reason:`Migration from schema ${version} failed`};
    state=next;
    version+=1;
  }
  return {ok:true,state,version};
}

const isRatingMap=(value)=>value&&typeof value==='object'&&RATING_KEYS.every(key=>{
  const rating=value[key];
  return typeof rating==='number'&&Number.isFinite(rating)&&rating>=0&&rating<=100;
});

export function validateCareer(state){
  if(!state||typeof state!=='object')return {ok:false,reason:'Career state is missing'};
  if(!Number.isFinite(state.seed))return {ok:false,reason:'Career seed is missing'};
  if(!REGION_IDS.includes(state.regionId))return {ok:false,reason:`Unknown region "${state.regionId}"`};
  if(!Number.isInteger(state.week)||state.week<0)return {ok:false,reason:'Career week is invalid'};
  if(!Number.isFinite(state.energy)||state.energy<0||state.energy>100)return {ok:false,reason:'Career energy is invalid'};
  if(!RATING_KEYS.includes(state.trainingFocus))return {ok:false,reason:`Unknown training focus "${state.trainingFocus}"`};
  if(state.clubId!=null&&typeof state.clubId!=='string')return {ok:false,reason:'Club reference is invalid'};
  if(state.areaId!=null&&typeof state.areaId!=='string')return {ok:false,reason:'Area reference is invalid'};
  if(state.cityId!=null&&typeof state.cityId!=='string')return {ok:false,reason:'City reference is invalid'};
  if(!Array.isArray(state.history))return {ok:false,reason:'Career history is invalid'};
  const athlete=state.athlete;
  if(!athlete||typeof athlete!=='object')return {ok:false,reason:'Career athlete is missing'};
  if(typeof athlete.id!=='string'||!athlete.id)return {ok:false,reason:'Athlete id is missing'};
  if(typeof athlete.name!=='string'||!athlete.name.trim())return {ok:false,reason:'Athlete name is missing'};
  if(!isRatingMap(athlete.ratings))return {ok:false,reason:'Athlete ratings are invalid'};
  if(!Number.isFinite(athlete.rating)||athlete.rating<RATING_MIN||athlete.rating>RATING_MAX)return {ok:false,reason:'Athlete rating is invalid'};
  if(typeof athlete.archetypeId!=='string'||!athlete.archetypeId)return {ok:false,reason:'Athlete archetype is missing'};
  if(athlete.tourPoints!=null&&!Number.isFinite(athlete.tourPoints))return {ok:false,reason:'Tour points are invalid'};
  return {ok:true};
}

// True when a stored payload can be parsed, migrated and validated.
export function isRestorable(text){
  const parsed=parseCareer(text);
  if(!parsed.ok)return false;
  const migrated=migrateCareer(parsed.payload);
  if(!migrated.ok)return false;
  return validateCareer(migrated.state).ok;
}

export function saveCareer(state,storage=careerStorage()){
  const check=validateCareer(state);
  if(!check.ok)return {ok:false,reason:check.reason};
  if(!storage)return {ok:false,reason:'No local storage is available'};
  const text=serializeCareer(state);
  try{
    // Only a verified good save is promoted to the backup, so a file that
    // corrupted before this write cannot destroy the recovery copy.
    const previous=storage.getItem(CAREER_SAVE_KEY);
    if(previous&&isRestorable(previous))storage.setItem(CAREER_BACKUP_KEY,previous);
    storage.setItem(CAREER_SAVE_KEY,text);
    return {ok:true,savedAt:JSON.parse(text).savedAt};
  }catch(error){
    return {ok:false,reason:`Save failed: ${error?.message??'storage rejected the write'}`};
  }
}

// Reads the career, repairing what it can. Order of preference: the current
// save, then the previous good save, then nothing.
export function loadCareer(storage=careerStorage()){
  if(!storage)return {state:null,reason:'No local storage is available',restored:false};
  const text=storage.getItem(CAREER_SAVE_KEY);
  if(text==null)return {state:null,reason:null,restored:false};
  const parsed=parseCareer(text);
  if(parsed.ok){
    const migrated=migrateCareer(parsed.payload);
    if(migrated.ok){
      const check=validateCareer(migrated.state);
      if(check.ok)return {state:migrated.state,reason:null,restored:false};
      return recover(storage,`Save file failed validation: ${check.reason}`);
    }
    return recover(storage,migrated.reason);
  }
  return recover(storage,parsed.reason);
}

function recover(storage,reason){
  const backup=storage.getItem(CAREER_BACKUP_KEY);
  if(backup!=null){
    const parsed=parseCareer(backup);
    if(parsed.ok){
      const migrated=migrateCareer(parsed.payload);
      if(migrated.ok&&validateCareer(migrated.state).ok){
        try{storage.setItem(CAREER_SAVE_KEY,backup)}catch{}
        return {state:migrated.state,reason:`Recovered the previous save. ${reason}`,restored:true};
      }
    }
  }
  try{
    storage.setItem(CAREER_QUARANTINE_KEY,storage.getItem(CAREER_SAVE_KEY)??'');
    storage.removeItem(CAREER_SAVE_KEY);
    storage.removeItem(CAREER_BACKUP_KEY);
  }catch{}
  return {state:null,reason:`Save file was unreadable and could not be recovered. ${reason}`,restored:false};
}

export function clearCareer(storage=careerStorage()){
  if(!storage)return false;
  try{
    storage.removeItem(CAREER_SAVE_KEY);
    storage.removeItem(CAREER_BACKUP_KEY);
    storage.removeItem(CAREER_QUARANTINE_KEY);
    return true;
  }catch{return false}
}

// A tiny in-memory storage used by tests and by the browser fallback path.
export function memoryStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return {
    getItem:key=>(map.has(key)?map.get(key):null),
    setItem:(key,value)=>{map.set(key,String(value))},
    removeItem:key=>{map.delete(key)},
    get size(){return map.size},
    snapshot:()=>Object.fromEntries(map)
  };
}
