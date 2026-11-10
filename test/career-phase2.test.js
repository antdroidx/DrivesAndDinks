import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCpuWorld,advanceCpuWorld,cpuLeaders,cpuPlayerPage,cpuTournamentOutlook} from '../src/career/cpu-careers.js';

test('dynamic CPU tournaments are generated from club strength and participation',()=>{
  const world=createCpuWorld(4242,'north-america',12,{activeLimit:20,circuitLimit:30});
  assert.equal(world.tournaments.length,12);
  assert.equal(new Set(world.tournaments.map(event=>event.id)).size,world.tournaments.length);
  assert.ok(world.tournaments.every(event=>event.projectedEntries>=8&&event.projectedEntries<=event.fieldSize));
  const open=cpuTournamentOutlook(world,'open');
  assert.ok(Array.isArray(open));
});

test('CPU query scopes paginate and filter without rebuilding the world',()=>{
  const world=createCpuWorld(4242,'north-america',12,{activeLimit:20,circuitLimit:30});
  const leaders=cpuLeaders(world,{format:'doubles',limit:10});
  assert.equal(leaders.length,10);
  for(let index=1;index<leaders.length;index++)assert.ok(leaders[index-1].formats.doubles>=leaders[index].formats.doubles);
  const page=cpuPlayerPage(world,{detail:'active',minAge:10,maxAge:100,page:0,pageSize:7});
  assert.ok(page.items.length<=7);
  assert.ok(page.items.every(record=>record.detail==='active'));
  assert.ok(page.pages>=1);
});

test('the configurable CPU world survives twenty years of growth and turnover',()=>{
  let world=createCpuWorld(4242,'north-america',0,{activeLimit:40,circuitLimit:60});
  const clubCount=world.clubs.length;
  for(let week=1;week<=20*52;week++){
    world=advanceCpuWorld(world,{seed:4242,regionId:'north-america',week,ratings:{}}).world;
  }
  assert.equal(world.clubs.length,clubCount,'the regional club map stays complete');
  assert.equal(world.tournaments.length,12,'the event outlook remains bounded');
  assert.ok(world.retired.length>0,'careers retire');
  assert.ok(world.entrants.length>0,'new competitors arrive');
  assert.ok(Object.values(world.records).some(record=>record.age>54),'the population ages');
  assert.ok(Object.values(world.records).filter(record=>!record.retired).length<=100,'the configured population cap is respected');
});