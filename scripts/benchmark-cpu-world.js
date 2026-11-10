import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createCpuWorld,advanceCpuWorld,cpuLeaders,cpuPlayerPage,emptyCpuWorld} from '../src/career/cpu-careers.js';
import {emptyInjuries} from '../src/career/injuries.js';

const sizes=(process.argv.slice(2).find(arg=>arg.startsWith('--sizes='))?.split('=')[1]??'1000,5000,10000,25000,50000').split(',').map(Number).filter(Number.isFinite);
const weeks=Math.max(1,Math.min(52,Number(process.argv.slice(2).find(arg=>arg.startsWith('--weeks='))?.split('=')[1]??12)));
const output=process.argv.slice(2).find(arg=>arg.startsWith('--output='))?.split('=')[1]??'validation/cpu-benchmarks.json';

function syntheticWorld(size){
  const world=emptyCpuWorld();
  world.limits={active:Math.ceil(size*.3),circuit:Math.ceil(size*.5)};
  const records={};
  for(let index=0;index<size;index++){
    const id=`bench-player-${index}`;
    const rating=3+((index*7919)%2500)/1000;
    records[id]={
      id,name:`Player ${String(index).padStart(6,'0')}`,gender:index%2?'female':'male',
      regionId:index%3?'north-america':'asia',cityId:'seattle',clubId:`club-${index%80}`,
      detail:index%10<3?'active':index%10<7?'circuit':'background',startAge:18,age:18+(index%62),
      ratings:{},formats:{singles:rating,doubles:rating,mixed:rating},potential:rating*12,
      matches:index%400,wins:index%200,events:index%80,tourPoints:index%2400,tourPointsHistory:[],
      contract:'none',proInviteWeek:null,proWeek:null,fatigue:index%40,form:index%20-10,
      injuries:emptyInjuries(),equipmentId:'allcourt-hybrid',sponsorId:null,teamId:null,
      retired:false,retiredWeek:null,lastActiveWeek:0,lastTrainedWeek:null,lastMatchWeek:null,lastEventWeek:0,stage:'amateur'
    };
  }
  world.records=records;
  world.summary={...world.summary,population:size};
  return world;
}

function timed(fn){
  const start=performance.now();
  const value=fn();
  return {ms:performance.now()-start,value};
}

const results=[];
for(const size of sizes){
  const beforeMemory=process.memoryUsage().heapUsed;
  const built=timed(()=>syntheticWorld(size));
  const leaders=timed(()=>cpuLeaders(built.value,{limit:25}));
  const page=timed(()=>cpuPlayerPage(built.value,{query:'Player 00',page:0,pageSize:40}));
  const serialized=timed(()=>JSON.stringify(built.value));
  const afterMemory=process.memoryUsage().heapUsed;
  results.push({
    population:size,
    buildMs:Math.round(built.ms*100)/100,
    leaderboardMs:Math.round(leaders.ms*100)/100,
    queryPageMs:Math.round(page.ms*100)/100,
    serializeMs:Math.round(serialized.ms*100)/100,
    serializedMb:Math.round(serialized.value.length/1024/1024*100)/100,
    heapDeltaMb:Math.round(Math.max(0,afterMemory-beforeMemory)/1024/1024*100)/100,
    pageTotal:page.value.total
  });
}

let world=createCpuWorld(4242,'north-america',0);
const advanceStart=performance.now();
for(let week=1;week<=weeks;week++){
  world=advanceCpuWorld(world,{seed:4242,regionId:'north-america',week,ratings:{}}).world;
}
const weeklyAdvanceMs=(performance.now()-advanceStart)/weeks;
const report={
  generatedAt:new Date().toISOString(),
  runtime:'Node.js reference harness',
  methodology:'Synthetic compact records benchmark query, sorting, serialization and heap growth. The final weekly advance uses the real configured CPU world.',
  sizes,
  weeks,
  synthetic:results,
  actualWorld:{active:world.summary.active,circuit:world.summary.circuit,background:world.summary.background,weeklyAdvanceMs:Math.round(weeklyAdvanceMs*100)/100,serializedMb:Math.round(JSON.stringify(world).length/1024/1024*100)/100},
  externalRequired:'Run the same report on representative browser and Android devices before claiming Phase 2 performance exit.'
};
mkdirSync(output.split(/[\\/]/).slice(0,-1).join('/')||'.',{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\\n');
console.log(JSON.stringify(report,null,2));