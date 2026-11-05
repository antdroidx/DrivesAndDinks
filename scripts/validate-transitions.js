// Read-only live-match diagnostics. No extra random draws or engine source edits.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const count=(object,key,value=1)=>{object[key]=(object[key]??0)+value};
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const rate=(a,b)=>b?a/b:null;
const near=p=>p.team===0?p.y<33:p.y>11;
export const targetDepth=(team,y)=>team===0?y:44-y;
const snapshot=p=>p?{id:p.id,team:p.team,x:p.x,y:p.y,speed:Math.hypot(p.vx||0,p.vy||0),stamina:p.stamina??1,recoveryTimer:p.recoveryTimer??0,role:p.tacticalRole??'unknown'}:null;

export function contactContext(game,player,core){
 const partner=game.players.find(p=>p.team===player.team&&p.id!==player.id);
 const opponents=game.players.filter(p=>p.team!==player.team);
 const difficulty=core.contactDifficulty(player,game.ball,'drive');
 return {hitter:snapshot(player),partner:snapshot(partner),opponents:opponents.map(snapshot),height:game.ball.z,difficulty,
  partnerReady:!partner||((partner.stamina??1)>.3&&(partner.recoveryTimer??0)<.3&&Math.abs(partner.y-player.y)<8),
  balanced:Math.hypot(player.vx||0,player.vy||0)<(player.abilities.speed??core.C.speed)*.85&&difficulty<.78,
  opponentsAtKitchen:opponents.every(p=>p.team===0?p.y<34:p.y>10),
  opponentsDeep:opponents.every(p=>p.team===0?p.y>35:p.y<9),
  transition:player.team===game.score.team&&game.shots>=4&&[player,partner].filter(Boolean).some(p=>p.team===0?p.y>33:p.y<11),
  aggression:player.playstyle?.aggression??player.abilities.aggression??.5,courtIQ:player.abilities.courtIQ??1,
  attackSkill:((player.abilities.drive??1)+(player.abilities.smash??1)+(player.abilities.power??1))/3,
  softSkill:((player.abilities.drop??1)+(player.abilities.dink??1)+(player.abilities.defense??1))/3};
}

export function trackTransitions(game,core){
 const data={decisions:[],depths:[],rallies:[],roleSeconds:{},transitionRoleSeconds:{}};
 let active=null,serve=null,pending=null,follow=null,rallyDecisions=[];
 const emit=game.emit.bind(game),hit=game.hit.bind(game),release=game.releaseServe.bind(game);
 function closePending(status){if(pending){pending.status=status;pending=null}}
 game.hit=(player,...args)=>{
  active={player,context:contactContext(game,player,core)};
  try{return hit(player,...args)}finally{active=null}
 };
 game.releaseServe=(...args)=>{
  serve=game.serveToss?{...game.serveToss}:null;
  try{return release(...args)}finally{serve=null}
 };
 game.emit=(type,detail={})=>{
  if(type==='hit'){
   closePending('contact-before-first-landing');follow=null;
   const player=game.players.find(p=>p.id===detail.playerId),ordinal=detail.stroke==='serve'?1:game.shots+1;
   const isServe=ordinal===1,context=active?.context;
   if(isServe||ordinal===2){
    // The prior recovery engine launches serves to fixed y=8/36 and has no targetY field.
    const y=isServe?(serve?.targetY??(player.team===0?8:36)):detail.placement?.y;
    pending={rally:data.rallies.length+1,ordinal,kind:isServe?'serve':'return',team:player.team,shot:detail.shot,
     target:{x:isServe?serve?.target:detail.placement?.x,y},targetDepth:Number.isFinite(y)?targetDepth(player.team,y):null,
     quality:detail.quality,status:'pending',landing:null,serveX:isServe?player.x:null};
    data.depths.push(pending);
   }
   if(context&&ordinal>=3&&ordinal%2===1&&player.team===game.score.team){
    const decision={rally:data.rallies.length+1,ordinal,time:game.clock,shot:detail.shot,quality:detail.quality,
     contactDifficulty:detail.difficulty,...context,
     weak:detail.quality<.8||detail.difficulty>.7,
     followThrough:{seconds:0,partnerRoleSeconds:{},hitterRoleSeconds:{},bothNearKitchenSeconds:0,maxDepthGap:0},outcome:null};
    data.decisions.push(decision);rallyDecisions.push(decision);follow=decision;
   }
  }else if(type==='bounce'&&pending){
   const {x,y}=detail.position??game.ball,depth=targetDepth(pending.team,y);
   const inCourt=core.inBounds(x,y),receiverSide=core.side(y)!==pending.team;
   const serviceBox=pending.kind==='serve'?receiverSide&&(pending.serveX<10?x>=10:x<=10)&&(core.side(y)===0?y>29:y<15):null;
   pending.landing={x,y,depth,inCourt,receiverSide,serviceBox,netContact:!!game.ball.netContact,
    depthError:pending.targetDepth===null?null:depth-pending.targetDepth};
   closePending('landed');
  }else if(type==='rally-end'){
   closePending(`rally-ended: ${detail.reason}`);follow=null;
   const rally={rally:data.rallies.length+1,shots:detail.shots,winner:detail.winner,reason:detail.reason,time:game.clock};
   data.rallies.push(rally);
   for(const decision of rallyDecisions)decision.outcome={won:detail.winner===decision.hitter.team,reason:detail.reason,rallyShots:detail.shots};
   rallyDecisions=[];
  }
  return emit(type,detail);
 };
 return {data,sample(dt){
  if(game.phase!=='rally')return;
  for(const player of game.players)count(data.roleSeconds,player.tacticalRole??'unknown',dt);
  if(!follow)return;
  const hitter=game.players.find(p=>p.id===follow.hitter.id),partner=game.players.find(p=>p.id===follow.partner?.id);
  if(!partner)return;
  const f=follow.followThrough;f.seconds+=dt;
  count(f.hitterRoleSeconds,hitter.tacticalRole??'unknown',dt);count(f.partnerRoleSeconds,partner.tacticalRole??'unknown',dt);
  f.bothNearKitchenSeconds+=Number(near(hitter)&&near(partner))*dt;
  f.maxDepthGap=Math.max(f.maxDepthGap,Math.abs(hitter.y-partner.y));
  for(const p of [hitter,partner])count(data.transitionRoleSeconds,p.tacticalRole??'unknown',dt);
 },finish(){closePending('simulation-cap');return data}};
}

