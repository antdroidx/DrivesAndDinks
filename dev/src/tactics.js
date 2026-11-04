import {C,stepBall,side,move} from './core.js?v=130';
import {kitchenContact} from './player-feet.js?v=130';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const lane=p=>p.coverLane??p.lane??(p.x<10?5:15);
const kitchen=team=>team===0?30:14;

export function volleyBrakeTarget(player,target){
 const towardNet=Math.max(0,(player.vy||0)*(player.team===0?-1:1));
 const stamina=clamp(player.stamina??1,0,1),acceleration=(player.abilities?.acceleration??C.accel)*(.78+.22*stamina);
 // Use conservative reversal braking from move(), with clearance for a shoe sole.
 const braking=towardNet*towardNet/(2*acceleration*1.5*.62*.85);
 const safeY=player.team===0?29.85+braking:14.15-braking;
 return {...target,x:player.volleyMomentum&&towardNet>.8?player.x:target.x,y:player.team===0?Math.max(target.y,safeY):Math.min(target.y,safeY)};
}

export function safeVolleyRecovery(player,swingDuration=.36){
 const p={...player,stamina:Math.max(0,(player.stamina??1)-.075/Math.max(.65,player.abilities?.endurance??1)),swing:swingDuration,volleyMomentum:true};
 for(let tick=0;tick<120;tick++){
   p.swing=Math.max(0,p.swing-C.dt);p.airborneTimer=Math.max(0,(p.airborneTimer||0)-C.dt);
   const target=volleyBrakeTarget(p,{x:p.x,y:kitchen(p.team)});
   move(p,target.x,target.y,C.dt);
   if(kitchenContact(p))return false;
   const towardNet=(p.vy||0)*(p.team===0?-1:1);
   if(towardNet<=.05&&!p.airborneTimer&&p.swing<=swingDuration*.45)return true;
 }
 return false;
}

// Run a private copy through the live movement integrator. Planning must respect
// momentum, reaction delay, stroke recovery, body abilities and current stamina.
export function forecastMovement(player,target,time){
  const p={...player,vx:player.vx||0,vy:player.vy||0};
  let remaining=time;
  while(remaining>1e-9){
    const dt=Math.min(C.dt,remaining);remaining-=dt;
    for(const key of ['reactionWait','recoveryTimer','splitStepTimer','swing'])p[key]=Math.max(0,(p[key]||0)-dt);
    move(p,p.reactionWait>0?p.x:target.x,p.reactionWait>0?p.y:target.y,dt);
  }
  return p;
}

export function chooseCpuPlacement(player,opponents,shot){
  const soft=shot==='dink'||shot==='drop',near=player.team===0;
  const depth=shot==='dink'?14:shot==='drop'?12:shot==='slice'?6:4;
  const candidates=[3,7,10,13,17].map(x=>({x,y:near?depth:44-depth,intent:'open-court'}));
  if(['drive','overhead','dink'].includes(shot))for(const opponent of opponents){
    const y=near?clamp(opponent.y+.6,4,17):clamp(opponent.y-.6,27,40);
    if(!soft||Math.abs(y-(near?14:30))<2)candidates.push({x:clamp(opponent.x,3,17),y,intent:'feet'});
  }
  const anticipation=clamp((player.abilities?.courtIQ??1)-.55,0,.7);
  const value=target=>Math.min(...opponents.map(o=>{
    const horizon=soft?.55:.3,px=clamp(o.x+(o.vx||0)*horizon*anticipation,-3,23),py=o.y+(o.vy||0)*horizon*anticipation;
    let gap=Math.hypot(target.x-px,(target.y-py)*.65);
    const fraction=(py-player.y)/(target.y-player.y);
    if(!soft&&fraction>0&&fraction<1){
      const crossingX=player.x+(target.x-player.x)*fraction;
      gap=Math.min(gap,Math.abs(crossingX-px)+1.5);
    }
    const reversal=(target.x-o.x)*(o.vx||0)<0?Math.min(1.4,Math.abs(o.vx||0)*.16)*anticipation:0;
    const style=player.ratingStyle??'balanced',feet=target.intent==='feet'&&Math.abs(target.x-o.x)<1.5?(style==='net'?2.2:style==='banger'?1.9:1.6):0;
    const crossCourt=style==='soft'?Math.abs(target.x-player.x)*.035:0;
    const backhand=(target.x-o.x)*(o.team===0?1:-1)<0&&anticipation>.3?.2:0;
    return (gap+reversal*(style==='speed'?1.4:1)+feet+crossCourt+backhand)/Math.max(.7,(o.abilities?.speed??C.speed)/C.speed);
  }));
  return candidates.reduce((best,target)=>value(target)>value(best)?target:best,candidates[0]);
}

