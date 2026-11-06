import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {playerProfile} from '../src/core.js';
import {commitStackingCoverage,stackTargetXFor} from '../src/stacking.js';

function profile(hand='right',strong=false){
 const player={...playerProfile(),handedness:hand,ratingStyle:'balanced'};
 if(strong)player.ratings={volley:95,reach:90,power:90,courtIQ:90,aggression:90};
 return player;
}
function stackLineup(){
 return [profile('right',true),profile('right'),profile('right'),profile('right',true)];
}
function stackingGame(modes=['off','off'],sides=['auto','auto'],{lineup=stackLineup(),swapServer=false}={}){
 const g=new Game({seed:24});
 g.configure({format:'doubles',stacking:{teams:modes.map((mode,index)=>({mode,preferredSide:sides[index]}))}},lineup);
 if(swapServer){g.score.serverPlayer=0;g.score.rightPlayer[0]=0;g.serveSetup()}
 return g;
}

test('stacking is off by default and preserves normal partner sides',()=>{
 const g=stackingGame();
 for(const team of [0,1]){
  const plan=g.stackPlans[team],pair=g.players.filter(p=>p.team===team);
  assert.equal(plan.selected,false);
  assert.equal(plan.mode,'off');
  assert.notEqual(pair[0].x<10,pair[1].x<10);
 }
 assert.equal(g.tacticalStats.stackSelected,0);
});

test('correct hand formation already on preferred sides does not stack',()=>{
 const lineup=[profile('right'),profile('left'),profile('right'),profile('left')];
 const g=stackingGame(['cross','cross'],['auto','auto'],{lineup});
 for(const plan of g.stackPlans){
  assert.equal(plan.stackRequired,false);
  assert.equal(plan.selected,false);
  assert.notEqual(g.players.find(p=>p.id===plan.partnerId).x<10,g.players.find(p=>p.id===plan.activeId).x<10);
 }
});

test('same-handed stronger player prefers the left lane and stacks only when roles swap',()=>{
 const aligned=stackingGame(['cross','off'],['auto','auto']);
 assert.equal(aligned.stackPlans[0].stackRequired,false);
 const mismatched=stackingGame(['cross','off'],['auto','auto'],{swapServer:true});
 const plan=mismatched.stackPlans[0];
 assert.equal(plan.stackRequired,true);
 assert.equal(plan.selected,true);
 assert.equal(plan.targetLanes[plan.strongId],5);
 assert.equal(plan.targetLanes[plan.weakId],15);
});
test('server stack stages the partner outside the court and keeps score-controlled server identity',()=>{
 const g=stackingGame(['cross','off'],['left','auto'],{swapServer:true});
 const plan=g.stackPlans[0],active=g.players.find(p=>p.id===plan.activeId),partner=g.players.find(p=>p.id===plan.partnerId);
 assert.equal(plan.selected,true);
 assert.equal(plan.triggerRole,'serve');
 assert.ok(partner.x<0||partner.x>20);
 assert.equal(partner.x<0,active.x<10);
 assert.equal(stackTargetXFor(partner,plan),partner.x);
 assert.equal(g.server.id,g.score.team*2+g.score.player);
 assert.notEqual(g.server.x<10,g.serveReceiver.x<10);
 const serverId=g.server.id,receiverId=g.serveReceiver.id;
 g.serve();
 g.update(g.serveToss.duration+.01);
 assert.equal(plan.activated,true);
 assert.equal(plan.crossAfter,true);
 assert.equal(g.server.id,serverId);
 assert.equal(g.serveReceiver.id,receiverId);
 const mover=g.players.find(p=>p.id===plan.moverId);
 mover.x=plan.initialLane<10?12:8;
 assert.equal(commitStackingCoverage(g.players,plan,2),true);
 assert.equal(g.players.find(p=>p.id===plan.strongId).coverLane,plan.preferredLane);
 assert.equal(g.players.find(p=>p.id===plan.weakId).coverLane,20-plan.preferredLane);
 assert.equal(plan.crossed,true);
});

