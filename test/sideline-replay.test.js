import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_CONCEPTS,HAIR_OPTIONS} from '../src/character-concepts.js';
import {MOTIONS,sampleCharacterPose,ARM_LENGTHS} from '../src/pixel-character.js';
import {drawProfileAthlete,profilePose,createProfileRenderer} from '../src/profile-athlete.js';
import {createSideReplayRenderer,sideReplayCamera,replayAngleFor} from '../src/side-replay.js';
import {contactCue,replayContactAt,drawContactCue} from '../src/contact-cues.js';
import {Game} from '../src/game.js';
import {ReplayClock} from '../src/fault-replay.js';

function context(){let depth=0;return new Proxy({get depth(){return depth},getImageData(){return {data:new Uint8ClampedArray(144*144*4)}}},{get(target,key){if(key in target)return target[key];return (...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${key}: invalid coordinate`);if(key==='save')depth++;if(key==='restore')assert.ok(--depth>=0)}},set(){return true}})}

test('profile athletes draw connected limbs through every shared motion and body',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of ['idle',...MOTIONS])for(const direction of [-1,1])for(const phase of [0,.25,.52,.8,1]){
  const c=context(),before=structuredClone(d),p=drawProfileAthlete(c,{...d,outfit:'performance'},mode,phase,120,200,2,{direction,view:direction<0?'near':'far',frame:phase*4,moving:mode==='run'});
  assert.equal(c.depth,0);assert.deepEqual(d,before);
  for(const chain of [...p.arms,...p.legs])for(const point of chain)assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
  for(const chain of p.raw.arms3)for(let i=0;i<2;i++){const length=Math.hypot(chain[i+1].x-chain[i].x,chain[i+1].y-chain[i].y,chain[i+1].z-chain[i].z);assert.ok(Math.abs(length-ARM_LENGTHS[i])<1e-8)}
 }
});

test('profile faces support the existing hairstyles, headwear and expressions',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const hair of HAIR_OPTIONS[d.body])for(const headwear of ['none','cap','visor','headband'])for(const emotion of ['focus','effort','reaction','smile']){
  const c=context();drawProfileAthlete(c,{...d,hair:hair.id,headwear,eyewear:'glasses'},'forehand',.52,100,200,2,{direction:-1,emotion,sweat:.5,emotionClock:1});assert.equal(c.depth,0);
 }
});

test('side projection preserves forward paddle direction at both court ends',()=>{
 for(const direction of [-1,1]){const p=profilePose(CHARACTER_CONCEPTS[0],'idle',0,{direction});assert.ok((p.paddle.x-p.neck.x)*direction>0)}
});

test('world contact locks in 3D without stretching the shared arm rig',()=>{
 const p=sampleCharacterPose({mode:'forehand',phase:.52}),cos=Math.cos(p.rig.yaw),sin=Math.sin(p.rig.yaw);
 const target={x:p.rig.paddle.x*cos+p.rig.paddle.z*sin+.1,y:p.rig.paddle.y-.1,z:p.rig.paddle.z*cos-p.rig.paddle.x*sin+.1};
 const q=sampleCharacterPose({mode:'forehand',phase:.52,contact3D:target,contactWeight:1});
 assert.ok(Math.abs(q.rig.paddle.x*cos+q.rig.paddle.z*sin-target.x)<1e-8);
 assert.ok(Math.abs(q.rig.paddle.y-target.y)<1e-8);
 assert.ok(Math.abs(q.rig.paddle.z*cos-q.rig.paddle.x*sin-target.z)<1e-8);
});

test('sideline replay stays stationary while lobs and outcomes remain framed',()=>{
 for(const [width,height] of [[1920,1080],[390,800],[844,390]]){
  const frames=Array.from({length:91},(_,i)=>({clock:i/30,ball:{x:2+i/6,y:3+i*.45,z:Math.sin(i/90*Math.PI)*24}})),clip={frames};
  for(const snapshot of frames){const camera=sideReplayCamera(width,height,clip,snapshot);assert.deepEqual({x:camera.x,y:camera.y,width:camera.width,height:camera.height},{x:0,y:0,width,height});for(const z of [0,snapshot.ball.z]){const q=camera.project(snapshot.ball.x,snapshot.ball.y,z);assert.ok(q.x>camera.x&&q.x<camera.x+camera.width);assert.ok(q.y>camera.y&&q.y<camera.y+camera.height)}}
 }
});

test('foot faults default to overview and ball highlights default to sideline',()=>{
 assert.equal(replayAngleFor({focus:{boundary:29}}),'overview');assert.equal(replayAngleFor({focus:{reason:'ERNE'}}),'sideline');assert.equal(replayAngleFor({}),'sideline');assert.equal(replayAngleFor({},{aspect:.5}),'overview');
});

test('profile pixel rendering uses a reusable nearest-neighbor buffer',()=>{
 const buffers=[],draw=createProfileRenderer(()=>{const canvas={getContext:context};buffers.push(canvas);return canvas}),c=context();
 for(const d of CHARACTER_CONCEPTS)draw(c,d,'forehand',.52,100,200,2,{style:'anime-pixel'});
 assert.equal(buffers.length,1);assert.equal(c.depth,0);
});

test('contact cues distinguish contact pressure and hold briefly in replays',()=>{
 assert.equal(contactCue({time:.1,quality:.6}).kind,'mishit');assert.equal(contactCue({time:.1,quality:1,difficulty:.8}).kind,'stretched');assert.equal(contactCue({time:.1,quality:1}).kind,'clean');assert.equal(contactCue({time:.1,quality:1,sweetSpot:.1}).kind,'edge');assert.equal(contactCue({time:0}),null);
 const clip={frames:[{clock:1,contact:{time:.12,quality:.6,x:3,y:35,z:2}},{clock:1.2,contact:{time:0}}]};
 assert.equal(replayContactAt(clip,.9),null);assert.ok(replayContactAt(clip,1.25).time>0);assert.equal(replayContactAt(clip,1.4),null);
 const c=context();drawContactCue(c,replayContactAt(clip,1.1),(x,y,z)=>({x:x*10,y:y*10-z*10}),{labels:true});assert.equal(c.depth,0);
});

test('replay drawing does not mutate snapshots or draw from gameplay randomness',()=>{
 const g=new Game({seed:13});g.phase='rally';g.shots=4;g.players[0].windup=.2;g.recordReplay(true);const snapshot=g.replayFrames[0],before=structuredClone(snapshot),clip={frames:[snapshot]},c=context(),draw=createSideReplayRenderer();
 const random=Math.random;Math.random=()=>{throw new Error('Replay consumed gameplay randomness')};
 try{draw(c,{width:960,height:600},snapshot,clip,{style:'anime'});assert.deepEqual(snapshot,before);assert.equal(c.depth,0)}finally{Math.random=random}
});

test('replay pause holds playback time and resumes without skipping ahead',()=>{
 const clock=new ReplayClock();clock.start(1000);assert.equal(clock.elapsed(2500),1.5);clock.setPaused(true,2500);assert.equal(clock.elapsed(10000),1.5);clock.setPaused(true,11000);assert.equal(clock.elapsed(12000),1.5);clock.setPaused(false,12000);assert.equal(clock.elapsed(13000),2.5);clock.start(15000);assert.equal(clock.paused,false);assert.equal(clock.elapsed(16000),1);
});
