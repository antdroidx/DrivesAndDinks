import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAnimeGameRenderer,animeGameLayout,resolveAnimeGameDesign} from '../src/anime-game.js';
import {animePose} from '../src/anime-character.js';
import {CHARACTER_CONCEPTS} from '../src/character-concepts.js';
import {MOTIONS} from '../src/pixel-character.js';
import {COURT_VENUES,chooseCourtVenue,drawCourtBackdrop} from '../src/court-venues.js';
function context(){let depth=0;return new Proxy({get depth(){return depth},getImageData(){return {data:new Uint8ClampedArray(144*144*4)}}},{get(target,key){if(key in target)return target[key];return (...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));if(key==='save')depth++;if(key==='restore')assert.ok(--depth>=0)}},set(){return true}})}
test('game adapter draws both styles across the motion library without canvas leaks',()=>{
 const c=context();let allocated=0;const draw=createAnimeGameRenderer(()=>{allocated++;return {getContext:context}});
 for(const style of ['anime','anime-pixel'])for(const mode of ['idle',...MOTIONS])for(const view of ['near','far']){
  draw(c,{style,mode,view,phase:.52,frame:1.7,moving:true,x:100,y:120,width:70.5,height:94,appearance:{body:'female'},characterId:'selena',alignTo:{x:140,y:180},alignStrength:.5});assert.equal(c.depth,0);
 }assert.equal(allocated,1,'reuse the Fine pixel surface instead of allocating each frame');
});
test('game adapter converts world contact into the same pose coordinates at each body height',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const view of ['near','far']){
  const p=animePose(d,'forehand',.52,view),options={x:10,y:20,width:70,height:94,mode:'forehand',phase:.52},base=animeGameLayout(options,d);
  const target={x:base.cx+(p.paddle.x-24)*base.scale,y:base.baseline+(p.paddle.y-63)*base.scale},layout=animeGameLayout({...options,alignTo:target},d);
  assert.ok(Number.isFinite(layout.contact.x)&&Number.isFinite(layout.contact.y));assert.ok(Math.abs(layout.contact.y-(63+(p.paddle.y-63)*177/d.height))<1e-8);
 }
});
test('venue randomization avoids immediate repeats and preserves valid court colors',()=>{
 for(const venue of COURT_VENUES){for(const random of [0,.25,.5,.999])assert.notEqual(chooseCourtVenue(venue.id,()=>random).id,venue.id);for(const key of ['court','kitchen','outer','outerLight','apron','line','background'])assert.match(venue[key],/^#[0-9a-f]{6}$/i);const c=context();drawCourtBackdrop(c,venue,{x:-100,y:-200,width:1160,height:800});assert.equal(c.depth,0)}
});

test('personal height and build affect appearance without mutating the selected preset',()=>{
 for(const source of CHARACTER_CONCEPTS){const before=JSON.stringify(source),options={designId:source.id},base=resolveAnimeGameDesign(options),lean=resolveAnimeGameDesign({...options,customHeight:150,customBuild:.05}),broad=resolveAnimeGameDesign({...options,customHeight:205,customBuild:1.05});assert.equal(base.height,source.height);assert.equal(lean.height,150);assert.equal(broad.height,205);assert.ok(lean.waist<broad.waist);assert.equal(JSON.stringify(source),before)}
});

test('preview and gameplay resolve the same selected hair style',()=>{
 const selected=resolveAnimeGameDesign({appearance:{body:'female',hairStyle:'twinTails'},characterId:'selena'});
 const fallback=resolveAnimeGameDesign({appearance:{body:'female',hairStyle:'spiky'},characterId:'selena'});
 const designed=resolveAnimeGameDesign({appearance:{body:'female'},characterId:'selena'});
 assert.equal(selected.hair,'twinTails');
 assert.equal(fallback.hair,designed.hair);
});

test('resolved game appearance carries headwear and eyewear',()=>{
 const design=resolveAnimeGameDesign({appearance:{headwear:'cap',eyewear:'glasses'}});
 assert.equal(design.headwear,'cap');assert.equal(design.eyewear,'glasses');
});
