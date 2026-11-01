import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MOTIONS,CONTACT_PHASE,sampleCharacterPose,appearancePalette} from '../src/pixel-character.js';

test('every motion has two connected arms and legs, without pose discontinuities',()=>{
 for(const mode of MOTIONS)for(const view of ['near','far'])for(const side of [-1,1]){
  let previous;
  for(let i=0;i<=1000;i++){
   const pose=sampleCharacterPose({mode,view,side,phase:i/1000,frame:i/250});
   assert.equal(pose.arms.length,2);assert.equal(pose.legs.length,2);
   for(const chain of [...pose.arms,...pose.legs]){assert.equal(chain.length,3);for(const p of chain)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y))}
   if(previous){assert.ok(Math.hypot(pose.paddle.x-previous.paddle.x,pose.paddle.y-previous.paddle.y)<.6,`${mode}: paddle jumps`);assert.ok(Math.abs(pose.angle-previous.angle)<.02,`${mode}: wrist jumps`)}
   previous=pose;
  }
 }
});
test('impact constraint places face exactly on the ball without shifting the feet',()=>{
 for(const mode of MOTIONS.slice(2))for(const contact of [{x:3,y:20},{x:45,y:35},{x:24,y:4}]){
  const ready=sampleCharacterPose({mode,phase:CONTACT_PHASE});
  const impact=sampleCharacterPose({mode,phase:CONTACT_PHASE,contact,contactWeight:1});
  assert.deepEqual(impact.paddle,contact);assert.deepEqual(impact.feet,ready.feet);assert.deepEqual(impact.hips,ready.hips);
  assert.ok(Math.abs(Math.hypot(impact.hand.x-contact.x,impact.hand.y-contact.y)-8)<.00001);
 }
});
test('two-handed grip stays connected through the entire stroke on both sides',()=>{
 for(const side of [-1,1])for(let i=0;i<=100;i++){
  const pose=sampleCharacterPose({mode:'twoBackhand',phase:i/100,side});
  assert.ok(pose.twoHanded);assert.ok(Math.hypot(pose.arms[0][2].x-pose.arms[1][2].x,pose.arms[0][2].y-pose.arms[1][2].y)<3);
 }
});
test('all ten stroke paths differ and recover to the same ready position',()=>{
 const signatures=MOTIONS.slice(2).map(mode=>[.28,.52,.78].map(phase=>sampleCharacterPose({mode,phase}).paddle));
 assert.equal(new Set(signatures.map(p=>JSON.stringify(p))).size,10);
 for(const mode of MOTIONS.slice(2))assert.deepEqual(sampleCharacterPose({mode,phase:0}).paddle,sampleCharacterPose({mode,phase:1}).paddle);
});
test('material changes cannot recolor another body part or the black paddle face',()=>{
 const base=appearancePalette(),shirt=appearancePalette({shirtColor:'red'}),hair=appearancePalette({hairColor:'pink'}),skin=appearancePalette({skinColor:'deep'}),edge=appearancePalette({paddleColor:'coral'});
 assert.notEqual(base.shirt,shirt.shirt);assert.equal(base.skin,shirt.skin);assert.equal(base.hair,shirt.hair);assert.equal(base.paddle,shirt.paddle);
 assert.notEqual(base.hair,hair.hair);assert.equal(base.shirt,hair.shirt);assert.notEqual(base.skin,skin.skin);assert.equal(base.shirt,skin.shirt);
 assert.notEqual(base.paddle,edge.paddle);assert.notEqual(edge.paddle,edge.paddleLight);assert.equal(edge.paddleInterior,'#10151d');assert.equal(base.skin,edge.skin);
});
