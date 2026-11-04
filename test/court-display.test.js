import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courtSize,courtFrame,controlLaneWidth,toggleFullscreen} from '../src/court-display.js';
test('court fits both screenshot viewports without a vertical centering gap',()=>{
 for(const [w,h,stack] of [[925,1080,true],[1208,600,false],[390,740,true],[844,340,false]]){const size=courtSize(w,h,stack);assert.equal(size,Math.floor(Math.min(w,h-46)));assert.ok(size<=w);assert.ok(size<=h-46);assert.ok(size>Math.min(w,h)*.5)}
});
test('fullscreen requests browser chrome be hidden and supports exit',async()=>{
 const calls=[],doc={exitFullscreen:async()=>calls.push('exit')},element={requestFullscreen:async options=>calls.push(options)};
 assert.equal(await toggleFullscreen(doc,element),true);assert.deepEqual(calls,[{navigationUI:'hide'}]);doc.fullscreenElement=element;assert.equal(await toggleFullscreen(doc,element),false);assert.equal(calls[1],'exit');
});
test('unsupported or blocked fullscreen rejects for the visible fallback',async()=>{
 await assert.rejects(toggleFullscreen({},{}));await assert.rejects(toggleFullscreen({},{requestFullscreen:async()=>{throw new Error('blocked')}}),/blocked/);
});
test('prefixed fullscreen enters and exits through the browser methods',async()=>{
 const calls=[],element={webkitRequestFullscreen:async()=>calls.push('enter')},doc={webkitExitFullscreen:async()=>calls.push('exit')};await toggleFullscreen(doc,element);doc.webkitFullscreenElement=element;await toggleFullscreen(doc,element);assert.deepEqual(calls,['enter','exit']);
});

test('overlay controls reclaim the former side and bottom reservations',()=>{
 assert.equal(courtSize(390,440,true),390);
 assert.equal(courtSize(620,740,false),620);
 assert.equal(courtSize(390,440,true),courtSize(390,440,false));
});

test('landscape frame uses all available width and height instead of a square',()=>{
 assert.deepEqual(courtFrame(1208,700,false),{width:1208,height:700});
 assert.deepEqual(courtFrame(844,340,false),{width:844,height:340});
 assert.deepEqual(courtFrame(390,740,true),{width:390,height:506});
});

test('landscape thumb lanes stay outside the rendered court at phone and tablet widths',()=>{
 for(const width of [568,667,844,1240,1600]){const lane=controlLaneWidth(width),courtLeft=lane,courtRight=width-lane;assert.ok(12+(lane-24)<courtLeft);assert.ok(width-12-(lane-24)>courtRight);assert.ok(courtRight-courtLeft>=280);assert.ok(lane-24>=88)}
});

test('portrait keeps its court width while reserving a finger-safe strip underneath',()=>{
 const f=courtFrame(390,740,true),courtBottom=f.height-116;assert.equal(f.width,390);assert.equal(courtBottom,390);assert.ok(f.height+46<=740);
 const short=courtFrame(390,460,true);assert.ok(short.height+46<=460);assert.equal(short.width,short.height-116);
});
