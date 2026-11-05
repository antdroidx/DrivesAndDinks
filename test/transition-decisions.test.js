import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseCpuShot} from '../src/core.js';

// Mirrored fixtures keep the decision independent of which end serves.
for(const team of [0,1]){
 const choose=options=>chooseCpuShot({shots:2,team,y:team===0?38:6,height:3.6,random:.4,...options});
 const frequency=options=>Array.from({length:1000},(_,i)=>choose({...options,random:i/1000})).filter(shot=>shot==='drive').length;

 test(`team ${team}: third-shot drives require a feasible contact`,()=>{
  for(const options of [{height:.7},{difficulty:.8},{balanced:false},{attackSkill:.6}]){
   assert.equal(choose({...options,aggression:1,tendency:'banger',random:0}),'drop');
  }
  assert.equal(choose({height:2,opponentsDeep:true,random:.1}),'drive');
  assert.equal(choose({height:2,opponentsDeep:false,random:.1}),'drop');
  assert.equal(choose({height:2,opponentsDeep:true,opponentsAtKitchen:true,random:.1}),'drop');
  assert.equal(choose({height:1,difficulty:.95}),'drop');
 });

 test(`team ${team}: third-shot choices respond to team and player strengths`,()=>{
  assert.equal(choose({aggression:.15}),'drop');
  assert.equal(choose({aggression:1}),'drive');
  assert.ok(frequency({opponentsDeep:true})>frequency({}));
  assert.ok(frequency({})>frequency({opponentsAtKitchen:true}));
  assert.ok(frequency({partnerReady:true})>frequency({partnerReady:false}));
  assert.ok(frequency({difficulty:.1})>frequency({difficulty:.6}));
  assert.ok(frequency({attackSkill:1.4,softSkill:.8})>frequency({attackSkill:.8,softSkill:1.4}));
  assert.ok(frequency({opponentsAtKitchen:true,courtIQ:1.4})<frequency({opponentsAtKitchen:true,courtIQ:.7}));
 });

 test(`team ${team}: fifth and later transition shots reset when advancement is unsafe`,()=>{
  for(const shots of [4,5,6]){
   for(const options of [{partnerReady:false},{balanced:false},{difficulty:.9},{height:2,opponentsAtKitchen:true}]){
    assert.equal(choose({shots,transition:true,aggression:1,random:0,...options}),'drop');
    assert.equal(choose({shots,transition:true,aggression:1,random:0,...options,y:team===0?30:14}),'dink');
   }
  }
  assert.equal(choose({shots:4,transition:true,height:3.6,opponentsDeep:true,random:.1}),'drive');
  assert.equal(choose({shots:4,transition:true,height:6}),'drive');
  assert.equal(choose({shots:4,transition:true,height:6,balanced:false}),'drop');
 });

 test(`team ${team}: omitted transition context preserves rallies and defensive lobs`,()=>{
  for(const shots of [3,4,5,8]){
   for(const height of [1,2,3.6,6]){
    for(const random of [0,.5,.99]){
     const options={shots,height,random};
     assert.equal(choose(options),choose({...options,transition:false,partnerReady:true,balanced:true,opponentsDeep:false}));
     // Context alone must not turn an ordinary rally into a transition.
     assert.equal(choose(options),choose({...options,partnerReady:false,balanced:false,opponentsDeep:true}));
    }
   }
  }
  assert.equal(choose({shots:5,height:2,difficulty:.9}),'lob');
  assert.equal(choose({shots:5,height:2,difficulty:.9,transition:true}),'drop');
  assert.equal(choose({shots:1,height:.6,difficulty:1,transition:true,balanced:false}),'drive');
 });

 test(`team ${team}: singles ignore doubles transition context`,()=>{
  for(const shots of [1,2,4,5,8]){
   for(const height of [.6,2,3.6,6]){
    for(const difficulty of [0,.8,.95]){
     const options={shots,height,difficulty,singles:true};
     assert.equal(choose(options),choose({...options,transition:true,partnerReady:false,balanced:false,opponentsDeep:true}));
    }
   }
  }
  assert.equal(choose({singles:true,height:2,random:.5}),'drive');
  assert.equal(choose({singles:true,height:.6}),'drop');
  assert.equal(choose({singles:true,height:1,difficulty:.95}),'lob');
 });
}
