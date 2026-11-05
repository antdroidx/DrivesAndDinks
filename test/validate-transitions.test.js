import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadEngine,runMatch,trackTransitions,targetDepth,parseSeeds,summarize,compactMatch,compactReport} from '../scripts/validate-transitions.js';

test('seed ranges are explicit, deduplicated and validated',()=>{
 assert.deepEqual(parseSeeds('1-3,2,17-18'),[1,2,3,17,18]);
 for(const text of ['0','8-1','1,x','1-10001',''])assert.throws(()=>parseSeeds(text));
});

test('instrumentation preserves complete seeded watch-match outcomes',async()=>{
 const engine=await loadEngine();
 const tracked=runMatch(engine,{seed:2,level:'demo',maxSeconds:2400}),plain=runMatch(engine,{seed:2,level:'demo',instrument:false,maxSeconds:2400});
 assert.equal(tracked.completed,true);
 for(const key of ['points','winner','stats','tactics','simulatedSeconds'])assert.deepEqual(tracked[key],plain[key],key);
 assert.equal(tracked.rallies.length,tracked.stats.rallies);
 assert.equal(tracked.depths.filter(d=>d.kind==='serve').length,tracked.stats.serves);
 assert.ok(tracked.decisions.some(d=>d.ordinal===3));assert.ok(tracked.decisions.some(d=>d.ordinal===5));
 assert.ok(tracked.depths.every(d=>d.status!=='pending'));
 assert.ok(tracked.decisions.every(d=>d.outcome!==null));
 assert.ok(tracked.depths.some(d=>d.kind==='return'&&d.landing));
 assert.equal(summarize([tracked]).completed,1);
 const compact=compactMatch(tracked,2),full=summarize([tracked]);
 for(const key of ['decisions','depths','rallies']){
  assert.ok(compact[key].length<=2);assert.equal(compact.counts[key],tracked[key].length);
  assert.equal(compact.truncated[key],tracked[key].length-compact[key].length);
 }
 assert.equal(compact.summary.third.contacts,tracked.decisions.filter(d=>d.ordinal===3).length);
 const report=compactReport({levels:['demo'],results:{current:[tracked,compact]}});
 assert.equal(report.summaries.current.overall.rallies,full.rallies*2);
 assert.equal(report.summaries.current.overall.serve.contacts,full.serve.contacts*2);
 assert.equal(report.summaries.current.overall.third.contacts,full.third.contacts*2);
 assert.equal(report.summaries.current.overall.medianRallyShots,full.medianRallyShots);
 assert.ok(Math.abs(report.summaries.current.overall.return.meanFirstLandingDepth-full.return.meanFirstLandingDepth)<1e-9);
 assert.ok(Math.abs(report.summaries.current.overall.third.pressureSoftRate-full.third.pressureSoftRate)<1e-9);
 assert.throws(()=>runMatch(engine,{seed:1,maxSeconds:2401}));
 const capped=runMatch(engine,{seed:1,maxSeconds:.1});assert.equal(capped.completed,false);assert.ok(capped.simulatedSeconds<=.1);
});

for(const team of [0,1])test(`team ${team}: actual first landing, not second bounce or target, determines depth`,async()=>{
 const engine=await loadEngine(),g=new engine.Game({seed:1});
 g.score.team=team;g.serveSetup();
 const tracker=trackTransitions(g,engine.core);
 g.serveToss={target:12,targetY:team===0?5:39,type:'hard',shot:'serve-hard'};
 g.releaseServe();
 const first={x:g.server.x<10?12:8,y:team===0?7:37,z:.125};
 g.emit('bounce',{position:first});g.emit('bounce',{position:{...first,y:22}});
 const row=tracker.data.depths[0];
 assert.equal(row.targetDepth,5);assert.equal(row.landing.depth,7);assert.equal(row.landing.depthError,2);
 assert.equal(targetDepth(team,first.y),7);assert.equal(row.landing.serviceBox,true);assert.equal(row.status,'landed');
 assert.equal(row.landing.y,first.y);
});

test('missing landings stay censored and incomplete transition outcomes remain null',async()=>{
 const engine=await loadEngine(),g=new engine.Game({seed:3}),tracker=trackTransitions(g,engine.core);
 g.serveToss={target:10,targetY:5,type:'hard',shot:'serve-hard'};g.releaseServe();
 g.emit('rally-end',{winner:1-g.server.team,reason:'Out',shots:1});
 assert.equal(tracker.data.depths[0].landing,null);
 assert.equal(tracker.data.depths[0].status,'rally-ended: Out');
 const s=summarize([{...tracker.data,completed:true,stats:{faults:{Out:1}}}]);
 assert.equal(s.serve.contacts,1);assert.equal(s.serve.landed,0);assert.equal(s.serve.meanFirstLandingDepth,null);
 assert.equal(s.serve.deepReceiverLandingRate,0);
});

test('legacy baseline serves without targetY retain their actual fixed target',async()=>{
 const engine=await loadEngine();
 for(const team of [0,1]){
  const g=new engine.Game({seed:1});g.score.team=team;g.serveSetup();
  const tracker=trackTransitions(g,engine.core);
  g.serveToss={target:10,type:'hard',shot:'serve-hard'};g.releaseServe();
  assert.equal(tracker.data.depths[0].targetDepth,8);
  assert.equal(tracker.data.depths[0].target.y,team===0?8:36);
 }
});
