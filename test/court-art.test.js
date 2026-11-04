import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {drawCourtNet} from '../src/court-net.js';
import {SCENE_LAYOUTS,scenePlacement,createCourtArtRenderer,createCourtSurfaceRenderer,retroCourtPalette} from '../src/court-art.js';
import {COURT_VENUES} from '../src/court-venues.js';
function context(){let depth=0;const rects=[];return new Proxy({rects,get depth(){return depth},getImageData(){return {data:new Uint8ClampedArray(320*200*4)}}},{get(target,key){if(key in target)return target[key];return (...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));if(key==='save')depth++;if(key==='restore')assert.ok(--depth>=0);if(key==='fillRect')rects.push(args)}},set(){return true}})}
test('net leaves mesh cells unfilled and draws opaque rectangles only for narrow posts',()=>{
 for(const retro of [false,true]){const c=context();drawCourtNet(c,{x:280,y:391},{x:680,y:391},48,{retro});assert.equal(c.depth,0);assert.equal(c.rects.length,4);for(const [, ,width] of c.rects)assert.ok(width<=4,'no opaque rectangular net panel')}
});
test('every painted venue has a source asset and aligns its far and near baselines',()=>{
 for(const venue of COURT_VENUES){const layout=SCENE_LAYOUTS[venue.id];assert.ok(layout);assert.ok(existsSync(new URL('../assets/venues/'+layout.file,import.meta.url)));const p=scenePlacement(layout);assert.ok(Math.abs(p.y+layout.far*p.height-204)<1e-8);assert.ok(Math.abs(p.y+layout.near*p.height-578)<1e-8)}
});
test('painted and retro scenery load lazily and reuse their cached pixel treatment',()=>{
 const images=[],canvases=[];const draw=createCourtArtRenderer(()=>{const image={width:1586,height:992};images.push(image);return image},()=>{const canvas={getContext:context};canvases.push(canvas);return canvas});
 const c=context(),camera={x:0,y:0,width:960,height:600};assert.equal(images.length,0);assert.equal(draw(c,COURT_VENUES[0],camera),false);assert.equal(images.length,1);images[0].onload();
 assert.equal(draw(c,COURT_VENUES[0],camera),true);assert.equal(draw(c,COURT_VENUES[0],camera,'retro'),true);assert.equal(canvases.length,1);assert.equal(images.length,1);assert.equal(c.depth,0);
});
test('court art uses a coarse raster for retro style and preserves valid surface geometry',()=>{
 const canvases=[],draw=createCourtSurfaceRenderer((x,y)=>({x:480+(x-10)*(13+y*.21),y:204+y*8.5}),()=>{const canvas={getContext:context};canvases.push(canvas);return canvas}),c=context(),palette=COURT_VENUES[0];
 draw(c,palette,'painted');assert.equal(canvases[0].width,1920);draw(c,retroCourtPalette(palette),'retro');assert.equal(canvases[0].width,320);assert.equal(canvases.length,1);assert.equal(c.depth,0);
});

import {courtBackdropColor,drawCourtBackdrop} from '../src/court-venues.js';
test('loading and no-background surrounds use only a court-derived flat color',()=>{
 const blue={court:'#357282',kitchen:'#8f9799'},red={court:'#565d63',kitchen:'#a43b45'};
 assert.notEqual(courtBackdropColor(blue),courtBackdropColor(red));assert.match(courtBackdropColor(blue),/^#[0-9a-f]{6}$/);
 const c=context();drawCourtBackdrop(c,blue,{x:-700,y:-100,width:2400,height:800});assert.deepEqual(c.rects,[[-700,-100,2400,800]]);assert.equal(c.depth,0);
});
