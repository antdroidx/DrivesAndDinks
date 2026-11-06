import {test} from 'node:test';
import assert from 'assert/strict';
import {CHARACTER_CONCEPTS} from '../src/character-concepts.js';
import {animeBodyDimensions} from '../src/anime-character.js';
import {profilePose,profileTorso,profileShorts} from '../src/profile-athlete.js';
import {MOTIONS} from '../src/pixel-character.js';import {readFileSync} from 'node:fs';

test('profile joints stay integrated and replay headwear follows live orientation',()=>{
 const profileSource=readFileSync(new URL('../src/profile-athlete.js',import.meta.url),'utf8');
 const replaySource=readFileSync(new URL('../src/side-replay.js',import.meta.url),'utf8');
 assert.doesNotMatch(profileSource,/joint\(c,/);
 assert.match(profileSource,/headwearBackwards/);
 assert.match(profileSource,/const brim=headwearBackwards\?-1:1/);
 assert.doesNotMatch(profileSource,/if\(!headwearBackwards\)\{const brim/);
 assert.match(replaySource,/headwearBackwards:false/);assert.doesNotMatch(replaySource,/headwearBackwards:p\.team===0/);
});

test('profile torsos retain a crop waist and never collapse their shirt hem',()=>{
 for(const base of CHARACTER_CONCEPTS)for(const outfit of ['performance','polo','shorts'])for(const mode of ['idle',...MOTIONS])for(const phase of [0,.25,.52,.8,1]){
  const design={...base,outfit},pose=profilePose(design,mode,phase,{direction:-1}),torso=profileTorso(design,pose),crop=base.body==='female'&&outfit==='shorts';
  assert.equal(torso.crop,crop);assert.ok(torso.shirtHem>torso.top+6.5);assert.ok(torso.shirtHem<torso.bottom);
  if(crop)assert.ok(torso.bottom-torso.shirtHem>3&&torso.bottom-torso.shirtHem<7);
 }
});

test('profile shorts stay attached to hips and stop on the upper thigh',()=>{
 for(const base of CHARACTER_CONCEPTS)for(const mode of ['idle',...MOTIONS])for(const phase of [0,.25,.52,.8,1]){
  const design={...base,outfit:'shorts'},pose=profilePose(design,mode,phase,{direction:1}),body=animeBodyDimensions(design),garment=profileShorts(pose.hips,pose.legs,body);
  assert.equal(garment.pieces.length,2);
  for(let i=0;i<2;i++){const chain=pose.legs[i],piece=garment.pieces[i],hip=chain[0],knee=chain[1],upper=Math.hypot(knee.x-hip.x,knee.y-hip.y),endDistance=Math.hypot(piece.end.x-hip.x,piece.end.y-hip.y);assert.ok(endDistance<=upper*.52+1e-6);assert.ok(Math.hypot(piece.polygon[0][0]-(hip.x-1),piece.polygon[0][1]-(hip.y-1))<body.thigh+2)}
  assert.ok(garment.width>=body.thigh*1.25);
 assert.ok(garment.hipWidth>=body.hip*.8);
 assert.ok(garment.waistband.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)));
 }
});


test('profile long hair and bun use dedicated silhouettes',()=>{const source=readFileSync(new URL('../src/profile-athlete.js',import.meta.url),'utf8');assert.match(source,/d\.hair==='long'/);assert.match(source,/d\.hair==='bun'/);});

test('profile braids and twin tails stay behind the face and pixie stays under hats',()=>{
 const source=readFileSync(new URL('../src/profile-athlete.js',import.meta.url),'utf8');
 assert.match(source,/for\(const \[offset,drift\] of \[\[0,-1\],\[1\.15,1\]\]\)/);
 assert.match(source,/const covered=d\.headwear==='cap'\|\|d\.headwear==='visor'/);
 assert.match(source,/if\(!covered\)roundedShape/);
 assert.doesNotMatch(source,/for\(const side of \[-1,1\]\)\{\s*line\(c,\[\{x:side\*4/);
});
