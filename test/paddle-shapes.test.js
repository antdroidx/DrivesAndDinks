import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildProfile,createLineup,effectiveRatings,selectionStats,normalizeSelection} from '../src/roster.js';
import {Game} from '../src/game.js';
import {paddleContactResponse,paddleContactTarget,paddleShapeModifiers} from '../src/core.js';
import {paddleOutline} from '../src/pixel-character.js';
import {strokeDuration} from '../src/match-animation.js';

const span=(points,index)=>Math.max(...points.map(point=>point[index]))-Math.min(...points.map(point=>point[index]));

test('paddle shapes trade reach, power, hand speed and sweet-spot width',()=>{
  const wide=buildProfile({character:'avery',paddle:'balanced',paddleShape:'wide'});
  const elongated=buildProfile({character:'avery',paddle:'balanced',paddleShape:'elongated'});
  const hybrid=buildProfile({character:'avery',paddle:'balanced',paddleShape:'hybrid'});
  wide.team=elongated.team=hybrid.team=0;wide.x=elongated.x=hybrid.x=10;wide.y=elongated.y=hybrid.y=35;
  const incoming={x:12,y:35,z:2};
  assert.ok(paddleContactTarget(elongated,incoming).x>paddleContactTarget(wide,incoming).x);
  assert.ok(paddleShapeModifiers(elongated).reach>paddleShapeModifiers(wide).reach);
  const game=new Game();
  assert.ok(game.paddleFor(elongated).power>game.paddleFor(wide).power);
  assert.ok(game.paddleFor(wide).control>game.paddleFor(elongated).control);
  assert.ok(strokeDuration(wide,'drive')<strokeDuration(hybrid,'drive'));
  assert.ok(strokeDuration(elongated,'drive')>strokeDuration(hybrid,'drive'));
  const center={x:10,y:35,z:1.5},base={ball:center,incoming:{x:0,y:-20,z:0},paddleVelocity:{x:0,y:-10,z:0},normal:{x:0,y:-1,z:0},center,quality:1,swingDirection:1};
  const wideContact=paddleContactResponse({...base,ball:{...center,x:10.55},sweetSpotScale:paddleShapeModifiers(wide).sweetSpot});
  const elongatedContact=paddleContactResponse({...base,ball:{...center,x:10.55},sweetSpotScale:paddleShapeModifiers(elongated).sweetSpot});
  assert.ok(wideContact.sweetSpot>elongatedContact.sweetSpot);
});

test('shape visuals are distinct and selected ratings combine shape with paddle family',()=>{
  assert.ok(span(paddleOutline('wide'),0)>span(paddleOutline('hybrid'),0));
  assert.ok(span(paddleOutline('elongated'),1)>span(paddleOutline('hybrid'),1));
  assert.notDeepEqual(paddleOutline('wide'),paddleOutline('elongated'));
  const base=selectionStats({}),wide=effectiveRatings({paddleShape:'wide'}),elongated=effectiveRatings({paddleShape:'elongated'});
  assert.ok(wide.volley>base.volley&&wide.power<base.power);
  assert.ok(elongated.power>base.power&&elongated.reach>base.reach&&elongated.volley<base.volley);
  assert.equal(normalizeSelection({paddleShape:'invalid'}).paddleShape,'hybrid');
});

test('generated CPU players receive independent random paddle shapes',()=>{
  const lineup=createLineup({character:'avery',paddleShape:'hybrid'});
  for(const player of lineup)assert.ok(['wide','elongated','hybrid'].includes(player.paddle.shapeId));
});