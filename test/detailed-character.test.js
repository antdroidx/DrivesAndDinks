import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawDetailedCharacter,drawConceptAthlete,matchDesign,plantFeet,legDimensions,conceptLegs,movingStance} from '../src/detailed-character.js';
import {CHARACTER_CONCEPTS} from '../src/character-concepts.js';
import {MOTIONS,sampleCharacterPose} from '../src/pixel-character.js';
function canvas(){let depth=0,calls=0;const gradient={addColorStop(){}};return new Proxy({get depth(){return depth},get calls(){return calls}}, {get(target,key){if(key in target)return target[key];if(key==='createLinearGradient')return ()=>gradient;return (...args)=>{calls++;for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),`${key} received ${n}`);if(key==='save')depth++;if(key==='restore')assert.ok(--depth>=0)}},set(){return true}})}
test('every proposed body draws all motions and both court views without invalid geometry or canvas leaks',()=>{
 for(const design of CHARACTER_CONCEPTS)for(const mode of ['idle',...MOTIONS])for(const view of ['far','near'])for(const phase of [0,.25,.52,.8,1]){const c=canvas();drawConceptAthlete(c,design,mode,phase,view,100,200,2);assert.equal(c.depth,0);assert.ok(c.calls>50)}
});
test('all six proposals can be selected for the match renderer without mutating their presets',()=>{
 for(const design of CHARACTER_CONCEPTS){const before=JSON.stringify(design),c=canvas();assert.equal(matchDesign({},'avery',design.id).id,design.id);assert.equal(drawDetailedCharacter(c,{designId:design.id,mode:'forehand',phase:.52,width:70.5,height:94,x:20,y:30,alignTo:{x:65,y:78},alignStrength:1,paddleShape:'elongated'}),true);assert.equal(c.depth,0);assert.equal(JSON.stringify(design),before)}
});

test('matte and stylized silhouettes render the full motion library without canvas leaks or preset mutation',()=>{
 for(const design of CHARACTER_CONCEPTS)for(const silhouette of [undefined,'compact','toy'])for(const mode of ['idle',...MOTIONS])for(const view of ['near','far'])for(const phase of [0,.25,.52,.8,1]){
  const before=JSON.stringify(design),c=canvas();drawConceptAthlete(c,design,mode,phase,view,120,270,2.9,{material:'matte',silhouette});assert.equal(c.depth,0);assert.equal(JSON.stringify(design),before);
 }
});

test('matte rendering does not leave the following default character flat shaded',()=>{
 let gradients=0;const c=canvas();
 // Use a wrapper because the shared geometry mock deliberately ignores writes.
 const wrapped=new Proxy(c,{get(target,key){if(key==='createLinearGradient')return ()=>{gradients++;return {addColorStop(){}}};return target[key]}});
 drawConceptAthlete(wrapped,CHARACTER_CONCEPTS[0],'forehand',.52,'far',100,200,2,{material:'matte'});assert.equal(gradients,0);
 drawConceptAthlete(wrapped,CHARACTER_CONCEPTS[0],'forehand',.52,'far',100,200,2);assert.ok(gradients>0);
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

test('idle knees remain identical over repeated planted frames at every body size',()=>{
 for(const d of CHARACTER_CONCEPTS){const state={},raw=sampleCharacterPose({mode:'idle'}),expected=conceptLegs(raw,d);
 for(let frame=0;frame<600;frame++){const pose={legs:conceptLegs(raw,d)};plantFeet(pose,{plantState:state,frame,legLengths:legDimensions(d)},raw,100,200,2);assert.deepEqual(pose.legs,expected)}
 }
});
test('small speed corrections do not alternate idle and locomotion',()=>{
 const state={};for(const speed of [.6,.72,.65,1,.4,.8])assert.equal(movingStance(state,speed),false);
 assert.equal(movingStance(state,1.2),true);for(const speed of [1,.7,.5,.4])assert.equal(movingStance(state,speed),true);assert.equal(movingStance(state,.3),false);
});
test('thighs, calves, ankles and footwear grow with build; height scales both bones',()=>{
 const base=CHARACTER_CONCEPTS[0],lean=legDimensions({...base,build:.1,height:160}),full=legDimensions({...base,build:1,height:200});
 for(const key of ['thigh','calf','ankle','shoe'])assert.ok(full[key]>lean[key]*1.2,key);
 assert.equal(full.upper/lean.upper,200/160);assert.equal(full.lower/lean.lower,200/160);
});
test('scaled legs keep stable anatomical bend poles across a full movement cycle',()=>{
 for(const d of CHARACTER_CONCEPTS)for(const mode of ['idle','run','shuffle','forehand','slideReturn'])for(let n=0;n<80;n++){
 const raw=sampleCharacterPose({mode,phase:n/80,frame:n/20}),legs=conceptLegs(raw,d);
 for(const chain of legs)for(const p of chain)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 }
});
