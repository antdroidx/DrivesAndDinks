import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildClubIndex,buildClubRoster,buildAthlete,buildRegionRoster,findClub,mixSeed,clubsForCity,WORLD_POPULATION_TARGET,REGION_POPULATION_TARGETS} from '../src/career/population.js';
import {NAME_BANKS,RATING_KEYS} from '../src/roster.js';
import {careerProfile} from '../src/career/matchmaking.js';

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

test('the generated world allocates exactly the 10,000-player target',()=>{
  for(const seed of [SEED,4242]){
    const north=buildClubIndex(seed,'north-america');
    const asia=buildClubIndex(seed,'asia');
    assert.equal(north.reduce((sum,club)=>sum+club.memberCount,0),REGION_POPULATION_TARGETS['north-america']);
    assert.equal(asia.reduce((sum,club)=>sum+club.memberCount,0),REGION_POPULATION_TARGETS.asia);
    assert.equal(north.reduce((sum,club)=>sum+club.memberCount,0)+asia.reduce((sum,club)=>sum+club.memberCount,0),WORLD_POPULATION_TARGET);
  }
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

test('generated athletes vary their outfits, colors, hairstyles and accessories',()=>{
  const club=buildClubIndex(SEED,'north-america')[0];
  const roster=buildClubRoster(SEED,club);
  const values=key=>new Set(roster.map(player=>player.appearance?.[key]));
  assert.ok(values('outfit').size>=2,'outfits should vary');
  assert.ok(values('shirtColor').size>=3,'kit colors should vary');
  assert.ok(values('hairStyle').size>=4,'hairstyles should vary');
  assert.ok(values('headwear').size>=2,'headwear should vary');
  assert.ok(values('eyewear').size>=2,'eyewear should vary');
  assert.ok(values('paddleColor').size>=4,'paddle colors should vary');
  assert.ok(values('paddleFamily').size>=2,'paddle families should vary');
  assert.ok(values('paddleShape').size>=4,'paddle silhouettes should vary');
  assert.ok(values('paddleThickness').size>=2,'paddle thickness should vary');
  assert.ok(Math.max(...roster.map(player=>player.appearance.height))-Math.min(...roster.map(player=>player.appearance.height))>10,'body sizes should vary');
  assert.deepEqual(buildAthlete(SEED,club,0),buildAthlete(SEED,club,0),'appearance remains deterministic');
});
test('generated CPU paddle choices carry into their engine profile',()=>{
  const club=buildClubIndex(SEED,'north-america')[0],athlete=buildAthlete(SEED,club,0),profile=careerProfile(athlete);
  assert.equal(profile.paddle.id,athlete.appearance.paddleFamily);
  assert.equal(profile.paddle.shapeId,athlete.appearance.paddleShape);
  assert.equal(profile.paddle.thickness,athlete.appearance.paddleThickness);
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
    for(const format of Object.keys(athlete.formats))assert.ok(athlete.formats[format]>=2&&athlete.formats[format]<=8);
    assert.equal(athlete.clubId,club.id);
  }
});

test('generated athletes use the 13 percent left handed rate',()=>{
  const {athletes}=buildRegionRoster(SEED,'north-america');
  const left=athletes.filter(athlete=>athlete.handedness==='left').length;
  const rate=left/athletes.length;
  assert.ok(rate>0.08&&rate<0.19,`left handed rate was ${rate.toFixed(3)}`);
});

test('athletes are rated separately in doubles, singles and mixed',()=>{
  const clubs=buildClubIndex(SEED,'north-america');
  const roster=buildClubRoster(SEED,clubs[0]);
  for(const athlete of roster){
    assert.deepEqual(Object.keys(athlete.formats).sort(),['doubles','mixed','singles']);
    // The two games reward different things, so the ratings must differ.
    assert.ok(Math.abs(athlete.formats.doubles-athlete.formats.singles)>0.01,athlete.name);
  }
  // A player who is better in one game should be better in that game.
  const betterInDoubles=roster.some(athlete=>athlete.formats.doubles>athlete.formats.singles);
  const betterInSingles=roster.some(athlete=>athlete.formats.singles>athlete.formats.doubles);
  assert.ok(betterInDoubles&&betterInSingles,'the population has both kinds of player');
});

test('citizenship comes from the region pool and mostly matches the city',()=>{
  const {athletes}=buildRegionRoster(SEED,'north-america');
  const american=athletes.filter(athlete=>athlete.citizenship==='United States').length;
  const canadian=athletes.filter(athlete=>athlete.citizenship==='Canada').length;
  assert.ok(american/athletes.length>0.6,'North America is mostly American or Canadian');
  assert.ok(canadian/athletes.length>0.05,'and some Canadian');
  for(const athlete of athletes)assert.ok(typeof athlete.citizenship==='string'&&athlete.citizenship.length>0);
  const {athletes:asiaAthletes}=buildRegionRoster(SEED,'asia');
  const southEast=['Singapore','Thailand','Malaysia','Indonesia','Philippines','Vietnam'];
  const seAsian=asiaAthletes.filter(athlete=>southEast.includes(athlete.citizenship)).length;
  assert.ok(seAsian/asiaAthletes.length>0.5,'Asia is mostly South East Asian');
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


test('the expanded name banks are large enough for the full world and both genders',()=>{
  assert.ok(NAME_BANKS.male.length>=6000,NAME_BANKS.male.length);
  assert.ok(NAME_BANKS.female.length>=6000,NAME_BANKS.female.length);
  assert.ok(NAME_BANKS.last.length>=12000,NAME_BANKS.last.length);
});

test('all 10,000 generated athletes have unique full names',()=>{
  const names=[];
  for(const regionId of ['north-america','asia']){
    const {athletes}=buildRegionRoster(SEED,regionId);
    names.push(...athletes.map(athlete=>athlete.name));
  }
  assert.equal(names.length,WORLD_POPULATION_TARGET);
  assert.equal(new Set(names).size,names.length);
});
