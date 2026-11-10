export const INTRO_RATING_KEYS=Object.freeze(['power','control','agility','reach']);
export const INTRO_RATING_LABELS=Object.freeze({power:'Power',control:'Control',agility:'Speed',reach:'Reach'});

import {PADDLES,PADDLE_SHAPES} from './roster.js?v=195';
import {overallForRating,ratingFromSkill} from './career/rating.js?v=195';

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Math.round(Number(value)):fallback;
const ratingWithModifiers=(value,modifiers,key)=>Math.max(0,Math.min(100,finite(value,70)+(Number(modifiers?.[key])||0)));

export function matchIntroCards(players=[]){
 return players.map(player=>{
  const base=player.ratings??{},paddleId=player.paddle?.id??'balanced',shapeId=player.paddle?.shapeId??'hybrid',paddle=PADDLES.find(item=>item.id===paddleId)??PADDLES.find(item=>item.id==='balanced')??PADDLES[0],shape=PADDLE_SHAPES.find(item=>item.id===shapeId)??PADDLE_SHAPES.find(item=>item.id==='hybrid')??PADDLE_SHAPES[0],modifiers=[player.paddle?.ratingModifiers??{},player.paddle?.shapeRatingModifiers??{}];
  const effective=Object.fromEntries(Object.entries(base).map(([key,value])=>[key,ratingWithModifiers(value,{...modifiers[0],...modifiers[1]},key)]));
  const keys=Object.keys(effective).filter(key=>key!=='aggression'),rawOverall=keys.length?keys.reduce((sum,key)=>sum+effective[key],0)/keys.length:70,overall=overallForRating(ratingFromSkill(rawOverall));
  return {id:player.id,team:player.team??0,name:player.name??`Player ${(player.id??0)+1}`,archetype:player.archetype??player.archetypeId??'Balanced',characterId:player.characterId??'',appearance:player.appearance??{},handedness:player.handedness??'right',paddleShape:shapeId,overall,paddleId,paddleName:paddle.name,paddleShapeName:shape.name,paddleLabel:`${paddle.name} · ${shape.name}`,ratings:Object.fromEntries(INTRO_RATING_KEYS.map(key=>[key,Math.max(0,Math.min(100,effective[key]??70))]))};
 });
}export function matchIntroTeams(players=[]){
 const cards=matchIntroCards(players);
 return [0,1].map(team=>({team,label:team===0?'YOUR TEAM':'CPU TEAM',players:cards.filter(card=>card.team===team)})).filter(entry=>entry.players.length);
}
