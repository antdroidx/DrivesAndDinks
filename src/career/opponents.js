// Persistent career opponent memory and head-to-head records.

export function opponentLearningForMatchup(state,matchup){
  const ids=matchup?.opponentIds??[];
  const offset=matchup?.partnerId?2:1;
  const learning=[];
  for(let index=0;index<ids.length;index++){
    const memory=state.opponents?.[ids[index]]?.learning;
    if(memory)learning.push({...memory,playerId:offset+index});
  }
  return learning.length?learning:null;
}

export function recordOpponentResult(state,{matchup,report,won,week=state.week,eventId=null,eventLabel=null,format='doubles'}){
  const profiles={...(state.opponents??{})};
  const ids=matchup?.opponentIds??[];
  const reports=report?.learning??[];
  for(let index=0;index<ids.length;index++){
    const id=ids[index];
    if(!id)continue;
    const previous=profiles[id]??{id,name:matchup.opponentNames?.[index]??id,matches:0,wins:0,losses:0,currentStreak:0,learning:null};
    const internalId=(matchup.partnerId?2:1)+index;
    const learned=reports.find(entry=>entry.playerId===internalId);
    profiles[id]={
      ...previous,
      name:matchup.opponentNames?.[index]??previous.name,
      matches:previous.matches+1,
      wins:previous.wins+(won?1:0),
      losses:previous.losses+(won?0:1),
      currentStreak:won?(previous.currentStreak??0)+1:0,
      lastResult:won?'W':'L',
      lastWeek:week,
      lastEventId:eventId,
      lastEventLabel:eventLabel,
      lastFormat:format,
      learning:learned?{...learned,playerId:undefined}:previous.learning??null
    };
  }
  return {...state,opponents:profiles};
}

export function opponentHistory(state){
  return Object.values(state.opponents??{}).sort((a,b)=>(b.lastWeek??-1)-(a.lastWeek??-1)||b.matches-a.matches);
}