import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MOTIONS,CONTACT_PHASE,sampleCharacterPose,appearancePalette,ARM_LENGTHS,courtView,strokeForContact,solveArm3D,PIXEL_DENSITY,CHARACTER_BUFFER,animationRootOffset} from '../src/pixel-character.js';

test('every motion has two connected arms and legs, without pose discontinuities',()=>{
 for(const mode of MOTIONS)for(const view of ['near','far'])for(const side of [-1,1]){
  let previous;
  for(let i=0;i<=1000;i++){
   const pose=sampleCharacterPose({mode,view,side,phase:i/1000,frame:i/250});
   assert.equal(pose.arms.length,2);assert.equal(pose.legs.length,2);
   for(const chain of [...pose.arms,...pose.legs]){assert.equal(chain.length,3);for(const p of chain)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y))}
   if(previous){for(let arm=0;arm<2;arm++)for(let joint=0;joint<3;joint++){const a=pose.arms[arm][joint],b=previous.arms[arm][joint];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.6,`${mode}: arm joint jumps`)}assert.ok(Math.hypot(pose.paddle.x-previous.paddle.x,pose.paddle.y-previous.paddle.y)<.6,`${mode}: paddle jumps`);assert.ok(Math.abs(pose.angle-previous.angle)<.02,`${mode}: wrist jumps`)}
   previous=pose;
  }
 }
});
test('reachable contact locks the paddle face while preserving planted feet',()=>{
 for(const view of ['near','far'])for(const mode of MOTIONS.slice(2)){
  const ready=sampleCharacterPose({mode,view,phase:CONTACT_PHASE});
  const contact={x:ready.paddle.x+.2,y:ready.paddle.y-.2};
  const impact=sampleCharacterPose({mode,view,phase:CONTACT_PHASE,contact,contactWeight:1});
  assert.ok(Math.hypot(impact.paddle.x-contact.x,impact.paddle.y-contact.y)<1e-8,mode);
  assert.deepEqual(impact.feet,ready.feet);assert.deepEqual(impact.hips,ready.hips);
 }
});
test('all authored motions keep fixed human arm lengths without reaching the solver limit',()=>{
 for(const mode of ['idle',...MOTIONS])for(const view of ['near','far'])for(const side of [-1,1])for(let i=0;i<=200;i++){
  const pose=sampleCharacterPose({mode,view,side,phase:i/200,frame:i/50});
  assert.equal(pose.reachLimited,false,`${mode} ${i}: authored pose overreaches`);
  for(const chain of pose.arms3)for(let bone=0;bone<2;bone++){
   const a=chain[bone],b=chain[bone+1];
   assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-ARM_LENGTHS[bone])<1e-7,`${mode}: changing arm length`);
  }
 }
});
test('unreachable targets cannot dislocate or stretch the arm',()=>{
 const chain=solveArm3D({x:0,y:0,z:0},{x:100,y:100,z:100},{x:7,y:9,z:-4});
 for(let bone=0;bone<2;bone++){const a=chain[bone],b=chain[bone+1];assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-ARM_LENGTHS[bone])<1e-7)}
});
test('ready grips are forward, elbows stay below shoulders and back views occlude the arms',()=>{
 const front=sampleCharacterPose({view:'far'}),back=sampleCharacterPose({view:'near'});
 assert.ok(front.paddle.depth>0);assert.ok(back.paddle.depth<0);
 assert.ok(Math.abs(front.paddle.x+back.paddle.x-48)<1e-8);
 assert.ok(front.paddle.y>back.paddle.y);
 for(const view of ['far','near']){
  const pose=sampleCharacterPose({view});
  for(const chain of pose.arms3){assert.ok(chain[2].z>0);assert.ok(chain[1].y>chain[0].y);assert.ok(chain[1].z<chain[2].z)}
  for(const chain of pose.arms)for(let part=0;part<2;part++)assert.ok((chain[part].depth+chain[part+1].depth)*(view==='near'?-1:1)>0);
 }
});
test('court end determines facing and anatomical forehand/backhand, never stroke mirroring',()=>{
 assert.equal(courtView(0),'near');assert.equal(courtView(1),'far');
 for(const team of [0,1])for(const offset of [-1,1])assert.equal(strokeForContact({team,x:10},{x:10+offset}),offset*(team===0?1:-1)>0?'forehand':'backhand');
 for(const mode of ['forehand','backhand','forehandDink','backhandDink']){
  const front=sampleCharacterPose({mode,view:'far',phase:CONTACT_PHASE}),back=sampleCharacterPose({mode,view:'near',phase:CONTACT_PHASE});
  assert.ok(Math.abs(front.paddle.x+back.paddle.x-48)<1e-8);
  assert.ok(mode.startsWith('forehand')?back.paddle.x>24:back.paddle.x<24);
 }
});
test('two-handed grip stays connected through the entire stroke on both sides',()=>{
 for(const side of [-1,1])for(let i=0;i<=100;i++){
  const pose=sampleCharacterPose({mode:'twoBackhand',phase:i/100,side});
  assert.ok(pose.twoHanded);assert.ok(Math.hypot(pose.arms[0][2].x-pose.arms[1][2].x,pose.arms[0][2].y-pose.arms[1][2].y)<3);
 }
});
test('all stroke paths differ where authored and recover to the same ready position',()=>{
 const signatures=MOTIONS.slice(2).map(mode=>[.28,.52,.78].map(phase=>sampleCharacterPose({mode,phase}).paddle));
 assert.equal(new Set(signatures.map(p=>JSON.stringify(p))).size,MOTIONS.slice(2).length-1);
 for(const mode of MOTIONS.slice(2))assert.deepEqual(sampleCharacterPose({mode,phase:0}).paddle,sampleCharacterPose({mode,phase:1}).paddle);
});
test('material changes cannot recolor another body part or the black paddle face',()=>{
 const base=appearancePalette(),shirt=appearancePalette({shirtColor:'red'}),hair=appearancePalette({hairColor:'pink'}),skin=appearancePalette({skinColor:'deep'}),edge=appearancePalette({paddleColor:'coral'});
 assert.notEqual(base.shirt,shirt.shirt);assert.equal(base.skin,shirt.skin);assert.equal(base.hair,shirt.hair);assert.equal(base.paddle,shirt.paddle);
 assert.notEqual(base.hair,hair.hair);assert.equal(base.shirt,hair.shirt);assert.notEqual(base.skin,skin.skin);assert.equal(base.shirt,skin.shirt);
 assert.notEqual(base.paddle,edge.paddle);assert.equal('paddleLight' in edge,false);assert.equal(edge.paddleInterior,'#10151d');assert.equal(base.skin,edge.skin);
});