test('return stack stages the non-returner outside the court clear of the return lane',()=>{
 const g=stackingGame(['off','cross'],['auto','left'],{swapServer:true});
 const plan=g.stackPlans[1],active=g.players.find(p=>p.id===plan.activeId),partner=g.players.find(p=>p.id===plan.partnerId);
 assert.equal(plan.triggerRole,'return');
 assert.equal(active.id,g.serveReceiver.id);
 assert.ok(partner.x<0||partner.x>20);
 assert.equal(partner.x<0,active.x<10);
 assert.equal(stackTargetXFor(partner,plan),partner.x);
});
test('stack stay keeps the stacked lane and never commits an automatic crossing',()=>{
 const g=stackingGame(['stay','off'],['left','auto'],{swapServer:true});
 const plan=g.stackPlans[0],mover=g.players.find(p=>p.id===plan.moverId);
 g.serve();
 g.update(g.serveToss.duration+.01);
 assert.equal(plan.activated,true);
 assert.equal(plan.crossAfter,false);
 assert.equal(g.tacticalStats.stackStays,1);
 mover.x=plan.initialLane<10?12:8;
 assert.equal(commitStackingCoverage(g.players,plan,2),false);
 for(const p of g.players.filter(p=>p.team===0))assert.equal(p.coverLane,plan.initialLane);
});

test('adaptive stacking uses deterministic team/context probability and can remain off',()=>{
 const selected=stackingGame(['adaptive','off'],['left','auto'],{swapServer:true});
 selected.random=()=>0;
 selected.serveSetup();
 assert.equal(selected.stackPlans[0].selected,true);
 assert.ok(selected.stackPlans[0].adaptiveProbability>=.05);
 const skipped=stackingGame(['adaptive','off'],['left','auto'],{swapServer:true});
 skipped.random=()=>.99;
 skipped.serveSetup();
 assert.equal(skipped.stackPlans[0].selected,false);
});

test('unsafe lobs cancel an automatic crossing and record the fallback',()=>{
 const g=stackingGame(['cross','off'],['left','auto'],{swapServer:true});
 const plan=g.stackPlans[0];
 g.serve();
 g.update(g.serveToss.duration+.01);
 g.lastShot='lob';
 g.ball.shot='lob';
 g.updateStackingSafety();
 assert.equal(plan.fallback,'lob');
 assert.equal(plan.crossAfter,false);
 assert.equal(g.tacticalStats.stackFallbacks,1);
 assert.ok(g.matchReport().journal.events.some(event=>event.type==='stack-fallback'&&event.reason==='lob'));
});

test('wrong contact identity cannot trigger the receiver stack',()=>{
 const g=stackingGame(['off','cross'],['auto','left'],{swapServer:true});
 const plan=g.stackPlans[1],wrong=g.players.find(p=>p.team===1&&p.id!==g.serveReceiver.id);
 assert.equal(g.activateStacking(wrong,1,1),false);
 assert.equal(plan.activated,false);
 assert.equal(g.activateStacking(g.serveReceiver,1,1),true);
 assert.equal(plan.activated,true);
});

test('stack rotation never changes score identity or diagonal service courts',()=>{
 const g=stackingGame(['cross','cross'],['left','right'],{swapServer:true});
 for(let n=0;n<12;n++){
  const before=structuredClone(g.score);
  g.serveSetup();
  assert.deepEqual(g.score.rightPlayer,before.rightPlayer);
  assert.equal(g.server.id,g.score.team*2+g.score.player);
  assert.equal(g.serveReceiver.team,1-g.score.team);
  assert.notEqual(g.server.x<10,g.serveReceiver.x<10);
  g.score.point(n%3===0?g.score.team:1-g.score.team);
 }
});

test('stacking policy and point plans are visible in reports and replays',()=>{
 const g=stackingGame(['cross','stay'],['left','left'],{swapServer:true});
 g.serve();
 g.update(g.serveToss.duration+.01);
 g.recordReplay(true);
 const report=g.matchReport(),frame=g.replayFrames.at(-1);
 assert.equal(report.stacking.config.teams[0].mode,'cross');
 assert.equal(report.stacking.config.teams[1].mode,'stay');
 assert.equal(report.stacking.plans.length,2);
 assert.ok(report.tactics.stackSelected>=2);
 assert.ok(report.stacking.summary.decisions>=2);
 assert.ok(Object.keys(report.stacking.summary.byTeamType).length>0);
 assert.ok(Object.keys(report.stacking.summary.byHandPair).length>0);
 assert.ok(report.journal.events.some(event=>event.type==='stack-decision'));
 assert.equal(frame.stacking.length,2);
});
