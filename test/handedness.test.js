import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strokeForContact} from '../src/player-facing.js';
import {playerProfile} from '../src/core.js';
import {DEFAULT_SELECTION,GENERATED_LEFT_HANDED_RATE,normalizeSelection,buildProfile,createLineup} from '../src/roster.js';
import {createStackPlans,stackMetrics,stackProbability} from '../src/stacking.js';

function athlete(id,team,handedness){
 return {...playerProfile(),id,team,handedness,x:id%2?15:5,y:team===0?40:4,ratingStyle:'balanced'};
}

test('right- and left-handed players choose mirrored forehand sides',()=>{
 const right={...playerProfile(),team:0,x:10,handedness:'right'},left={...playerProfile(),team:0,x:10,handedness:'left'};
 assert.equal(strokeForContact(right,{x:11}),'forehand');
 assert.equal(strokeForContact(right,{x:9}),'backhand');
 assert.equal(strokeForContact(left,{x:11}),'backhand');
 assert.equal(strokeForContact(left,{x:9}),'forehand');
 assert.equal(strokeForContact({...right,team:1},{x:9}),'forehand');
 assert.equal(strokeForContact({...left,team:1},{x:9}),'backhand');
});

test('handedness is selectable, persisted in profiles, and generated for teammates',()=>{
 assert.equal(DEFAULT_SELECTION.handedness,'right');
 assert.equal(GENERATED_LEFT_HANDED_RATE,.13);
 assert.equal(normalizeSelection({handedness:'left'}).handedness,'left');
 assert.equal(normalizeSelection({handedness:'invalid'}).handedness,'right');
 assert.equal(buildProfile({handedness:'left'}).handedness,'left');
 const lineup=createLineup({handedness:'left'});
 assert.equal(lineup[0].handedness,'left');
 assert.ok(lineup.slice(1).every(player=>['right','left'].includes(player.handedness)));
});

test('hand pair changes adaptive stacking tendency and auto preferred side',()=>{
 const rightA=athlete(0,0,'right'),rightB=athlete(1,0,'right'),leftB=athlete(1,0,'left'),opponents=[athlete(2,1,'right'),athlete(3,1,'right')];
 leftB.ratings={volley:95,reach:90,power:90,courtIQ:90,aggression:90};
 const score={points:[0,0]};
 const same=stackMetrics([rightA,rightB],opponents),opposite=stackMetrics([rightA,leftB],opponents);
 assert.equal(same.handPair,'same');
 assert.equal(opposite.handPair,'opposite');
 assert.ok(stackProbability(same,score)>stackProbability(opposite,score));
 const players=[rightA,leftB,...opponents],server=leftB,receiver=opponents[0];
 const plans=createStackPlans({players,server,receiver,score:{...score,team:0},config:{teams:[{mode:'cross',preferredSide:'auto'},{mode:'off',preferredSide:'auto'}]},random:()=>0});
 assert.equal(plans[0].handPair,'opposite');
 assert.equal(plans[0].stackRequired,false);
 assert.equal(plans[0].targetLanes[rightA.id],5);
 assert.equal(plans[0].targetLanes[leftB.id],15);
 const sameHand=[athlete(0,0,'left'),athlete(1,0,'left'),...opponents];sameHand[1].ratings={volley:95,reach:90,power:90,courtIQ:90,aggression:90};
 const samePlan=createStackPlans({players:sameHand,server:sameHand[0],receiver:opponents[0],score:{...score,team:0},config:{teams:[{mode:'cross',preferredSide:'auto'},{mode:'off',preferredSide:'auto'}]},random:()=>0})[0];
 assert.equal(samePlan.targetLanes[samePlan.strongId],5);
});
