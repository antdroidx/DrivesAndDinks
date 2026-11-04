import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDialogBounds} from '../src/selection.js';
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
