// Persistent career inbox and deterministic news digest.
//
// News generation reads durable state changes. Delivery is separate: every
// message has a stable key, so the same match, injury or invitation cannot
// appear twice after a reload or an overlapping weekly update.

import {activeInjuries} from './injuries.js?v=216';
import {pendingInvitations} from './invitations.js?v=216';
import {generateSeasonCatalog} from './equipment.js?v=216';

export const INBOX_VERSION=1;
export const INBOX_LIMIT=160;
export const INBOX_CATEGORIES=Object.freeze(['match','injury','team','invitation','career','world','equipment']);

export function emptyInbox(){
  return {version:INBOX_VERSION,items:[],lastSyncedWeek:null,preferences:{archived:false}};
}

export function normalizeInbox(value){
  if(!value||typeof value!=='object')return emptyInbox();
  const items=Array.isArray(value.items)?value.items
    .filter(item=>item&&typeof item.key==='string'&&typeof item.title==='string')
    .slice(-INBOX_LIMIT):[];
  return {
    version:INBOX_VERSION,
    items,
    lastSyncedWeek:Number.isFinite(value.lastSyncedWeek)?value.lastSyncedWeek:null,
    preferences:value.preferences&&typeof value.preferences==='object'?{archived:Boolean(value.preferences.archived)}:{archived:false}
  };
}

export function deliverMessage(state,message){
  const inbox=normalizeInbox(state?.inbox);
  const normalized={
    key:String(message.key),category:INBOX_CATEGORIES.includes(message.category)?message.category:'career',
    week:Number.isFinite(message.week)?message.week:state?.week??0,
    title:String(message.title??'Career update'),body:String(message.body??''),
    read:Boolean(message.read),archived:Boolean(message.archived),
    action:message.action??null,createdAt:message.createdAt??new Date().toISOString()
  };
  if(inbox.items.some(item=>item.key===normalized.key))return {ok:true,state,message:normalized,duplicate:true};
  return {
    ok:true,
    state:{...state,inbox:{...inbox,items:[...inbox.items,normalized].slice(-INBOX_LIMIT)}},
    message:normalized,duplicate:false
  };
}

