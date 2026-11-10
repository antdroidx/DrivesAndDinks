import {writeFileSync,mkdirSync} from 'node:fs';
import {createCareer} from '../src/career/state.js';
import {rollInjury,activeInjuries} from '../src/career/injuries.js';

const trials=Number(process.argv.slice(2).find(arg=>arg.startsWith('--trials='))?.split('=')[1]??20000);
const output=process.argv.slice(2).find(arg=>arg.startsWith('--output='))?.split('=')[1]??'validation/injury-audit.json';
const base=createCareer({name:'Injury Audit',seed:4242,regionId:'north-america',cityId:'seattle',age:30});

function randomFor(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function run(label,state,activity,seed){
  const random=randomFor(seed);let injuries=0;const severities={minor:0,moderate:0,major:0},areas={},weeks=[];
  for(let index=0;index<trials;index++){
    const result=rollInjury({...state,week:index}, {activity,random});
    if(!result.injury)continue;
    injuries++;severities[result.injury.severity]++;areas[result.injury.areaId]=(areas[result.injury.areaId]??0)+1;weeks.push(result.injury.returnWeek-result.injury.startWeek);
  }
  const average=weeks.length?weeks.reduce((sum,value)=>sum+value,0)/weeks.length:null;
  return {label,activity,trials,rate:injuries/trials,severities,areas,averageWeeks:average};
}
const rows=[
  run('Normal match',base,'match',101),
  run('Low-energy match',{...base,energy:25},'match',202),
  run('Age 46 match',{...base,athlete:{...base.athlete,age:46}},'match',303),
  run('Low-energy age 50 match',{...base,energy:25,athlete:{...base.athlete,age:50}},'match',404),
  run('Normal training',base,'training',505),
  run('Low-energy training',{...base,energy:25},'training',606)
];
const report={generatedAt:new Date().toISOString(),model:'Shared player injury engine',trialsPerRow:trials,rows,note:'Game-balance measurements, not medical risk estimates.'};
mkdirSync(output.split(/[\\/]/).slice(0,-1).join('/')||'.',{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));