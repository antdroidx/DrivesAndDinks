import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  RATING_MIN,RATING_MAX,RATING_ELITE,RATING_BANDS,RATING_PRECISION,
  ratingFromSkill,ratingBand,formatRating,skillForRating,reliability,
  MATCH_TYPES,expectedScore,ratingGapForExpectedScore,overallForRating,ratingForOverall,matchPerformance,updateRating,rateMatch,
  teamStrength,MATCH_TYPES as TYPES
} from '../src/career/rating.js';

test('the rating scale runs from 2.000 to 8.000 with three decimals',()=>{
  assert.equal(RATING_MIN,2);
  assert.equal(RATING_MAX,8);
  assert.equal(RATING_PRECISION,3);
  assert.equal(formatRating(4.5),'4.500');
  assert.equal(formatRating(3),'3.000');
  assert.equal(formatRating(7.047),'7.047');
  assert.equal(formatRating(2),'2.000');
});

test('the bands are the published rating bands',()=>{
  assert.deepEqual(RATING_BANDS.map(band=>band.id),['novice','intermediate','advanced','professional']);
  assert.equal(ratingBand(2.0).label,'Novice');
  assert.equal(ratingBand(2.999).label,'Novice');
  assert.equal(ratingBand(3.0).label,'Intermediate');
  assert.equal(ratingBand(3.999).label,'Intermediate');
  assert.equal(ratingBand(4.0).label,'Advanced');
  assert.equal(ratingBand(4.999).label,'Advanced');
  assert.equal(ratingBand(5.0).label,'Professional');
  assert.equal(ratingBand(8.0).label,'Professional');
  assert.ok(ratingBand(4.2).note.length>0);
});

test('the starting rating is derived from skill and reaches the elite anchor',()=>{
  assert.equal(ratingFromSkill(30),2);
  assert.equal(ratingFromSkill(99),RATING_ELITE);
  assert.ok(ratingFromSkill(43)>2.8&&ratingFromSkill(43)<3.1);
  assert.ok(ratingFromSkill(60)>4&&ratingFromSkill(60)<4.6);
  assert.ok(ratingFromSkill(74)>5&&ratingFromSkill(74)<5.5);
  assert.ok(ratingFromSkill(0)>=RATING_MIN);
  assert.ok(ratingFromSkill(200)<=RATING_MAX);
});

test('displayed overall uses an intuitive nonlinear rating scale',()=>{
  assert.equal(overallForRating(2),30);
  assert.equal(overallForRating(3),50);
  assert.equal(overallForRating(4),68);
  assert.equal(overallForRating(4.5),75);
  assert.equal(overallForRating(7),97);
  assert.equal(ratingForOverall(75),4.5);
  for(let index=1;index<=60;index++)assert.ok(overallForRating(2+index/10)>=overallForRating(2+(index-1)/10));
});

test('the skill scale inverts back into a rating',()=>{
  for(const rating of [2,3,3.5,4.5,6.5,7]){
    assert.ok(Math.abs(ratingFromSkill(skillForRating(rating))-rating)<0.01,`round trip for ${rating}`);
  }
});

test('a rating gap produces an expected margin',()=>{
  const favourite=expectedScore(4.5,3.0);
  assert.ok(favourite.margin>4,'a 4.5 against a 3.0 is expected to win comfortably');
  assert.ok(favourite.myPoints>favourite.opponentPoints);
  const close=expectedScore(3.5,4.0);
  assert.ok(close.margin<0,'the lower rated player is expected to lose');
  assert.ok(Math.abs(close.margin)<Math.abs(favourite.margin));
  const even=expectedScore(4,4);
  assert.equal(even.margin,0);
});

test('expected scores follow the public half-point and full-point DUPR anchors',()=>{
  const halfPoint=expectedScore(4,3.5);
  assert.equal(halfPoint.myPoints,11);
  assert.ok(Math.abs(halfPoint.opponentPoints-5)<1e-9);
  const fullPoint=expectedScore(4,3);
  assert.equal(fullPoint.myPoints,11);
  assert.ok(Math.abs(fullPoint.opponentPoints-2)<1e-9);
  const reversal=expectedScore(3,4);
  assert.ok(reversal.margin<0);
  assert.equal(reversal.myPoints,fullPoint.opponentPoints);
  assert.equal(reversal.opponentPoints,fullPoint.myPoints);
});

test('expected score gaps can be inverted when calibrating gameplay levels',()=>{
  assert.equal(ratingGapForExpectedScore(9),0);
  assert.ok(Math.abs(ratingGapForExpectedScore(5)-.5)<1e-9);
  assert.ok(Math.abs(ratingGapForExpectedScore(2)-1)<1e-9);
  assert.ok(Math.abs(ratingGapForExpectedScore(7)-.25)<.2);
  assert.equal(ratingGapForExpectedScore(1),1.5);
});

test('a narrow win against a much lower rated opponent lowers the rating',()=>{
  // The case rating is asked about most: expected to win comfortably, won narrowly.
  const result=updateRating({rating:4.5,opponentRatings:[3.0],actualMyPoints:11,actualOpponentPoints:8});
  assert.ok(result.delta<0,`a narrow win should not raise a rating, got ${result.delta}`);
  assert.ok(result.performance<0);
});

test('a close loss to a higher rated opponent raises the rating',()=>{
  const result=updateRating({rating:3.5,opponentRatings:[4.0],actualMyPoints:9,actualOpponentPoints:11});
  assert.ok(result.delta>0,`competing above expectations should be rewarded, got ${result.delta}`);
});

