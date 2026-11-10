// Persistent team and partner invitations.

import {seededRandom} from '../competition.js?v=196';
import {mixSeed} from './population.js?v=196';
import {partnerCandidates,partnerSnapshot,resolvePartner} from './club-life.js?v=196';
import {joinFranchise} from './team-league.js?v=196';

export const INVITATIONS_VERSION=1;
export const INVITATION_LIMIT=24;
export const INVITATION_TTL=4;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const activeStatus=status=>status==='pending';
export function emptyInvitations(){return {version:INVITATIONS_VERSION,items:[],history:[],relationships:{},lastGeneratedWeek:null};}

export function normalizeInvitations(value){
  if(!value||typeof value!=='object')return emptyInvitations();
  return {
    version:INVITATIONS_VERSION,
    items:Array.isArray(value.items)?value.items.slice(-INVITATION_LIMIT):[],
    history:Array.isArray(value.history)?value.history.slice(-48):[],
    relationships:value.relationships&&typeof value.relationships==='object'?value.relationships:{},
    lastGeneratedWeek:Number.isFinite(value.lastGeneratedWeek)?value.lastGeneratedWeek:null
  };
}

export function pendingInvitations(state){
  return normalizeInvitations(state?.invitations).items.filter(item=>activeStatus(item.status)&&item.expiresWeek>=state.week);
}

export function createInvitation({week=0,kind='partner',direction='incoming',from=null,teamId=null,format='doubles',eventId=null,context='',expiresWeek=null,relationshipBias=0}={}){
  return {
    id:`invitation:${week}:${kind}:${direction}:${from?.id??teamId??'club'}:${format}`,
    kind,direction,from,teamId,format,eventId,context,
    createdWeek:week,expiresWeek:expiresWeek??week+INVITATION_TTL,
    status:'pending',relationshipBias
  };
}

export function addInvitation(state,invitation){
  const invitations=normalizeInvitations(state?.invitations);
  if(invitations.items.some(item=>item.id===invitation.id&&item.status==='pending'))return {ok:true,state,invitation,duplicate:true};
  return {
    ok:true,
    state:{...state,invitations:{...invitations,items:[...invitations.items,invitation].slice(-INVITATION_LIMIT)}},
    invitation,duplicate:false
  };
}

export function expireInvitations(state,week=state?.week??0){
  const invitations=normalizeInvitations(state?.invitations);
  const expired=[];
  const items=invitations.items.map(item=>{
    if(item.status==='pending'&&item.expiresWeek<week){
      const update={...item,status:'expired',resolvedWeek:week};
      expired.push(update);
      return update;
    }
    return item;
  });
  return {
    ok:true,
    state:{...state,invitations:{...invitations,items,history:[...invitations.history,...expired].slice(-48)}},
    expired
  };
}

function invitationById(state,id){return normalizeInvitations(state?.invitations).items.find(item=>item.id===id)??null;}

function resolveItem(state,id,status,week){
  const invitations=normalizeInvitations(state?.invitations);
  const item=invitations.items.find(entry=>entry.id===id);
  if(!item)return null;
  const resolved={...item,status,resolvedWeek:week};
  return {
    item:resolved,
    state:{...state,invitations:{...invitations,items:invitations.items.map(entry=>entry.id===id?resolved:entry),history:[...invitations.history,resolved].slice(-48)}}
  };
}

function updateRelationship(state,athleteId,patch={}){
  if(!athleteId)return state;
  const invitations=normalizeInvitations(state?.invitations);
  const previous=invitations.relationships[athleteId]??{meetings:0,wins:0,losses:0,chemistry:0,lastWeek:null};
  return {...state,invitations:{...invitations,relationships:{...invitations.relationships,[athleteId]:{...previous,...patch}}}};
}

export function acceptInvitation(state,id,week=state?.week??0){
  const item=invitationById(state,id);
  if(!item||item.status!=='pending')return {ok:false,state,message:'That invitation is no longer available.'};
  if(item.expiresWeek<week)return {ok:false,state:expireInvitations(state,week).state,message:'That invitation has expired.'};
  let next=state;
  if(item.kind==='team'){
    const joined=joinFranchise(next,item.teamId,week);
    if(!joined.ok)return joined;
    next=joined.state;
  }else if(item.kind==='partner'){
    if(!item.from)return {ok:false,state,message:'The partner invitation is incomplete.'};
    next={...next,partners:{...(next.partners??{}),[item.format]:item.from}};
    next=updateRelationship(next,item.from.id,{lastWeek:week,chemistry:clamp((next.invitations?.relationships?.[item.from.id]?.chemistry??0)+1,-5,10)});
  }
  const resolved=resolveItem(next,id,'accepted',week);
  next={...resolved.state,log:[...(resolved.state.log??[]),{week,text:`Accepted ${item.kind==='team'?'a team':'a partner'} invitation from ${item.from?.name??'the team'}.`}].slice(-14)};
  return {ok:true,state:next,message:`Accepted ${item.kind==='team'?'the team invitation':item.from?.name+"'s partner invitation"}.`};
}

