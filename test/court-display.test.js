import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courtFrame,gameViewport,toggleFullscreen,COURT_HUD_HEIGHT} from '../src/court-display.js';

test('game fits a smaller visual viewport and follows its offset',()=>{
 assert.deepEqual(gameViewport(402,874,{width:350,height:600,offsetLeft:12,offsetTop:20,scale:1}),{width:350,height:600,left:12,top:20});
 assert.deepEqual(gameViewport(874,402,{width:1000,height:500,scale:1}),{width:874,height:402,left:0,top:0});
});

test('viewport fallback works without the API and pinch zoom keeps the existing layout',()=>{
 assert.deepEqual(gameViewport(402,681),{width:402,height:681,left:0,top:0});
 assert.equal(gameViewport(402,681,{width:201,height:340.5,scale:2}),null);
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

test('scorebug marks only the team currently serving with a pickleball icon',()=>{
 const source=readFileSync(new URL('../src/court-display.js',import.meta.url),'utf8');
 assert.match(source,/serve\.className='serve-ball'/);
 assert.match(source,/servingTeam===0/);
 assert.match(source,/servingTeam===1/);
 assert.match(source,/game\.score\?\.team/);
});

test('all layouts reserve the full score strip without shrinking court width',()=>{
 for(const [width,height] of [[925,900],[390,460],[390,740],[568,300],[844,340],[1240,700],[404,568],[640,360]]){
  const frame=courtFrame(width,height);assert.equal(frame.width,width);assert.ok(frame.height<=height);assert.equal(frame.height+COURT_HUD_HEIGHT+4,height);
 }
});
test('portrait keeps fold-outer width and fits below the score strip',()=>{
 assert.deepEqual(courtFrame(925,900),{width:925,height:842});
 assert.deepEqual(courtFrame(404,568),{width:404,height:510});
});
test('landscape uses full width and reserves scorebug space above the court',()=>{
 assert.deepEqual(courtFrame(844,340),{width:844,height:282});
 assert.deepEqual(courtFrame(640,360),{width:640,height:302});
});

test('scorebug has one stable row in both fold-outer orientations',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8'),source=readFileSync(new URL('../src/court-display.js',import.meta.url),'utf8');
 assert.match(css,/main\[data-court-layout="wide"\] \.playfield\{grid-template-columns:minmax\(0,1fr\);grid-template-rows:var\(--court-hud-height,54px\) var\(--court-height\)\}/);
 assert.doesNotMatch(css,/main\[data-court-layout="wide"\] #court-hud\{position:absolute/);
 assert.match(css,/main\[data-court-layout="stacked"\] \.playfield\{grid-template-rows:var\(--court-hud-height,54px\) var\(--court-height\)/);
 assert.match(css,/\.serve-ball\{position:relative;display:block;grid-column:2;grid-row:2/);
 assert.match(css,/\.score-meta\{grid-column:1\/-1;grid-row:2;align-self:center/);
 assert.match(source,/field\.style\.setProperty\('--court-hud-height',COURT_HUD_HEIGHT\+'px'\)/);
});
