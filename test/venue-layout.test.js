import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SCENE_LAYOUTS,scenePlacement} from '../src/court-art.js';

// Where the back barrier meets the ground in each active plate, measured from the
// artwork. The court baseline has to land below that line, otherwise the far
// players stand on the barrier instead of on ground in front of it.
const BARRIER={outdoor:.2984,indoor:.3145,stadium:.2661};

test('the court baseline lands on open ground behind the venue barrier',()=>{
 for(const [id,layout] of Object.entries(SCENE_LAYOUTS)){
  const barrier=BARRIER[id];
  assert.ok(barrier!==undefined,id + ': no measured barrier height');
  assert.ok(layout.far>barrier,id + ': the baseline sits on the barrier');
  const height=374/(layout.near-layout.far),strip=(layout.far-barrier)*height;
  assert.ok(strip>=35,id + ': only ' + strip.toFixed(1) + ' units of ground behind the baseline');
 }
});

test('every venue plate covers the whole court depth and some apron',()=>{
 for(const [id,layout] of Object.entries(SCENE_LAYOUTS)){
  const placement=scenePlacement(layout);
  assert.ok(placement.y<=204,id + ': the plate does not reach the far baseline');
  assert.ok(placement.y+placement.height>=578,id + ': the plate stops short of the near baseline');
  assert.ok(placement.width===960,id);
 }
});




