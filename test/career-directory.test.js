import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterPlayers,directoryPage,DIRECTORY_PAGE_SIZE} from '../src/career/directory.js';

const athletes=[
  {id:'a',name:'Alice',areaId:'north',cityId:'one',gender:'female',age:21,ratings:{power:40},formats:{doubles:3.5},clubName:'A'},
  {id:'b',name:'Bob',areaId:'north',cityId:'two',gender:'male',age:42,ratings:{power:90},formats:{doubles:4.5},clubName:'B'},
  {id:'c',name:'Cara',areaId:'south',cityId:'three',gender:'female',age:34,ratings:{power:70},formats:{doubles:5.1},clubName:'C'}
];

test('the player directory works without a name query',()=>{
  assert.equal(filterPlayers(athletes,{}).length,3);
  assert.equal(filterPlayers(athletes,{minAge:'',maxAge:''}).length,3,'empty age fields do not mean age zero');
  assert.equal(filterPlayers(athletes,{sort:'name'})[0].name,'Alice');
});

test('directory filters combine area, city, gender, age and bracket',()=>{
  assert.deepEqual(filterPlayers(athletes,{areaId:'north',gender:'female'}).map(a=>a.id),['a']);
  assert.deepEqual(filterPlayers(athletes,{minAge:30,maxAge:40}).map(a=>a.id),['c']);
  assert.deepEqual(filterPlayers(athletes,{bracket:'4.5'}).map(a=>a.id),['b']);
  assert.deepEqual(filterPlayers(athletes,{cityId:'two',query:'bo'}).map(a=>a.id),['b']);
});

test('directory sorting uses doubles rating, age or name',()=>{
  assert.deepEqual(filterPlayers(athletes,{sort:'rating-desc'}).map(a=>a.id),['c','b','a']);
  assert.deepEqual(filterPlayers(athletes,{sort:'rating-asc'}).map(a=>a.id),['a','b','c']);
  assert.deepEqual(filterPlayers(athletes,{sort:'age-asc'}).map(a=>a.id),['a','c','b']);
  assert.deepEqual(filterPlayers(athletes,{sort:'overall-desc'}).map(a=>a.id),['b','c','a']);
  assert.deepEqual(filterPlayers(athletes,{sort:'overall-asc'}).map(a=>a.id),['a','c','b']);
});

test('directory pagination returns bounded pages',()=>{
  const many=Array.from({length:95},(_,index)=>({...athletes[0],id:String(index),name:'Player '+index}));
  const first=directoryPage(many,{sort:'name'},0);
  assert.equal(first.total,95);
  assert.equal(first.page,0);
  assert.equal(first.pages,Math.ceil(95/DIRECTORY_PAGE_SIZE));
  assert.equal(first.rows.length,DIRECTORY_PAGE_SIZE);
  const last=directoryPage(many,{sort:'name'},999);
  assert.equal(last.page,last.pages-1);
  assert.ok(last.rows.length>0);
});