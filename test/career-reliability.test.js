import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addReliabilityEvidence,careerReliabilityEvidence,reliability} from '../src/career/rating.js';

const match={opponentIds:['a','b'],partnerId:'p'};
test('repeat teams add less confidence than varied players, irrespective of results',()=>{
  let repeat, varied;
  for(let i=0;i<3;i++){
    repeat=addReliabilityEvidence(repeat,{...match,won:i<2});
    varied=addReliabilityEvidence(varied,{opponentIds:['a'+i,'b'+i],partnerId:'p'+i});
  }
  assert.equal(reliability(repeat.effectiveMatches).percent,17);
  assert.equal(reliability(varied.effectiveMatches).percent,22);
  assert.equal(repeat.opponents.a,3);
});
test('exact opponent pair is unordered and new combinations add more evidence',()=>{
  const first=addReliabilityEvidence(null,match);
  const reversed=addReliabilityEvidence(first,{...match,opponentIds:['b','a']});
  assert.equal(Object.keys(reversed.teams).length,1);
  let history=addReliabilityEvidence(first,{opponentIds:['c','d'],partnerId:'p'});
  const repeat=addReliabilityEvidence(history,match);
  const mixed=addReliabilityEvidence(history,{...match,opponentIds:['a','c']});
  assert.ok(mixed.effectiveMatches>repeat.effectiveMatches);
  assert.ok(addReliabilityEvidence(history,{...match,partnerId:'q'}).effectiveMatches>repeat.effectiveMatches);
});
test('legacy history resolves player identities and durable evidence survives archive trimming',()=>{
  const state={athlete:{record:{matches:3}},opponents:{a:{id:'a',name:'Alice'},b:{id:'b',name:'Bob'}},matches:Array.from({length:3},()=>({opponents:['Alice','Bob']}))};
  const evidence=careerReliabilityEvidence(state);
  assert.equal(evidence.opponents.a,3);
  const continued=addReliabilityEvidence(evidence,match);
  assert.equal(continued.opponents.a,4);
  const restored=JSON.parse(JSON.stringify({athlete:{record:{matches:4,reliabilityEvidence:continued}},matches:[]}));
  assert.deepEqual(careerReliabilityEvidence(restored),continued);
  assert.deepEqual(evidence,careerReliabilityEvidence(state));
});
test('empty and incomplete legacy saves have bounded reliability',()=>{
  assert.equal(reliability(careerReliabilityEvidence({}).effectiveMatches).percent,0);
  assert.ok(reliability(careerReliabilityEvidence({athlete:{record:{matches:100}},matches:[]}).effectiveMatches).percent<=99);
});
