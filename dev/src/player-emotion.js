const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const PLAYER_EXPRESSIONS=Object.freeze(['focus','effort','fatigue','surprise','aggression','happy','disappointment','anger','relief']);
export const RALLY_REACTIONS=Object.freeze(['celebrate','disappointment','anger','relief']);
export const REACTION_DURATION=1.4;

export function postRallyReactionPlan({winner,faultTeam=null,faultPlayerId=null,faultAggression=.5,faultMishit=false,lastHitterId=null,shots=0,score=null,special=false,random=Math.random}={}){
 if(winner!==0&&winner!==1)return {triggered:false,assignments:[]};
 const points=score?.points??[0,0],matchPoint=score?.winner!=null,closeScore=Math.max(...points)>=9&&Math.abs(points[0]-points[1])<=2,longRally=shots>=12,bigMoment=matchPoint||closeScore||longRally||special;
 if(!bigMoment||(!matchPoint&&random()>.78))return {triggered:false,assignments:[]};
 const winnerIsLastHitter=lastHitterId!=null&&faultTeam!==winner;
 const winnerAssignment={team:winner,playerId:winnerIsLastHitter?lastHitterId:null,kind:special?'celebrate':(longRally||closeScore)&&random()<.68?'relief':'celebrate'};
 const loserTeam=faultTeam===0||faultTeam===1?faultTeam:1-winner;
 const loserAssignment={team:loserTeam,playerId:faultPlayerId,kind:faultMishit||((faultAggression??0)>.72&&random()<.62)?'anger':'disappointment'};
 return {triggered:true,matchPoint,bigMoment,assignments:[winnerAssignment,loserAssignment]};
}

export function applyRallyReactions(players,plan){
 for(const player of players??[]){player.reactionKind=null;player.reactionTimer=0;player.celebrateTimer=0}
 if(!plan?.triggered)return false;
 for(const assignment of plan.assignments??[]){
  let player=assignment.playerId==null?null:(players??[]).find(item=>item.id===assignment.playerId);
  if(!player||player.team!==assignment.team)player=(players??[]).find(item=>item.team===assignment.team);
  if(!player)continue;
  player.reactionKind=assignment.kind;player.reactionTimer=REACTION_DURATION;
  if(assignment.kind==='celebrate')player.celebrateTimer=REACTION_DURATION;
 }
 return true;
}

export function playerEmotionState(player,context={}){
 const stamina=clamp(player.stamina??1,0,1),rallyShots=Math.max(0,Number(context.rallyShots)||0),reactionActive=(player.reactionTimer??0)>0&&RALLY_REACTIONS.includes(player.reactionKind);
 const fatigue=clamp((.38-stamina)/.38+rallyShots/90,0,1);
 const surprise=Boolean(player.surpriseTimer>0||context.incomingShot==='atp'||context.incomingShot==='erne'||context.incomingShot==='tweener');
 const aggression=Boolean(player.aggressionTimer>0||(player.swing>0&&['drive','overhead','atp','erne'].includes(player.animationShot)&&(player.playstyle?.aggression??player.abilities?.aggression??.5)>.62));
 const happy=Boolean(player.celebrateTimer>0||(context.phase==='pause'||context.phase==='over')&&context.lastPointWinner===player.team);
 const mishit=Boolean(player.mishit&&player.swing>.12);
 let expression='focus';
 if(reactionActive)expression=({celebrate:'happy',relief:'relief',disappointment:'disappointment',anger:'anger'})[player.reactionKind];
 else if(happy)expression='happy';
 else if(mishit||surprise)expression='surprise';
 else if(fatigue>.68&&(player.swing<=0||stamina<.22))expression='fatigue';
 else if(aggression)expression='aggression';
 else if(player.swing>0||player.effortTimer>0||Math.hypot(player.vx||0,player.vy||0)>7)expression='effort';
 const reactionIntensity=reactionActive?clamp((player.reactionTimer??0)/REACTION_DURATION,0,1):0;
 const sweat=clamp((1-stamina)*.78+fatigue*.32+(player.effortTimer??0)*.28+Math.max(0,rallyShots-10)*.004,0,1);
 return {expression,intensity:clamp(Math.max(fatigue,reactionIntensity,player.surpriseTimer??0,player.aggressionTimer??0,player.celebrateTimer??0),0,1),fatigue,sweat,marks:expression};
}