export async function loadEngine(directory=root){
 const url=name=>pathToFileURL(resolve(directory,`src/${name}.js`)).href;
 const [game,core,roster,competition]=await Promise.all(['game','core','roster','competition'].map(name=>import(url(name))));
 return {...game,core,roster,competition};
}

export function runMatch(engine,{seed,level='demo',maxSeconds=1200,lineup=null,instrument=true}={}){
 if(!Number.isFinite(maxSeconds)||maxSeconds<=0||maxSeconds>2400)throw new Error('Simulation cap must be >0 and <=2400 seconds');
 const {Game,core,roster,competition}=engine;
 const players=lineup??roster.levelLineup(level,competition.seededRandom(seed));
 const game=new Game({seed});game.configure({format:'doubles'},structuredClone(players));game.mode='watch';game.recordReplay=()=>{};
 if(seed%2===0){game.score.team=1;game.score.serverPlayer=0;game.serveSetup()}
 const tracker=instrument?trackTransitions(game,core):null;
 const ticks=Math.floor(maxSeconds/core.C.dt);let tick=0;
 for(;tick<ticks&&game.phase!=='over';tick++){
  game.update(core.C.dt);tracker?.sample(core.C.dt);
  if(tick%120===0&&!game.players.every(p=>[p.x,p.y,p.vx,p.vy,p.stamina].every(Number.isFinite)))throw new Error(`Nonfinite player: ${level}/${seed}`);
 }
 return {seed,level,completed:game.phase==='over',simulatedSeconds:tick*core.C.dt,points:[...game.score.points],winner:game.score.winner,
  stats:structuredClone(game.stats),tactics:structuredClone(game.tacticalStats),...(tracker?.finish()??{})};
}

function decisionSummary(rows){
 const shots={};for(const row of rows)count(shots,row.shot);
 const pressure=rows.filter(r=>!r.balanced||r.difficulty>.78||(r.ordinal>=5&&!r.partnerReady));
 const weak=rows.filter(r=>r.weak),soft=shot=>['drop','dink'].includes(shot);
 return {contacts:rows.length,shots,unready:rows.filter(r=>!r.partnerReady).length,unbalanced:rows.filter(r=>!r.balanced).length,
  pressureContacts:pressure.length,pressureSoftRate:rate(pressure.filter(r=>soft(r.shot)).length,pressure.length),
  meanDifficulty:mean(rows.map(r=>r.difficulty)),mishitRate:rate(rows.filter(r=>r.quality<.8).length,rows.length),
  weakContacts:weak.length,weakPartnerHoldSeconds:weak.reduce((n,r)=>n+(r.followThrough.partnerRoleSeconds['transition-hold']??0),0),
  weakPartnerSetSeconds:weak.reduce((n,r)=>n+(r.followThrough.partnerRoleSeconds['doubles-set']??0),0),
  followThroughContacts:rows.filter(r=>r.followThrough.seconds>0).length,
  meanMaxFollowThroughDepthGap:mean(rows.filter(r=>r.followThrough.seconds>0).map(r=>r.followThrough.maxDepthGap))};
}

