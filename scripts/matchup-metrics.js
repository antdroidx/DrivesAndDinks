export function summarizeBodies(results){
 const groups=new Map();
 for(const row of results){
  const key=`${row.format}/${row.body}`,group=groups.get(key)??{format:row.format,body:row.body,games:0,completed:0,subjectWins:0};
  group.games+=row.games;group.completed+=row.completed;group.subjectWins+=row.subjectWins;groups.set(key,group);
 }
 return [...groups.values()].map(group=>({...group,subjectWinRate:group.subjectWins/group.games,review:group.games>=8&&(group.subjectWins/group.games>=.875||group.subjectWins/group.games<=.125)?'investigate across more seeds':'sample only'}));
}