export function declineInvitation(state,id,week=state?.week??0){
  const item=invitationById(state,id);
  if(!item||item.status!=='pending')return {ok:false,state,message:'That invitation is no longer available.'};
  const resolved=resolveItem(state,id,'declined',week);
  return {ok:true,state:resolved.state,message:'Invitation declined.'};
}

export function withdrawInvitation(state,id,week=state?.week??0){
  const item=invitationById(state,id);
  if(!item||item.status!=='pending'||item.direction!=='outgoing')return {ok:false,state,message:'That outgoing invitation cannot be withdrawn.'};
  const resolved=resolveItem(state,id,'withdrawn',week);
  return {ok:true,state:resolved.state,message:'Invitation withdrawn.'};
}

export function inviteClubMate(state,athleteId,format='doubles',eventId=null){
  if(!state.clubId)return {ok:false,state,message:'Join a club before inviting a partner.'};
  const member=partnerCandidates(state,format).find(athlete=>athlete.id===athleteId);
  if(!member)return {ok:false,state,message:'That club mate is not available for this format.'};
  const invitation=createInvitation({
    week:state.week,kind:'partner',direction:'outgoing',from:partnerSnapshot(member),format,eventId,
    context:'Player-created partner invitation'
  });
  const added=addInvitation(state,invitation);
  return {...added,message:'Invitation sent to '+member.name+'.'};
}

function generateIncoming(state,seed,week){
  const random=seededRandom(mixSeed(seed,`invite-incoming:${week}`));
  const active=pendingInvitations(state);
  const rating=Math.max(...Object.values(state.athlete?.formats??{}).filter(Number.isFinite));
  if(state.teamCareer?.playerTeamId==null&&rating>=4.15&&!active.some(item=>item.kind==='team')){
    const franchises=state.teamCareer?.franchises??[];
    if(franchises.length&&random()<.55){
      const team=franchises[Math.floor(random()*franchises.length)];
      return createInvitation({week,kind:'team',from:{id:team.id,name:team.name},teamId:team.id,format:'doubles',context:`${team.name} roster trial`,relationshipBias:.4});
    }
  }
  if(state.clubId&&!active.some(item=>item.kind==='partner')){
    const format=random()<.5?'doubles':'mixed';
    const candidates=partnerCandidates(state,format).filter(member=>member.id!==resolvePartner(state,format)?.id);
    if(candidates.length&&random()<.28){
      const member=candidates[Math.floor(random()*candidates.length)];
      return createInvitation({week,kind:'partner',from:partnerSnapshot(member),format,eventId:'local-league',context:`${member.name} wants to play ${format} doubles`,relationshipBias:.2});
    }
  }
  return null;
}

export function advanceInvitations(state,{seed=state?.seed,week=state?.week??0}={}){
  let next=expireInvitations(state,week).state;
  const invitations=normalizeInvitations(next.invitations);
  const items=[];
  for(const item of invitations.items){
    if(item.status!=='pending'||item.direction!=='outgoing'){
      items.push(item);
      continue;
    }
    const random=seededRandom(mixSeed(seed,`invite-response:${item.id}:${week}`));
    const relationship=invitations.relationships[item.from?.id]??{chemistry:0};
    const accepted=random()<clamp(.55+relationship.chemistry*.04+item.relationshipBias,.2,.92);
    if(accepted){
      const resolved={...item,status:'accepted',resolvedWeek:week};
      items.push(resolved);
      next={...next,partners:{...(next.partners??{}),[item.format]:item.from}};
      next=updateRelationship(next,item.from?.id,{lastWeek:week,chemistry:clamp(relationship.chemistry+1,-5,10)});
    }else items.push(item);
  }
  next={...next,invitations:{...normalizeInvitations(next.invitations),items}};
  if(invitations.lastGeneratedWeek==null||week-invitations.lastGeneratedWeek>=2){
    const generated=generateIncoming(next,seed,week);
    if(generated)next=addInvitation(next,generated).state;
    next.invitations={...normalizeInvitations(next.invitations),lastGeneratedWeek:week};
  }
  return {state:next,generated:generateIncoming(next,seed,week+1)};
}

export function relationshipFor(state,athleteId){
  return normalizeInvitations(state?.invitations).relationships[athleteId]??null;
}

export function validateInvitations(state){
  const value=state?.invitations;
  if(!value||typeof value!=='object')return {ok:false,reason:'Invitation state is missing'};
  if(value.version!==INVITATIONS_VERSION)return {ok:false,reason:'Invitation state version is invalid'};
  if(!Array.isArray(value.items)||!Array.isArray(value.history))return {ok:false,reason:'Invitation history is invalid'};
  for(const item of value.items){
    if(!item?.id||!['partner','team','milp'].includes(item.kind))return {ok:false,reason:'Invitation item is invalid'};
    if(!['pending','accepted','declined','expired','withdrawn'].includes(item.status))return {ok:false,reason:'Invitation status is invalid'};
    if(!Number.isFinite(item.createdWeek)||!Number.isFinite(item.expiresWeek))return {ok:false,reason:'Invitation date is invalid'};
  }
  if(!value.relationships||typeof value.relationships!=='object')return {ok:false,reason:'Invitation relationships are invalid'};
  return {ok:true};
}