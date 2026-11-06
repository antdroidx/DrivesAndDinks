import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {setupDialogBounds} from '../src/selection.js';
test('setup remains inside portrait, landscape and keyboard-sized visible viewports',()=>{
 for(const [width,height] of [[390,800],[844,390],[925,1180],[1240,810],[320,256]]){const b=setupDialogBounds({width,height});assert.ok(b.left>=0);assert.ok(b.top>=0);assert.ok(b.left+b.width<=width);assert.ok(b.top+b.height<=height);assert.equal(b.compact,b.width<650)}
});
test('zoomed and panned browser viewports position setup in the visible region',()=>{
 const v={width:360,height:580,offsetLeft:170,offsetTop:90},b=setupDialogBounds(v);
 assert.equal(b.left,178);assert.equal(b.top,98);assert.equal(b.width,344);assert.ok(b.left+b.width<=v.offsetLeft+v.width);assert.ok(b.top+b.height<=v.offsetTop+v.height);assert.equal(b.compact,true);
});
test('orientation change recomputes dialog dimensions rather than preserving the old width',()=>{
 const portrait=setupDialogBounds({width:390,height:800}),landscape=setupDialogBounds({width:800,height:390});assert.equal(portrait.width,374);assert.equal(landscape.width,740);assert.equal(landscape.height,374);assert.ok(landscape.top+landscape.height<=390);
});
test('browser zoom remains available and dialogs keep their own scrolling',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
 assert.match(css,/dialog\{touch-action:pan-y\}/);
 assert.match(css,/body:has\(dialog\[open\]\)\{overscroll-behavior:none\}/);
 assert.doesNotMatch(css,/\.game #shots @media/);
 assert.match(html,/name="hairStyle"/);
 assert.match(html,/id="hair-style"/);
 assert.match(html,/id="headwear"/);
 assert.match(html,/id="eyewear"/);
 assert.match(css,/\.score-team\{display:grid/);
 assert.match(css,/\.score-meta\{grid-column:1\/-1/);
});
