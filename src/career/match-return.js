import {pendingMatchId,readMatchResult,clearMatchResult} from './handshake.js';
import {finishCareerMatch} from './career-match.js';
import {saveCareer} from './save.js';

// A returned result is acknowledged only after the updated save is durable.
export function commitReturnedMatch(state,storage){
  const expected=pendingMatchId(state?.pendingMatch);
  const report=expected?readMatchResult(expected):null;
  if(!report)return {ok:true,state,applied:false};
  const scored=finishCareerMatch(structuredClone(state),report);
  if(!scored.ok)return {...scored,state,applied:false};
  const saved=saveCareer(scored.state,storage);
  if(!saved.ok)return {ok:false,state,applied:false,message:saved.reason};
  clearMatchResult();
  return {...scored,applied:true};
}
