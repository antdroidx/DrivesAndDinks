import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  CAREER_SAVE_VERSION,CAREER_SAVE_KEY,CAREER_BACKUP_KEY,CAREER_QUARANTINE_KEY,
  serializeCareer,parseCareer,migrateCareer,validateCareer,saveCareer,loadCareer,clearCareer,memoryStorage
} from '../src/career/save.js';
import {createCareer,train,advanceWeek} from '../src/career/state.js';

const career=()=>createCareer({name:'Test Player',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242});

test('a career round trips through the save file',()=>{
  const storage=memoryStorage();
  const state=career();
  const result=saveCareer(state,storage);
  assert.ok(result.ok,result.reason);
  const loaded=loadCareer(storage);
  assert.equal(loaded.reason,null);
  assert.deepEqual(loaded.state,state);
});

test('the save file carries a schema version',()=>{
  const storage=memoryStorage();
  saveCareer(career(),storage);
  const payload=JSON.parse(storage.getItem(CAREER_SAVE_KEY));
  assert.equal(payload.version,CAREER_SAVE_VERSION);
  assert.ok(payload.savedAt);
  assert.ok(payload.state.athlete.name);
});

test('a newer schema is refused rather than guessed at',()=>{
  const storage=memoryStorage();
  storage.setItem(CAREER_SAVE_KEY,JSON.stringify({version:CAREER_SAVE_VERSION+5,savedAt:'x',state:{}}));
  const loaded=loadCareer(storage);
  assert.equal(loaded.state,null);
  assert.match(loaded.reason,/newer schema/);
});

test('a corrupt file falls back to the last good save',()=>{
  const storage=memoryStorage();
  const state=career();
  saveCareer(state,storage);
  const second=advanceWeek(state).state;
  saveCareer(second,storage);
  assert.ok(storage.getItem(CAREER_BACKUP_KEY),'a backup should exist');
  storage.setItem(CAREER_SAVE_KEY,'{"version":1,"state":');
  const loaded=loadCareer(storage);
  assert.ok(loaded.restored);
  assert.equal(loaded.state.week,state.week,'the backup holds the last verified save');
  assert.match(loaded.reason,/Recovered the previous save/);
});

test('a corrupt main file does not overwrite the good backup on the next save',()=>{
  const storage=memoryStorage();
  const state=career();
  saveCareer(state,storage);
  const second=advanceWeek(state).state;
  saveCareer(second,storage);
  storage.setItem(CAREER_SAVE_KEY,'{"version":1,"state":');
  saveCareer(advanceWeek(second).state,storage);
  const backup=JSON.parse(storage.getItem(CAREER_BACKUP_KEY));
  assert.ok(backup.state.athlete.name);
  assert.equal(backup.state.week,state.week);
});

test('a corrupt file with no backup is quarantined instead of silently reset',()=>{
  const storage=memoryStorage();
  storage.setItem(CAREER_SAVE_KEY,'not json at all');
  const loaded=loadCareer(storage);
  assert.equal(loaded.state,null);
  assert.match(loaded.reason,/unreadable/);
  assert.equal(storage.getItem(CAREER_SAVE_KEY),null);
  assert.equal(storage.getItem(CAREER_QUARANTINE_KEY),'not json at all');
});

test('a save with a broken state shape is rejected',()=>{
  const storage=memoryStorage();
  storage.setItem(CAREER_SAVE_KEY,JSON.stringify({version:1,savedAt:'x',state:{seed:1,regionId:'north-america',week:0,energy:50,trainingFocus:'drive',history:[],athlete:{id:'p',name:'X',ratings:{},rating:3.5,archetypeId:'avery'}}}));
  const loaded=loadCareer(storage);
  assert.equal(loaded.state,null);
  assert.match(loaded.reason,/ratings are invalid/);
});

test('validation rejects the individual fields a career depends on',()=>{
  const state=career();
  assert.ok(validateCareer(state).ok);
  assert.match(validateCareer({...state,seed:null}).reason,/seed/);
  assert.match(validateCareer({...state,regionId:'europe'}).reason,/region/);
  assert.match(validateCareer({...state,week:-1}).reason,/week/);
  assert.match(validateCareer({...state,energy:500}).reason,/energy/);
  assert.match(validateCareer({...state,trainingFocus:'nope'}).reason,/focus/);
  assert.match(validateCareer({...state,athlete:{...state.athlete,id:''}}).reason,/Athlete id/);
});

test('saving an invalid career is refused',()=>{
  const storage=memoryStorage();
  const result=saveCareer({...career(),week:'soon'},storage);
  assert.equal(result.ok,false);
  assert.equal(storage.getItem(CAREER_SAVE_KEY),null);
});

test('clearing a career removes the save and the backup',()=>{
  const storage=memoryStorage();
  saveCareer(career(),storage);
  assert.ok(clearCareer(storage));
  assert.equal(storage.getItem(CAREER_SAVE_KEY),null);
  assert.equal(storage.getItem(CAREER_BACKUP_KEY),null);
});

test('the migration chain reaches the current version',()=>{
  const payload=JSON.parse(serializeCareer(career()));
  const migrated=migrateCareer(payload);
  assert.ok(migrated.ok);
  assert.equal(migrated.version,CAREER_SAVE_VERSION);
});

test('a v1 career is migrated and its culture label repaired',()=>{
  const state=career();
  const legacy={...state,athlete:{...state.athlete,culture:'middle_eastern',cultureLabel:'middle_eastern'}};
  const migrated=migrateCareer({version:1,state:legacy});
  assert.ok(migrated.ok);
  assert.equal(migrated.version,CAREER_SAVE_VERSION);
  assert.equal(migrated.state.athlete.cultureLabel,'Middle Eastern');
  assert.ok(validateCareer(migrated.state).ok);
});

test('a career saved before the label fix loads with the repaired label',()=>{
  const storage=memoryStorage();
  const state=career();
  const legacy={...state,athlete:{...state.athlete,culture:'middle_eastern',cultureLabel:'middle_eastern'}};
  storage.setItem(CAREER_SAVE_KEY,JSON.stringify({version:1,savedAt:'x',state:legacy}));
  const loaded=loadCareer(storage);
  assert.ok(loaded.state,loaded.reason);
  assert.equal(loaded.state.athlete.cultureLabel,'Middle Eastern');
});

test('a missing save is not an error',()=>{
  const loaded=loadCareer(memoryStorage());
  assert.equal(loaded.state,null);
  assert.equal(loaded.reason,null);
});

