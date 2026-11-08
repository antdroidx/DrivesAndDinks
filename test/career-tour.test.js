import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  PRO_TOURS,tourFor,tourRank,onTheTour,pointsForEntry,pointsInWindow,addPoints,
  EVENT_POINTS,TOUR_POINTS_WINDOW,PRO_TOUR_SIZE,WORLD_POPULATION,TOUR_SHARE,PRO_FLOOR_RATING
} from '../src/career/tour.js';

test('the tour has separate men and women boards of the same size',()=>{
  assert.equal(PRO_TOURS.men.size,1200);
  assert.equal(PRO_TOURS.women.size,1200);
  assert.equal(tourFor('male').id,'men');
  assert.equal(tourFor('female').id,'women');
  // The two boards share one pro floor, so a rating means the same thing on
  // each of them.
  assert.equal(PRO_TOURS.men.floorRating,PRO_TOURS.women.floorRating);
  assert.equal(PRO_TOURS.men.floorRating,4.95);
});

test('the tour is the top share of the world population',()=>{
  assert.equal(TOUR_SHARE,.01);
  assert.equal(PRO_TOUR_SIZE,1200);
  assert.equal(WORLD_POPULATION,120000);
  assert.equal(PRO_TOUR_SIZE,Math.round(WORLD_POPULATION*TOUR_SHARE));
  assert.equal(PRO_FLOOR_RATING,4.95);
});

test('the last place on each board lands on the tour size',()=>{
  assert.equal(tourRank(PRO_TOURS.men.floorRating,'male'),PRO_TOURS.men.size);
  assert.equal(tourRank(PRO_TOURS.women.floorRating,'female'),PRO_TOURS.women.size);
  assert.equal(tourRank(PRO_TOURS.men.topRating,'male'),1);
  assert.equal(tourRank(PRO_TOURS.women.topRating,'female'),1);
});

test('a rating below the floor is not on the board',()=>{
  assert.equal(tourRank(4.5,'male'),null);
  assert.equal(tourRank(4.5,'female'),null);
  assert.equal(tourRank(4.94,'male'),null);
  assert.equal(tourRank(4.94,'female'),null);
  assert.ok(onTheTour(4.95,'male'));
  assert.ok(onTheTour(4.95,'female'));
  assert.equal(onTheTour(4.94,'male'),false);
});

test('a better rating always means a better place on the board',()=>{
  for(const gender of ['male','female']){
    let previous=Infinity;
    for(let rating=4.95;rating<=7.05;rating+=0.05){
      const rank=tourRank(rating,gender);
      assert.ok(rank<=previous,`${gender} at ${rating}`);
      previous=rank;
    }
  }
});

test('the two boards stay close, so a rating means the same on each',()=>{
  for(const rating of [5.0,5.19,5.5,6.0,6.5]){
    const men=tourRank(rating,'male');
    const women=tourRank(rating,'female');
    assert.ok(Math.abs(men-women)/men<0.15,`${rating} spread too far apart`);
  }
});

test('tour points are earned per event and playing up is worth more',()=>{
  assert.equal(EVENT_POINTS['club-night'],0);
  assert.ok(EVENT_POINTS['national']>EVENT_POINTS['local-league']);
  assert.ok(EVENT_POINTS['pro-league']>EVENT_POINTS['national']);
  const own=pointsForEntry('city-open','3.0','3.0');
  const up=pointsForEntry('city-open','3.5','3.0');
  assert.ok(up>own,'playing up a bracket is worth more');
});

test('tour points age out on the rolling 52 week window',()=>{
  let history=[];
  history=addPoints(history,0,100);
  assert.equal(pointsInWindow(history,0),100);
  assert.equal(pointsInWindow(history,51),100);
  assert.equal(pointsInWindow(history,52),0,'points expire after 52 weeks');
  assert.equal(pointsInWindow(history,120),0);
  assert.equal(TOUR_POINTS_WINDOW,52);
});

test('the window keeps only recent entries',()=>{
  let history=[];
  for(let week=0;week<200;week+=10)history=addPoints(history,week,10);
  assert.ok(history.length<=7,`expected a trimmed window, got ${history.length}`);
  assert.equal(pointsInWindow(history,199),50);
});
