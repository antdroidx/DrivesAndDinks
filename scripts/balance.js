import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {C} from '../src/core.js';
import {CHARACTERS,PADDLES,buildProfile} from '../src/roster.js';
const pairs=Number(process.argv[2]||4);
if(!Number.isInteger(pairs)||pairs<1||pairs>50)throw new Error('Choose 1–50 paired seeds');
const originalRandom=Math.random,results=[];
try{for(const character of CHARACTERS)for(const paddle of PADDLES){
 const result={archetype:character.id,style:character.style,paddle:paddle.name,games:0,wins:0,completed:0,pointDifference:0};
 for(let seed=1;seed<=pairs;seed++)for(const slot of [0,2]){
  let state=seed;Math.random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296};
  const g=new Game();g.mode='watch';g.lineup=Array.from({length:4},()=>buildProfile({}));g.lineup[slot]=buildProfile({character:character.id,paddle:paddle.id});g.reset();
  for(let tick=0;tick<120*1800&&g.phase!=='over';tick++)g.update(C.dt);
  result.games++;const team=slot<2?0:1;
  if(g.phase==='over'){result.completed++;if(g.score.winner===team)result.wins++;result.pointDifference+=g.score.points[team]-g.score.points[1-team]}
 }
 assert.equal(result.completed,result.games,`${character.id}/${paddle.id} did not finish every game`);
 results.push(result);
}}finally{Math.random=originalRandom}
const balanceFlags=pairs>=12?results.filter(r=>r.wins/r.games<.2||r.wins/r.games>.8).map(r=>`${r.archetype}/${r.paddle}: outside the 20–80% smoke-test band`):[];
console.log(JSON.stringify({balanceFlags,method:'CPU-only candidate plus standard partner vs two standard opponents; candidate tested on both court sides for each seed. Smoke test, not proof of competitive balance.',pairedSeeds:pairs,results},null,2));

if(balanceFlags.length)process.exitCode=1;
