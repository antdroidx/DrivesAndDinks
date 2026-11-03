import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawDetailedCharacter,drawConceptAthlete,matchDesign,plantFeet} from '../src/detailed-character.js';
import {CHARACTER_CONCEPTS} from '../src/character-concepts.js';
import {MOTIONS,sampleCharacterPose} from '../src/pixel-character.js';
function canvas(){let depth=0,calls=0;const gradient={addColorStop(){}};return new Proxy({get depth(){return depth},get calls(){return calls}}, {get(target,key){if(key in target)return target[key];if(key==='createLinearGradient')return ()=>gradient;return (...args)=>{calls++;for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),`${key} received ${n}`);if(key==='save')depth++;if(key==='restore')assert.ok(--depth>=0)}},set(){return true}})}
test('every proposed body draws all motions and both court views without invalid geometry or canvas leaks',()=>{
 for(const design of CHARACTER_CONCEPTS)for(const mode of ['idle',...MOTIONS])for(const view of ['far','near'])for(const phase of [0,.25,.52,.8,1]){const c=canvas();drawConceptAthlete(c,design,mode,phase,view,100,200,2);assert.equal(c.depth,0);assert.ok(c.calls>50)}
});
test('all six proposals can be selected for the match renderer without mutating their presets',()=>{
 for(const design of CHARACTER_CONCEPTS){const before=JSON.stringify(design),c=canvas();assert.equal(matchDesign({},'avery',design.id).id,design.id);assert.equal(drawDetailedCharacter(c,{designId:design.id,mode:'forehand',phase:.52,width:70.5,height:94,x:20,y:30,alignTo:{x:65,y:78},alignStrength:1,paddleShape:'elongated'}),true);assert.equal(c.depth,0);assert.equal(JSON.stringify(design),before)}
});
test('automatic model selection respects body type and retains the selected kit colors',()=>{
 for(const body of ['male','female'])for(const id of ['avery','remy','jordan','sam']){const d=matchDesign({body,shirtColor:'white'},id);assert.equal(d.body,body);assert.match(d.shirt,/^#[0-9a-f]{6}$/i);assert.deepEqual(d,matchDesign({body,shirtColor:'white'},id))}
});
test('a stance foot stays planted as the root moves; swing, jump and teleport release the lock',()=>{
 const state={},pose=()=>structuredClone(sampleCharacterPose({mode:'run',frame:1}));
 let p=pose(),raw=sampleCharacterPose({mode:'run',frame:1});plantFeet(p,{plantState:state,frame:1},raw,100,200,2);const locked={...state.feet[1]};
 p=pose();plantFeet(p,{plantState:state,frame:1.1},raw,102,200,2);assert.equal(102+(p.legs[1][2].x-24)*2,locked.x);assert.equal(200+(p.legs[1][2].y-63)*2,locked.y);
 plantFeet(p,{plantState:state,frame:3},raw,102,200,2);assert.equal(state.feet[1],null);
 plantFeet(p,{plantState:state,frame:1},{...raw,jump:1},102,200,2);assert.deepEqual(state.feet,[null,null]);
 p=pose();plantFeet(p,{plantState:state,frame:1},raw,500,200,2);assert.ok(state.feet[1].x>450);
});
