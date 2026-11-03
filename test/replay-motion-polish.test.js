import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleCharacterPose} from '../src/pixel-character.js';
import {readFileSync} from 'node:fs';
test('poach block and sliding reach have distinct contact heights and footwork',()=>{for(const view of ['near','far'])for(const travelSide of [-1,1]){const poach=sampleCharacterPose({mode:'poachLunge',phase:.52,view,travelSide}),slide=sampleCharacterPose({mode:'slideReturn',phase:.52,view,travelSide});assert.ok(slide.hips.y>poach.hips.y+2);assert.ok(slide.paddle.y>poach.paddle.y+2);assert.notDeepEqual(slide.feet,poach.feet);assert.equal(slide.feet[travelSide<0?0:1].y,59)}});
test('point replay controls are an absolute court overlay',()=>{const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),css=readFileSync(new URL('../style.css',import.meta.url),'utf8');assert.match(js,/querySelector\('\.game'\)\.append\(pointActions\)/);assert.match(css,/\.game \.point-actions\{position:absolute;/);assert.match(css,/\.point-actions\[hidden\]\{display:none\}/)});