test('winning exactly as expected barely moves the rating',()=>{
  const expected=expectedScore(4.5,3.0);
  const result=updateRating({rating:4.5,opponentRatings:[3.0],actualMyPoints:Math.round(expected.myPoints),actualOpponentPoints:Math.round(expected.opponentPoints)});
  assert.ok(Math.abs(result.delta)<0.02,`an expected result should barely move, got ${result.delta}`);
});

test('overperforming is rewarded more than meeting expectations',()=>{
  const expected=expectedScore(4.5,4.0);
  const routine=updateRating({rating:4.5,opponentRatings:[4.0],actualMyPoints:Math.round(expected.myPoints),actualOpponentPoints:Math.round(expected.opponentPoints)});
  const better=updateRating({rating:4.5,opponentRatings:[4.0],actualMyPoints:11,actualOpponentPoints:2});
  assert.ok(better.delta>routine.delta);
});

test('a first-match blowout moves each player meaningfully and reports both ratings',()=>{
 const rated=rateMatch({
  players:[
   {id:'me',team:'mine',rating:3.8,matchesPlayed:0},
   {id:'partner',team:'mine',rating:3.8,matchesPlayed:0},
   {id:'them',team:'opponent',rating:3.7,matchesPlayed:0},
   {id:'them2',team:'opponent',rating:3.9,matchesPlayed:0}
  ],
  actualMyPoints:11/15*2,actualOpponentPoints:11,matchType:'league'
 });
 const mine=rated.players.find(player=>player.id==='me');
 assert.ok(mine.delta<-.3,`a 15-2 first-match loss should move more than 0.3, got ${mine.delta}`);
 assert.equal(mine.previousRating,3.8);
 assert.ok(Math.abs(mine.rating-3.8-mine.delta)<1e-9);
 assert.equal(rated.provisional,1.5);
});

test('the system stays balanced: one side rises and the other falls',()=>{
  const rated=rateMatch({
    players:[
      {id:'me',team:'mine',rating:4.5,matchesPlayed:10},
      {id:'partner',team:'mine',rating:4.2,matchesPlayed:10},
      {id:'them',team:'opponent',rating:3.6,matchesPlayed:10},
      {id:'them2',team:'opponent',rating:3.4,matchesPlayed:10}
    ],
    actualMyPoints:11,
    actualOpponentPoints:2
  });
  const mine=rated.players.filter(player=>player.team==='mine');
  const theirs=rated.players.filter(player=>player.team==='opponent');
  assert.ok(mine.every(player=>player.rating>player.rating-player.delta||player.delta>0));
  assert.ok(mine.every(player=>player.delta>0),'the winning team rises');
  assert.ok(theirs.every(player=>player.delta<0),'the losing team falls');
  const before=rated.players.reduce((sum,player)=>sum+player.rating,0);
  const after=rated.players.reduce((sum,player)=>sum+player.rating,0);
  assert.ok(Math.abs(before-after)<0.001,'total rating is conserved');
});

test('organized play carries more weight than a recreational game',()=>{
  const base={rating:4.5,opponentRatings:[3.0],actualMyPoints:11,actualOpponentPoints:8};
  const tournament=updateRating({...base,matchType:'tournament'}).delta;
  const league=updateRating({...base,matchType:'league'}).delta;
  const club=updateRating({...base,matchType:'club'}).delta;
  const recreational=updateRating({...base,matchType:'recreational'}).delta;
  assert.ok(tournament<recreational,'a bigger negative move for a tournament means more weight');
  assert.ok(Math.abs(tournament)>Math.abs(league));
  assert.ok(Math.abs(league)>Math.abs(club));
  assert.ok(Math.abs(club)>Math.abs(recreational));
  assert.ok(TYPES.tournament.weight>TYPES.recreational.weight);
});

test('recent matches matter more than old ones',()=>{
  const base={rating:4.5,opponentRatings:[3.0],actualMyPoints:11,actualOpponentPoints:3,matchesPlayed:20};
  const recent=updateRating({...base,weeksAgo:0}).delta;
  const old=updateRating({...base,weeksAgo:26}).delta;
  assert.ok(Math.abs(recent)>Math.abs(old));
});

test('a thin history moves more than a long one',()=>{
  const base={rating:4.5,opponentRatings:[3.0],actualMyPoints:11,actualOpponentPoints:3};
  const early=updateRating({...base,matchesPlayed:0}).delta;
  const later=updateRating({...base,matchesPlayed:60}).delta;
  assert.ok(Math.abs(early)>Math.abs(later));
});

test('a rating never leaves the scale',()=>{
  const high=updateRating({rating:8,opponentRatings:[2],actualMyPoints:11,actualOpponentPoints:0});
  assert.ok(high.rating<=RATING_MAX);
  const low=updateRating({rating:2,opponentRatings:[8],actualMyPoints:0,actualOpponentPoints:11});
  assert.ok(low.rating>=RATING_MIN);
});

test('doubles team strength uses both players',()=>{
  assert.equal(teamStrength([4,4]),4);
  assert.equal(teamStrength([5,3]),4);
  assert.equal(teamStrength([4.5]),4.5);
});

test('reliability rises with matches played and is labelled',()=>{
  assert.equal(reliability(0).percent,0);
  assert.equal(reliability(0).label,'Low');
  assert.ok(reliability(12).percent>reliability(2).percent);
  assert.ok(reliability(40).percent>reliability(12).percent);
  assert.ok(reliability(40).label==='High');
  assert.ok(reliability(1000).percent<=99);
});

test('match performance is zero when the result matches the expectation',()=>{
  const expected=expectedScore(4,4);
  const performance=matchPerformance({actualMyPoints:9,actualOpponentPoints:9,expectedMyPoints:expected.myPoints,expectedOpponentPoints:expected.opponentPoints});
  assert.ok(Math.abs(performance)<1e-9);
});
