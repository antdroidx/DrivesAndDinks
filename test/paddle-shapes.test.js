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

test('sweet spots follow shape geometry and power leverage',()=>{
  const wide=buildProfile({character:'avery',paddleShape:'wide'});
  const elongated=buildProfile({character:'avery',paddleShape:'elongated'});
  const hybrid=buildProfile({character:'avery',paddleShape:'hybrid'});
  const wideSpot=paddleShapeModifiers(wide),elongatedSpot=paddleShapeModifiers(elongated),hybridSpot=paddleShapeModifiers(hybrid);
  assert.ok(wideSpot.radiusX>hybridSpot.radiusX&&hybridSpot.radiusX>elongatedSpot.radiusX);
  assert.ok(elongatedSpot.radiusZ>hybridSpot.radiusZ&&hybridSpot.radiusZ>wideSpot.radiusZ);
  assert.ok(elongatedSpot.centerZ>hybridSpot.centerZ&&hybridSpot.centerZ>wideSpot.centerZ);
  assert.ok(elongatedSpot.powerGain>hybridSpot.powerGain&&hybridSpot.powerGain>wideSpot.powerGain);
  const center={x:10,y:35,z:1.5},base={ball:center,incoming:{x:0,y:-20,z:0},paddleVelocity:{x:0,y:-10,z:0},normal:{x:0,y:-1,z:0},center,quality:1,swingDirection:1};
  const lateral={...base,ball:{...center,x:center.x+1}};
  const upper={...base,ball:{...center,z:center.z+1.2}};
  const wideLateral=paddleContactResponse({...lateral,sweetSpotShape:wideSpot});
  const elongatedLateral=paddleContactResponse({...lateral,sweetSpotShape:elongatedSpot});
  const wideUpper=paddleContactResponse({...upper,sweetSpotShape:wideSpot});
  const elongatedUpper=paddleContactResponse({...upper,sweetSpotShape:elongatedSpot});
  const hybridUpper=paddleContactResponse({...upper,sweetSpotShape:hybridSpot});
  assert.ok(wideLateral.sweetSpot>elongatedLateral.sweetSpot);
  assert.ok(elongatedUpper.sweetSpot>wideUpper.sweetSpot);
  assert.ok(elongatedUpper.sweetSpot>hybridUpper.sweetSpot);
  assert.ok(elongatedUpper.paceScale>wideUpper.paceScale);
});
test('new paddle shapes can define contact geometry and influence from data',()=>{
  const profile=buildProfile({character:'avery',paddleShape:'elongated'});
  for(const key of ['sweetSpotCenterX','sweetSpotCenterZ','sweetSpotRadiusX','sweetSpotRadiusZ','sweetSpotPowerGain','sweetSpotControlGain','sweetSpotSpinGain','sweetSpotEdgePenalty'])assert.ok(key in profile.paddle,key);
  const center={x:10,y:35,z:1.5},base={ball:{x:11,y:35,z:1.5},incoming:{x:0,y:-20,z:0},paddleVelocity:{x:0,y:-10,z:0},normal:{x:0,y:-1,z:0},center,quality:1,swingDirection:1};
  const neutral=paddleContactResponse({...base,sweetSpotShape:{radiusX:1,radiusZ:1,centerX:0,centerZ:0,powerGain:1,controlGain:1,spinGain:1,edgePenalty:1}});
  const custom=paddleContactResponse({...base,sweetSpotShape:{radiusX:1,radiusZ:1,centerX:0,centerZ:0,powerGain:1,controlGain:1.6,spinGain:1.6,edgePenalty:1}});
  assert.ok(Math.abs(custom.aimError)<Math.abs(neutral.aimError));
  assert.ok(Math.abs(custom.spinKick)>Math.abs(neutral.spinKick));
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