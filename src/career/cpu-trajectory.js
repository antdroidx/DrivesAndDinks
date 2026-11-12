// Reproducible CPU development, independent of how often a player is viewed.
// These are game balance policies, not predictions of real athletic careers.
import {RATING_KEYS} from '../roster.js';
import {seededRandom} from '../competition.js';
import {attributeAgeFactor} from './age.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round3=value=>Math.round(value*1000)/1000;

export const CPU_TRAJECTORY_STYLES=Object.freeze({
  casual:{label:'Recreational regular',weight:28,pace:.10,realization:.18,budget:.5,dedication:.25},
  plateau:{label:'Settled at this level',weight:23,pace:.08,realization:.04,budget:0,dedication:.10},
  steady:{label:'Steady learner',weight:25,pace:.24,realization:.75,budget:2,dedication:.85},
  late:{label:'Late bloomer',weight:10,pace:.34,realization:.95,budget:3,dedication:.9},
  early:{label:'Early peak',weight:8,pace:.48,realization:.70,budget:1,dedication:.65},
  volatile:{label:'Uneven development',weight:6,pace:.26,realization:.60,budget:2,dedication:.6}
});
const PHASE_LABELS={steady:'Developing',plateau:'Plateau',slump:'Slump',breakthrough:'Breakthrough'};

export function createCpuTrajectory(seed,startAge=25){
  const random=seededRandom(seed);
  let roll=random()*100;
  const style=Object.keys(CPU_TRAJECTORY_STYLES).find(id=>(roll-=CPU_TRAJECTORY_STYLES[id].weight)<0)??'casual';
  const policy=CPU_TRAJECTORY_STYLES[style];
  return {
    version:1,seed:Number(seed)>>>0,style,
    learningRate:.55+random()*.9,
    dedication:policy.dedication*(.7+random()*.6),
    consistency:style==='volatile'?.2+random()*.25:.65+random()*.3,
    realization:policy.realization*(.65+random()*.5),
    growthBudget:policy.budget*(.5+random()),
    delayYears:style==='late'?2+random()*5:0,
    peakAge:style==='early'?Math.max(startAge+2,25+random()*6):Math.max(startAge+6,29+random()*12),
    declineRate:.65+random()*.85,
    maintenance:random()*.55,
    focus:RATING_KEYS[Math.floor(random()*RATING_KEYS.length)]
  };
}

function phaseForYear(profile,year){
  const random=seededRandom((profile.seed^Math.imul(year+1,0x9e3779b1))>>>0);
  const roll=random();
  if(profile.style==='plateau')return roll<.92?'plateau':roll<.97?'slump':'steady';
  if(profile.style==='casual')return roll<.7?'plateau':roll<.85?'slump':'steady';
  if(profile.style==='volatile')return roll<.3?'plateau':roll<.6?'slump':roll<.85?'breakthrough':'steady';
  return roll<.25?'plateau':roll<.4?'slump':roll<.56?'breakthrough':'steady';
}

export function cpuTrajectoryStatus(profile,week=0){
  if(!profile)return null;
  const phase=phaseForYear(profile,Math.floor(Math.max(0,week)/52));
  const trainingMultiplier=phase==='plateau'||phase==='slump'?0:profile.dedication*(phase==='breakthrough'?1.8:1);
  return {style:profile.style,label:CPU_TRAJECTORY_STYLES[profile.style]?.label??'Individual development',phase,phaseLabel:PHASE_LABELS[phase],trainingMultiplier};
}

// Integrate productive seasons rather than assuming every elapsed year is
// improvement. Bad seasons also have a temporary, smoothly recovering dip.
function developmentTime(profile,years){
  let time=0;
  for(let year=0;year<Math.ceil(years);year++){
    const duration=Math.max(0,Math.min(year+1,years)-Math.max(year,profile.delayYears));
    const phase=phaseForYear(profile,year);
    time+=duration*(phase==='breakthrough'?1.8:phase==='steady'?1:0);
  }
  return time;
}

export function cpuTrajectoryRatings({initialRatings,peakRatings,startAge,week=0,development={},trajectory}){
  const years=Math.max(0,Number(week)||0)/52;
  const age=startAge+years;
  const profile=trajectory;
  const policy=CPU_TRAJECTORY_STYLES[profile.style]??CPU_TRAJECTORY_STYLES.casual;
  const productive=developmentTime(profile,years);
  const progress=1-Math.exp(-productive*policy.pace*profile.learningRate);
  const phase=phaseForYear(profile,Math.floor(years));
  const pulse=Math.sin(Math.PI*(years%1))**2;
  const variation=(phase==='slump'?-1:phase==='breakthrough'?.3:0)*(1-profile.consistency)*3*pulse;
  const aging={...development,agilityDeclineRate:(development.agilityDeclineRate??1)*profile.declineRate,powerDeclineRate:profile.declineRate};
  const ratings={};
  for(const key of RATING_KEYS){
    const initial=initialRatings[key]??25;
    const originalFactor=attributeAgeFactor(key,startAge,aging,profile.maintenance);
    const factor=attributeAgeFactor(key,age,aging,profile.maintenance);
    const baseline=initial/Math.max(.08,originalFactor);
    const ceiling=Math.max(baseline,peakRatings[key]??baseline);
    const focus=key===profile.focus?1.35:.85;
    const headroom=Math.max(0,ceiling-baseline)*profile.realization+profile.growthBudget;
    const growth=Math.min(Math.max(0,99-baseline),headroom*progress*focus);
    const earlyLoss=profile.style==='early'?Math.max(0,age-profile.peakAge)*.25*profile.declineRate:0;
    const value=(baseline+growth-earlyLoss+variation*focus)*factor;
    ratings[key]=clamp(round3(value),25,99);
  }
  return ratings;
}
