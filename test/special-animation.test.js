import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANIMATION_TEST_STROKES,SWING_SECONDS,ANIMATION_CYCLE_SECONDS,forceSpecialShot,applySpecialShotAnimation} from '../src/animation-test.js';
import {sampleStrokeAnimation} from '../src/stroke-animation.js';
import {Game} from '../src/game.js';

const characters=[['avery','male'],['selena','female']];

for(const [character,gender] of characters){
 for(const shot of ANIMATION_TEST_STROKES){
  test(`${gender} ${shot} can be forced through a complete swing animation`,()=>{
   const game=new Game(),player=forceSpecialShot(game,{shot,character});
   assert.equal(player.gender,gender);
   const physicalShot=shot==='forehand'||shot==='backhand'?'drive':shot;
   assert.equal(player.animationShot,physicalShot);
   assert.equal(game.lastShot,physicalShot);
   assert.equal(player.stroke,shot==='forehand'||shot==='backhand'?shot:'volley');
   assert.equal(player.swing,SWING_SECONDS);
   assert.equal(player.swingDuration,SWING_SECONDS);
   assert.equal(player.motion,'planted');
   assert.deepEqual(player.contactPoint,{x:10,y:35,z:3.35});
   assert.equal(game.events.at(-1).type,'hit');
   assert.equal(game.events.at(-1).shot,physicalShot);

   applySpecialShotAnimation(player,SWING_SECONDS*.5);
   assert.equal(player.swing,SWING_SECONDS*.5);
   applySpecialShotAnimation(player,SWING_SECONDS);
   assert.equal(player.swing,0);
   assert.equal(player.windup,0);
   applySpecialShotAnimation(player,ANIMATION_CYCLE_SECONDS*.65);
   assert.equal(player.swing,0);
   assert.equal(player.windup,.3);
  });
 }
}

test('the animation test rejects an unsupported stroke',()=>{
 assert.throws(()=>forceSpecialShot(new Game(),{shot:'drop'}),/Unsupported animation stroke/);
});

test('overhead, forehand and backhand use distinct sprite clips',()=>{
 const player={stroke:'forehand',animationShot:'drive',swingSide:1};
 const sequence=()=>[0,.2,.4,.6,.8,.95].map(progress=>sampleStrokeAnimation(player,progress));
 const forehand=sequence();
 player.stroke='backhand';
 const backhand=sequence();
 player.animationShot='overhead';
 const overhead=sequence();
 assert.equal(forehand[0].kind,'forehand');
 assert.equal(backhand[0].kind,'backhand');
 assert.equal(overhead[0].kind,'overhead');
 assert.notDeepEqual(forehand.map(sample=>sample.frameColumn),backhand.map(sample=>sample.frameColumn));
 assert.equal(forehand[0].mirror,!backhand[0].mirror);
 assert.equal(forehand[0].useSwingSheet,false);
 assert.equal(overhead[0].useSwingSheet,true);
 assert.ok(Math.min(...overhead.map(sample=>sample.offsetY))<Math.min(...forehand.map(sample=>sample.offsetY)));
 assert.ok(Math.min(...overhead.map(sample=>sample.rotation))<Math.min(...forehand.map(sample=>sample.rotation)));
});

test('stroke clips stay in bounds throughout their complete playback',()=>{
 for(const shot of ANIMATION_TEST_STROKES){
  const player={stroke:shot==='backhand'?'backhand':'forehand',animationShot:shot,swingSide:-1};
  for(let phase=0;phase<=1;phase+=.05){const sample=sampleStrokeAnimation(player,phase);assert.ok(sample.frameColumn>=0&&sample.frameColumn<=3);assert.ok(Number.isFinite(sample.offsetY));assert.ok(Number.isFinite(sample.rotation))}
 }
});


test('female backhands add a two-handed grip while male backhands remain one-handed',()=>{
 const female={gender:'female',stroke:'backhand',animationShot:'drive',swingSide:-1};
 const male={gender:'male',stroke:'backhand',animationShot:'drive',swingSide:-1};
 for(const progress of [0,.2,.4,.6,.8,.95]){
  const femaleSample=sampleStrokeAnimation(female,progress),maleSample=sampleStrokeAnimation(male,progress);
  assert.equal(femaleSample.twoHanded,true);
  assert.equal(maleSample.twoHanded,false);
  assert.ok(Number.isFinite(femaleSample.supportHandX));
  assert.ok(Number.isFinite(femaleSample.supportHandY));
 }
});
