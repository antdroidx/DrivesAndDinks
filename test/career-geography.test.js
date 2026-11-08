import {test} from 'node:test';
import assert from 'node:assert/strict';
import {REGIONS,allCities,allAreas,cityById,areaById,COMPETITION_EVENTS,EVENT_BY_ID,PRO_LEAGUE_DIVISION,formatRating,RATING_MIN,RATING_MAX,RATING_BRACKETS,divisionFor,majorCities} from '../src/career/geography.js';
import {trainingCost,createCareer} from '../src/career/state.js';

test('career geography is limited to North America and Asia',()=>{
  assert.deepEqual(REGIONS.map(region=>region.id),['north-america','asia']);
  assert.deepEqual(REGIONS.map(region=>region.label),['North America','Asia']);
  for(const region of REGIONS){
    assert.ok(region.areas.length>=5,`${region.id} needs several areas`);
    for(const area of region.areas)assert.ok(area.cities.length>=4,`${area.id} needs several cities`);
  }
});

test('every city id is unique across both regions',()=>{
  const ids=[...allCities('north-america'),...allCities('asia')].map(city=>city.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(ids.length,74);
});

test('cities resolve to their area and region',()=>{
  const seattle=cityById('north-america','seattle');
  assert.equal(seattle.label,'Seattle');
  assert.equal(seattle.areaId,'na-pacific');
  assert.equal(seattle.regionId,'north-america');
  assert.equal(cityById('asia','seattle'),null);
  assert.equal(cityById('north-america','not-a-city'),null);
  assert.ok(majorCities('asia').length>=10);
});

test('the ladder runs from club night to the pro league',()=>{
  assert.deepEqual(COMPETITION_EVENTS.map(event=>event.id),['club-night','local-league','city-open','regional-open','mlp-amateur','semi-pro','national','international','pro-league','mlp']);
  assert.equal(EVENT_BY_ID['pro-league'].scope,'world');
  assert.equal(EVENT_BY_ID['semi-pro'].scope,'region');
  assert.equal(EVENT_BY_ID['club-night'].kind??'practice','practice');
  for(const event of COMPETITION_EVENTS){
    assert.ok(event.energy>0,`${event.id} needs an energy cost`);
    assert.ok(event.skillFocus,`${event.id} needs a focus`);
  }
});

test('no event is gated on a rating, they run brackets instead',()=>{
  for(const event of COMPETITION_EVENTS){
    assert.equal(event.minRating,undefined,`${event.id} must not carry a rating gate`);
  }
  // Every event except the pro league fields brackets, and a bracket is one
  // of the published rating levels.
  const levelIds=RATING_BRACKETS.map(division=>division.id);
  for(const event of COMPETITION_EVENTS.filter(entry=>entry.id!=='pro-league')){
    assert.ok(event.brackets.length>0,`${event.id} should field brackets`);
    for(const id of event.brackets)assert.ok(levelIds.includes(id),`${event.id} runs unknown bracket ${id}`);
  }
});

test('bigger events run fewer and higher brackets',()=>{
  const club=EVENT_BY_ID['club-night'];
  const national=EVENT_BY_ID['national'];
  assert.ok(club.brackets.length>national.brackets.length);
  const clubLevels=club.brackets.map(id=>divisionFor(id==='2.0'?2.2:id==='2.5'?2.7:id==='3.0'?3.2:id==='3.5'?3.7:4).level);
  const nationalLevels=national.brackets.map(id=>divisionFor(id==='5.0+'?5.4:5).level);
  assert.ok(Math.min(...clubLevels)<Math.min(...nationalLevels),'the club night reaches lower levels');
});

test('the semi-pro circuit runs the 5.0+ bracket and the pro league does not gate on rating',()=>{
  assert.ok(EVENT_BY_ID['semi-pro'].brackets.includes('5.0+'));
  assert.equal(EVENT_BY_ID['pro-league'].brackets.length,0);
  assert.equal(EVENT_BY_ID['pro-league'].qualification,'pro-tour');
  assert.equal(EVENT_BY_ID['pro-league'].rankingLimit,undefined);
  assert.equal(PRO_LEAGUE_DIVISION.label,'Pro League Open');
});

test('the ladder reaches the whole published scale',()=>{
  for(const event of COMPETITION_EVENTS.filter(entry=>entry.brackets.length)){
    for(const id of event.brackets){
      const division=RATING_BRACKETS.find(entry=>entry.id===id);
      assert.ok(division.min>=RATING_MIN&&division.max<=RATING_MAX);
    }
  }
});

test('playing a rated match costs more than training, and bigger events cost more',()=>{
  const costs=COMPETITION_EVENTS.map(event=>event.energy);
  // A training session at the level a career starts at costs less than the
  // cheapest rated match.
  const starting=createCareer({seed:1,regionId:'north-america'});
  assert.ok(Math.min(...costs)>trainingCost(starting),'no rated match should be as cheap as training');
  const national=COMPETITION_EVENTS.find(event=>event.id==='national');
  const pro=COMPETITION_EVENTS.find(event=>event.id==='pro-league');
  assert.ok(pro.energy>national.energy,'the pro tour costs more than a national championship');
  assert.ok(national.energy>Math.min(...costs));
});
