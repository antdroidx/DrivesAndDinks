import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {Game} from '../src/game.js';
import {C,launch} from '../src/core.js';

const games=Number(process.argv[2]??20),seconds=Number(process.argv[3]??180),output=resolve(process.argv[4]??'validation/rally-variety.json');
if(!Number.isInteger(games)||games<5||games>100)throw new Error('Match count must be an integer from 5 to 100');
if(!Number.isFinite(seconds)||seconds<60||seconds>600)throw new Error('Seconds per match must be from 60 to 600');

const rows=[];
for(let seed=1;seed<=games;seed++){
 const game=new Game({seed});game.mode='watch';game.recordReplay=()=>{};
 for(let tick=0;tick<seconds*120&&game.phase!=='over';tick++)game.update(C.dt);
 rows.push({seed,completed:game.phase==='over',points:[...game.score.points],shots:{atp:game.stats.shots.atp??0,tweener:game.stats.shots.tweener??0,lob:game.stats.shots.lob??0},net:{...game.stats.net}});
}

const deepLobRows=[];
for(let seed=1;seed<=8;seed++){
 const game=new Game({seed});game.mode='watch';game.recordReplay=()=>{};game.phase='rally';game.shots=4;game.last=1;game.bounces=0;
 game.ball={x:10,y:15,z:1.2,vx:0,vy:0,vz:0,spin:0,spinX:0,spinY:0,spinZ:0,radius:C.ballRadius};
 launch(game.ball,10,43,'lob',{power:1,control:1,spin:1,skill:1},1,{shape:'open-court'});
 Object.assign(game.players[0],{x:5,y:30});Object.assign(game.players[1],{x:15,y:30});
 let response=null,maxReceiverY=30;const hit=game.hit.bind(game);
 game.hit=(player,shot,...args)=>{if(!response&&game.shots>=4)response={playerId:player.id,shot};return hit(player,shot,...args)};
 for(let tick=0;tick<600&&game.phase==='rally';tick++){game.update(C.dt);const receiver=game.players.find(player=>player.id===game.teamPlan?.receiverId);if(receiver)maxReceiverY=Math.max(maxReceiverY,receiver.y)}
 deepLobRows.push({seed,maxReceiverY:Number(maxReceiverY.toFixed(3)),response,fault:game.phase==='over'?game.message:null});
}

const totals=rows.reduce((sum,row)=>{
 sum.atp+=row.shots.atp;sum.tweener+=row.shots.tweener;sum.lob+=row.shots.lob;
 sum.netContacts+=row.net.contacts;sum.netCords+=row.net.cords;sum.netMesh+=row.net.mesh;
 if(row.shots.atp)sum.matchesWithAtp++;if(row.shots.tweener)sum.matchesWithTweener++;if(row.net.contacts)sum.matchesWithNetContact++;
 return sum;
},{atp:0,tweener:0,lob:0,netContacts:0,netCords:0,netMesh:0,matchesWithAtp:0,matchesWithTweener:0,matchesWithNetContact:0});
const deepLobChases=deepLobRows.filter(row=>row.maxReceiverY>38&&['lob','tweener'].includes(row.response?.shot)).length;
const checks={
 atpPresentInMostMatches:totals.matchesWithAtp>=Math.ceil(games*.7),
 atpFrequency:totals.atp>=games*2,
 netContactsVisible:totals.netContacts>=games*.5&&totals.netCords>0&&totals.netMesh>0,
 occasionalTweeners:totals.tweener>0&&totals.matchesWithTweener>0,
 deepLobChases:deepLobChases>=6
};
const report={schemaVersion:1,methodology:{format:'doubles',mode:'watch',games,secondsPerMatch:seconds,seeds:Array.from({length:games},(_,index)=>index+1),deepLobScenarios:deepLobRows.length},totals,checks,rows,deepLobRows,passed:Object.values(checks).every(Boolean)};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,passed:report.passed,totals,checks,deepLobChases},null,2));
if(!report.passed)process.exitCode=1;