export function summarize(matches){
 if(matches.some(match=>match.summary))return mergeSummaries(matches.map(match=>match.summary??summarize([match])));
 const decisions=matches.flatMap(m=>m.decisions),depths=matches.flatMap(m=>m.depths),rallies=matches.flatMap(m=>m.rallies);
 const faults={},roleSeconds={},transitionRoleSeconds={};
 for(const match of matches){
  for(const [key,n] of Object.entries(match.stats.faults))count(faults,key,n);
  for(const [key,n] of Object.entries(match.roleSeconds))count(roleSeconds,key,n);
  for(const [key,n] of Object.entries(match.transitionRoleSeconds))count(transitionRoleSeconds,key,n);
 }
 const depthSummary=kind=>{
  const rows=depths.filter(r=>r.kind===kind),landed=rows.filter(r=>r.landing),receiverLandings=landed.filter(r=>r.landing.inCourt&&r.landing.receiverSide);
  const errors=landed.filter(r=>r.landing.depthError!==null).map(r=>r.landing.depthError);
  return {contacts:rows.length,landed:landed.length,unlanded:rows.length-landed.length,targetDepthCount:rows.filter(r=>r.targetDepth!==null).length,depthErrorCount:errors.length,
   meanTargetDepth:mean(rows.filter(r=>r.targetDepth!==null).map(r=>r.targetDepth)),meanFirstLandingDepth:mean(landed.map(r=>r.landing.depth)),
   meanSignedDepthError:mean(errors),meanAbsoluteDepthError:mean(errors.map(Math.abs)),
   inCourtReceiverLandingRate:rate(receiverLandings.length,rows.length),
   deepReceiverLandingRate:rate(receiverLandings.filter(r=>r.landing.depth<=9).length,rows.length),
   serviceBoxLandingRate:kind==='serve'?rate(landed.filter(r=>r.landing.inCourt&&r.landing.serviceBox&&!r.landing.netContact).length,rows.length):null};
 };
 const lengths=rallies.map(r=>r.shots).sort((a,b)=>a-b);
 const rallyHistogram={};for(const n of lengths)count(rallyHistogram,n);
 return {matches:matches.length,completed:matches.filter(m=>m.completed).length,faults,rallies:rallies.length,rallyHistogram,
  meanRallyShots:mean(lengths),medianRallyShots:lengths.length?lengths[Math.floor((lengths.length-1)/2)]:null,maxRallyShots:lengths.at(-1)??null,
  third:decisionSummary(decisions.filter(r=>r.ordinal===3)),fifth:decisionSummary(decisions.filter(r=>r.ordinal===5)),
  fifthTransition:decisionSummary(decisions.filter(r=>r.ordinal===5&&r.transition)),
  laterTransition:decisionSummary(decisions.filter(r=>r.ordinal>5&&r.transition)),
  serve:depthSummary('serve'),return:depthSummary('return'),roleSeconds,transitionRoleSeconds};
}

