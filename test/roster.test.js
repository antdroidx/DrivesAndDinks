import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,PADDLES,CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS,COURT_PALETTES,NAME_CULTURES,RATING_KEYS,PLAYTEST_BASE_RATING,normalizeSelection,buildProfile,createLineup,selectionStats,effectiveRatings,skillAverage} from '../src/roster.js';
import {statRating} from '../src/selection.js';
import {appearancePalette,characterSpritesReady,onCharacterSpritesReady,characterFrame} from '../src/pixel-character.js';
import {Game} from '../src/game.js';

test('every requested appearance option is available',()=>{
 assert.deepEqual(CLOTHING_COLORS.map(item=>item.name),['Black','Gray','White','Blue','Yellow','Red','Green','Purple','Pink','Orange']);
 assert.equal(PADDLE_COLORS.length,12);assert.ok(HAIR_COLORS.length>=6);assert.ok(SKIN_COLORS.length>=4);
 assert.equal(COURT_PALETTES.length,3);
 const blueGray=COURT_PALETTES.find(item=>item.id==='blue-gray'),rgb=blueGray.kitchen.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16));
 assert.ok(Math.max(...rgb)-Math.min(...rgb)<=12);
});
test('invalid and legacy selections safely normalize',()=>{
 const fallback=normalizeSelection(null);
 assert.equal(fallback.shirtColor,'green');assert.equal(fallback.paddleColor,'mint');
 const invalid=normalizeSelection({character:'nope',paddle:'nope',hair:'nope',skin:'nope',outfit:'dress',shirtColor:'nope',bottomColor:'nope',paddleColor:'nope',court:'nope'});
 assert.equal(invalid.character,'avery');assert.equal(invalid.court,'blue-gray');
 assert.equal(invalid.hairColor,'brown');assert.equal(invalid.skinColor,'medium');
 assert.equal('outfit' in invalid,false);assert.equal('bottomColor' in invalid,false);
});
test('every player and paddle combination produces an independent playable profile',()=>{
 for(const c of CHARACTERS)for(const p of PADDLES){const config={character:c.id,paddle:p.id,shirtColor:'orange',paddleColor:'yellow',court:'pink-black'};const profile=buildProfile(config);assert.equal(profile.characterId,c.id);assert.equal(profile.paddle.id,p.id);assert.equal(profile.appearance.shirtColor,'orange');assert.equal(profile.appearance.paddleColor,'yellow');profile.abilities.speed=0;assert.ok(buildProfile(config).abilities.speed>0)}
});
test('each character has a meaningful strength and a tradeoff',()=>{const standard=selectionStats({});for(const c of CHARACTERS.filter(c=>c.id!=='avery')){const stats=selectionStats({character:c.id});assert.ok(Object.keys(stats).some(k=>stats[k]>standard[k]));assert.ok(Object.keys(stats).some(k=>stats[k]<standard[k]))}});
test('playtest archetypes average around 70 and keep shot identities distinct',()=>{
 for(const character of CHARACTERS){const stats=selectionStats({character:character.id});assert.equal(Object.keys(stats).join(','),RATING_KEYS.join(','));assert.ok(Math.abs(skillAverage(stats)-PLAYTEST_BASE_RATING)<=3,character.id)}
 const balanced=selectionStats({character:'avery'}),banger=selectionStats({character:'jordan'}),soft=selectionStats({character:'quinn'}),net=selectionStats({character:'selena'});
 assert.ok(Object.values(balanced).every(value=>value===70));
 assert.ok(banger.power>balanced.power&&banger.drive>balanced.drive&&banger.dink<balanced.dink);
 assert.ok(soft.dink>balanced.dink&&soft.drop>balanced.drop&&soft.power<balanced.power);
 assert.ok(net.volley>balanced.volley&&net.reach>balanced.reach&&net.lob<balanced.lob);
});
test('power and control paddles trade displayed capabilities rather than changing archetype ratings',()=>{const base=selectionStats({}),power=effectiveRatings({paddle:'power'}),control=effectiveRatings({paddle:'control'});assert.ok(power.power>control.power);assert.ok(power.control<control.control);assert.deepEqual(selectionStats({paddle:'power'}),base);assert.deepEqual(selectionStats({paddle:'control'}),base)});
test('cosmetic changes do not affect abilities or paddle performance',()=>{const a=buildProfile({shirtColor:'black',paddleColor:'mint'}),b=buildProfile({shirtColor:'pink',paddleColor:'red'});assert.deepEqual(a.abilities,b.abilities);assert.deepEqual(a.paddle,b.paddle);assert.notDeepEqual(a.appearance,b.appearance)});
test('configured lineup contains four unique archetypes and survives match resets',()=>{const config={character:'morgan',paddle:'control',shirtColor:'blue',paddleColor:'orange',skinColor:'medium',court:'green-orange'};const lineup=createLineup(config);assert.equal(new Set(lineup.map(p=>p.characterId)).size,4);const g=new Game();g.configure(config,lineup);const identity={name:g.players[0].name,culture:g.players[0].culture,skinColor:g.players[0].appearance.skinColor};assert.ok(identity.name);assert.equal(g.players[0].archetypeId,'morgan');assert.equal(g.players[0].paddle.id,'control');g.players[0].abilities.control=0;g.reset();assert.equal(g.players[0].abilities.control,CHARACTERS.find(c=>c.id==='morgan').abilities.control);assert.deepEqual({name:g.players[0].name,culture:g.players[0].culture,skinColor:g.players[0].appearance.skinColor},identity);assert.equal(g.players[0].appearance.shirtColor,'blue');assert.equal(g.players[0].appearance.court,'green-orange')});
test('body choice is independent of archetype',()=>{for(const gender of ['male','female']){const p=buildProfile({character:'avery',gender,customName:'Alex'});assert.equal(p.gender,gender);assert.equal(p.appearance.body,gender);assert.equal(p.name,'Alex');assert.deepEqual(p.ratings,buildProfile({character:'avery'}).ratings)}});
test('player power and spin modify effective equipment and stat bars are bounded',()=>{const g=new Game();g.configure({character:'jordan',paddle:'balanced'});const p=g.players[0],effective=g.paddleFor(p);assert.ok(effective.power>p.paddle.power);assert.ok(effective.spin<p.paddle.spin);assert.equal(Object.keys(selectionStats({character:'jordan'}))[0],'serve');for(const value of [.4,.8,1,1.2,1.5])assert.ok(statRating(value)>=0&&statRating(value)<=100)});

