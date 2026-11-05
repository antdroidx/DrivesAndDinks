// Read-only match instrumentation. Keep shot arguments and rule decisions intact.
export function trackMatchup(game,subjectTeam){
 const teams=Array.from({length:2},()=>({contacts:0,mishits:0,qualityTotal:0,staminaTotal:0,lowContacts:0,shots:{},faults:{},ralliesWon:0}));
 const hit=game.hit.bind(game),fault=game.fault.bind(game);
 game.hit=(player,shot,aim,quality=1,placement=null)=>{
  const stamina=player.stamina??1,height=game.ball.z,result=hit(player,shot,aim,quality,placement);
  if(result){const row=teams[player.team===subjectTeam?0:1];row.contacts++;row.mishits+=Number(player.mishit);row.qualityTotal+=quality;row.staminaTotal+=stamina;row.lowContacts+=Number(height<.9);row.shots[shot]=(row.shots[shot]??0)+1}
  return result;
 };
 game.fault=(team,reason,player=null)=>{
  if(game.phase!=='pause'&&game.phase!=='over'){
   const index=team===subjectTeam?0:1;teams[index].faults[reason]=(teams[index].faults[reason]??0)+1;teams[1-index].ralliesWon++;
  }
  return fault(team,reason,player);
 };
 return teams;
}

export function summarizeContacts(teams){
 return teams.map(({qualityTotal,staminaTotal,...row})=>({...row,meanQuality:row.contacts?qualityTotal/row.contacts:null,meanStamina:row.contacts?staminaTotal/row.contacts:null,mishitRate:row.contacts?row.mishits/row.contacts:null}));
}
