// Standings, qualification and the money.
//
// The pro tour is a board of 1200 players on each of the men's and women's
// sides, and a player holds a place on it. This module works out where the
// player stands, who is next to them, whether they have qualified for the
// rounds above, and what the year has paid.

import {buildRegionSkills,buildAthlete} from './population.js?v=208';
import {currentRatings} from './world.js?v=208';
import {tourFor,tourRank,worldRank,PRO_TOUR_SIZE,PRO_FLOOR_RATING,EVENT_POINTS} from './tour.js?v=208';
import {summarizeCareerForm} from './match-record.js?v=208';
import {REGIONS} from './geography.js?v=208';

// The rounds a player has to earn their way into.
export const QUALIFICATION_POINTS=Object.freeze({
  national:400,
  international:900,
  'pro-league':1600,
  mlp:1400
});

// Prize money by event. Winning takes the purse, losing takes a share.
export const PRIZE_MONEY=Object.freeze({
  'club-night':0,
  'local-league':150,
  'city-open':300,
  'regional-open':800,
  'mlp-amateur':600,
  'semi-pro':1400,
  national:2500,
  international:6000,
  'pro-league':15000,
  mlp:5000
});

// Sponsors arrive with a standing and pay a little more into every purse.
export const SPONSORS=Object.freeze([
  {id:'local-shop',label:'Local Gear Co.',rank:1200,bonus:0},
  {id:'regional-sport',label:'Regional Sporting Goods',rank:800,bonus:.1},
  {id:'national-brand',label:'National Paddle Works',rank:400,bonus:.25},
  {id:'global-brand',label:'Global Racquet Group',rank:100,bonus:.5}
]);

export function prizeFor({eventId,won,format,sponsors=[]}){
  const purse=PRIZE_MONEY[eventId]??0;
  if(!purse)return 0;
  const share=won?1:0.15;
  const bonus=sponsors.reduce((sum,sponsor)=>sum+sponsor.bonus,0);
  return Math.round(purse*share*(1+bonus));
}

// The player's place on the board for a format.
export function boardPosition(state,format){
  const rating=state.athlete.formats[format]??0;
  const tour=tourFor(state.athlete.gender);
  const rank=tourRank(rating,state.athlete.gender);
  return {
    rating,
    rank,
    worldRank:worldRank(rating,state.athlete.gender),
    size:tour.size,
    floor:tour.floorRating,
    onTour:rank!==null,
    label:tour.label
  };
}

function disciplinePool(athletes,state,format){
  const boardGender=format==='mixed'?null:state.athlete.gender;
  return boardGender?athletes.filter(athlete=>athlete.gender===boardGender):athletes;
}

// The players nearest to the player on the board, taken from the population
// of the region. Each carries the world rank its rating implies.
export function nearbyRivals(state,format,count=6){
  const skills=buildRegionSkills(state.seed,state.regionId,state.week);
  const current=[...currentRatings(skills,state.worldRatings,state.week,format).values()];
  const mine=state.athlete.formats[format]??0;
  const others=disciplinePool(current,state,format).filter(athlete=>athlete.id!=='player');
  others.sort((a,b)=>Math.abs(a.rating-mine)-Math.abs(b.rating-mine));
  return others.slice(0,count).map(athlete=>{
    const full=athlete.club?buildAthlete(state.seed,athlete.club,athlete.index):null;
    return {
      id:athlete.id,
      name:full?.name??'a local',
      citizenship:full?.citizenship??'',
      gender:full?.gender??athlete.gender,
      rating:athlete.rating,
      worldRank:worldRank(athlete.rating,full?.gender??athlete.gender),
      rank:tourRank(athlete.rating,full?.gender??athlete.gender),
      cityId:athlete.cityId
    };
  });
}

// The highest-rated players on the selected discipline board across both
// regions. CPU ranking histories do not exist yet, so this is deliberately a
// rating leaderboard rather than the points ranking used to enter PPA events.
export function topPlayers(state,format,count=25){
  const skills=REGIONS.flatMap(region=>buildRegionSkills(state.seed,region.id,state.week));
  const current=disciplinePool([...currentRatings(skills,state.worldRatings,state.week,format).values()],state,format);
  current.push({
    id:'player',
    name:state.athlete.name,
    citizenship:state.athlete.citizenship??'',
    cityId:state.cityId,
    cityLabel:state.cityLabel,
    regionId:state.regionId,
    gender:state.athlete.gender,
    age:state.athlete.age,
    rating:state.athlete.formats[format]??0
  });
  return current
    .sort((a,b)=>b.rating-a.rating)
    .slice(0,Math.max(1,count))
    .map((athlete,index)=>{
      const full=athlete.club?buildAthlete(state.seed,athlete.club,athlete.index):null;
      return {
        rank:index+1,
        id:athlete.id,
        name:full?.name??athlete.name??athlete.id,
        citizenship:full?.citizenship??athlete.citizenship??'',
        cityId:athlete.cityId,
        regionId:athlete.club?.regionId??athlete.regionId??null,
        cityLabel:full?.cityLabel??athlete.cityLabel??'',
        gender:full?.gender??athlete.gender,
        age:full?.age??null,
        rating:athlete.rating,
        worldRank:worldRank(athlete.rating,full?.gender??athlete.gender)
      };
    });
}

// The rival is the player the career keeps coming back to: the nearest one on
// the board when the career began.
export function findRival(state,format){
  const mine=state.athlete.formats[format]??0;
  const skills=buildRegionSkills(state.seed,state.regionId,state.week);
  const current=disciplinePool([...currentRatings(skills,state.worldRatings,state.week,format).values()],state,format);
  let best=null;
  let gap=Infinity;
  for(const athlete of current){
    if(athlete.id==='player')continue;
    const distance=Math.abs(athlete.rating-mine);
    if(distance<gap){gap=distance;best=athlete;}
  }
  if(!best)return null;
  const full=best.club?buildAthlete(state.seed,best.club,best.index):null;
  return {
    id:best.id,
    name:full?.name??'a local',
    gender:full?.gender??best.gender,
    rating:best.rating,
    worldRank:worldRank(best.rating,full?.gender??best.gender),
    rank:tourRank(best.rating,full?.gender??best.gender),
    gap:Number(gap.toFixed(3))
  };
}

// Whether the player has earned a place in a round.
export function qualificationStatus(state,eventId){
  const needed=QUALIFICATION_POINTS[eventId];
  if(!needed)return {required:false,ok:true,points:state.athlete.tourPoints??0};
  const points=state.athlete.tourPoints??0;
  return {required:true,ok:points>=needed,points,needed,short:Math.max(0,needed-points)};
}

export function sponsorsFor(state,format){
  const position=boardPosition(state,format);
  if(!position.onTour)return [];
  return SPONSORS.filter(sponsor=>position.rank<=sponsor.rank);
}

export function prizeMultiplier(state,format){
  return 1+sponsorsFor(state,format).reduce((sum,sponsor)=>sum+sponsor.bonus,0);
}

export function careerForm(state){
  return summarizeCareerForm(state.matches??[],10);
}
