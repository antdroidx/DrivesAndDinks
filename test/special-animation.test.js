import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANIMATION_TEST_STROKES,SWING_SECONDS,ANIMATION_CYCLE_SECONDS,forceSpecialShot,applySpecialShotAnimation} from '../src/animation-test.js';
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
   assert.equal(player.stroke,shot==='backhand'?'backhand':'forehand');
   assert.equal(player.swing,SWING_SECONDS);
   assert.equal(player.swingDuration,SWING_SECONDS);
   assert.equal(player.motion,'planted');
   assert.deepEqual(player.contactPoint,{x:10,y:35,z:shot==='overhead'?6:3.35});
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
