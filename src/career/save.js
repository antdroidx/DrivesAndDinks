// Career save schema.
//
// The career file is a versioned envelope around the state. Migrations move a
// payload from an older schema forward one step at a time; a payload from a
// newer schema is refused rather than guessed at. A corrupt or truncated file
// never silently resets a career: it falls back to the last good save, and
// the unreadable payload is kept aside for recovery.

import {NAME_CULTURES,RATING_KEYS,skillAverage} from '../roster.js';
import {RATING_MAX,RATING_MIN,ratingFromSkill,NEW_PLAYER_RATING,FORMATS} from './rating.js';
import {REGIONS} from './geography.js';
import {emptyAnalytics} from './analytics.js';
import {peakAgeFor,createDevelopmentProfile} from './age.js';

export const CAREER_SAVE_VERSION=14;
export const CAREER_SAVE_KEY='drives-dinks:career';
export const CAREER_BACKUP_KEY='drives-dinks:career:backup';
export const CAREER_QUARANTINE_KEY='drives-dinks:career:quarantine';

const REGION_IDS=REGIONS.map(region=>region.id);

// Migrations are keyed by the version they upgrade from. Each one receives the
// state and returns the next version's state.
export const CAREER_MIGRATIONS=Object.freeze({
  // v14 added club partners, reputation, opponents and coaching.
  13:state=>({
    ...state,
    partners:state.partners??{doubles:null,mixed:null},
    clubReputation:state.clubReputation??0,
    opponents:state.opponents??{},
    coachFeedback:state.coachFeedback??null
  }),
  // v13 added per-attribute maintenance from repeated training.
  12:state=>({
    ...state,
    athlete:{
      ...state.athlete,
      maintenance:state.athlete?.maintenance??Object.fromEntries(RATING_KEYS.map(key=>[key,0]))
    }
  }),
  // v12 added unique development and physical-decline profiles.
  11:state=>({
    ...state,
    athlete:{
      ...state.athlete,
      development:state.athlete?.development??createDevelopmentProfile(state.seed,state.athlete?.startAge??state.athlete?.age??25)
    }
  }),
  // v11 added age ceilings and the retirement artifact.
  10:state=>({
    ...state,
    athlete:{
      ...state.athlete,
      age:state.athlete?.age??25,
      startAge:state.athlete?.startAge??state.athlete?.age??25,
      peakAge:state.athlete?.peakAge??peakAgeFor(state.seed),
      peakRatings:state.athlete?.peakRatings??{...state.athlete?.ratings},
      peakFormats:state.athlete?.peakFormats??{...state.athlete?.formats}
    },
    retired:state.retired??false,
    retiredWeek:state.retiredWeek??null,
    retirementReason:state.retirementReason??null,
    retiredAge:state.retiredAge??null,
    epilogue:state.epilogue??null,
    allTimeBoard:state.allTimeBoard??[]
  }),
  // v10 added durable analytics independent of the bounded match archive.
  9:state=>({
    ...state,
    analytics:state.analytics??emptyAnalytics(state.athlete?.formats),
    eventHistory:state.eventHistory??[],
    ratingHistory:state.ratingHistory??[]
  }),
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
  },
  // v8 added prize money and the rival.
  7:state=>({
    ...state,
    money:state.money??250,
    rivalId:state.rivalId??null
  }),
  // v9 added contract review, release and the route back to the tour.
  8:state=>({
    ...state,
    contract:state.contract??'none',
    contractSince:state.contractSince??null,
    contractEvents:state.contractEvents??0,
    contractFormats:state.contractFormats??{singles:0,doubles:0,mixed:0},
    contractEventLog:state.contractEventLog??[],
    ineligibleUntil:state.ineligibleUntil??null,
    releasedAt:state.releasedAt??null,
    reentryEvents:state.reentryEvents??0,
    reentryEventIds:state.reentryEventIds??[],
    contractRecommendation:state.contractRecommendation??null,
    eventEntries:state.eventEntries??[],
    rankingResults:state.rankingResults??[]
  }),
  // v7 split the rating per format and the world ratings per format.
  6:state=>{
    const athlete={...state.athlete};
    const legacy=athlete.rating;
    delete athlete.rating;
    const formats={};
    for(const format of FORMATS)formats[format]=athlete.formats?.[format]??legacy??NEW_PLAYER_RATING;
    athlete.formats=formats;
    const legacyWorld=state.worldRatings??{};
    const worldRatings={};
    for(const format of FORMATS)worldRatings[format]=legacyWorld[format]??{};
    // The old world ratings were a flat map of doubles results.
    if(!legacyWorld.doubles&&!legacyWorld.singles&&Object.keys(legacyWorld).length){
      worldRatings.doubles=legacyWorld;
    }
    return {...state,athlete,worldRatings};
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
  if(!athlete.formats||typeof athlete.formats!=='object')return {ok:false,reason:'Athlete ratings are invalid'};
  for(const format of FORMATS){
    const rating=athlete.formats[format];
    if(!Number.isFinite(rating)||rating<RATING_MIN||rating>RATING_MAX)return {ok:false,reason:'Athlete rating is invalid'};
  }
  if(typeof athlete.archetypeId!=='string'||!athlete.archetypeId)return {ok:false,reason:'Athlete archetype is missing'};
  if(athlete.tourPoints!=null&&!Number.isFinite(athlete.tourPoints))return {ok:false,reason:'Tour points are invalid'};
  if(!['none','futures','standard','gold'].includes(state.contract??'none'))return {ok:false,reason:'Contract level is invalid'};
  if(state.contractSince!=null&&!Number.isFinite(state.contractSince))return {ok:false,reason:'Contract date is invalid'};
  if(state.contractEvents!=null&&(!Number.isFinite(state.contractEvents)||state.contractEvents<0))return {ok:false,reason:'Contract events are invalid'};
  if(state.contractFormats!=null&&(!state.contractFormats||typeof state.contractFormats!=='object'))return {ok:false,reason:'Contract formats are invalid'};
  if(state.ineligibleUntil!=null&&!Number.isFinite(state.ineligibleUntil))return {ok:false,reason:'Ineligible date is invalid'};
  if(state.reentryEvents!=null&&(!Number.isFinite(state.reentryEvents)||state.reentryEvents<0))return {ok:false,reason:'Re-entry events are invalid'};
  if(state.contractEventLog!=null&&!Array.isArray(state.contractEventLog))return {ok:false,reason:'Contract history is invalid'};
  if(state.reentryEventIds!=null&&!Array.isArray(state.reentryEventIds))return {ok:false,reason:'Re-entry history is invalid'};
  if(state.eventEntries!=null&&!Array.isArray(state.eventEntries))return {ok:false,reason:'Event entry history is invalid'};
  if(state.eventHistory!=null&&!Array.isArray(state.eventHistory))return {ok:false,reason:'Event history is invalid'};
  if(state.ratingHistory!=null&&!Array.isArray(state.ratingHistory))return {ok:false,reason:'Rating history is invalid'};
  if(state.analytics!=null&&(!state.analytics||typeof state.analytics!=='object'))return {ok:false,reason:'Career analytics are invalid'};
  if(!state.partners||typeof state.partners!=='object')return {ok:false,reason:'Club partners are invalid'};
  if(!Number.isFinite(state.clubReputation)||state.clubReputation<0)return {ok:false,reason:'Club reputation is invalid'};
  if(!state.opponents||typeof state.opponents!=='object')return {ok:false,reason:'Opponent history is invalid'};
  if(!Number.isFinite(athlete.age)||athlete.age<10||athlete.age>120)return {ok:false,reason:'Athlete age is invalid'};
  if(!Number.isFinite(athlete.startAge)||athlete.startAge<10||athlete.startAge>70)return {ok:false,reason:'Starting age is invalid'};
  if(!Number.isFinite(athlete.peakAge))return {ok:false,reason:'Peak age is invalid'};
  if(!athlete.peakRatings||typeof athlete.peakRatings!=='object')return {ok:false,reason:'Peak skills are invalid'};
  if(!athlete.peakFormats||typeof athlete.peakFormats!=='object')return {ok:false,reason:'Peak ratings are invalid'};
  if(!athlete.development||typeof athlete.development!=='object')return {ok:false,reason:'Development profile is invalid'};
  if(!athlete.maintenance||typeof athlete.maintenance!=='object')return {ok:false,reason:'Training maintenance is invalid'};
  if(typeof state.retired!=='boolean')return {ok:false,reason:'Retirement state is invalid'};
  if(state.allTimeBoard!=null&&!Array.isArray(state.allTimeBoard))return {ok:false,reason:'All-time board is invalid'};
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
