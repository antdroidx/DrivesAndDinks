import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,joinClub,advanceWeek} from '../src/career/state.js';
import {buildClubIndex} from '../src/career/population.js';
import {createTeamCareer,joinFranchise,advanceTeamCareer,teamCareerSummary} from '../src/career/team-league.js';
import {emptyInvitations,addInvitation,createInvitation,acceptInvitation,declineInvitation,withdrawInvitation,pendingInvitations,inviteClubMate,advanceInvitations} from '../src/career/invitations.js';
import {partnerCandidates} from '../src/career/club-life.js';
import {migrateCareer,CAREER_SAVE_VERSION} from '../src/career/save.js';
import {readFileSync} from 'node:fs';

const career=()=>createCareer({name:'Phase Three',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242,age:25});
const withClub=state=>({...state,...joinClub(state,buildClubIndex(state.seed,state.regionId).find(club=>club.cityId===state.cityId).id).state,invitations:emptyInvitations()});

test('MLP franchises complete a season in the background without commissioner work',()=>{
  const state=career();
  assert.equal(state.teamCareer.franchises.length,8);
  assert.equal(state.teamCareer.currentSeason.status,'active');
  const joined=joinFranchise(state,state.teamCareer.franchises[0].id);
  assert.ok(joined.ok,joined.message);
  let current=joined.state;
  for(let index=0;index<4;index++)current=advanceWeek(current).state;
  const summary=teamCareerSummary(current.teamCareer);
  assert.equal(summary.seasons,1);
  assert.ok(summary.champion?.name);
  assert.equal(summary.playerTeam.id,joined.state.teamCareer.playerTeamId);
});

test('annual CPU drafts create roster turnover and history',()=>{
  const state=career();
  const before=state.teamCareer.franchises[0].members.map(member=>member.id);
  const advanced=advanceTeamCareer({...state,week:52},{seed:state.seed,regionId:state.regionId,week:52});
  assert.equal(advanced.state.teamCareer.draftHistory.length,1);
  const after=advanced.state.teamCareer.franchises[0].members.map(member=>member.id);
  assert.notDeepEqual(after,before);
});

test('MiLP club fixtures schedule and resolve with the weekly world',()=>{
  let state=withClub(career());
  state=advanceTeamCareer({...state,week:4},{seed:state.seed,regionId:state.regionId,week:4}).state;
  assert.ok(state.teamCareer.milp.active,'a home club fixture is scheduled');
  state=advanceTeamCareer({...state,week:5},{seed:state.seed,regionId:state.regionId,week:5}).state;
  assert.equal(state.teamCareer.milp.active,null);
  assert.equal(state.teamCareer.milp.history.length,1);
  assert.ok(['won','complete'].includes(state.teamCareer.milp.history[0].status==='complete'?'complete':'won'));
});

test('team invitations can be accepted and partner invitations update the roster partner',()=>{
  const state=withClub(career());
  const team=state.teamCareer.franchises[0];
  const teamInvite=createInvitation({week:0,kind:'team',from:{id:team.id,name:team.name},teamId:team.id,expiresWeek:4});
  const withTeam=addInvitation(state,teamInvite).state;
  const accepted=acceptInvitation(withTeam,teamInvite.id,1);
  assert.ok(accepted.ok,accepted.message);
  assert.equal(accepted.state.teamCareer.playerTeamId,team.id);

  const partner=partnerCandidates(state,'doubles')[0];
  const partnerInvite=createInvitation({week:1,kind:'partner',from:{id:partner.id,name:partner.name,gender:partner.gender,formats:partner.formats},format:'doubles',expiresWeek:5});
  const withPartner=addInvitation(accepted.state,partnerInvite).state;
  const partnerAccepted=acceptInvitation(withPartner,partnerInvite.id,2);
  assert.ok(partnerAccepted.ok,partnerAccepted.message);
  assert.equal(partnerAccepted.state.partners.doubles.id,partner.id);
  assert.equal(partnerAccepted.state.invitations.relationships[partner.id].chemistry,1);
});

test('invitations expire, decline, withdraw and prevent stale actions',()=>{
  const state=career();
  const invite=createInvitation({week:0,kind:'team',from:{id:'t',name:'Test'},teamId:state.teamCareer.franchises[0].id,expiresWeek:2});
  const withInvite=addInvitation(state,invite).state;
  const expired=advanceInvitations(withInvite,{seed:state.seed,week:3}).state;
  assert.equal(pendingInvitations(expired).some(item=>item.id===invite.id),false);
  assert.equal(acceptInvitation(expired,invite.id,3).ok,false);

  const declinedInvite=createInvitation({week:3,kind:'team',from:{id:'t2',name:'Other'},teamId:state.teamCareer.franchises[1].id,expiresWeek:6});
  const declined=declineInvitation(addInvitation(expired,declinedInvite).state,declinedInvite.id,3);
  assert.ok(declined.ok,declined.message);
  assert.equal(declineInvitation(declined.state,declinedInvite.id,3).ok,false);

  const outgoing=createInvitation({week:3,kind:'partner',direction:'outgoing',from:{id:'mate',name:'Mate'},format:'doubles',expiresWeek:6});
  const outgoingState=addInvitation(declined.state,outgoing).state;
  assert.ok(withdrawInvitation(outgoingState,outgoing.id,3).ok);
});

test('a user can invite a club mate and the response resolves in a later week',()=>{
  const state=withClub(career());
  const partner=partnerCandidates(state,'doubles')[0];
  const invited=inviteClubMate(state,partner.id,'doubles','local-league');
  assert.ok(invited.ok,invited.message);
  const item=invited.invitation;
  assert.equal(item.direction,'outgoing');
  assert.ok(pendingInvitations(invited.state).some(entry=>entry.id===item.id));
  const advanced=advanceInvitations(invited.state,{seed:state.seed,week:1}).state;
  const resolved=advanced.invitations.items.find(entry=>entry.id===item.id);
  assert.equal(resolved.status,'accepted');
  assert.equal(advanced.partners.doubles.id,partner.id);
});
test('schema v18 careers gain team competition and invitations',()=>{
  const legacy=career();
  delete legacy.teamCareer;
  delete legacy.invitations;
  const migrated=migrateCareer({version:18,state:legacy});
  assert.ok(migrated.ok,migrated.reason);
  assert.equal(migrated.version,CAREER_SAVE_VERSION);
  assert.equal(migrated.state.teamCareer.franchises.length,8);
  assert.deepEqual(migrated.state.invitations.items,[]);
});

test('the career shell exposes the TEAM and invitation controls',()=>{
  const html=readFileSync(new URL('../career-mode/index.html',import.meta.url),'utf8');
  const source=readFileSync(new URL('../src/career/main.js',import.meta.url),'utf8');
  assert.match(html,/data-view="team"/);
  assert.match(source,/data-action="accept-invite"/);
  assert.match(source,/data-action="decline-invite"/);
  assert.match(source,/data-action="withdraw-invite"/);
  assert.match(source,/data-action="invite-mate"/);
});