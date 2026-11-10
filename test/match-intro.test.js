import {test} from 'node:test';
import assert from 'assert/strict';
import {matchIntroCards,matchIntroTeams,INTRO_RATING_KEYS} from '../src/match-intro.js';

const ratings=Object.fromEntries(['serve','drive','volley','drop','dink','lob','smash','power','control','defense','agility','courtIQ','reach','aggression'].map(key=>[key,70]));
const players=[{id:0,team:0,name:'Alex Kim',archetype:'All-rounder',characterId:'avery',ratings:{...ratings,power:95,control:90,agility:65,reach:52},appearance:{body:'male'},paddle:{shapeId:'hybrid'}},{id:2,team:1,name:'Priya Rao',archetype:'Counter-attacker',characterId:'selena',ratings,appearance:{body:'female'},paddle:{shapeId:'wide'}}];

test('match intro cards include identity, overall and core ratings',()=>{
 const cards=matchIntroCards(players);assert.equal(cards.length,2);assert.equal(cards[0].name,'Alex Kim');assert.equal(cards[0].archetype,'All-rounder');assert.equal(cards[0].overall,81.2);assert.deepEqual(Object.keys(cards[0].ratings),[...INTRO_RATING_KEYS]);assert.equal(cards[0].ratings.power,95);assert.ok(INTRO_RATING_KEYS.every(key=>cards[0].ratings[key]>=0&&cards[0].ratings[key]<=100));
});

test('match intro labels paddle family and shape while applying equipment rating modifiers',()=>{
 const base=matchIntroCards(players)[0],equipped={...players[0],paddle:{id:'power',shapeId:'elongated',ratingModifiers:{power:10,control:-5},shapeRatingModifiers:{power:6,reach:6,volley:-5}}},card=matchIntroCards([equipped])[0];
 assert.equal(base.paddleLabel,'Allcourt · Hybrid - Flat Top · 16 mm');
 assert.equal(card.paddleLabel,'Ignite · Elongated - Flat Top · 16 mm');
 assert.equal(card.paddleName,'Ignite');
 assert.equal(card.paddleShapeName,'Elongated - Flat Top');
 assert.equal(card.ratings.power,100);
 assert.equal(card.ratings.reach,58);
 assert.ok(card.overall>=base.overall);
});
test('match intro groups doubles and singles lineups by team',()=>{
 const teams=matchIntroTeams(players);assert.deepEqual(teams.map(team=>team.team),[0,1]);assert.equal(teams[0].players.length,1);
 const doubles=matchIntroTeams([...players,{id:1,team:0,name:'Morgan Lee',archetype:'Kitchen specialist',ratings,appearance:{body:'male'}}]);assert.equal(doubles[0].players.length,2);assert.equal(doubles[1].players.length,1);
});
