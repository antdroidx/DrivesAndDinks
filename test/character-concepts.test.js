import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_CONCEPTS,HAIR_OPTIONS,conceptDimensions,conceptPoint} from '../src/character-concepts.js';
import {MOTIONS,sampleCharacterPose} from '../src/pixel-character.js';
test('proposal collection covers independent heights builds hair and headwear',()=>{assert.equal(CHARACTER_CONCEPTS.length,6);assert.equal(new Set(CHARACTER_CONCEPTS.map(d=>d.id)).size,6);assert.ok(Math.max(...CHARACTER_CONCEPTS.map(d=>d.height))-Math.min(...CHARACTER_CONCEPTS.map(d=>d.height))>30);assert.ok(new Set(CHARACTER_CONCEPTS.map(d=>d.hair)).size>=5);for(const item of ['none','cap','visor','headband'])assert.ok(CHARACTER_CONCEPTS.some(d=>d.headwear===item))});
test('appearance adjustments leave authored designs immutable and feet grounded',()=>{for(const source of CHARACTER_CONCEPTS){const before=structuredClone(source),tall=conceptDimensions(source,12,.25),short=conceptDimensions(source,-12,-.25);assert.ok(tall.height>short.height);assert.ok(tall.waist>short.waist);assert.equal(conceptPoint({x:24,y:63},tall).y,63);assert.ok(conceptPoint({x:24,y:20},tall).y<conceptPoint({x:24,y:20},short).y);assert.deepEqual(source,before)}});
test('all six body concepts retain finite joints throughout every existing motion',()=>{for(const design of CHARACTER_CONCEPTS)for(const view of ['near','far'])for(const mode of MOTIONS)for(const delta of [-12,12])for(let n=0;n<=20;n++){const pose=sampleCharacterPose({mode,view,phase:n/20,frame:n/5}),body=conceptDimensions(design,delta,delta/50);for(const point of [pose.neck,pose.hips,...pose.arms.flat(),...pose.legs.flat(),pose.paddle]){const p=conceptPoint(point,body);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y))}}});


test('female catalog adds long hair and a structured bun',()=>{assert.deepEqual(HAIR_OPTIONS.female.slice(-3).map(item=>[item.id,item.name]),[['long','Long hair'],['bun','Bun'],['twinTails','Twin tails']]);});

test('male catalog separates textured crop, swept side part, curls and afro',()=>{
 assert.deepEqual(HAIR_OPTIONS.male.map(item=>[item.id,item.name]),[['crop','Textured crop'],['sidePart','Swept side part'],['curls','Soft curls'],['afro','Afro'],['spiky','Spiky hair'],['buzz','Close buzz cut'],['bald','Bald']]);
});