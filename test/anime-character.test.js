import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawAnimeAthlete,animePose,animeHeadCenter,skinPalette,animePixelPalette,animeTorso,animeBodyDimensions} from '../src/anime-character.js';
import {CHARACTER_CONCEPTS,HAIR_OPTIONS} from '../src/character-concepts.js';
import {MOTIONS,sampleCharacterPose} from '../src/pixel-character.js';import {readFileSync} from 'node:fs';
function context(){let depth=0,calls=0;return new Proxy({get depth(){return depth},get calls(){return calls}},{get(target,key){if(key in target)return target[key];return (...args)=>{calls++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),`${key}: invalid coordinate`);if(key==='save')depth++;if(key==='restore')assert.ok(--depth>=0)}},set(){return true}})}
test('anime body and costume render every motion, body and court view in both art directions',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of ['idle',...MOTIONS])for(const view of ['far','near'])for(const phase of [0,.25,.52,.8,1])for(const look of ['sports','storybook'])for(const outfit of ['performance','polo','shorts']){
  const before=JSON.stringify(d),c=context();drawAnimeAthlete(c,{...d,outfit,eyewear:'glasses'},mode,phase,view,120,266,2.9,{look});assert.equal(c.depth,0);assert.ok(c.calls>100);assert.equal(JSON.stringify(d),before);
 }
});
test('anime redesign retains shared grip and stroke-facing decisions including the rear tweener',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of MOTIONS)for(const view of ['near','far']){
  const p=animePose(d,mode,.52,view),raw=sampleCharacterPose({mode,phase:.52,view,frame:2.08});assert.equal(p.raw.view,raw.view);assert.equal(p.raw.gripSide,raw.gripSide);assert.deepEqual(p.hand,p.arms[raw.gripSide][2]);
  assert.ok(Math.hypot(p.paddle.x-p.hand.x,p.paddle.y-p.hand.y)<15);
 }
});
test('anime hair and headwear combinations remain drawable in front and back views',()=>{
 for(const body of ['male','female'])for(const hair of [...HAIR_OPTIONS[body],{id:'bald'}])for(const headwear of ['none','cap','visor','headband'])for(const view of ['near','far']){
  const d={...CHARACTER_CONCEPTS.find(d=>d.body===body),hair:hair.id,headwear},c=context();drawAnimeAthlete(c,d,'forehand',.52,view,120,266,2.9);assert.equal(c.depth,0);
 }
});

test('rear views suppress front collar and bald facial highlights',()=>{
 const source=readFileSync(new URL('../src/anime-character.js',import.meta.url),'utf8');
 assert.match(source,/if\(d\.outfit==='polo'\)\{\s*if\(!near\)/);
 assert.match(source,/if\(bald\)\{\s*if\(!near\)/);
 assert.doesNotMatch(source,/if\(sole\)path/);
 assert.doesNotMatch(source,/else path\(c,\[point\(x\+5\.8,y-3\.2\)/);
});

test('shortened head placement keeps a compact chin-to-collar gap across bodies and motions',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of MOTIONS)for(const phase of [0,.52,1]){
  const p=animePose(d,mode,phase,'far'),chin=animeHeadCenter(p.neck).y+6.1,collar=p.neck.y+.2+2.2;
  assert.ok(collar-chin>1&&collar-chin<3);assert.equal(animeHeadCenter(p.neck).x,p.neck.x);
 }
});
test('skin ramps preserve the selected base tone and ordered lighting in the pixel palette',()=>{
 const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)).reduce((a,b)=>a+b,0);
 for(const d of CHARACTER_CONCEPTS){const p=skinPalette(d.skin),palette=animePixelPalette(d);assert.equal(p.base,d.skin);assert.ok(luminance(p.light)>luminance(p.base));assert.ok(luminance(p.base)>luminance(p.shadow));assert.ok(luminance(p.shadow)>luminance(p.deep));assert.ok(palette.length<=20);for(const hex of Object.values(p)){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16));assert.ok(palette.some(color=>color.every((v,i)=>v===rgb[i])))} }
});

test('female crop top has an exposed waist while other supported outfits retain full torso coverage',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of MOTIONS)for(const phase of [0,.25,.52,.8,1])for(const outfit of ['performance','polo','shorts']){
  const design={...d,outfit},p=animePose(design,mode,phase,'far'),t=animeTorso(design,p);
  assert.equal(t.crop,d.body==='female'&&outfit==='shorts');assert.equal(t.bottom-t.hem,t.crop?5:0);assert.ok(t.hem>t.top);
 }
});

test('upper legs attach inside the torso silhouette for every body preset',()=>{
 for(const d of CHARACTER_CONCEPTS){const p=animePose(d,'idle',0,'far'),body=animeBodyDimensions(d);for(const leg of p.legs){const outer=Math.abs(leg[0].x-p.hips.x)+body.thigh/2;assert.ok(outer<=body.hip+.25,`${d.id}: upper leg outside pelvis`)}assert.ok(body.hip<d.shoulder*.97)}
});