test('sprite readiness invokes callbacks even when sheets are already cached',()=>{
 let calls=0;
 assert.equal(characterSpritesReady(),true);
 assert.equal(onCharacterSpritesReady(()=>calls++),true);
 assert.equal(calls,1);
});
test('lateral shuffle and slide states use the moving sprite cycle',()=>{
 assert.deepEqual(characterFrame('shuffle',0,0),{row:1,col:0});
 assert.deepEqual(characterFrame('shuffle',0,1),{row:1,col:1});
 assert.deepEqual(characterFrame('slide',0,2),{row:1,col:2});
 assert.deepEqual(characterFrame('serve',.999),{row:14,col:3});
 assert.deepEqual(characterFrame('forehand',.999),{row:3,col:3});
 assert.deepEqual(characterFrame('overhead',.999),{row:9,col:3});
 assert.deepEqual(characterFrame('lob',.999),{row:10,col:3});
});

test('expanded motion rows cover every requested shot',()=>{
 for(const mode of ['run','shuffle','volley','forehand','backhand','forehandDink','backhandDink','forehandDrop','backhandDrop','overhead','lob','twoBackhand','twoBackhandDink','erne','serve','poachLunge','slideReturn']){
  const frame=characterFrame(mode,0,0);assert.ok(Number.isInteger(frame.row)&&frame.row>=0&&frame.row<17);assert.ok(Number.isInteger(frame.col)&&frame.col>=0&&frame.col<4);
 }
});
test('pixel sprite palettes follow every appearance color choice',()=>{
 const first=appearancePalette({shirtColor:'blue',paddleColor:'coral'});
 const second=appearancePalette({shirtColor:'red',paddleColor:'yellow'});
 assert.notEqual(first.shirt,second.shirt);assert.notEqual(first.bottom,second.bottom);assert.notEqual(first.paddle,second.paddle);
});

test('generated identities cover the requested name groups with coherent skin tones',()=>{
 assert.deepEqual(Object.values(NAME_CULTURES).map(group=>group.label).sort(),['Asian','European','Indian','Latin','Middle Eastern','White American']);
 let seed=17;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 const config={character:'avery',shirtColor:'red',paddleColor:'yellow',hairColor:'black',skinColor:'medium',court:'blue-gray'};
 const first=createLineup(config,{random}),second=createLineup(config,{random});
 assert.equal(new Set(first.map(player=>player.culture)).size,4);
 assert.equal(new Set(first.map(player=>player.name)).size,4);
 for(const player of first){assert.ok(NAME_CULTURES[player.culture]);assert.ok(player.appearance.skinColor in NAME_CULTURES[player.culture].tones);assert.match(player.name,/^[A-Za-z-]+ [A-Za-z-]+$/)}
 assert.equal(first[0].appearance.shirtColor,'red');assert.equal(first[0].appearance.hairColor,'black');assert.equal(first[0].appearance.skinColor,'medium');
 assert.notDeepEqual(first.slice(1).map(player=>[player.name,player.appearance]),second.slice(1).map(player=>[player.name,player.appearance]));
 for(const player of first)assert.ok(['male','female'].includes(player.gender));
});
