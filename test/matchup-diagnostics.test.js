import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {trackMatchup,summarizeContacts} from '../scripts/matchup-diagnostics.js';

test('matchup instrumentation preserves seeded gameplay and attributes every fault to its side',()=>{
 const create=()=>{const g=new Game({seed:71});g.configure({format:'singles',character:'morgan'});g.mode='watch';g.recordReplay=()=>{};return g};
 const plain=create(),observed=create(),teams=trackMatchup(observed,1);
 for(let tick=0;tick<120*90;tick++){plain.update(C.dt);observed.update(C.dt)}
 assert.deepEqual(observed.matchReport(),plain.matchReport());
 const report=summarizeContacts(teams);
 assert.ok(report.every(row=>row.contacts>0));
 assert.equal(report[0].contacts,observed.stats.teams[1].hits);
 assert.equal(report[1].contacts,observed.stats.teams[0].hits);
 assert.equal(report[0].mishits,observed.stats.teams[1].mishits);
 for(const [reason,count] of Object.entries(observed.stats.faults))assert.equal((report[0].faults[reason]??0)+(report[1].faults[reason]??0),count);
 assert.equal(report[0].ralliesWon,Object.values(report[1].faults).reduce((a,b)=>a+b,0));
 assert.ok(report[0].meanQuality>0&&report[0].meanQuality<=1);
});

test('diagnostics forward placement and faulting player, and ignore rejected hits and repeated faults',()=>{
 const player={team:0,mishit:false},placement={x:4,y:12,intent:'feet'};let hitArgs,faultArgs;
 const g={phase:'rally',ball:{z:.5},hit(...args){hitArgs=args;return false},fault(...args){faultArgs=args;this.phase='pause'}};
 const teams=trackMatchup(g,0);
 assert.equal(g.hit(player,'drop',4,.9,placement),false);assert.equal(hitArgs[4],placement);assert.equal(teams[0].contacts,0);
 g.fault(0,'Kitchen momentum fault',player);assert.equal(faultArgs[2],player);
 g.fault(0,'Kitchen momentum fault',player);assert.equal(teams[0].faults['Kitchen momentum fault'],1);assert.equal(teams[1].ralliesWon,1);
 assert.equal(summarizeContacts(teams)[0].meanQuality,null);
});
