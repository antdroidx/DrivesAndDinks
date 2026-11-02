import {C,stepBall,side} from './core.js?v=75';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const lane=p=>p.coverLane??p.lane??(p.x<10?5:15);
const kitchen=team=>team===0?30:14;

// Forecast reachable contacts, including the first bounce, on the same fixed-step physics.
function contacts(players,team,ball,shots,bounces){
  const future={...ball},found=new Map();let count=bounces;
  for(let tick=1;tick<=216;tick++){
    const event=stepBall(future,C.dt);if(event==='net')break;
    if(event==='bounce'){count++;if(count>=2||future.x<0||future.x>20||future.y<0||future.y>44)break}
    if(tick%4||side(future.y)!==team||future.z>7.4||(shots<=2&&count===0))continue;
    for(const p of players){
      if(found.has(p.id))continue;
      const y=count===0?(team===0?Math.max(29.6,future.y):Math.min(14.4,future.y)):future.y;
      if(Math.abs(future.y-y)>1.6)continue;
      if(future.z>3.4&&(future.z<5.2||future.vz>0))continue;
      const target={x:clamp(future.x,1,19),y:clamp(y,team===0?23:1,team===0?43:21)};
      const travel=Math.hypot(target.x-p.x,target.y-p.y),time=tick*C.dt;
      const reach=1.3*(p.abilities?.reach??1),speed=(p.abilities?.speed??12)*.8;
      if(travel<=Math.max(0,time-(p.reactionWait||0))*speed+reach)found.set(p.id,{...target,z:future.z,time,bounces:count});
    }
    if(found.size===players.length)break;
  }
  return found;
}

export function planIncoming({players,team,ball,shots,bounces,serveReceiver,clock=0}){
  const pair=players.filter(p=>p.team===team),flight={...ball};
  const landingTime=Math.max(0,(flight.vz+Math.sqrt(Math.max(0,flight.vz**2+2*C.gravity*flight.z)))/C.gravity);
  const landing={x:clamp(flight.x+flight.vx*landingTime,1,19),y:clamp(flight.y+flight.vy*landingTime,team===0?23:1,team===0?43:21)};
  const owner=shots===1?serveReceiver:pair.reduce((a,b)=>Math.abs(lane(a)-landing.x)<=Math.abs(lane(b)-landing.x)?a:b);
  const available=contacts(pair,team,ball,shots,bounces);
  let selected=owner,point=available.get(owner.id),poach=false;
  if(shots>2){
    const partner=pair.find(p=>p!==owner),chance=available.get(partner.id);
    const nearLine=team===0?partner.y<=34:partner.y>=10;
    const earlier=chance&&(!point||chance.time+.08<point.time);const middleAttack=chance&&chance.x>=7&&chance.x<=13&&(!point||chance.time<=point.time+.1)&&(shots+partner.id)%3===0;
    if(chance&&chance.bounces===0&&(earlier||middleAttack)&&nearLine&&chance.x>=5&&chance.x<=15&&Math.abs(chance.x-partner.x)<6){
      selected=partner;point=chance;poach=true;
    }else if(!point&&chance){selected=partner;point=chance}
  }
  // A locked owner prevents both teammates chasing a continually changing nearest-ball estimate.
  return {shot:shots,receiverId:selected.id,point:point||landing,poach,created:clock,expires:clock+(point?.time??.65)+.2};
}

export function formationTarget(p,{ball,incoming,receiverId,point,shots,servingTeam,lastShot,lastHitter}){
  const home=lane(p),team=p.team;
  if(p.id===receiverId&&team===incoming)return {x:point.x,y:point.y,role:'receive'};
  // Hold the serve formations through the mandatory bounce sequence.
  if(shots<=2&&team===servingTeam)return {x:home,y:team===0?41:3,role:'hold'};
  if(shots===1)return {x:home,y:kitchen(team),role:'hold'};
  const shade=clamp((ball.x-10)*.28,-2.4,2.4);
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
  }
  return {x,y,role};
}

export function separateTargets(entries,team,receiverId){
  const pair=entries.filter(entry=>entry.player.team===team);if(pair.length<2)return;
  const [a,b]=pair,support=a.player.id===receiverId?b:a,active=support===a?b:a;
  const distance=Math.hypot(support.player.x-active.player.x,support.player.y-active.player.y);if(distance>=2.3)return;
  const direction=(support.player.x-active.player.x)||((lane(support.player)<lane(active.player))?-1:1),push=Math.min(1.1,(2.3-distance)*.42);
  support.target.x=clamp(support.target.x+Math.sign(direction)*push,.5,19.5);
  support.target.y=clamp(support.target.y+(team===0?push:-push),team===0?23:0,team===0?44:21);
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
