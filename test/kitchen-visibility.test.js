import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playerFeet,kitchenContact,footSole} from '../src/player-feet.js';
import {Game} from '../src/game.js';
import {faultReplaySample,faultReplayCamera,replayTiming} from '../src/fault-replay.js';

test('kitchen detection identifies the exact grounded sole at both line boundaries',()=>{
 for(const team of [0,1]){const player={id:team*2,team,x:5,y:team===0?29.42:14.58,vx:0,vy:0};const contact=kitchenContact(player);assert.ok(contact);assert.equal(contact.playerId,player.id);assert.ok(playerFeet(player).some(foot=>foot.index===contact.index));const ys=footSole(contact).map(p=>p[1]);assert.ok(team===0?Math.min(...ys)<=29+1e-9:Math.max(...ys)>=15-1e-9);player.y+=team===0?.01:-.01;assert.equal(kitchenContact(player),null);player.airborneTimer=.2;player.y=team===0?28:16;assert.equal(kitchenContact(player),null)}
});
function kitchenFault(){const game=new Game({seed:42});game.phase='rally';game.mode='watch';game.shots=4;const p=game.players[0];p.x=5;for(let i=0;i<90;i++){game.clock=i/30;p.y=31-i/90*1.7;game.replayTick=0;game.recordReplay()}p.y=29.4;game.clock=3.001;game.fault(0,'Kitchen momentum fault',p);return game;}
test('fault replay includes the exact final contact even between normal recording ticks',()=>{
 const g=kitchenFault(),clip=g.replayClip;assert.ok(clip);assert.equal(clip.focus.playerId,0);assert.equal(clip.frames.at(-1).clock,3.001);assert.equal(clip.frames.at(-1).faultFocus.time,3.001);assert.match(clip.label,/KITCHEN MOMENTUM/);assert.ok(clip.frames.every(frame=>frame.clock>=1.001));g.players[0].y=40;assert.equal(clip.frames.at(-1).players[0].y,29.4);
});
test('kitchen replay slows and holds contact, then restores normal playback at completion',()=>{
 const clip=kitchenFault().replayClip;assert.equal(faultReplaySample(clip,0),clip.frames[0]);assert.equal(faultReplaySample(clip,replayTiming(clip).duration-.1),clip.frames.at(-1));assert.equal(faultReplaySample(clip,20),null);const base={x:220,y:80,width:520,height:520},project=(x,y)=>({x:480+(x-10)*19,y:204+y*8.5}),camera=faultReplayCamera(base,clip.focus,project,clip.focus.time);assert.deepEqual(camera,base);
});
