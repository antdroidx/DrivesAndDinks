// Background MLP and MiLP team competition.
//
// The user is a player, not a commissioner. CPU franchises draft and manage
// rosters, while clubs schedule amateur MiLP fixtures. This module keeps those
// seasons compact and deterministic so they can advance with the career week.

import {seededRandom} from '../competition.js?v=220';
import {buildClubIndex,buildClubRoster,mixSeed} from './population.js?v=220';
import {FORMATS} from './rating.js?v=220';

export const TEAM_LEAGUE_VERSION=1;
export const MLP_TEAM_LIMIT=8;
export const MLP_CAREER_WEEKS=4;
const NICKNAMES=Object.freeze(['Aces','Breakers','Drivers','Momentum','Rally','Sentinels','Stingers','Volley']);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round3=value=>Math.round((Number(value)||0)*1000)/1000;
const teamRating=team=>{
  const members=team?.members??[];
  return members.length?round3(members.reduce((sum,member)=>sum+(member.formats?.doubles??3.5),0)/members.length):3.5;
};

function memberSnapshot(athlete){
  return {
    id:athlete.id,name:athlete.name,gender:athlete.gender,age:athlete.age,
    formats:{...athlete.formats},ratings:{...athlete.ratings},clubId:athlete.clubId
  };
}

function createFranchises(seed,regionId,week){
  const clubs=buildClubIndex(seed,regionId);
  const random=seededRandom(mixSeed(seed,`team:franchises:${regionId}`));
  const ranked=[...clubs].sort((a,b)=>(b.skill??0)-(a.skill??0));
  const selected=[];
  const used=new Set();
  while(selected.length<MLP_TEAM_LIMIT&&ranked.length){
    const index=Math.min(ranked.length-1,Math.floor(random()*ranked.length));
    const club=ranked.splice(index,1)[0];
    if(!club||used.has(club.id))continue;
    used.add(club.id);
    const roster=buildClubRoster(seed,club,week).sort((a,b)=>(b.formats.doubles-a.formats.doubles)).slice(0,4).map(memberSnapshot);
    selected.push({
      id:`mlp-team:${club.id}`,
      name:`${club.cityLabel} ${NICKNAMES[selected.length%NICKNAMES.length]}`,
      clubId:club.id,cityId:club.cityId,regionId,
      members:roster,
      rating:roster.length?round3(roster.reduce((sum,member)=>sum+member.formats.doubles,0)/roster.length):3.5,
      wins:0,losses:0,points:0
    });
  }
  return selected;
}

function buildFixtures(franchises,startWeek,duration){
  const sides=franchises.map(team=>team.id);
  if(sides.length%2)sides.push(null);
  const rotation=[...sides];
  const rounds=[];
  for(let round=0;round<rotation.length-1&&rounds.length<duration;round++){
    const matches=[];
    for(let index=0;index<rotation.length/2;index++){
      const home=rotation[index],away=rotation[rotation.length-1-index];
      if(home&&away)matches.push({home,away,homeName:franchises.find(team=>team.id===home)?.name??home,awayName:franchises.find(team=>team.id===away)?.name??away,week:startWeek+round,played:false});
    }
    rounds.push({round,matches});
    rotation.splice(1,0,rotation.pop());
  }
  return rounds;
}

function startSeason(career,week){
  const franchises=(career.franchises??[]).map(team=>({...team,wins:0,losses:0,points:0,members:(team.members??[]).map(member=>({...member}))}));
  return {
    id:`mlp-season:${Math.floor(week/52)}:${week}`,
    startWeek:week,week,duration:MLP_CAREER_WEEKS,status:'active',
    franchises,fixtures:buildFixtures(franchises,week,MLP_CAREER_WEEKS),champion:null
  };
}

export function emptyTeamCareer(){
  return {
    version:TEAM_LEAGUE_VERSION,playerTeamId:null,franchises:[],currentSeason:null,
    seasons:[],draftHistory:[],milp:{active:null,fixtures:[],history:[]}
  };
}

