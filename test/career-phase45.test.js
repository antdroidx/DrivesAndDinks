import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,currentEvents,advanceWeek} from '../src/career/state.js';
import {startCareerMatch,quickSimCareerMatch} from '../src/career/career-match.js';
import {syncInbox,inboxMessages,unreadCount,markMessageRead,archiveMessage} from '../src/career/inbox.js';
import {generateSeasonCatalog,purchaseEquipment,equipPaddle,equipmentSelection,createSignaturePaddle} from '../src/career/equipment.js';
import {careerProfile} from '../src/career/matchmaking.js';
import {migrateCareer,CAREER_SAVE_VERSION} from '../src/career/save.js';
import {exportCareerPortable,importCareerPortable} from '../src/career/portable-save.js';
import {readFileSync} from 'node:fs';
import {archiveCareer,hydrateCareerWithArchive} from '../src/career/career-archive.js';
import {memoryStorage} from '../src/career/save.js';

const career=(overrides={})=>createCareer({name:'Phase Four Five',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242,age:30,...overrides});

test('matches and injuries deliver deduplicated persistent inbox messages',()=>{
  let state=career();
  const event=currentEvents(state).find(entry=>entry.eventId==='local-league'&&entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  assert.ok(started.ok,started.message);
  const simulated=quickSimCareerMatch(started.state);
  assert.ok(simulated.ok,simulated.message);
  state=simulated.state;
  const count=state.inbox.items.length;
  assert.ok(count>0,'the match should create at least one message');
  assert.ok(state.inbox.items.some(item=>item.category==='match'));
  state=syncInbox(state);
  assert.equal(state.inbox.items.length,count,'syncing the same state must not duplicate messages');
  assert.equal(unreadCount(state),count);
});

test('inbox messages can be searched, marked read, archived and capped',()=>{
  let state=career();
  const message={key:'custom:1',category:'career',week:0,title:'Contract update',body:'Your Futures contract is active.',read:false,archived:false};
  state={...state,inbox:{...state.inbox,items:[message]}};
  assert.equal(inboxMessages(state,{query:'futures'}).length,1);
  state=markMessageRead(state,message.key);
  assert.equal(unreadCount(state),0);
  state=archiveMessage(state,message.key);
  assert.equal(inboxMessages(state).length,0);
  assert.equal(inboxMessages(state,{archived:true}).length,1);
});

test('seasonal catalog is deterministic and rotates release status',()=>{
  const announced=generateSeasonCatalog(4242,0);
  const same=generateSeasonCatalog(4242,0);
  assert.deepEqual(announced,same);
  assert.equal(announced.length,4);
  assert.ok(announced.every(item=>item.status==='announced'));
  const released=generateSeasonCatalog(4242,15);
  assert.ok(released.some(item=>item.status==='available'||item.status==='low-stock'));
  assert.equal(new Set(released.map(item=>item.id)).size,4);
});

test('seasonal paddles can be purchased, equipped and remain engine-bounded',()=>{
  const base={...career(),week:4,money:2000};
  const product=generateSeasonCatalog(base.seed,base.week).find(item=>item.releaseWeek<=base.week&&item.status!=='announced');
  assert.ok(product);
  const purchased=purchaseEquipment(base,product.id);
  assert.ok(purchased.ok,purchased.message);
  assert.equal(purchased.state.equipment.catalog.some(item=>item.id===product.id),true);
  const equipped=equipPaddle(purchased.state,product.id);
  assert.ok(equipped.ok,equipped.message);
  const profile=careerProfile(equipped.state.athlete,equipmentSelection(equipped.state));
  assert.equal(profile.paddle.id,product.family);
  assert.equal(profile.paddle.shapeId,product.shape);
});

test('a Gold contract unlocks one bounded signature release',()=>{
  const base={...career(),contract:'gold',contractSince:0};
  const created=createSignaturePaddle(base,{label:'Seattle Standard'});
  assert.ok(created.ok,created.message);
  assert.equal(created.state.equipment.equipped.includes('signature:'),true);
  assert.equal(created.item.signature,true);
  const profile=careerProfile(created.state.athlete,equipmentSelection(created.state));
  assert.ok(profile.paddle.power>0&&profile.paddle.control>0);
});

test('schema v20 careers gain the seasonal equipment catalog',()=>{
  const legacy=career();
  legacy.equipment={...legacy.equipment};
  legacy.equipment.version=1;
  delete legacy.equipment.catalog;
  const migrated=migrateCareer({version:20,state:legacy});
  assert.ok(migrated.ok,migrated.reason);
  assert.equal(migrated.version,CAREER_SAVE_VERSION);
  assert.deepEqual(migrated.state.equipment.catalog,[]);
});
test('a portable career export round-trips through compression and validation',async()=>{
  const state={...career(),week:8,money:975};
  const text=await exportCareerPortable(state,{exportedAt:'2026-11-09T12:00:00.000Z'});
  assert.match(text,/^DDC1\.[gj]\./);
  const imported=await importCareerPortable(text);
  assert.ok(imported.ok,imported.reason);
  assert.equal(imported.version,CAREER_SAVE_VERSION);
  assert.equal(imported.state.athlete.name,state.athlete.name);
  assert.equal(imported.state.week,8);
  assert.equal(imported.exportedAt,'2026-11-09T12:00:00.000Z');
});

test('portable import rejects unrelated and malformed files',async()=>{
  assert.equal((await importCareerPortable('not a career')).ok,false);
  assert.equal((await importCareerPortable('DDC1.j.bad')).ok,false);
});

test('the UI exposes the inbox and portable save controls',()=>{
  const source=readFileSync(new URL('../src/career/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../career-mode/index.html',import.meta.url),'utf8');
  assert.match(html,/data-view="inbox"/);
  assert.match(source,/data-action="export-career"/);
  assert.match(source,/data-action="import-career"/);
  assert.match(source,/data-action="archive-message"/);
});
test('completed careers and inbox history survive into a new career',()=>{
  const storage=memoryStorage();
  const completed={...career(),epilogue:{id:'career-42'},allTimeBoard:[{id:'career-42',name:'Former Pro',titles:3,wins:80,peakRatings:{singles:5.5}}],inbox:{...career().inbox,items:[{key:'old:1',category:'career',week:2,title:'Old news',body:'Retained after retirement',read:true,archived:false}]}};
  assert.ok(archiveCareer(completed,storage).ok);
  const fresh=hydrateCareerWithArchive(career({seed:999}),storage);
  assert.equal(fresh.allTimeBoard[0].name,'Former Pro');
});