// Forecast reachable contacts, including the first bounce, on the same fixed-step physics.
function contacts(players,team,ball,shots,bounces){
  const future={...ball},found=new Map();let count=bounces;
  for(let tick=1;tick<=216;tick++){
    const event=stepBall(future,C.dt);if(event==='net')continue;
    if(event==='bounce'){count++;if(count>=2||future.x<0||future.x>20||future.y<0||future.y>44)break}
    if(tick%4||side(future.y)!==team||(shots<=2&&count===0))continue;
    for(const p of players){
      if(found.has(p.id)||future.z>7.4*(p.physique?.heightScale??1))continue;
      const y=count===0?volleyBrakeTarget(p,future).y:future.y;
      if(Math.abs(future.y-y)>1.6)continue;
      if(count>0&&future.vz>3&&future.z<1.35)continue;
      if(future.z>3.4&&(future.z<5.2*(p.physique?.heightScale??1)||future.vz>0))continue;
      const target={x:clamp(future.x,-3,23),y:clamp(y,team===0?23:-3,team===0?47:21)};
      const travel=Math.hypot(target.x-p.x,target.y-p.y),time=tick*C.dt;
      const reach=1.3*(p.abilities?.reach??1),speed=p.abilities?.speed??C.speed;
      if(travel>time*Math.max(speed,Math.hypot(p.vx||0,p.vy||0))+reach)continue;
      const projected=forecastMovement(p,target,time);
      if(Math.hypot(target.x-projected.x,target.y-projected.y)<=reach)found.set(p.id,{...target,z:future.z,time,bounces:count});
    }
    if(found.size===players.length)break;
  }
  return found;
}

export function planIncoming({players,team,ball,shots,bounces,serveReceiver,clock=0}){
  const pair=players.filter(p=>p.team===team),flight={...ball};
  const landingTime=Math.max(0,(flight.vz+Math.sqrt(Math.max(0,flight.vz**2+2*C.gravity*flight.z)))/C.gravity);
  const landing={x:clamp(flight.x+flight.vx*landingTime,1,19),y:clamp(flight.y+flight.vy*landingTime,team===0?23:-3,team===0?47:21)};
  const owner=shots===1?serveReceiver:pair.reduce((a,b)=>Math.abs(lane(a)-landing.x)<=Math.abs(lane(b)-landing.x)?a:b);
  const available=contacts(pair,team,ball,shots,bounces);
  let selected=owner,point=available.get(owner.id),poach=false;
  if(shots>2&&pair.length>1){
    const partner=pair.find(p=>p!==owner),chance=available.get(partner.id);
    const iq=partner.abilities?.courtIQ??1,volley=partner.abilities?.volley??1,aggression=partner.playstyle?.aggression??partner.abilities?.aggression??.7;
    const initiative=iq*.4+volley*.35+aggression*.25;
    const nearLine=team===0?partner.y<=34:partner.y>=10;
    const earlier=chance&&(!point||chance.time+Math.max(.03,.3-initiative*.24)<point.time);const middleAttack=chance&&chance.x>=7&&chance.x<=13&&(!point||chance.time<=point.time+.1)&&(partner.abilities?.courtIQ??1)>=.9;
    if(initiative>=.72&&iq>=.75&&volley>=.75&&chance&&chance.bounces===0&&(earlier||middleAttack)&&nearLine&&chance.x>=5&&chance.x<=15&&Math.abs(chance.x-partner.x)<6){
      selected=partner;point=chance;poach=true;
      }else if(!point&&chance){selected=partner;point=chance}
  }
  // A locked owner prevents both teammates chasing a continually changing nearest-ball estimate.
  return {shot:shots,receiverId:selected.id,point:point||landing,poach,created:clock,expires:clock+(point?.time??.65)+.2};
}

