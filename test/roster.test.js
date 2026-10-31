import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,CHARACTER_LOOKS,PADDLES,normalizeSelection,buildProfile,createLineup,selectionStats} from '../src/roster.js';
import {Game} from '../src/game.js';

test('invalid saved selections safely normalize',()=>{assert.deepEqual(normalizeSelection(null),{character:'avery',paddle:'balanced',jersey:0,design:'ocean'});assert.deepEqual(normalizeSelection({character:'nope',paddle:'nope',jersey:-1,design:'nope'}),normalizeSelection())});
test('every player and paddle combination produces an independent playable profile',()=>{for(const c of CHARACTERS)for(const p of PADDLES){const config={character:c.id,paddle:p.id,jersey:3,design:'mint'};const profile=buildProfile(config);assert.equal(profile.characterId,c.id);assert.equal(profile.paddle.id,p.id);assert.equal(profile.appearance.jersey,3);assert.equal(profile.appearance.paddleDesign,'mint');profile.abilities.speed=0;assert.ok(buildProfile(config).abilities.speed>0)}});
test('each character has a meaningful strength and a tradeoff',()=>{const standard=selectionStats({});for(const c of CHARACTERS.filter(c=>c.id!=='avery')){const stats=selectionStats({character:c.id});assert.ok(Object.keys(stats).some(k=>stats[k]>standard[k]));assert.ok(Object.keys(stats).some(k=>stats[k]<standard[k]))}});
test('power and control paddles trade capabilities rather than increasing all stats',()=>{const power=selectionStats({paddle:'power'}),control=selectionStats({paddle:'control'});assert.ok(power.power>control.power);assert.ok(power.placement<control.placement);assert.ok(power.spin<control.spin)});
test('cosmetic changes do not affect abilities or paddle performance',()=>{const a=buildProfile({jersey:0,design:'ocean'}),b=buildProfile({jersey:2,design:'ember'});assert.deepEqual(a.abilities,b.abilities);assert.deepEqual(a.paddle,b.paddle);assert.notDeepEqual(a.appearance,b.appearance)});
test('configured lineup contains four characters and survives match resets',()=>{const config={character:'morgan',paddle:'control',jersey:2,design:'ember'};assert.equal(new Set(createLineup(config).map(p=>p.characterId)).size,4);const g=new Game();g.configure(config);assert.equal(g.players[0].name,'Morgan Reed');assert.equal(g.players[0].paddle.id,'control');g.players[0].abilities.control=0;g.reset();assert.equal(g.players[0].abilities.control,1.04);assert.deepEqual(g.players[0].appearance,{jersey:2,body:'male',paddleDesign:'ember'})});



test('female players have distinct originals and same-gender doubles partners',()=>{const women=CHARACTERS.filter(c=>c.gender==='female');assert.equal(women.length,4);const lineup=createLineup({character:'quinn',paddle:'control'});assert.equal(lineup[0].characterId,'quinn');assert.equal(lineup[0].paddle.id,'control');assert.ok(lineup[1].gender==='female');assert.ok(lineup.slice(2).every(p=>p.gender==='male'));assert.ok(lineup[1].characterId!=='quinn')});
test('male selections receive a same-gender partner and female opponents',()=>{const lineup=createLineup({character:'avery'});assert.equal(lineup[0].gender,'male');assert.equal(lineup[1].gender,'male');assert.ok(lineup.slice(2).every(p=>p.gender==='female'))});


test('each character has a distinct trial skin and hair palette',()=>{const palettes=CHARACTERS.map(c=>CHARACTER_LOOKS[c.id]);assert.ok(palettes.every(Boolean));assert.equal(new Set(palettes.map(p=>[...p.skin,...p.hair].join(','))).size,CHARACTERS.length)});
