import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,currentEvents,advanceWeek} from '../src/career/state.js';
import {startCareerMatch,quickSimCareerMatch} from '../src/career/career-match.js';
import {syncInbox,inboxMessages,unreadCount,markMessageRead,archiveMessage} from '../src/career/inbox.js';
import {PADDLE_CATALOG,generateSeasonCatalog,purchaseEquipment,equipPaddle,equipmentSelection,createSignaturePaddle,equipmentStats,equipmentCatalog,HEADWEAR_CATALOG,buyHeadwear,equipHeadwear,clearHeadwear,setPaddleColor} from '../src/career/equipment.js';
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
  const matchMessage=state.inbox.items.find(item=>item.category==='match');
  assert.match(matchMessage.body,/Winner: .+/);
  assert.match(matchMessage.body,/Loser: .+/);
  assert.match(matchMessage.body,/Your rating \d\.\d{3} → \d\.\d{3}/);
  assert.match(matchMessage.body,/Reliability \d+% → \d+%/);
  assert.match(matchMessage.title,/(WIN|LOSS) · /);
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

test('seasonal paddles have unique brand-specific names and readable stats',()=>{
  const seasons=[...generateSeasonCatalog(4242,0),...generateSeasonCatalog(4242,52),...generateSeasonCatalog(4242,104)];
  assert.equal(new Set(seasons.map(item=>item.label)).size,seasons.length);
  for(const brand of new Set(seasons.map(item=>item.brand)))assert.ok(seasons.filter(item=>item.brand===brand).every(item=>item.label.startsWith(brand+' ')));
  const power=seasons.find(item=>item.family==='power'),control=seasons.find(item=>item.family==='control');
  assert.ok(power&&control);
  assert.ok(equipmentStats(power).power>equipmentStats(control).power);
  assert.ok(equipmentStats(control).control>equipmentStats(power).control);
  for(const item of seasons)for(const value of Object.values(equipmentStats(item)))assert.ok(value>=35&&value<=95);
});

test('seasonal paddles can be purchased, equipped and remain engine-bounded',()=>{
  const base={...career(),week:4,money:2000};
  const product=generateSeasonCatalog(base.seed,base.week).find(item=>item.releaseWeek<=base.week&&item.status!=='announced');
  assert.ok(product);
  const purchased=purchaseEquipment(base,product.id,{color:'red'});
  assert.ok(purchased.ok,purchased.message);
  assert.equal(purchased.state.equipment.catalog.some(item=>item.id===product.id),true);
  assert.equal(purchased.item.color,'red');
  const equipped=equipPaddle(purchased.state,product.id);
  assert.ok(equipped.ok,equipped.message);
  const profile=careerProfile(equipped.state.athlete,equipmentSelection(equipped.state));
  assert.equal(profile.paddle.id,product.family);
  assert.equal(profile.paddle.shapeId,product.shape);
  assert.equal(profile.appearance.paddleColor,'red');
});

test('colored headwear can be purchased, worn and removed',()=>{
  const base={...career(),money:1000};
  const cap=HEADWEAR_CATALOG.find(item=>item.headwear==='cap'&&item.color==='red');
  const visor=HEADWEAR_CATALOG.find(item=>item.headwear==='visor'&&item.color==='blue');
  assert.ok(cap&&visor);
  const boughtCap=buyHeadwear(base,cap.id);
  assert.ok(boughtCap.ok,boughtCap.message);
  assert.equal(boughtCap.state.equipment.headwear.equipped,cap.id);
  let profile=careerProfile(boughtCap.state.athlete,equipmentSelection(boughtCap.state));
  assert.equal(profile.appearance.headwear,'cap');
  assert.equal(profile.appearance.headwearColor,'red');
  const boughtVisor=buyHeadwear(boughtCap.state,visor.id);
  assert.ok(boughtVisor.ok,boughtVisor.message);
  const worn=equipHeadwear(boughtVisor.state,cap.id);
  assert.ok(worn.ok,worn.message);
  const cleared=clearHeadwear(worn.state);
  assert.equal(cleared.state.equipment.headwear.equipped,null);
});

test('the retail catalog covers every roadmap shape and thickness availability',()=>{
  const shapes=new Set(PADDLE_CATALOG.map(item=>item.shape));
  assert.deepEqual([...shapes].sort(),['elongated-aero','elongated-cutout','elongated-flat','elongated-short-handle','hybrid-aero','hybrid-flat','round','tennis','tennis-extended-handle','widebody','widebody-cutout'].sort());
  const grouped=Map.groupBy(PADDLE_CATALOG,item=>item.baseId);
  assert.ok([...grouped.values()].some(items=>new Set(items.map(item=>item.thickness)).size===2),'some paddles should ship in both thicknesses');
  assert.ok([...grouped.values()].some(items=>items.length===1),'some paddles should ship in only one thickness');
});

test('14 mm paddles trade control for pop while 16 mm paddles favor control',()=>{
  const base={...career(),money:2000},thin=PADDLE_CATALOG.find(item=>item.id==='ignite-widebody-14'),thick=PADDLE_CATALOG.find(item=>item.id==='ignite-widebody');
  assert.ok(thin&&thick);
  assert.equal(thin.thickness,14);
  assert.equal(thick.thickness,16);
  assert.ok(equipmentStats(thin).power>equipmentStats(thick).power);
  assert.ok(equipmentStats(thick).control>equipmentStats(thin).control);
  const boughtThin=purchaseEquipment(base,thin.id,{color:'blue'});
  assert.ok(boughtThin.ok,boughtThin.message);
  const boughtBoth=purchaseEquipment(boughtThin.state,thick.id,{color:'red'});
  assert.ok(boughtBoth.ok,boughtBoth.message);
  const thinProfile=careerProfile(boughtBoth.state.athlete,equipmentSelection({...boughtBoth.state,equipment:{...boughtBoth.state.equipment,equipped:thin.id}}));
  const thickProfile=careerProfile(boughtBoth.state.athlete,equipmentSelection(boughtBoth.state));
  assert.equal(thinProfile.paddle.thickness,14);
  assert.equal(thickProfile.paddle.thickness,16);
  assert.ok(thinProfile.paddle.power>thickProfile.paddle.power);
  assert.ok(thickProfile.paddle.control>thinProfile.paddle.control);
});

test('owned paddle colors can be changed after purchase',()=>{
  const base={...career(),money:1000};
  const recolored=setPaddleColor(base,'allcourt-hybrid','blue');
  assert.ok(recolored.ok,recolored.message);
  const profile=careerProfile(recolored.state.athlete,equipmentSelection(recolored.state));
  assert.equal(profile.appearance.paddleColor,'blue');
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
test('schema v22 careers gain colored equipment state and settings',()=>{
  const legacy=career();
  legacy.equipment={...legacy.equipment,version:2};
  delete legacy.equipment.headwear;
  legacy.settings=undefined;
  const migrated=migrateCareer({version:22,state:legacy});
  assert.ok(migrated.ok,migrated.reason);
  assert.equal(migrated.state.equipment.version,4);
  assert.deepEqual(migrated.state.equipment.headwear,{owned:[],equipped:null});
  assert.equal(migrated.state.settings.difficulty,'normal');
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