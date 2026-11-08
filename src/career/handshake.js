// The handshake between the career and the match engine.
//
// The engine page and the career page are separate documents. This module is
// the only thing they share: a pending match written by the career, and a
// result written back by the engine. Both are plain data in local storage,
// so the handoff survives a reload and works inside an iframe.

export const CAREER_PENDING_KEY='drives-dinks:career:pending-match';
export const CAREER_RESULT_KEY='drives-dinks:career:match-result';
export const CAREER_MATCH_PARAM='career-match';

function storage(){
  try{return globalThis.localStorage??null}catch{return null}
}

export function writePendingMatch(match){
  const store=storage();
  if(!store)return false;
  try{store.setItem(CAREER_PENDING_KEY,JSON.stringify({...match,queuedAt:new Date().toISOString()}));return true}catch{return false}
}

export function readPendingMatch(){
  const store=storage();
  if(!store)return null;
  try{
    const raw=store.getItem(CAREER_PENDING_KEY);
    if(!raw)return null;
    const match=JSON.parse(raw);
    return match&&match.matchup?.lineup?match:null;
  }catch{return null}
}

export function clearPendingMatch(){
  const store=storage();
  if(!store)return false;
  try{store.removeItem(CAREER_PENDING_KEY);return true}catch{return false}
}

export function writeMatchResult(report){
  const store=storage();
  if(!store)return false;
  try{store.setItem(CAREER_RESULT_KEY,JSON.stringify({...report,playedAt:new Date().toISOString()}));return true}catch{return false}
}

export function readMatchResult(){
  const store=storage();
  if(!store)return null;
  try{
    const raw=store.getItem(CAREER_RESULT_KEY);
    if(!raw)return null;
    return JSON.parse(raw);
  }catch{return null}
}

export function clearMatchResult(){
  const store=storage();
  if(!store)return false;
  try{store.removeItem(CAREER_RESULT_KEY);return true}catch{return false}
}
