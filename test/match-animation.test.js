import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchStrokeMode,strokeDuration,prepareReceiver,sampleMatchAnimation} from '../src/match-animation.js';
import {contactQuality,playerProfile} from '../src/core.js';
import {CHARACTERS,buildProfile} from '../src/roster.js';
import {Game} from '../src/game.js';

test('baseline airborne attacks retain full strokes while kitchen blocks stay compact',()=>{
 for(const [team,y,kitchen] of [[0,40,30],[1,4,14]]){
  const p={team,y,stroke:'forehand',animationShot:'drive',contactType:'volley'};
  assert.equal(matchStrokeMode(p),'forehand');assert.equal(strokeDuration(p),.8);
  p.y=kitchen;assert.equal(matchStrokeMode(p),'volley');assert.equal(strokeDuration(p),.5);
 }
});
test('receiver prepares continuously before contact without delaying the ball',()=>{
 const g=new Game();g.phase='rally';g.shots=4;const p=g.players[0];p.swing=0;
 g.teamPlan={receiverId:p.id,created:0,point:{x:p.x+.6,y:p.y,z:2,time:1}};
 g.clock=.75;prepareReceiver(p,g);const first=sampleMatchAnimation(p,g);
 assert.ok(first.phase>0&&first.phase<.1);
 g.clock=.95;prepareReceiver(p,g);const next=sampleMatchAnimation(p,g);assert.equal(next.mode,'forehand');p.splitStepTimer=0;const prepared=sampleMatchAnimation(p,g);
 assert.ok(prepared.phase>first.phase&&prepared.phase<.52);
 const ball={...g.ball};g.hit(p,'drive',10);assert.notDeepEqual(g.ball,ball);
 const impact=sampleMatchAnimation(p,g);assert.equal(impact.phase,.52);assert.equal(impact.alignStrength,1);
 p.swing=p.swingDuration*.8;const follow=sampleMatchAnimation(p,g);assert.ok(follow.phase>.52);assert.equal(follow.alignStrength,0);
});
test('all playtest characters have strong control, serve, movement and reactions',()=>{
 for(const c of CHARACTERS){const p=buildProfile({character:c.id});assert.ok(p.abilities.control>1.3);assert.ok(p.abilities.serve>=1.19);assert.ok(p.abilities.speed>12.9);assert.ok(p.abilities.reaction<.08)}
});
test('a difficult clean roll never becomes a mishit solely because probability is high',()=>{
 const p={...playerProfile(),x:10,y:35,vx:12,vy:0},ball={x:11.6,y:35.5,z:.4};
 const clean=contactQuality(p,ball,'drive',false,.999),mishit=contactQuality(p,ball,'drive',false,0);
 assert.ok(clean.chance>.1);assert.equal(clean.mishit,false);assert.ok(clean.quality>.8);
 assert.equal(mishit.mishit,true);assert.ok(mishit.quality<.8);
 const g=new Game();g.phase='rally';g.shots=4;g.bounces=1;Object.assign(g.ball,ball);
 g.hit(g.players[0],'drive',10,clean.quality);assert.equal(g.players[0].mishit,false);
});
test('skilled control reduces contact errors without making them impossible',()=>{
 const base={...playerProfile(),x:10,y:35,vx:8,vy:0},expert={...buildProfile({}),x:10,y:35,vx:8,vy:0},ball={x:11.5,y:35.2,z:2};
 const a=contactQuality(base,ball,'drive',false,.999),b=contactQuality(expert,ball,'drive',false,.999);
 assert.ok(b.chance>0&&b.chance<a.chance*.6);
});

test('poach and sliding contacts select their dedicated motions',()=>{
 const base={team:0,y:31,stroke:'backhand',animationShot:'drive',contactType:'volley'};
 assert.equal(matchStrokeMode({...base,wasPoach:true,contactDifficulty:.5}),'poachLunge');
 assert.equal(matchStrokeMode({...base,contactMotion:'slide',contactDifficulty:.5}),'slideReturn');
});
