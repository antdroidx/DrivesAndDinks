import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseCpuShot} from '../src/core.js';

test('playable incoming lobs are attacked instead of returned as another lob',()=>{
 for(const tendency of ['balanced','banger','soft','net','speed']){
  assert.equal(chooseCpuShot({shots:5,team:0,y:31,height:1,tendency,difficulty:.9,incomingShot:'lob',opponentsAtKitchen:true,random:0}),'drive');
  assert.notEqual(chooseCpuShot({shots:5,team:0,y:31,height:1,tendency,difficulty:.9,incomingShot:'lob',opponentsAtKitchen:true,lobExchange:1,random:1}),'lob');
 }
});

test('a desperate counter-lob is rare and cannot continue the lob exchange',()=>{
 const desperate={shots:5,team:0,y:31,height:1,difficulty:.98,incomingShot:'lob',opponentsAtKitchen:true,random:.8};
 assert.equal(chooseCpuShot(desperate),'lob');
 assert.notEqual(chooseCpuShot({...desperate,lobExchange:1}),'lob');
 assert.notEqual(chooseCpuShot({...desperate,opponentsAtKitchen:false}),'lob');
});