// The handshake between the career and the match engine.
//
// The engine page and the career page are separate documents. This module is
// the only thing they share: a pending match written by the career, and a
// result written back by the engine. Both are plain data in local storage,
// so the handoff survives a reload and works inside an iframe.

export const CAREER_PENDING_KEY='drives-dinks:career:pending-match';
export const CAREER_RESULT_KEY='drives-dinks:career:match-result';
export const CAREER_ENGINE_STATE_KEY='drives-dinks:career:engine-state';
export const CAREER_MATCH_PARAM='career-match';

function storage(){
  try{return globalThis.localStorage??null}catch{return null}
}

export function pendingMatchId(match){
  if(!match)return null;
  return match.matchId??[
    match.eventId,match.optionId,match.week,match.tournamentId,match.round,match.sessionId
  ].map(value=>value??'').join(':');
}

export function writePendingMatch(match){
  const store=storage();
  if(!store||!match?.matchup?.lineup)return false;
  try{
    store.setItem(CAREER_PENDING_KEY,JSON.stringify({
      ...match,
      matchId:pendingMatchId(match),
      queuedAt:new Date().toISOString()
    }));
    return true;
  }catch{return false}
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

export function writeEngineState(matchId,state){
  const store=storage();
  if(!store||!matchId||!state)return false;
  try{store.setItem(CAREER_ENGINE_STATE_KEY,JSON.stringify({matchId,state,savedAt:new Date().toISOString()}));return true}catch{return false}
}

export function readEngineState(expectedMatchId=null){
  const store=storage();
  if(!store)return null;
  try{
    const saved=JSON.parse(store.getItem(CAREER_ENGINE_STATE_KEY)??'null');
    if(!saved?.state||(expectedMatchId&&saved.matchId!==expectedMatchId))return null;
    return saved.state;
  }catch{return null}
}

export function clearEngineState(){
  const store=storage();
  if(!store)return false;
  try{store.removeItem(CAREER_ENGINE_STATE_KEY);return true}catch{return false}
}

export function clearPendingMatch(){
  const store=storage();
  if(!store)return false;
  try{store.removeItem(CAREER_PENDING_KEY);return true}catch{return false}
}

export function writeMatchResult(report,matchId=null){
  const store=storage();
  if(!store||!report)return false;
  try{
    store.setItem(CAREER_RESULT_KEY,JSON.stringify({
      ...report,
      matchId:matchId??null,
      playedAt:new Date().toISOString()
    }));
    return true;
  }catch{return false}
}

export function readMatchResult(expectedMatchId=null){
  const store=storage();
  if(!store)return null;
  try{
    const raw=store.getItem(CAREER_RESULT_KEY);
    if(!raw)return null;
    const report=JSON.parse(raw);
    if(!report||typeof report!=='object'||!report.score)return null;
    if(expectedMatchId&&report.matchId!==expectedMatchId)return null;
    return report;
  }catch{return null}
}

// Consumes the result once. A stale result is discarded instead of being
// allowed to score a later, unrelated career match.
export function takeMatchResult(expectedMatchId=null){
  const report=readMatchResult(expectedMatchId);
  clearMatchResult();
  return report;
}

export function clearMatchResult(){
  const store=storage();
  if(!store)return false;
  try{store.removeItem(CAREER_RESULT_KEY);return true}catch{return false}
}
