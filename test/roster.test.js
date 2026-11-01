import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,PADDLES,CLOTHING_COLORS,PADDLE_COLORS,COURT_PALETTES,normalizeSelection,buildProfile,createLineup,selectionStats} from '../src/roster.js';
import {statRating} from '../src/selection.js';
import {appearancePalette,characterSpritesReady,onCharacterSpritesReady,characterFrame} from '../src/pixel-character.js';
import {Game} from '../src/game.js';

test('every requested appearance option is available',()=>{
 assert.deepEqual(CLOTHING_COLORS.map(item=>item.name),['Black','Gray','White','Blue','Yellow','Red','Green','Purple','Pink','Orange']);
 assert.equal(PADDLE_COLORS.length,10);
 assert.equal(COURT_PALETTES.length,3);
});
test('invalid and legacy selections safely normalize',()=>{
 const fallback=normalizeSelection(null);
 assert.equal(fallback.shirtColor,'green');assert.equal(fallback.paddleColor,'mint');
 const invalid=normalizeSelection({character:'nope',paddle:'nope',hair:'nope',skin:'nope',outfit:'dress',shirtColor:'nope',bottomColor:'nope',paddleColor:'nope',court:'nope'});
 assert.equal(invalid.character,'avery');assert.equal(invalid.court,'blue-gray');
 assert.equal('hair' in invalid,false);assert.equal('skin' in invalid,false);
 assert.equal('outfit' in invalid,false);assert.equal('bottomColor' in invalid,false);
});
test('every player and paddle combination produces an independent playable profile',()=>{
 for(const c of CHARACTERS)for(const p of PADDLES){const config={character:c.id,paddle:p.id,shirtColor:'orange',paddleColor:'yellow',court:'pink-black'};const profile=buildProfile(config);assert.equal(profile.characterId,c.id);assert.equal(profile.paddle.id,p.id);assert.equal(profile.appearance.shirtColor,'orange');assert.equal(profile.appearance.paddleColor,'yellow');profile.abilities.speed=0;assert.ok(buildProfile(config).abilities.speed>0)}
});
test('each character has a meaningful strength and a tradeoff',()=>{const standard=selectionStats({});for(const c of CHARACTERS.filter(c=>c.id!=='avery')){const stats=selectionStats({character:c.id});assert.ok(Object.keys(stats).some(k=>stats[k]>standard[k]));assert.ok(Object.keys(stats).some(k=>stats[k]<standard[k]))}});
test('players carry distinct serve, power, and spin skills into the lineup',()=>{for(const character of CHARACTERS)assert.ok(buildProfile({character:character.id}).abilities.serve>0);assert.ok(selectionStats({character:'lena'}).serve>selectionStats({character:'harper'}).serve);const stats=CHARACTERS.map(character=>selectionStats({character:character.id}));assert.ok(new Set(stats.map(stat=>stat.power)).size>=6);assert.ok(new Set(stats.map(stat=>stat.spin)).size>=6)});
test('power and control paddles trade capabilities rather than increasing all stats',()=>{const power=selectionStats({paddle:'power'}),control=selectionStats({paddle:'control'});assert.ok(power.power>control.power);assert.ok(power.placement<control.placement);assert.ok(power.spin<control.spin)});
test('cosmetic changes do not affect abilities or paddle performance',()=>{const a=buildProfile({shirtColor:'black',paddleColor:'mint'}),b=buildProfile({shirtColor:'pink',paddleColor:'red'});assert.deepEqual(a.abilities,b.abilities);assert.deepEqual(a.paddle,b.paddle);assert.notDeepEqual(a.appearance,b.appearance)});
test('configured lineup contains four characters and survives match resets',()=>{const config={character:'morgan',paddle:'control',shirtColor:'blue',paddleColor:'orange',court:'green-orange'};const lineup=createLineup(config);assert.equal(new Set(lineup.map(p=>p.characterId)).size,4);const g=new Game();g.configure(config);assert.equal(g.players[0].name,'Morgan Reed');assert.equal(g.players[0].paddle.id,'control');g.players[0].abilities.control=0;g.reset();assert.equal(g.players[0].abilities.control,1.04);assert.equal(g.players[0].appearance.shirtColor,'blue');assert.equal(g.players[0].appearance.court,'green-orange')});
test('female selections receive a male partner and male selections receive a female partner',()=>{for(const player of CHARACTERS){const lineup=createLineup({character:player.id});for(const team of [lineup.slice(0,2),lineup.slice(2,4)])assert.deepEqual(new Set(team.map(p=>p.gender)),new Set(['male','female']))}});
test('player power and spin modify effective equipment and stat bars are bounded',()=>{const g=new Game();g.configure({character:'jordan',paddle:'balanced'});const p=g.players[0],effective=g.paddleFor(p);assert.ok(effective.power>p.paddle.power);assert.ok(effective.spin<p.paddle.spin);assert.equal(Object.keys(selectionStats({character:'jordan'}))[0],'serve');for(const value of [.4,.8,1,1.2,1.5])assert.ok(statRating(value)>=0&&statRating(value)<=100)});

test('sprite readiness invokes callbacks even when sheets are already cached',()=>{
 let calls=0;
 assert.equal(characterSpritesReady(),true);
 assert.equal(onCharacterSpritesReady(()=>calls++),true);
 assert.equal(calls,1);
});
test('lateral shuffle and slide states use the moving sprite cycle',()=>{
 assert.deepEqual(characterFrame('shuffle',0,0),{row:0,col:0});
 assert.deepEqual(characterFrame('shuffle',0,1),{row:0,col:1});
 assert.deepEqual(characterFrame('slide',0,2),{row:0,col:0});
 assert.deepEqual(characterFrame('forehand',.999),{row:1,col:3});
});
test('pixel sprite palettes follow every appearance color choice',()=>{
 const first=appearancePalette({shirtColor:'blue',paddleColor:'coral'});
 const second=appearancePalette({shirtColor:'red',paddleColor:'yellow'});
 assert.notEqual(first.shirt,second.shirt);assert.notEqual(first.bottom,second.bottom);assert.notEqual(first.paddle,second.paddle);
});