export function createTeamCareer(seed,regionId,week=0){
  const franchises=createFranchises(seed,regionId,week);
  const season=startSeason({franchises},week);
  return {...emptyTeamCareer(),franchises,currentSeason:season};
}

export function joinFranchise(state,teamId,week=state?.week??0){
  if(!state?.teamCareer)return {ok:false,state,message:'Team competition is unavailable.'};
  const franchise=(state.teamCareer.franchises??[]).find(team=>team.id===teamId);
  if(!franchise)return {ok:false,state,message:'That MLP franchise was not found.'};
  return {
    ok:true,
    state:{...state,teamCareer:{...state.teamCareer,playerTeamId:teamId}},
    message:`You joined the ${franchise.name} roster.`
  };
}

function simulateFixture(home,away,random){
  const homeRating=teamRating(home),awayRating=teamRating(away);
  const edge=clamp(.5+(homeRating-awayRating)/8,.28,.72);
  const homeWon=random()<edge;
  return {homeWon,homePoints:homeWon?21:Math.max(10,Math.floor(15+random()*5)),awayPoints:homeWon?Math.max(10,Math.floor(15+random()*5)):21};
}

function applyFixture(season,match,random){
  if(match.played)return null;
  const home=season.franchises.find(team=>team.id===match.home);
  const away=season.franchises.find(team=>team.id===match.away);
  if(!home||!away)return null;
  const result=simulateFixture(home,away,random);
  match.played=true;match.score=result.homePoints+'-'+result.awayPoints;match.winner=result.homeWon?home.id:away.id;
  const winner=result.homeWon?home:away,loser=result.homeWon?away:home;
  winner.wins+=1;winner.points+=3;loser.losses+=1;
  return {round:match.round??null,home:home.name,away:away.name,score:match.score,winner:winner.name,week:match.week};
}

function advanceMlp(career,seed,week){
  let next={...career};
  if(!next.currentSeason||next.currentSeason.status==='complete'){
    if(week%4!==0)return {state:next,results:[]};
    next.currentSeason=startSeason(next,week);
  }
  const season=next.currentSeason;
  const random=seededRandom(mixSeed(seed,`mlp:${season.id}:${week}`));
  const results=[];
  for(const round of season.fixtures??[]){
    for(const match of round.matches??[]){
      if(match.week!==week)continue;
      match.round=round.round;
      const result=applyFixture(season,match,random);
      if(result)results.push(result);
    }
  }
  const lastWeek=season.startWeek+season.duration-1;
  if(week>=lastWeek){
    season.status='complete';
    const standings=[...season.franchises].sort((a,b)=>b.wins-a.wins||b.points-a.points||b.rating-a.rating);
    season.champion=standings[0]??null;
    season.standings=standings.map((team,index)=>({place:index+1,id:team.id,name:team.name,wins:team.wins,losses:team.losses,points:team.points}));
    next.seasons=[...(next.seasons??[]),season].slice(-8);
    next.franchises=season.franchises.map(team=>({...team,wins:0,losses:0,points:0}));
  }
  return {state:next,results};
}

function advanceDraft(career,seed,regionId,week){
  if(week===0||week%52!==0)return career;
  const franchises=(career.franchises??[]).map((team,index)=>({...team,members:(team.members??[]).map(member=>({...member}))}));
  const clubs=buildClubIndex(seed,regionId);
  const random=seededRandom(mixSeed(seed,`mlp-draft:${week}`));
  const picks=[];
  for(const team of franchises){
    const club=clubs[Math.floor(random()*clubs.length)];
    const roster=buildClubRoster(seed,club,week);
    const pick=roster[Math.floor(random()*roster.length)];
    if(!pick)continue;
    const replace=Math.floor(random()*team.members.length);
    const released=team.members[replace]??null;
    team.members[replace]=memberSnapshot(pick);
    team.rating=teamRating(team);
    picks.push({teamId:team.id,team:team.name,playerId:pick.id,player:pick.name,released:released?.name??null,round:1,pick:picks.length+1});
  }
  const currentSeason=career.currentSeason?{
    ...career.currentSeason,
    franchises:career.currentSeason.franchises.map(team=>franchises.find(updated=>updated.id===team.id)??team)
  }:null;
  return {
    ...career,franchises,currentSeason,
    draftHistory:[...(career.draftHistory??[]),{week,season:Math.floor(week/52),picks}].slice(-10)
  };
}

