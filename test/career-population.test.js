import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildClubIndex,buildClubRoster,buildAthlete,buildRegionRoster,findClub,mixSeed,clubsForCity} from '../src/career/population.js';
import {RATING_KEYS} from '../src/roster.js';

const SEED=20260101;

test('the club index is deterministic and covers every city in the region',()=>{
  const first=buildClubIndex(SEED,'north-america');
  const second=buildClubIndex(SEED,'north-america');
  assert.deepEqual(first,second);
  assert.ok(first.length>=80);
  const cityIds=new Set(first.map(club=>club.cityId));
  assert.ok(cityIds.size>=40,'every city should have clubs');
  const clubIds=new Set(first.map(club=>club.id));
  assert.equal(clubIds.size,first.length,'club ids must be unique');
});

test('a different seed produces a different population',()=>{
  const a=buildClubIndex(SEED,'north-america');
  const b=buildClubIndex(SEED+1,'north-america');
  assert.notDeepEqual(a.map(club=>club.name),b.map(club=>club.name));
});

test('club ids survive a region rebuild, so join references stay valid',()=>{
  const before=buildClubIndex(SEED,'asia').map(club=>club.id);
  const after=buildClubIndex(SEED,'asia').map(club=>club.id);
  assert.deepEqual(before,after);
  assert.ok(before.every(id=>id.includes('-')));
});

test('a club roster matches its advertised member count',()=>{
  const clubs=buildClubIndex(SEED,'asia');
  const club=clubs[0];
  const roster=buildClubRoster(SEED,club);
  assert.equal(roster.length,club.memberCount);
  assert.equal(new Set(roster.map(athlete=>athlete.id)).size,roster.length);
});

test('generated athletes are stable, fully rated and inside the rating band',()=>{
  const clubs=buildClubIndex(SEED,'north-america');
  const club=clubs[3];
  const first=buildClubRoster(SEED,club);
  const second=buildClubRoster(SEED,club);
  assert.deepEqual(first,second);
  for(const athlete of first){
    assert.deepEqual(Object.keys(athlete.ratings).sort(),[...RATING_KEYS].sort());
    for(const value of Object.values(athlete.ratings))assert.ok(value>=20&&value<=99,`${athlete.name} rating ${value}`);
    assert.ok(athlete.name.length>3);
    assert.ok(['left','right'].includes(athlete.handedness));
    assert.ok(athlete.dupr>=2&&athlete.dupr<=8);
    assert.equal(athlete.clubId,club.id);
  }
});

test('generated athletes use the 13 percent left handed rate',()=>{
  const {athletes}=buildRegionRoster(SEED,'north-america');
  const left=athletes.filter(athlete=>athlete.handedness==='left').length;
  const rate=left/athletes.length;
  assert.ok(rate>0.08&&rate<0.19,`left handed rate was ${rate.toFixed(3)}`);
});

test('region culture weights drive the generated names',()=>{
  const {athletes}=buildRegionRoster(SEED,'asia');
  const asian=athletes.filter(athlete=>athlete.culture==='asian').length;
  assert.ok(asian/athletes.length>0.35,'Asia should be mostly Asian-named athletes');
});

test('athletes can be built one at a time by id',()=>{
  const club=buildClubIndex(SEED,'north-america')[0];
  const roster=buildClubRoster(SEED,club);
  assert.deepEqual(buildAthlete(SEED,club,0),roster[0]);
});

test('club lookups find by id and reject unknown ids',()=>{
  const clubs=buildClubIndex(SEED,'north-america');
  assert.equal(findClub(clubs,'seattle-0').id,'seattle-0');
  assert.equal(findClub(clubs,'nope'),null);
  assert.ok(clubsForCity(clubs,'seattle').length>=2);
});

test('the seed mixer separates streams for different keys',()=>{
  assert.notEqual(mixSeed(1,'a'),mixSeed(1,'b'));
  assert.equal(mixSeed(1,'a'),mixSeed(1,'a'));
});
