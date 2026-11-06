import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sideReplayCamera,sideReplayFigureHeight,MAX_REPLAY_Z} from '../src/side-replay.js';

test('sideline figures read at the same size against the court as the live view',()=>{
 const camera=sideReplayCamera(1920,1080,{frames:[]},null);
 // The live view draws a player 94 units tall against a 374 unit court, so the
 // replay has to reach the same ratio or the court swallows the athletes.
 const courtLength=44*camera.span(10,22);
 const figure=sideReplayFigureHeight(camera,10,22);
 assert.ok(Math.abs(figure/courtLength-94/374)<1e-9,'figures do not match the live view read');
 // The figures also stay sane against the court's width, which the side camera
 // foreshortens.
 const courtWidth=Math.abs(camera.project(20,22).y-camera.project(0,22).y);
 assert.ok(figure/courtWidth>0.4&&figure/courtWidth<1.4,'figures do not match the court width');
});
