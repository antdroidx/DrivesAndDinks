import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courtFrame,toggleFullscreen} from '../src/court-display.js';
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

test('scorebug marks only the team currently serving with a pickleball icon',()=>{
 const source=readFileSync(new URL('../src/court-display.js',import.meta.url),'utf8');
 assert.match(source,/serve\.className='serve-ball'/);
 assert.match(source,/servingTeam===0/);
 assert.match(source,/servingTeam===1/);
 assert.match(source,/game\.score\?\.team/);
});

test('all layouts use the full available width, even when portrait height is limited',()=>{
 for(const [width,height,stacked] of [[925,900,true],[390,460,true],[390,740,true],[568,300,false],[844,340,false],[1240,700,false]]){
 const frame=courtFrame(width,height,stacked);assert.equal(frame.width,width);assert.ok(frame.height<=height);assert.ok(frame.height+(stacked?42:0)<=height);
 }
});
test('portrait screenshot regression does not shrink width to fit the controls plus a square court',()=>{
 assert.deepEqual(courtFrame(925,900,true),{width:925,height:854});
 assert.deepEqual(courtFrame(390,460,true),{width:390,height:414});
});
test('landscape restores its full-width view with the original available height',()=>{
 assert.deepEqual(courtFrame(844,340,false),{width:844,height:340});
 assert.deepEqual(courtFrame(1240,700,false),{width:1240,height:700});
});
