import {test} from 'node:test';
import assert from 'node:assert/strict';
import {REGIONS,allCities,allAreas,cityById,areaById,COMPETITION_TIERS,TIER_BY_ID,duprRating,duprBand,formatDupr,reliabilityPercent,skillForDupr,DUPR_MIN,DUPR_MAX,majorCities} from '../src/career/geography.js';

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

test('the competition ladder runs from club night to the pro league',()=>{
  const ids=COMPETITION_TIERS.map(tier=>tier.id);
  assert.deepEqual(ids,['club-night','local-league','city-open','regional-open','semi-pro','national','international','pro-league']);
  for(let index=1;index<COMPETITION_TIERS.length;index++){
    assert.ok(COMPETITION_TIERS[index].minRating>COMPETITION_TIERS[index-1].minRating,'ladder must ascend');
  }
  assert.equal(TIER_BY_ID['pro-league'].scope,'world');
  assert.equal(TIER_BY_ID['semi-pro'].scope,'region');
  assert.equal(TIER_BY_ID['club-night'].kind,'practice');
  assert.ok(COMPETITION_TIERS.filter(tier=>tier.kind==='match').length>=6);
});

test('the career rating follows the DUPR scale from 2.00 to 8.00',()=>{
  assert.equal(DUPR_MIN,2);
  assert.equal(DUPR_MAX,8);
  assert.equal(duprRating(30),2);
  assert.equal(duprRating(99),8);
  assert.ok(duprRating(30)<duprRating(50));
  assert.ok(duprRating(50)<duprRating(90));
  assert.ok(duprRating(0)>=DUPR_MIN);
  assert.ok(duprRating(100)<=DUPR_MAX);
  assert.equal(duprRating(70),duprRating(70));
});

test('the career rating is precise rather than bucketed',()=>{
  assert.notEqual(duprRating(50),duprRating(51));
  assert.ok(duprRating(50)-duprRating(49)<0.2,'one skill point is a small move');
  assert.ok(duprRating(51)-duprRating(50)>0,'the rating always responds to improvement');
  assert.equal(formatDupr(3.1267),'3.13');
  assert.equal(formatDupr(3),'3.00');
  assert.equal(formatDupr(8),'8.00');
});

test('the skill scale can be inverted back into a rating',()=>{
  for(const rating of [2,3.5,4.87,7.65,8]){
    assert.ok(Math.abs(duprRating(skillForDupr(rating))-rating)<0.02,`round trip for ${rating}`);
  }
});

test('DUPR bands label the ladder',()=>{
  assert.equal(duprBand(2.4).label,'Beginner');
  assert.equal(duprBand(3.2).label,'Novice');
  assert.equal(duprBand(4.2).label,'Intermediate +');
  assert.equal(duprBand(3.6).label,'Intermediate');
  assert.equal(duprBand(4.6).label,'Advanced');
  assert.equal(duprBand(5.2).label,'Advanced');
  assert.equal(duprBand(6.2).label,'Expert');
  assert.equal(duprBand(7.5).label,'Pro');
  assert.ok(duprBand(3.2).note.length>0);
});

test('reliability grows with matches played and stays under 100',()=>{
  assert.equal(reliabilityPercent(0),0);
  assert.ok(reliabilityPercent(12)>reliabilityPercent(2));
  assert.ok(reliabilityPercent(40)>reliabilityPercent(12));
  assert.ok(reliabilityPercent(1000)<=99);
});

test('the ladder gates span the DUPR range',()=>{
  assert.ok(COMPETITION_TIERS[0].minRating<=DUPR_MIN);
  assert.ok(COMPETITION_TIERS.at(-1).minRating>=7.5);
  assert.ok(COMPETITION_TIERS.every(tier=>tier.minRating>=DUPR_MIN&&tier.minRating<=DUPR_MAX));
});
