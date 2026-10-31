import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';

test('manual pause freezes the match and blocks shots',()=>{
  const game=new Game();
  game.score.team=0;
  game.score.serverPlayer=0;
  game.serveSetup();
  assert.equal(game.setPaused(true),true);
  const clock=game.clock,ball={...game.ball},timer=game.timer;
  game.update(.75);
  assert.equal(game.clock,clock);
  assert.deepEqual(game.ball,ball);
  assert.equal(game.timer,timer);
  game.swing();
  assert.equal(game.phase,'serve');
  assert.equal(game.setPaused(false),false);
  game.swing();
  assert.equal(game.phase,'rally');
});

test('a new match clears pause and starts playable',()=>{
  const game=new Game();
  game.setPaused(true);
  game.reset();
  assert.equal(game.paused,false);
  assert.equal(game.phase,'serve');
});