function advanceMilp(career,state,seed,week){
  const milp={...(career.milp??emptyTeamCareer().milp),fixtures:[...(career.milp?.fixtures??[])],history:[...(career.milp?.history??[])]};
  if(milp.active&&week>=milp.active.week+1){
    const random=seededRandom(mixSeed(seed,`milp:${milp.active.id}`));
    const strength=milp.active.clubRating??3.5;
    const opponent=milp.active.opponentRating??3.5;
    const won=random()<clamp(.5+(strength-opponent)/8,.25,.75);
    const result={...milp.active,week:milp.active.week+1,status:'complete',won,score:won?'3-2':'2-3'};
    milp.history=[...milp.history,result].slice(-24);
    milp.active=null;
  }
  if(!milp.active&&state.clubId&&week%4===0){
    const clubs=buildClubIndex(seed,state.regionId).filter(club=>club.id!==state.clubId);
    const random=seededRandom(mixSeed(seed,`milp-fixture:${week}:${state.clubId}`));
    const opponent=clubs[Math.floor(random()*clubs.length)];
    if(opponent){
      milp.active={
        id:`milp:${week}:${state.clubId}:${opponent.id}`,week,
        clubId:state.clubId,clubName:state.club?.name??'Your club',
        opponentClubId:opponent.id,opponent:opponent.name,
        clubRating:round3((state.athlete.formats.doubles+state.clubReputation*.01)/1.2),
        opponentRating:round3(3.3+(opponent.skill??70-70)/20),
        status:'scheduled'
      };
      milp.fixtures=[...milp.fixtures,milp.active].slice(-16);
    }
  }
  return {...milp};
}

export function advanceTeamCareer(state,{seed=state?.seed,regionId=state?.regionId,week=state?.week??0}={}){
  const base=state.teamCareer?.version===TEAM_LEAGUE_VERSION?state.teamCareer:createTeamCareer(seed,regionId,week);
  const drafted=advanceDraft(base,seed,regionId,week);
  const mlp=advanceMlp(drafted,seed,week);
  const next=mlp.state;
  next.milp=advanceMilp(next,state,seed,week);
  return {state:{...state,teamCareer:next},results:mlp.results??[],milp:next.milp};
}

export function validateTeamCareer(value){
  if(!value||typeof value!=='object')return {ok:false,reason:'Team career state is missing'};
  if(value.version!==TEAM_LEAGUE_VERSION)return {ok:false,reason:'Team career version is invalid'};
  if(!Array.isArray(value.franchises)||!Array.isArray(value.seasons)||!Array.isArray(value.draftHistory))return {ok:false,reason:'Team career history is invalid'};
  if(value.currentSeason!=null&&typeof value.currentSeason!=='object')return {ok:false,reason:'MLP season is invalid'};
  if(!value.milp||typeof value.milp!=='object'||!Array.isArray(value.milp.history))return {ok:false,reason:'MiLP state is invalid'};
  return {ok:true};
}

export function teamCareerSummary(value){
  const season=value?.currentSeason;
  const playerTeamId=value?.playerTeamId;
  const playerTeam=(value?.franchises??[]).find(team=>team.id===playerTeamId)??season?.franchises?.find(team=>team.id===playerTeamId)??null;
  return {
    franchises:value?.franchises?.length??0,
    seasons:value?.seasons?.length??0,
    season:season?.id??null,seasonStatus:season?.status??null,
    playerTeam,
    champion:value?.seasons?.at(-1)?.champion??season?.champion??null,
    drafts:value?.draftHistory?.length??0,
    milp:value?.milp??emptyTeamCareer().milp
  };
}