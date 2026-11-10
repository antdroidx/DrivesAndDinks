// Cross-career archive for completed careers and inbox history.

export const CAREER_ARCHIVE_KEY='drives-dinks:career-archive';
export const CAREER_ARCHIVE_VERSION=1;

export function emptyCareerArchive(){return {version:CAREER_ARCHIVE_VERSION,allTimeBoard:[],inbox:[]};}

export function loadCareerArchive(storage){
  if(!storage)return emptyCareerArchive();
  try{const value=JSON.parse(storage.getItem(CAREER_ARCHIVE_KEY)??'null');return value?.version===CAREER_ARCHIVE_VERSION?{
    version:CAREER_ARCHIVE_VERSION,
    allTimeBoard:Array.isArray(value.allTimeBoard)?value.allTimeBoard.slice(-40):[],
    inbox:Array.isArray(value.inbox)?value.inbox.slice(-160):[]
  }:emptyCareerArchive()}catch{return emptyCareerArchive()}
}

export function saveCareerArchive(value,storage){
  if(!storage)return {ok:false,reason:'No storage is available'};
  const archive={
    version:CAREER_ARCHIVE_VERSION,
    allTimeBoard:(value?.allTimeBoard??[]).slice(-40),
    inbox:(value?.inbox??[]).slice(-160)
  };
  try{storage.setItem(CAREER_ARCHIVE_KEY,JSON.stringify(archive));return {ok:true,archive}}catch(error){return {ok:false,reason:error?.message??'Archive write failed'}}
}

export function archiveCareer(state,storage){
  const archive=loadCareerArchive(storage);
  const key=state.epilogue?.id??`career-${state.seed}`;
  const existing=new Set(archive.allTimeBoard.map(entry=>entry.id));
  const allTimeBoard=[...archive.allTimeBoard];
  for(const entry of state.allTimeBoard??[])if(!existing.has(entry.id)){allTimeBoard.push(entry);existing.add(entry.id)}
  const inboxKeys=new Set(archive.inbox.map(entry=>entry.key));
  for(const item of state.inbox?.items??[])if(!inboxKeys.has(item.key)){archive.inbox.push({...item,archived:true});inboxKeys.add(item.key)}
  return saveCareerArchive({...archive,allTimeBoard:allTimeBoard.slice(-40),inbox:archive.inbox.slice(-160),lastCareerId:key},storage);
}

export function hydrateCareerWithArchive(state,storage){
  const archive=loadCareerArchive(storage);
  const ids=new Set((state.allTimeBoard??[]).map(entry=>entry.id));
  const allTimeBoard=[...(state.allTimeBoard??[])];
  for(const entry of archive.allTimeBoard)if(!ids.has(entry.id)){allTimeBoard.push(entry);ids.add(entry.id)}
  return {...state,allTimeBoard:allTimeBoard.slice(-40)};
}