function factsFor(state){
  const facts=[];
  const result=state.lastMatchResult;
  if(result){
    const playerNames=team=>team?.players?.map(player=>player.name).join(' & ')??team?.label??'';
    const winner=result.winnerTeam??(result.won?result.yourTeam:result.opponentTeam);
    const loser=result.loserTeam??(result.won?result.opponentTeam:result.yourTeam);
    const winnerNames=playerNames(winner)||(result.won?'Your team':'Opponent');
    const loserNames=playerNames(loser)||(result.won?'Opponent':'Your team');
    const before=Number(result.ratingBefore??result.rating);
    const after=Number(result.rating);
    const reliability=result.reliabilityBefore&&result.reliabilityAfter
      ?` Reliability ${result.reliabilityBefore.percent}% → ${result.reliabilityAfter.percent}%.`
      :'';
    const changes=[...(winner?.players??[]),...(loser?.players??[])]
      .map(player=>`${player.name} ${Number(player.previousRating).toFixed(3)} → ${Number(player.rating).toFixed(3)}`)
      .join(' · ');
    facts.push({
      key:`match:${result.matchId??`${result.week}:${result.eventId}:${result.bracket}:${result.format}:${result.score}`}`,
      category:'match',week:result.week,title:`${result.won?'WIN':'LOSS'} · ${winnerNames} ${result.score} ${loserNames}`,
      body:`${result.label} · ${result.bracket} ${result.format}. Winner: ${winnerNames}. Loser: ${loserNames}. Your rating ${before.toFixed(3)} → ${after.toFixed(3)} (${result.delta>=0?'+':''}${Number(result.delta).toFixed(3)}).${reliability}${changes?` Ratings: ${changes}.`:''} ${result.tournamentStatus??''}`,
      action:{type:'view',view:'home'}
    });
  }
  for(const injury of activeInjuries(state)){
    facts.push({
      key:`injury:${injury.id}`,category:'injury',week:injury.startWeek,
      title:`${injury.severityLabel} · ${injury.areaLabel}`,
      body:`Injury from ${injury.cause}. You are expected to be available ${injury.returnLabel}.`,
      action:{type:'view',view:'home'}
    });
  }
  for(const invitation of pendingInvitations(state)){
    facts.push({
      key:`invite:${invitation.id}`,category:'invitation',week:invitation.createdWeek,
      title:invitation.kind==='team'?'MLP roster invitation':`${invitation.from?.name??'A player'} invited you to partner`,
      body:`${invitation.context||invitation.format}. Expires after week ${invitation.expiresWeek+1}.`,
      action:{type:'invitation',invitationId:invitation.id,view:'team'}
    });
  }
  for(const story of state.cpuWorld?.stories??[]){
    if(story.week!==state.week)continue;
    const labels={injury:'Injury',recovery:'Recovery','pro-invite':'Pro invitation',retirement:'Retirement',promotion:'Promotion',demotion:'Demotion',entrant:'New competitor'};
    facts.push({
      key:`cpu:${story.type}:${story.id}:${story.week}`,category:'world',week:story.week,
      title:`${labels[story.type]??'World update'} · ${story.name}`,
      body:story.type==='retirement'?`${story.name} retired at age ${story.age}.`:story.type==='entrant'?`${story.name} entered the regional circuit at age ${story.age}.`:`${story.name} reached a new career milestone at age ${story.age}.`,
      action:{type:'view',view:'players'}
    });
  }
  const draft=state.teamCareer?.draftHistory?.at(-1);
  if(draft?.week===state.week){
    facts.push({
      key:`draft:${draft.week}`,category:'team',week:draft.week,
      title:`Annual MLP draft complete · ${draft.picks.length} picks`,
      body:`${draft.picks.slice(0,4).map(pick=>`${pick.team} selected ${pick.player}`).join('. ')}${draft.picks.length>4?'. More picks recorded.':'.'}`,
      action:{type:'view',view:'team'}
    });
  }
  const season=state.teamCareer?.seasons?.at(-1);
  if(season?.champion){
    facts.push({
      key:`season:${season.id}:complete`,category:'team',week:season.startWeek+season.duration-1,
      title:`${season.champion.name} won the MLP season`,
      body:`The ${season.duration}-week CPU-managed season is complete.`,
      action:{type:'view',view:'team'}
    });
  }
  for(const product of generateSeasonCatalog(state.seed,state.week,{contract:state.contract})){
    if(product.releaseWeek!==state.week&&product.discontinueWeek!==state.week)continue;
    const discontinued=product.discontinueWeek===state.week;
    facts.push({
      key:`equipment:${product.id}:${discontinued?'retired':'release'}`,category:'equipment',week:state.week,
      title:`${product.label} ${discontinued?'discontinued':'released'}`,
      body:`${product.description} $${product.price}. ${discontinued?'It moves to the legacy catalog.':'Now available from the equipment shop.'}`,
      action:{type:'view',view:'home'}
    });
  }
  if(state.contract&&state.contract!=='none'){
    facts.push({
      key:`contract:${state.contract}:${state.contractSince}`,
      category:'career',week:state.contractSince??state.week,
      title:`${state.contract[0].toUpperCase()+state.contract.slice(1)} contract active`,
      body:'Your contract level is visible in Path to Pro, along with rating and tour-point requirements.',
      action:{type:'view',view:'home'}
    });
  }
  return facts;
}

export function syncInbox(state){
  let next=state;
  for(const fact of factsFor(state)){
    const delivered=deliverMessage(next,{...fact,read:false,archived:false});
    if(delivered.duplicate)continue;
    next=delivered.state;
  }
  const inbox=normalizeInbox(next.inbox);
  return {...next,inbox:{...inbox,lastSyncedWeek:state.week}};
}

export function inboxMessages(state,{category='',query='',archived=false,limit=120}={}){
  const needle=String(query??'').trim().toLowerCase();
  return normalizeInbox(state?.inbox).items
    .filter(item=>item.archived===archived)
    .filter(item=>!category||item.category===category)
    .filter(item=>!needle||item.title.toLowerCase().includes(needle)||item.body.toLowerCase().includes(needle))
    .sort((a,b)=>b.week-a.week||b.createdAt.localeCompare(a.createdAt))
    .slice(0,limit);
}

export function unreadCount(state){
  return normalizeInbox(state?.inbox).items.filter(item=>!item.read&&!item.archived).length;
}

function updateMessage(state,key,patch){
  const inbox=normalizeInbox(state?.inbox);
  return {...state,inbox:{...inbox,items:inbox.items.map(item=>item.key===key?{...item,...patch}:item)}};
}

export function markMessageRead(state,key){
  return updateMessage(state,key,{read:true});
}

export function archiveMessage(state,key){
  return updateMessage(state,key,{archived:true,read:true});
}

export function validateInbox(state){
  const value=state?.inbox;
  if(!value||typeof value!=='object')return {ok:false,reason:'Inbox state is missing'};
  if(value.version!==INBOX_VERSION)return {ok:false,reason:'Inbox version is invalid'};
  if(!Array.isArray(value.items))return {ok:false,reason:'Inbox messages are invalid'};
  for(const item of value.items){
    if(typeof item.key!=='string'||typeof item.title!=='string')return {ok:false,reason:'Inbox message is invalid'};
    if(!INBOX_CATEGORIES.includes(item.category))return {ok:false,reason:'Inbox category is invalid'};
  }
  return {ok:true};
}