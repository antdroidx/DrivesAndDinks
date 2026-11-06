export const INTRO_RATING_KEYS=Object.freeze(['power','control','agility','reach']);
export const INTRO_RATING_LABELS=Object.freeze({power:'Power',control:'Control',agility:'Speed',reach:'Reach'});

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Math.round(Number(value)):fallback;

export function matchIntroCards(players=[]){
 return players.map(player=>{
  const ratings=player.ratings??{},keys=Object.keys(ratings).filter(key=>key!=='aggression'),overall=keys.length?Math.round(keys.reduce((sum,key)=>sum+finite(ratings[key],70),0)/keys.length):70;
  return {id:player.id,team:player.team??0,name:player.name??`Player ${(player.id??0)+1}`,archetype:player.archetype??player.archetypeId??'Balanced',characterId:player.characterId??'',appearance:player.appearance??{},handedness:player.handedness??'right',paddleShape:player.paddle?.shapeId??'hybrid',overall,ratings:Object.fromEntries(INTRO_RATING_KEYS.map(key=>[key,Math.max(0,Math.min(100,finite(ratings[key],70)))]))};
 });
}

export function matchIntroTeams(players=[]){
 const cards=matchIntroCards(players);
 return [0,1].map(team=>({team,label:team===0?'YOUR TEAM':'CPU TEAM',players:cards.filter(card=>card.team===team)})).filter(entry=>entry.players.length);
}