test('character raster detail stays above the original desktop density',()=>{
 assert.ok(PIXEL_DENSITY>=3);
 assert.equal(CHARACTER_BUFFER.width,96*PIXEL_DENSITY);
 assert.equal(CHARACTER_BUFFER.height,96*PIXEL_DENSITY);
});


test('stroke loading shifts stance and weight without moving the feet during contact alignment',()=>{
 const ready=sampleCharacterPose({mode:'forehand',phase:0,view:'near'});
 const loaded=sampleCharacterPose({mode:'forehand',phase:CONTACT_PHASE,view:'near'});
 const readyWidth=Math.abs(ready.feet[1].x-ready.feet[0].x),loadedWidth=Math.abs(loaded.feet[1].x-loaded.feet[0].x);
 assert.ok(loadedWidth>readyWidth);assert.ok(Math.abs(loaded.weightShift)>.1);
 const locked=sampleCharacterPose({mode:'forehand',phase:CONTACT_PHASE,view:'near',contact:{x:loaded.paddle.x,y:loaded.paddle.y-.2},contactWeight:1});
 assert.deepEqual(locked.feet,loaded.feet);assert.deepEqual(locked.hips,loaded.hips);
});

test('Erne includes an airborne contact and lateral travel',()=>{
 const erne=sampleCharacterPose({mode:'erne',phase:CONTACT_PHASE});
 assert.ok(erne.jump>.9);assert.ok(erne.feet[0].y<54&&erne.feet[1].y<54);assert.ok(erne.rootOffset>10);
 const landing=sampleCharacterPose({mode:'erne',phase:1});assert.ok(Math.abs(landing.jump)<1e-9);assert.ok(Math.abs(animationRootOffset('erne',1,1))<1e-9);
});
