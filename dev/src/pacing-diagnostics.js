import {C,stepBall,netHeightAt,netCrossingX,inBounds,side} from './core.js?v=155';

const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]:null};
const count=(object,key,value=1)=>{object[key]=(object[key]??0)+value};

function netMargin(ball,core){
 let probe={...ball};
 for(let tick=0;tick<720;tick++){
  const beforeY=probe.y,beforeX=probe.x,beforeZ=probe.z;
  const event=stepBall(probe,core.C.dt);
  if(event==='net')return 0;
  if((beforeY-core.C.net)*(probe.y-core.C.net)<=0&&beforeY!==probe.y){
   const f=(core.C.net-beforeY)/(probe.y-beforeY);
   const x=beforeX+(probe.x-beforeX)*f,z=beforeZ+(probe.z-beforeZ)*f;
   return z-(core.netHeightAt??netHeightAt)(x);
  }
  if(event==='bounce'||!inBounds(probe.x,probe.y))return null;
 }
 return null;
}

function movementState(player,core){
 const speed=Math.hypot(player.vx||0,player.vy||0);
 return speed<.7?'ready':speed<(player.abilities?.speed??core.C.speed)*.55?'settling':'moving';
}

function shotDistance(player,placement){
 if(!placement||!Number.isFinite(placement.x)||!Number.isFinite(placement.y))return null;
 return Math.hypot(placement.x-player.x,placement.y-player.y);
}

export function createPacingDiagnostics(game,core){
 const data={completed:false,rallyRows:[],hitRows:[],kitchenSeconds:0,bothTeamsKitchenSeconds:0,transitionSeconds:0};
 let activeRally=null,lastHit=null;
 const hit=game.hit.bind(game),fault=game.fault.bind(game),release=game.releaseServe.bind(game);
 game.hit=(player,shot,aim,quality=1,placement=null)=>{
  const before={x:player.x,y:player.y,vx:player.vx||0,vy:player.vy||0,stamina:player.stamina??1};
  const result=hit(player,shot,aim,quality,placement);
  if(!result)return result;
  const row={time:game.clock,shot,shotNumber:game.shots+1,playerId:player.id,team:player.team,quality,difficulty:player.contactDifficulty??null,
   intent:player.placementIntent??placement?.intent??'manual',distance:shotDistance(player,player.lastShotPlacement??placement),movement:movementState(player,core),
   transition:game.format==='doubles'&&player.team===game.score.team&&game.shots>=4&&game.players.some(other=>other.team===player.team&&(other.team===0?other.y>33:other.y<11)),
   netMargin:netMargin(game.ball,core),position:{x:before.x,y:before.y},speed:Math.hypot(before.vx,before.vy),stamina:before.stamina};
  data.hitRows.push(row);lastHit=row;activeRally?.hits.push(row);
  return result;
 };
 game.fault=(team,reason,player=null)=>{
  if(game.practice||game.phase==='pause'||game.phase==='over')return fault(team,reason,player);
  const result=fault(team,reason,player),hits=activeRally?.hits??[];
  data.rallyRows.push({time:game.clock,duration:game.clock-(activeRally?.startedAt??game.clock),shots:game.shots,reason,winner:1-team,
   faultTeam:team,faultPlayerId:player?.id??null,lastHit:lastHit?{...lastHit}:null,shotsByType:hits.reduce((out,hit)=>{count(out,hit.shot);return out},{})});
  activeRally=null;lastHit=null;
  return result;
 };
 game.releaseServe=(...args)=>{
  const result=release(...args);
  if(!game.practice)activeRally={startedAt:game.clock,hits:[]};
  return result;
 };
 return {
  data,
  sample(dt){
   if(game.practice||game.phase!=='rally')return;
   const near=p=>p.team===0?p.y<33:p.y>11;
   if(game.players.some(near))data.kitchenSeconds+=dt;
   if(game.format==='doubles'&&game.players.some(p=>p.team===0&&near(p))&&game.players.some(p=>p.team===1&&near(p)))data.bothTeamsKitchenSeconds+=dt;
   if(game.format==='doubles'&&game.score.team===game.last&&game.shots>=4)data.transitionSeconds+=dt;
  },
  finish(){
   data.completed=game.score.winner!==null;
   if(activeRally)data.rallyRows.push({time:game.clock,duration:game.clock-activeRally.startedAt,shots:game.shots,reason:'simulation-cap',winner:null,faultTeam:null,faultPlayerId:null,lastHit:lastHit?{...lastHit}:null,shotsByType:(activeRally.hits??[]).reduce((out,hit)=>{count(out,hit.shot);return out},{})});
   activeRally=null;lastHit=null;
   return summarizePacing(data);
  }
 };
}

export function summarizePacing(data){
 const rallies=data.rallyRows??[],hits=data.hitRows??[];
 const durations=rallies.map(row=>row.duration).filter(Number.isFinite),shots=rallies.map(row=>row.shots).filter(Number.isFinite);
 const shotsByType={},qualityByType={},faultsByShot={},faultsByReason={},transitionByShot={};
 for(const hit of hits){
  count(shotsByType,hit.shot);
  const quality=qualityByType[hit.shot]??={contacts:0,meanQuality:null,qualities:[],meanDifficulty:null,difficulties:[],netMargins:[]};
  quality.contacts++;quality.qualities.push(hit.quality??1);if(Number.isFinite(hit.difficulty))quality.difficulties.push(hit.difficulty);if(Number.isFinite(hit.netMargin))quality.netMargins.push(hit.netMargin);
  if(hit.transition)count(transitionByShot,hit.shot);
 }
 for(const row of Object.values(qualityByType)){
  row.meanQuality=mean(row.qualities);row.meanDifficulty=mean(row.difficulties);row.meanNetMargin=mean(row.netMargins);
  delete row.qualities;delete row.difficulties;delete row.netMargins;
 }
 for(const rally of rallies){
  count(faultsByReason,rally.reason??'unknown');
  const shot=rally.lastHit?.shot??'no-contact';count(faultsByShot,`${rally.reason??'unknown'} / ${shot}`);
 }
 return {
  matches:1,
  completed:Boolean(data.completed),
  rallyCount:rallies.length,
  rallyDurations:{mean:mean(durations),median:percentile(durations,.5),p95:percentile(durations,.95),max:durations.length?Math.max(...durations):null},
  rallyShots:{mean:mean(shots),median:percentile(shots,.5),p95:percentile(shots,.95),max:shots.length?Math.max(...shots):0},
  shotsByType,qualityByType,faultsByReason,faultsByShot,transitionByShot,
  kitchenSeconds:data.kitchenSeconds,bothTeamsKitchenSeconds:data.bothTeamsKitchenSeconds,transitionSeconds:data.transitionSeconds
 };
}
