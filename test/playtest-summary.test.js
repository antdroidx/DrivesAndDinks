import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MatchJournal} from '../src/match-journal.js';
import {summarizePlaytest} from '../src/playtest-summary.js';
import {Game} from '../src/game.js';

test('playtest summary groups rally pace, contact quality and fault context',()=>{
 const journal=new MatchJournal();
 journal.record('rally-start',0,{});
 journal.record('hit',1,{shot:'dink',quality:.62,difficulty:.55,shotNumber:3,transition:true,distance:8,movement:'settling',netMargin:.2});
 journal.record('rally-end',3,{reason:'Net fault',shots:3,winner:1});
 const summary=summarizePlaytest(journal.snapshot(),{recoverySets:1},{poachAttempts:2});
 assert.equal(summary.rallies.count,1);assert.equal(summary.rallies.meanDuration,3);
 assert.equal(summary.shots.dink.mishits,1);assert.equal(summary.faults.counts['Net fault'],1);
 assert.equal(summary.faults.byLastShot['Net fault / dink'].count,1);
 assert.equal(summary.transitions.transition.contacts,1);assert.equal(summary.tactics.poachAttempts,2);
});

test('finished match reports include the derived playtest summary',()=>{
 const game=new Game({seed:5});game.recordReplay=()=>{};game.mode='watch';
 for(let tick=0;tick<120*30&&game.phase!=='over';tick++)game.update(1/120);
 const report=game.matchReport();assert.equal(report.playtest.schemaVersion,1);
 assert.ok(report.playtest.rallies.count>0);assert.ok(report.playtest.contacts.count>0);
});
