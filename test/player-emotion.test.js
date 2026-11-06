import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playerEmotionState,PLAYER_EXPRESSIONS,postRallyReactionPlan,applyRallyReactions,REACTION_DURATION} from '../src/player-emotion.js';
import {playerProfile} from '../src/core.js';

test('fatigue and sweat grow from stamina and rally load',()=>{
 const rested=playerEmotionState({...playerProfile(),stamina:1,swing:0},{rallyShots:4});
 const tired=playerEmotionState({...playerProfile(),stamina:.1,swing:0},{rallyShots:30});
 assert.equal(rested.expression,'focus');assert.ok(rested.sweat<.2);
 assert.equal(tired.expression,'fatigue');assert.ok(tired.sweat>.7);assert.ok(tired.fatigue>.68);
});

test('surprise, aggression and happiness respond to rally state',()=>{
 const surprise=playerEmotionState({...playerProfile(),surpriseTimer:.5},{incomingShot:'tweener'});
 const aggression=playerEmotionState({...playerProfile(),aggressionTimer:.6,animationShot:'drive',playstyle:{aggression:.9},swing:.4},{});
 const happy=playerEmotionState({...playerProfile(),team:0,celebrateTimer:.8},{phase:'pause',lastPointWinner:0});
 assert.equal(surprise.expression,'surprise');
 assert.equal(aggression.expression,'aggression');
 assert.equal(happy.expression,'happy');
 assert.ok(PLAYER_EXPRESSIONS.includes(happy.expression));
});

test('mishits use surprise while clean attacking swings stay aggressive',()=>{
 const mishit=playerEmotionState({...playerProfile(),mishit:true,swing:.3,animationShot:'drive'},{});
 const clean=playerEmotionState({...playerProfile(),mishit:false,swing:.3,animationShot:'drive',aggressionTimer:.4,playstyle:{aggression:.9}},{});
 assert.equal(mishit.expression,'surprise');assert.equal(clean.expression,'aggression');
});

test('post-rally reactions stay selective and split winner from loser',()=>{
 const ordinary=postRallyReactionPlan({winner:0,faultTeam:1,faultPlayerId:2,lastHitterId:0,shots:5,score:{points:[2,1],winner:null},random:()=>0});
 assert.equal(ordinary.triggered,false);
 const matchPoint=postRallyReactionPlan({winner:0,faultTeam:1,faultPlayerId:2,lastHitterId:0,shots:5,score:{points:[11,8],winner:0},random:()=>0});
 assert.equal(matchPoint.triggered,true);assert.deepEqual(matchPoint.assignments.map(item=>item.kind),['celebrate','disappointment']);
 const special=postRallyReactionPlan({winner:0,faultTeam:1,faultPlayerId:2,faultAggression:.9,faultMishit:true,lastHitterId:0,shots:20,score:{points:[8,7],winner:null},special:true,random:()=>0});
 assert.deepEqual(special.assignments.map(item=>item.kind),['celebrate','anger']);
 const players=[{id:0,team:0},{id:2,team:1}];assert.equal(applyRallyReactions(players,special),true);assert.equal(players[0].reactionKind,'celebrate');assert.equal(players[0].reactionTimer,REACTION_DURATION);assert.equal(players[1].reactionKind,'anger');
 assert.equal(playerEmotionState(players[0],{}).expression,'happy');assert.equal(playerEmotionState(players[1],{}).expression,'anger');
});