export function formationTarget(p,{ball,incoming,receiverId,point,shots,servingTeam,lastShot,lastHitter,singles=false,players=[]}){
  const home=lane(p),team=p.team;
  if(p.id===receiverId&&team===incoming)return {x:point.x,y:point.y,role:'receive'};
  if(singles){
   if(shots<=2&&team===servingTeam)return {x:10,y:team===0?41:3,role:'hold'};
   const x=clamp(10+(ball.x-10)*.25,5,15),deep=lastShot==='lob';
   const baseline=team===0?p.y>35:p.y<9,stayDeep=deep||baseline&&lastShot==='drive';
   return {x,y:team===0?(stayDeep?39:shots<=2?35:32):(stayDeep?5:shots<=2?9:12),role:'singles-recover'};
  }
  // Hold the serve formations through the mandatory bounce sequence.
  if(shots<=2&&team===servingTeam)return {x:home,y:team===0?41:3,role:'hold'};
  if(shots===1)return {x:home,y:kitchen(team),role:'hold'};
  const intelligence=Math.max(.5,Math.min(1.3,p.abilities?.courtIQ??1));
  const shade=clamp((ball.x-10)*.28*intelligence,-2.4,2.4);
  let x=clamp(home+shade,1.3,18.7),y=kitchen(team),role='shade';
  if(team===incoming){
    // Cover the opening beside a wide receiver rather than following them to the sideline.
    if(point.x<4||point.x>16){x=home<10?7:13;role='cover-middle'}
    if(lastShot==='lob'){y=team===0?clamp(point.y-4,33,39):clamp(point.y+4,5,11);role='lob-cover'}
  }else{
    if(lastShot==='drive'){
      y=team===0?Math.max(30,p.y-4):Math.min(14,p.y+4);
      if(p.id!==lastHitter){x=home<10?7.4:12.6;role='pinch-middle'}
    }
    const partner=players.find(other=>other.team===team&&other.id!==p.id);
    // Advance together behind a soft approach instead of stranding one player
    // alone at the kitchen before the drop has brought their partner forward.
    if(lastShot==='drop'&&partner){
      y=team===0?Math.max(y,partner.y-3):Math.min(y,partner.y+3);
      role='approach-together';
    }
  }
  return {x,y,role};
}

export function separateTargets(entries,team,receiverId){
  const pair=entries.filter(entry=>entry.player.team===team);if(pair.length<2)return;
  const [a,b]=pair,support=a.player.id===receiverId?b:a,active=support===a?b:a;
  // Reserve the hitter's destination and the approach segment before overlap.
  const start=active.player,end=active.target,dx=end.x-start.x,dy=end.y-start.y;
  const t=clamp(((support.target.x-start.x)*dx+(support.target.y-start.y)*dy)/(dx*dx+dy*dy||1),0,1);
  const closest={x:start.x+dx*t,y:start.y+dy*t};
  const gap=Math.hypot(support.target.x-closest.x,support.target.y-closest.y);
  if(gap<3.6){
    const direction=lane(support.player)<lane(active.player)?-1:1;
    support.target.x=clamp(closest.x+direction*3.6,.5,19.5);
    support.target.y=clamp(closest.y+(team===0?1.6:-1.6),team===0?23:0,team===0?47:21);
    support.target.role='yield-contact';
  }
}

export function separatePartners(players,team,receiverId){
  const pair=players.filter(p=>p.team===team),[a,b]=pair;
  const distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>=2.3)return;
  const support=a.id===receiverId?b:a,active=support===a?b:a;
  const direction=(support.x-active.x)||((lane(support)<lane(active))?-1:1);
  const push=Math.min(.18,(2.3-distance)*.18);
  support.x=clamp(support.x+Math.sign(direction)*push,.5,19.5);
  // Support gives way away from the net, keeping the hitter's feet/contact stable.
  support.y=clamp(support.y+(team===0?push:-push),team===0?23:0,team===0?44:21);
}