function mergeSummaries(rows){
 const sum=key=>rows.reduce((n,row)=>n+(row[key]??0),0);
 const maps=key=>{const result={};for(const row of rows)for(const [k,n] of Object.entries(row[key]??{}))count(result,k,n);return result};
 const weighted=(items,key,weight)=>{const valid=items.filter(row=>row[key]!==null&&row[key]!==undefined);const total=valid.reduce((n,row)=>n+(row[weight]??0),0);return total?valid.reduce((n,row)=>n+row[key]*row[weight],0)/total:null};
 const combine=(key,means)=>{
  const items=rows.map(row=>row[key]),result={};
  for(const field of Object.keys(items[0])){
   if(Object.hasOwn(means,field))result[field]=weighted(items,field,means[field]);
   else if(typeof items[0][field]==='object'&&items[0][field]!==null){result[field]={};for(const row of items)for(const [k,n] of Object.entries(row[field]))count(result[field],k,n)}
   else if(items.every(row=>row[field]===null))result[field]=null;
   else result[field]=items.reduce((n,row)=>n+(row[field]??0),0);
  }
  return result;
 };
 const rallyHistogram=maps('rallyHistogram'),rallies=sum('rallies');let median=null,cumulative=0;
 for(const [shots,n] of Object.entries(rallyHistogram).sort((a,b)=>Number(a[0])-Number(b[0]))){cumulative+=n;if(cumulative>Math.floor((rallies-1)/2)){median=Number(shots);break}}
 const result={matches:sum('matches'),completed:sum('completed'),faults:maps('faults'),rallies,rallyHistogram,
  meanRallyShots:weighted(rows,'meanRallyShots','rallies'),medianRallyShots:median,maxRallyShots:Math.max(...rows.map(row=>row.maxRallyShots??0)),
  roleSeconds:maps('roleSeconds'),transitionRoleSeconds:maps('transitionRoleSeconds')};
 for(const key of ['third','fifth','fifthTransition','laterTransition'])result[key]=combine(key,{pressureSoftRate:'pressureContacts',meanDifficulty:'contacts',mishitRate:'contacts',meanMaxFollowThroughDepthGap:'followThroughContacts'});
 for(const key of ['serve','return'])result[key]=combine(key,{meanTargetDepth:'targetDepthCount',meanFirstLandingDepth:'landed',meanSignedDepthError:'depthErrorCount',meanAbsoluteDepthError:'depthErrorCount',inCourtReceiverLandingRate:'contacts',deepReceiverLandingRate:'contacts',serviceBoxLandingRate:'contacts'});
 return result;
}

export function compactMatch(match,limit=12){
 if(!Number.isInteger(limit)||limit<0)throw new Error('Sample limit must be a nonnegative integer');
 const summary=match.summary??summarize([match]),counts={},truncated={},samples={};
 for(const key of ['decisions','depths','rallies']){
  const rows=match[key];counts[key]=match.counts?.[key]??rows.length;
  const n=Math.min(limit,rows.length);
  samples[key]=Array.from({length:n},(_,i)=>rows[n===1?0:Math.floor(i*(rows.length-1)/(n-1))]);
  truncated[key]=counts[key]-n;
 }
 const {decisions,depths,rallies,...metadata}=match;
 return {...metadata,summary,counts,truncated,...samples};
}

export function compactReport(report,limit=12){
 const summaries=Object.fromEntries(Object.entries(report.results).map(([label,matches])=>[label,{overall:summarize(matches),byLevel:Object.fromEntries(report.levels.map(level=>[level,summarize(matches.filter(m=>m.level===level))]))}]));
 return {...report,sampleLimitPerMatch:limit,sampling:'Evenly spaced observed event samples; summaries/counts use every event, including unsampled events.',summaries,
  results:Object.fromEntries(Object.entries(report.results).map(([label,matches])=>[label,matches.map(match=>compactMatch(match,limit))]))};
}

export function parseSeeds(value){
 const result=[];
 for(const group of value.split(',')){
  if(!/^\d+(?:-\d+)?$/.test(group))throw new Error('Seeds must be comma-separated integers or ascending ranges');
  const [start,end=start]=group.split('-').map(Number);
  if(start<1||end<start||end>10000)throw new Error('Seed range must be ascending and within 1–10000');
  for(let n=start;n<=end;n++)if(!result.includes(n))result.push(n);
 }
 return result;
}

function provenance(directory){
 const files=['core','game','tactics'].map(name=>`src/${name}.js`);
 const manifest=resolve(directory,'baseline-provenance.json');
 return {directory,...(existsSync(manifest)?{reconstruction:JSON.parse(readFileSync(manifest,'utf8'))}:{}),sha256:Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(resolve(directory,file))).digest('hex')]))};
}

