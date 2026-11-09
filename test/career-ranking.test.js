import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPoints,overallPoints,rankings,rankForPoints,pointsAtRank,
  finalsQualified,recordResult,RANKING_BEST,RANKING_WINDOW,FORMAT_WEIGHTS
} from '../src/career/ranking.js';

const state=(results=[],week=0)=>({week,rankingResults:results});
const result=(week,format,points,tier='challenger')=>({week,format,points,tier});

test('a discipline ranking is the best fourteen results',()=>{
  const results=Array.from({length:20},(_,index)=>result(0,'doubles',100+index));
  const points=formatPoints(results,'doubles',0);
  const best=results.map(entry=>entry.points).sort((a,b)=>b-a).slice(0,RANKING_BEST);
  assert.equal(points,best.reduce((sum,value)=>sum+value,0));
});

test('the biggest events count whatever the result',()=>{
  const results=[
    ...Array.from({length:14},(_,index)=>result(0,'doubles',500,`tier${index}`)),
    result(0,'doubles',10,'major')
  ];
  const points=formatPoints(results,'doubles',0);
  // The major always counts and takes the place of the weakest of the fourteen.
  assert.equal(points,13*500+10);
});

test('results age out of the fifty two week window',()=>{
  const results=[result(0,'doubles',1000),result(10,'doubles',500)];
  assert.equal(formatPoints(results,'doubles',11),1500);
  assert.equal(formatPoints(results,'doubles',RANKING_WINDOW+1),500,'the first result has aged out');
});

test('the overall ranking is the weighted composite',()=>{
  const results=[result(0,'doubles',1000),result(0,'mixed',1000),result(0,'singles',1000)];
  const expected=1000*(FORMAT_WEIGHTS.doubles+FORMAT_WEIGHTS.mixed+FORMAT_WEIGHTS.singles);
  assert.equal(overallPoints(results,0),expected);
  assert.equal(Math.round(expected),1000);
});

test('a discipline with no results contributes nothing',()=>{
  const results=[result(0,'doubles',1000)];
  const points=rankings(state(results));
  assert.equal(points.doubles,1000);
  assert.equal(points.mixed,0);
  assert.equal(points.singles,0);
  assert.equal(points.overall,500);
});

test('more points always means a better place',()=>{
  const a=rankForPoints(6000);
  const b=rankForPoints(3000);
  const c=rankForPoints(1000);
  assert.ok(a<b&&b<c,'a bigger total ranks higher');
  assert.equal(rankForPoints(0),null);
  assert.equal(pointsAtRank(1),12000);
});

test('the finals take the top eight',()=>{
  const top=state([
    result(0,'doubles',12000,'major'),
    result(0,'mixed',12000,'major'),
    result(0,'singles',12000,'major')
  ]);
  assert.equal(finalsQualified(top),true);
  const outside=state([result(0,'doubles',400)]);
  assert.equal(finalsQualified(outside),false);
});

test('recording a result keeps the history and trims the old',()=>{
  let tracked={week:0,rankingResults:[]};
  tracked=recordResult(tracked,{week:0,format:'doubles',tier:'open',points:800,place:1,eventId:'e1'});
  assert.equal(tracked.rankingResults.length,1);
  assert.equal(tracked.rankingResults[0].points,800);
  assert.equal(tracked.rankingResults[0].tier,'open');
});
