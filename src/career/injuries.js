// Injuries and temporary availability.
//
// Injuries are intentionally rare. They interrupt competition and reduce
// recovery without changing the athlete's permanent rating. The same model is
// used by the player and CPU careers so a return date means the same thing in
// both places.

export const INJURY_VERSION=1;
export const INJURY_HISTORY_LIMIT=32;

export const INJURY_AREAS=Object.freeze([
  {id:'knee',label:'Knee',factor:1.12},
  {id:'shoulder',label:'Shoulder',factor:1.2},
  {id:'elbow',label:'Elbow',factor:.85},
  {id:'ankle',label:'Ankle',factor:1},
  {id:'back',label:'Lower back',factor:1.25},
  {id:'wrist',label:'Wrist',factor:.8}
]);

export const INJURY_SEVERITIES=Object.freeze({
  minor:{id:'minor',label:'Minor strain',minWeeks:1,maxWeeks:2,recoveryFactor:.78,probability:.028},
  moderate:{id:'moderate',label:'Moderate injury',minWeeks:3,maxWeeks:5,recoveryFactor:.55,probability:.009},
  major:{id:'major',label:'Significant injury',minWeeks:6,maxWeeks:8,recoveryFactor:.35,probability:.0015}
});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const integer=(value,fallback=0)=>Number.isFinite(Number(value))?Math.round(Number(value)):fallback;
export const areaById=id=>INJURY_AREAS.find(area=>area.id===id)??INJURY_AREAS[0];
export const severityById=id=>INJURY_SEVERITIES[id]??INJURY_SEVERITIES.minor;

export function emptyInjuries(){
  return {version:INJURY_VERSION,active:[],history:[],lastInjuryWeek:null};
}

export function normalizeInjuries(value){
  if(!value||typeof value!=='object')return emptyInjuries();
  return {
    version:INJURY_VERSION,
    active:Array.isArray(value.active)?value.active.slice(-3).filter(injury=>injury?.id&&injury?.returnWeek>=(value.lastInjuryWeek??0)):[],
    history:Array.isArray(value.history)?value.history.slice(-INJURY_HISTORY_LIMIT):[],
    lastInjuryWeek:Number.isFinite(value.lastInjuryWeek)?value.lastInjuryWeek:null
  };
}

export function activeInjuries(state){
  const week=integer(state?.week);
  return normalizeInjuries(state?.injuries).active.filter(injury=>injury.returnWeek>week);
}

export function currentInjury(state){
  return activeInjuries(state).sort((a,b)=>b.returnWeek-a.returnWeek)[0]??null;
}

export function injuryBlockReason(state){
  const injury=currentInjury(state);
  if(!injury)return null;
  return `Recovering from ${injury.severityLabel.toLowerCase()} (${injury.areaLabel}). Available ${injury.returnLabel}.`;
}

export function injuryRecoveryFactor(state){
  const active=activeInjuries(state);
  if(!active.length)return 1;
  return active.reduce((factor,injury)=>Math.min(factor,injury.recoveryFactor??.7),1);
}

function chooseSeverity(random){
  const roll=random();
  if(roll<INJURY_SEVERITIES.major.probability)return INJURY_SEVERITIES.major;
  if(roll<INJURY_SEVERITIES.major.probability+INJURY_SEVERITIES.moderate.probability)return INJURY_SEVERITIES.moderate;
  return INJURY_SEVERITIES.minor;
}

export function createInjury({week=0,activity='match',severity='minor',areaId=null,random=Math.random}={}){
  const model=severityById(severity);
  const area=areaId?areaById(areaId):INJURY_AREAS[Math.min(INJURY_AREAS.length-1,Math.floor(random()*INJURY_AREAS.length))];
  const span=model.maxWeeks-model.minWeeks+1;
  const weeks=model.minWeeks+Math.floor(random()*span);
  const startWeek=integer(week);
  const returnWeek=startWeek+Math.max(1,Math.round(weeks*area.factor));
  return {
    id:`injury:${startWeek}:${activity}:${area.id}`,
    areaId:area.id,
    areaLabel:area.label,
    severity:model.id,
    severityLabel:model.label,
    cause:activity,
    startWeek,
    returnWeek,
    recoveryFactor:model.recoveryFactor,
    returnLabel:`week ${returnWeek+1}`
  };
}

export function addInjury(state,injury){
  if(!injury)return {ok:true,state,injury:null};
  const injuries=normalizeInjuries(state?.injuries);
  if(injuries.active.some(entry=>entry.id===injury.id))return {ok:true,state,injury,duplicate:true};
  const next={
    ...state,
    injuries:{
      ...injuries,
      active:[...injuries.active,injury].slice(-3),
      lastInjuryWeek:injury.startWeek
    }
  };
  return {ok:true,state:next,injury,duplicate:false};
}

export function rollInjury(state,{activity='match',random=Math.random}={}){
  if(currentInjury(state))return {ok:true,state,injury:null};
  const week=integer(state?.week);
  const last=normalizeInjuries(state?.injuries).lastInjuryWeek;
  let risk=activity==='training'?.012:.03;
  if(Number(state?.energy)<35)risk*=2.1;
  if(Number(state?.athlete?.age)>45)risk*=1.5;
  if(last!=null&&week-last<8)risk*=1.25;
  if(random()>=clamp(risk,.002,.08))return {ok:true,state,injury:null};
  const severity=chooseSeverity(random);
  const injury=createInjury({week,activity,severity:severity.id,random});
  return addInjury(state,injury);
}

export function healInjuries(state,week=state?.week??0,{recoveryBoost=0}={}){
  const currentWeek=integer(week);
  const injuries=normalizeInjuries(state?.injuries);
  const stillActive=[];
  const healed=[];
  for(const injury of injuries.active){
    const adjustedReturn=injury.returnWeek-Math.max(0,integer(recoveryBoost));
    if(adjustedReturn<=currentWeek){
      healed.push({...injury,returnWeek:Math.min(injury.returnWeek,adjustedReturn),healedWeek:currentWeek});
    }else{
      stillActive.push({...injury,returnWeek:adjustedReturn});
    }
  }
  if(!healed.length)return {ok:true,state,injury:null,healed:[]};
  return {
    ok:true,
    state:{
      ...state,
      injuries:{
        version:INJURY_VERSION,
        active:stillActive,
        history:[...injuries.history,...healed].slice(-INJURY_HISTORY_LIMIT),
        lastInjuryWeek:injuries.lastInjuryWeek
      }
    },
    healed
  };
}

export function validateInjuries(state){
  const value=state?.injuries;
  if(!value||typeof value!=='object')return {ok:false,reason:'Injury state is missing'};
  if(value.version!==INJURY_VERSION)return {ok:false,reason:'Injury state version is invalid'};
  if(!Array.isArray(value.active)||!Array.isArray(value.history))return {ok:false,reason:'Injury history is invalid'};
  for(const injury of value.active.concat(value.history)){
    if(typeof injury?.areaId!=='string'||typeof injury?.severity!=='string')return {ok:false,reason:'Injury record is invalid'};
    if(!Number.isFinite(injury.startWeek)||!Number.isFinite(injury.returnWeek)||injury.returnWeek<injury.startWeek)return {ok:false,reason:'Injury date is invalid'};
  }
  return {ok:true};
}