export async function main(args=process.argv.slice(2)){
 const allowed=new Set(['--baseline','--seeds','--levels','--output','--max-seconds','--resume']),options={};
 for(let i=0;i<args.length;i+=2){if(!allowed.has(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Invalid option/value: ${args[i]}`);options[args[i]]=args[i+1]}
 const previous=options['--resume']?JSON.parse(readFileSync(resolve(options['--resume']),'utf8')):null;
 const seeds=parseSeeds(options['--seeds']??previous?.seeds.join(',')??'1-8'),levels=(options['--levels']??previous?.levels.join(',')??'beginner,intermediate,demo,advanced').split(',');
 const current=await loadEngine(),engines={current};
 if(options['--baseline'])engines.baseline=await loadEngine(resolve(options['--baseline']));
 const maxSeconds=Number(options['--max-seconds']??1200),results=Object.fromEntries(Object.keys(engines).map(key=>[key,[]]));
 const sources={current:provenance(root)};
 if(engines.baseline)sources.baseline=provenance(resolve(options['--baseline']));
 if(previous)for(const [label,source] of Object.entries(sources)){
  if(JSON.stringify(source.sha256)!==JSON.stringify(previous.sources[label]?.sha256))throw new Error(`Cannot resume: ${label} source hashes differ`);
 }
 const resumeCounts={reusedCompleted:0,rerunIncomplete:0};
 for(const level of levels){
  if(!Object.hasOwn(current.roster.SKILL_LEVELS,level))throw new Error(`Unknown level ${level}`);
  for(const seed of seeds){
   // Identical current-roster profiles on both engines; lineup RNG is separate from match RNG.
   const lineup=current.roster.levelLineup(level,current.competition.seededRandom(seed));
   for(const [label,engine] of Object.entries(engines)){
    const old=previous?.results[label]?.find(row=>row.seed===seed&&row.level===level);
    const reused=!!old?.completed;
    const match=reused?old:runMatch(engine,{seed,level,maxSeconds,lineup});results[label].push(match);
    if(reused)resumeCounts.reusedCompleted++;else if(old)resumeCounts.rerunIncomplete++;
    console.log(JSON.stringify({engine:label,level,seed,reused,completed:match.completed,points:match.points,seconds:match.simulatedSeconds,rallies:match.summary?.rallies??match.rallies.length}));
   }
  }
 }
 for(const [label,source] of Object.entries(sources)){
  const after=provenance(source.directory);if(JSON.stringify(source.sha256)!==JSON.stringify(after.sha256))throw new Error(`${label} engine source changed during run; discard comparison`);
 }
 const summaries=Object.fromEntries(Object.entries(results).map(([label,matches])=>[label,{overall:summarize(matches),byLevel:Object.fromEntries(levels.map(level=>[level,summarize(matches.filter(m=>m.level===level))]))}]));
 const pairs=results.baseline?results.current.map((after,i)=>{
  const before=results.baseline[i];return {seed:after.seed,level:after.level,completed:before.completed&&after.completed,
   beforePoints:before.points,afterPoints:after.points,beforeRallies:before.summary?.rallies??before.rallies.length,afterRallies:after.summary?.rallies??after.rallies.length,
   beforeMeanRallyShots:before.summary?.meanRallyShots??mean(before.rallies.map(r=>r.shots)),afterMeanRallyShots:after.summary?.meanRallyShots??mean(after.rallies.map(r=>r.shots))};
 }):[];
 const report={schemaVersion:1,seeds,levels,maxSimulatedSecondsPerMatch:maxSeconds,sources,
  ...(previous?{resume:{from:resolve(options['--resume']),...resumeCounts}}:{}),
  methodology:{scope:'Seeded CPU watch doubles, identical profiles and alternating starting service. Aggregate integration comparison, not isolated causal evidence or human-play evidence.',
   decisions:'Observed accepted hit events on serving-side third/fifth/later odd contacts, not tentative chooseCpuShot calls. Shot is the final selected stroke (overhead/ATP/Erne included).',
   readiness:'Reconstructed pre-hit context uses current caller thresholds for both engines; baseline did not necessarily consume these fields. transition means shots>=4, serving team, either teammate outside near-kitchen threshold.',
   depth:'Feet from opponent baseline (team 0: y, team 1: 44-y). First emitted bounce only, including out/wrong-side/net landings. No extrapolated landings; missing bounces retain a status. Deep zone <=9 feet, denominator all serves/returns.',
   roles:'Live tacticalRole integrated every fixed tick during rally; followThrough ends at next contact or rally end. Weak means quality<.8 or chosen-shot contact difficulty>.7.',
   limits:`${maxSeconds/60} simulated minutes per match; resumed reports reuse completed matches and restart incomplete matches from their seeds. Replay recording disabled, no engine source edits or additional random draws. Paired seeds diverge after decisions change; samples and within-rally contacts are correlated.`},summaries,pairs,results};
 const compact=compactReport(report);
 const output=resolve(options['--output']??'validation/combined-transitions.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(compact)+'\n');
 console.log(JSON.stringify({output,completed:Object.fromEntries(Object.entries(results).map(([key,matches])=>[key,`${matches.filter(m=>m.completed).length}/${matches.length}`]))}));
 if(Object.values(results).some(matches=>matches.some(m=>!m.completed)))process.exitCode=1;
 return compact;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
