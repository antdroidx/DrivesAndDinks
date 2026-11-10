import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildProfile,createLineup,effectiveRatings,selectionStats,normalizeSelection} from '../src/roster.js';
import {Game} from '../src/game.js';
import {paddleContactResponse,paddleContactTarget,paddleShapeModifiers} from '../src/core.js';
import {paddleCutout,paddleOutline} from '../src/pixel-character.js';
import {strokeDuration} from '../src/match-animation.js';

const span=(points,index)=>Math.max(...points.map(point=>point[index]))-Math.min(...points.map(point=>point[index]));

test('paddle shapes trade reach, power, hand speed and sweet-spot width',()=>{
  const wide=buildProfile({character:'avery',paddle:'balanced',paddleShape:'widebody'});
  const elongated=buildProfile({character:'avery',paddle:'balanced',paddleShape:'elongated-flat'});
  const hybrid=buildProfile({character:'avery',paddle:'balanced',paddleShape:'hybrid-flat'});
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
  const wide=buildProfile({character:'avery',paddleShape:'widebody'});
  const elongated=buildProfile({character:'avery',paddleShape:'elongated-flat'});
  const hybrid=buildProfile({character:'avery',paddleShape:'hybrid-flat'});
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
  const profile=buildProfile({character:'avery',paddleShape:'elongated-flat'});
  for(const key of ['sweetSpotCenterX','sweetSpotCenterZ','sweetSpotRadiusX','sweetSpotRadiusZ','sweetSpotPowerGain','sweetSpotControlGain','sweetSpotSpinGain','sweetSpotEdgePenalty'])assert.ok(key in profile.paddle,key);
  const center={x:10,y:35,z:1.5},base={ball:{x:11,y:35,z:1.5},incoming:{x:0,y:-20,z:0},paddleVelocity:{x:0,y:-10,z:0},normal:{x:0,y:-1,z:0},center,quality:1,swingDirection:1};
  const neutral=paddleContactResponse({...base,sweetSpotShape:{radiusX:1,radiusZ:1,centerX:0,centerZ:0,powerGain:1,controlGain:1,spinGain:1,edgePenalty:1}});
  const custom=paddleContactResponse({...base,sweetSpotShape:{radiusX:1,radiusZ:1,centerX:0,centerZ:0,powerGain:1,controlGain:1.6,spinGain:1.6,edgePenalty:1}});
  assert.ok(Math.abs(custom.aimError)<Math.abs(neutral.aimError));
  assert.ok(Math.abs(custom.spinKick)>Math.abs(neutral.spinKick));
});
test('shape visuals are distinct and selected ratings combine shape with paddle family',()=>{
  assert.ok(span(paddleOutline('widebody'),0)>span(paddleOutline('hybrid-flat'),0));
  assert.ok(span(paddleOutline('elongated-flat'),1)>span(paddleOutline('hybrid-flat'),1));
  assert.notDeepEqual(paddleOutline('widebody'),paddleOutline('elongated-flat'));
  const base=selectionStats({}),wide=effectiveRatings({paddleShape:'widebody'}),elongated=effectiveRatings({paddleShape:'elongated-flat'});
  assert.ok(wide.volley>base.volley&&wide.power<base.power);
  assert.ok(elongated.power>base.power&&elongated.reach>base.reach&&elongated.volley<base.volley);
  assert.equal(normalizeSelection({paddleShape:'invalid'}).paddleShape,'hybrid-flat');
  assert.equal(normalizeSelection({paddleShape:'hybrid'}).paddleShape,'hybrid-flat');
});

test('all eleven roadmap silhouettes have distinct shared renderer definitions',()=>{
  const ids=['widebody','hybrid-aero','hybrid-flat','elongated-flat','elongated-aero','elongated-short-handle','widebody-cutout','elongated-cutout','round','tennis','tennis-extended-handle'];
  const outlines=ids.map(id=>paddleOutline(id));
  assert.equal(new Set(outlines.map(points=>JSON.stringify(points))).size,ids.length);
  assert.deepEqual(paddleOutline('hybrid'),paddleOutline('hybrid-flat'));
  for(const points of outlines){
    assert.ok(points.length>=11);
    assert.ok(points.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)));
  }
});

test('cut-out paddles use a smooth outer silhouette with a centered opening',()=>{
  for(const id of ['widebody-cutout','elongated-cutout']){
    const outline=paddleOutline(id),cutout=paddleCutout(id);
    assert.ok(outline.length>=12);
    assert.ok(cutout&&cutout.length>=7);
    assert.equal(cutout[0][0],0);
    assert.ok(Math.max(...cutout.map(point=>point[1]))<Math.max(...outline.map(point=>point[1])));
  }
});

test('generated CPU players receive independent random paddle shapes',()=>{
  const lineup=createLineup({character:'avery',paddleShape:'hybrid-flat'});
  for(const player of lineup)assert.ok(['widebody','hybrid-aero','hybrid-flat','elongated-flat','elongated-aero','elongated-short-handle','widebody-cutout','elongated-cutout','round','tennis','tennis-extended-handle'].includes(player.paddle.shapeId));
});