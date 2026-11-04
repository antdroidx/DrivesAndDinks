import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {Game} from '../src/game.js';
import {C} from '../src/core.js';

const seconds=Number(process.argv[2]??60);
if(!Number.isInteger(seconds)||seconds<10||seconds>300)throw new Error('Use 10–300 simulated seconds per case');
const outputIndex=process.argv.indexOf('--output'),output=outputIndex>=0?process.argv[outputIndex+1]:null;
if(outputIndex>=0&&!output)throw new Error('--output needs a path');
const percentile=(samples,p)=>samples[Math.min(samples.length-1,Math.floor((samples.length-1)*p))];
const results=[];
for(const scenario of ['singles','doubles','practice-drop','practice-reset']){
 const g=new Game({seed:37});g.configure({format:scenario==='singles'?'singles':'doubles'});
 if(scenario.startsWith('practice-'))g.startPractice(scenario.slice(9));else g.mode='watch';
 const timings=[],byPhase={};let reportMs=0;
 for(let tick=0;tick<seconds*120&&g.phase!=='over';tick++){
  if(g.practice){g.shot='soft';if(g.canHumanHit())g.swing()}
  const phase=g.phase,start=performance.now();g.update(C.dt);const ms=performance.now()-start;
  timings.push(ms);(byPhase[phase]??=[]).push(ms);
 }
 for(let n=0;n<10;n++){const start=performance.now();JSON.stringify(g.matchReport());reportMs+=performance.now()-start}
 timings.sort((a,b)=>a-b);
 const summarize=values=>{values.sort((a,b)=>a-b);return {samples:values.length,p50:percentile(values,.5),p95:percentile(values,.95),p99:percentile(values,.99),max:values.at(-1)}};
 const row={scenario,updateMs:summarize(timings),phases:Object.fromEntries(Object.entries(byPhase).map(([phase,values])=>[phase,summarize(values)])),reportExportAverageMs:reportMs/10,retainedEvents:g.journal.events.length};
 results.push(row);console.log(JSON.stringify(row));
}
const report={runtime:process.version,fixedStepBudgetMs:1000/120,scope:'CPU update, replay recording and journal; excludes browser rendering and real mobile hardware',results};
if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n')}
