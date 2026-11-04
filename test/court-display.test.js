import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courtSize,courtFrame,toggleFullscreen} from '../src/court-display.js';
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
 assert.deepEqual(courtFrame(390,740,true),{width:390,height:390});
});
