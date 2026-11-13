import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer} from '../src/career/state.js';
import {equipmentSelection,STARTER_EQUIPMENT_ID} from '../src/career/equipment.js';
import {careerProfile} from '../src/career/matchmaking.js';
import {saveCareer,loadCareer,memoryStorage} from '../src/career/save.js';
import {
  EXPERIENCE_OPTIONS,STARTING_TRAITS,normalizeHeight,normalizeWeight,bodyAttributeModifiers,startingModifiers,centimetersToFeetInches,feetInchesToCentimeters,kilogramsToPounds,poundsToKilograms
} from '../src/career/creation.js';

const base=(overrides={})=>createCareer({name:'Creator',gender:'male',archetypeId:'remy',regionId:'north-america',cityId:'seattle',seed:4242,age:25,height:177,weight:80,experience:'athlete',trait:'none',...overrides});

test('a selected starting paddle is owned, equipped, saved and used on court',()=>{
  const state=base({startingPaddleId:'ignite-elongated-14',appearance:{paddleColor:'blue'}});
  assert.ok(state.equipment.owned.includes('ignite-elongated-14'));
  assert.equal(state.equipment.equipped,'ignite-elongated-14');
  assert.equal(state.equipment.purchases.length,0);
  const storage=memoryStorage();
  assert.ok(saveCareer(state,storage).ok);
  const loaded=loadCareer(storage).state;
  const selection=equipmentSelection(loaded);
  assert.equal(selection.paddle,'power');
  assert.equal(selection.shape,'elongated-aero');
  assert.equal(selection.color,'blue');
  assert.equal(selection.item.thickness,14);
  const profile=careerProfile(loaded.athlete,selection);
  assert.equal(profile.paddle.thickness,14);
  assert.equal(profile.paddle.shapeId,'elongated-aero');
});

test('missing or invalid starting paddle retains the existing default',()=>{
  assert.equal(base().equipment.equipped,STARTER_EQUIPMENT_ID);
  assert.equal(base({startingPaddleId:'not-a-paddle'}).equipment.equipped,STARTER_EQUIPMENT_ID);
});

test('experience controls the provisional starting level',()=>{
  const ratings=EXPERIENCE_OPTIONS.map(option=>base({experience:option.id}).athlete.formats.doubles);
  assert.deepEqual(ratings,[2.5,3,3.5,4,4.5]);
});

test('one-pound spinner steps survive the metric round trip',()=>{
  for(const pounds of [88,89,140,141,142,143,308,309]){
    const kilograms=poundsToKilograms(pounds,177,'male');
    assert.equal(kilogramsToPounds(kilograms),pounds,`${pounds} lb changed to ${kilogramsToPounds(kilograms)} lb`);
  }
});

test('height and weight modify physical attributes relative to body size',()=>{
  const compact=bodyAttributeModifiers({height:165,weight:62});
  const tallHeavy=bodyAttributeModifiers({height:198,weight:110});
  assert.ok(tallHeavy.reach>compact.reach);
  assert.ok(tallHeavy.power>compact.power);
  assert.ok(tallHeavy.agility<compact.agility);
  assert.equal(normalizeHeight(130),145);
  assert.equal(normalizeHeight(230),210);
  assert.equal(normalizeWeight(20),40);
  assert.equal(normalizeWeight(200),140);
});

test('height and weight convert between imperial input and metric simulation values',()=>{
  assert.deepEqual(centimetersToFeetInches(177),{feet:5,inches:10});
  assert.equal(feetInchesToCentimeters(5,10,'male'),178);
  assert.equal(kilogramsToPounds(80),176);
  assert.ok(Math.abs(poundsToKilograms(176,178,'male')-79.83)<.001);
  assert.equal(feetInchesToCentimeters(4,0,'male'),145);
  assert.equal(feetInchesToCentimeters(7,0,'male'),210);
});

test('career creation stores the chosen on-court character profile',()=>{
  const state=base({appearance:{handedness:'left',shirtColor:'red',paddleColor:'blue',highlightColor:'yellow',hairStyle:'design',hairColor:'black',skinColor:'deep',headwear:'none',eyewear:'none',outfit:'polo',court:'blue-gray'}});
  assert.equal(state.athlete.handedness,'left');
  assert.equal(state.athlete.shirtColor,'red');
  assert.equal(state.athlete.appearance.outfit,'polo');
  assert.equal(state.athlete.appearance.skinColor,'deep');
});

test('one starting trait adds a focused bonus',()=>{
  const plain=base({trait:'none'});
  const quick=base({trait:'quick_start'});
  const soft=base({trait:'soft_touch'});
  assert.ok(quick.athlete.peakRatings.agility>plain.athlete.peakRatings.agility);
  assert.ok(soft.athlete.peakRatings.dink>plain.athlete.peakRatings.dink);
  assert.equal(quick.athlete.startingTrait,'quick_start');
  assert.equal(quick.athlete.startingTraitLabel,STARTING_TRAITS.find(option=>option.id==='quick_start').label);
});

test('creation inputs are stored on the athlete',()=>{
  const state=base({height:191,weight:96,experience:'racket',trait:'student'});
  assert.equal(state.athlete.height,191);
  assert.equal(state.athlete.weight,96);
  assert.equal(state.athlete.experience,'racket');
  assert.equal(state.athlete.experienceLabel,'Racket-sport crossover');
  assert.equal(state.athlete.startingTrait,'student');
  assert.ok(state.athlete.bodyModifiers.reach>0);
});

test('the same creation choices and seed reproduce the same athlete',()=>{
  const a=base({experience:'casual',trait:'big_serve',height:185,weight:88});
  const b=base({experience:'casual',trait:'big_serve',height:185,weight:88});
  const c=base({experience:'casual',trait:'big_serve',height:185,weight:88,seed:99});
  assert.deepEqual(a.athlete.ratings,b.athlete.ratings);
  assert.notDeepEqual(a.athlete.ratings,c.athlete.ratings);
});

test('combined experience, body and trait modifiers remain bounded',()=>{
  const modifiers=startingModifiers({experience:'competitive',trait:'natural_athlete',height:210,weight:140});
  for(const value of Object.values(modifiers))assert.ok(Math.abs(value)<=15);
});
