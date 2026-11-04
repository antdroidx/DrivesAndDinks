import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawAnimeAthlete,animePose} from '../src/anime-character.js';
import {CHARACTER_CONCEPTS,HAIR_OPTIONS} from '../src/character-concepts.js';
import {MOTIONS,sampleCharacterPose} from '../src/pixel-character.js';
function context(){let depth=0,calls=0;return new Proxy({get depth(){return depth},get calls(){return calls}},{get(target,key){if(key in target)return target[key];return (...args)=>{calls++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),`${key}: invalid coordinate`);if(key==='save')depth++;if(key==='restore')assert.ok(--depth>=0)}},set(){return true}})}
test('anime body and costume render every motion, body and court view in both art directions',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of ['idle',...MOTIONS])for(const view of ['far','near'])for(const phase of [0,.25,.52,.8,1])for(const look of ['sports','storybook']){
  const before=JSON.stringify(d),c=context();drawAnimeAthlete(c,d,mode,phase,view,120,266,2.9,{look});assert.equal(c.depth,0);assert.ok(c.calls>100);assert.equal(JSON.stringify(d),before);
 }
});
test('anime redesign retains shared grip and stroke-facing decisions including the rear tweener',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of MOTIONS)for(const view of ['near','far']){
  const p=animePose(d,mode,.52,view),raw=sampleCharacterPose({mode,phase:.52,view,frame:2.08});assert.equal(p.raw.view,raw.view);assert.equal(p.raw.gripSide,raw.gripSide);assert.deepEqual(p.hand,p.arms[raw.gripSide][2]);
  assert.ok(Math.hypot(p.paddle.x-p.hand.x,p.paddle.y-p.hand.y)<15);
 }
});
test('anime hair and headwear combinations remain drawable in front and back views',()=>{
 for(const body of ['male','female'])for(const hair of HAIR_OPTIONS[body])for(const headwear of ['none','cap','visor','headband'])for(const view of ['near','far']){
  const d={...CHARACTER_CONCEPTS.find(d=>d.body===body),hair:hair.id,headwear},c=context();drawAnimeAthlete(c,d,'forehand',.52,view,120,266,2.9);assert.equal(c.depth,0);
 }
});
