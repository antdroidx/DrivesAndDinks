export const STACK_MODES=Object.freeze(['off','cross','stay','adaptive']);
export const STACK_SIDES=Object.freeze(['auto','left','right']);

export const DEFAULT_STACKING_SELECTION=Object.freeze({
 teams:Object.freeze([
  Object.freeze({mode:'adaptive',preferredSide:'auto'}),
  Object.freeze({mode:'adaptive',preferredSide:'auto'})
 ])
});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const normalize01=value=>clamp(finite(value,0),0,1);

export function normalizeStackMode(value){
 if(value===true)return 'cross';
 if(value===false||value==null)return 'off';
 return STACK_MODES.includes(value)?value:'off';
}

export function normalizeStackSide(value){
 return STACK_SIDES.includes(value)?value:'auto';
}

export function normalizeStackTeam(value){
 const input=typeof value==='string'?{mode:value}:value??{};
 return {mode:normalizeStackMode(input.mode??input.stacking),preferredSide:normalizeStackSide(input.preferredSide??input.side)};
}

export function normalizeStackingSelection(value){
 const input=value??DEFAULT_STACKING_SELECTION;
 if(Array.isArray(input))return {teams:[normalizeStackTeam(input[0]),normalizeStackTeam(input[1])]};
 const teams=input.teams;
 return {teams:[normalizeStackTeam(input.team0??input.your??teams?.[0]),normalizeStackTeam(input.team1??input.opponent??teams?.[1])]};
}

function rating(player,key){
 if(Number.isFinite(player?.ratings?.[key]))return finite(player.ratings[key],70);
 if(Number.isFinite(player?.attributes?.[key]))return finite(player.attributes[key],70);
 const abilityKey=key==='agility'?'speed':key;
 const ability=player?.abilities?.[abilityKey];
 return Number.isFinite(ability)?70+(finite(ability,1)-1)*35:70;
}

function average(players,key){return players.reduce((sum,p)=>sum+rating(p,key),0)/Math.max(1,players.length)}
function handOf(player){return player?.handedness==='left'||player?.hand==='left'?'left':'right'}
function preferredLaneFor(player,team){const left=handOf(player)==='left';return team===0?(left?15:5):(left?5:15)}
function netScore(player){return rating(player,'volley')*.38+rating(player,'reach')*.22+rating(player,'power')*.18+rating(player,'courtIQ')*.12+rating(player,'aggression')*.1}
function teamType(pair,metrics){
 const styles=pair.map(p=>p?.ratingStyle);
 if(metrics.mixed)return 'mixed';
 if(metrics.netMismatch>.35)return 'asymmetric';
 if(styles.some(style=>style==='net'||style==='banger'))return 'pressure';
 if(styles.every(style=>style==='speed'))return 'coverage';
 if(styles.every(style=>style==='soft'))return 'control';
 return 'balanced';
}

export function summarizeStacking(journal,tactics={}){
 const decisions=(journal?.events??[]).filter(event=>event.type==='stack-decision');
 const groups=(key)=>{const result={};for(const decision of decisions){const name=String(decision[key]??'unknown'),row=result[name]??={decisions:0,selected:0,probabilitySum:0};row.decisions++;row.selected+=decision.selected?1:0;row.probabilitySum+=finite(decision.probability,0)}return Object.fromEntries(Object.entries(result).map(([name,row])=>[name,{decisions:row.decisions,selected:row.selected,selectedRate:row.decisions?row.selected/row.decisions:0,averageProbability:row.decisions?row.probabilitySum/row.decisions:0}]))};
 const summarizeStats=(stats)=>Object.fromEntries(Object.entries(stats??{}).map(([name,row])=>[name,{decisions:row.decisions??0,selected:row.selected??0,selectedRate:row.decisions?row.selected/row.decisions:0,averageProbability:row.decisions?(row.probabilitySum??0)/row.decisions:0}]));
 const byTeamType=summarizeStats(tactics.stackByTeamType),byHandPair=summarizeStats(tactics.stackByHandPair);
 return {schemaVersion:1,decisions:tactics.stackDecisions??decisions.length,selected:tactics.stackSelected??decisions.filter(decision=>decision.selected).length,selectedRate:(tactics.stackDecisions??decisions.length)?(tactics.stackSelected??decisions.filter(decision=>decision.selected).length)/(tactics.stackDecisions??decisions.length):0,byTeamType:Object.keys(byTeamType).length?byTeamType:groups('teamType'),byHandPair:Object.keys(byHandPair).length?byHandPair:groups('handPair'),byMode:groups('mode'),byTeam:groups('team'),execution:{needed:tactics.stackNeeded??0,aligned:tactics.stackAligned??0,crossPlanned:tactics.stackCrossPlanned??0,crossed:tactics.stackCrossings??0,stays:tactics.stackStays??0,fallbacks:tactics.stackFallbacks??0}};
}
function stylePrior(pair){
 const styles=pair.map(p=>p?.ratingStyle);
 if(styles.some(style=>style==='net'||style==='banger'))return .08;
 if(styles.every(style=>style==='speed'))return .04;
 if(styles.every(style=>style==='soft'))return -.04;
 return 0;
}

export function stackMetrics(pair,opponents=[]){
 const a=pair[0],b=pair[1],netA=netScore(a),netB=netScore(b);
 const mixed=pair.some(player=>player?.gender==='female')&&pair.some(player=>player?.gender==='male');
 return {
  netMismatch:clamp(Math.abs(netA-netB)/45,0,1),
  level:clamp((netA+netB)/40,2,8),
  mixed,
  netStrength:clamp((netA+netB)/200,0,1),
  mobility:clamp(average(pair,'agility')/100,0,1),
  courtIQ:clamp(average(pair,'courtIQ')/100,0,1),
  aggression:clamp(average(pair,'aggression')/100,0,1),
  lobRisk:clamp((average(opponents,'lob')*.65+average(opponents,'smash')*.35)/100,0,1),
  handPair:handOf(a)===handOf(b)?'same':'opposite',
  stylePrior:stylePrior(pair)
 };
}

export function stackPressure(score){
 const points=score?.points??[0,0],high=Math.max(finite(points[0],0),finite(points[1],0)),diff=Math.abs(finite(points[0],0)-finite(points[1],0));
 const matchPoint=high>=10&&diff>=1?.35:high>=9?.18:0;
 return clamp(high/11*.25+matchPoint+(diff<=1?.1:0),0,1);
}

export function stackProbability(metrics,score){
 return clamp(.08+.28*metrics.netMismatch+.18*metrics.netStrength+.12*metrics.mobility+.10*stackPressure(score)-.18*metrics.lobRisk+metrics.stylePrior+(metrics.handPair==='same'?.10:-.08)+(metrics.mixed?(metrics.level>=4.0?.12:.02):0),.05,.85);
}

function strongerPlayer(pair){
 const a=pair[0],b=pair[1],sa=netScore(a),sb=netScore(b);
 return sa===sb?(a.id<b.id?a:b):sa>sb?a:b;
}

function laneForHand(hand){return hand==='left'?15:5}
function resolveTargetLanes(pair,settings,strong,weak,metrics){
 if(settings.preferredSide==='left'||settings.preferredSide==='right'){
  const lane=settings.preferredSide==='left'?5:15;
  return {[strong.id]:lane,[weak.id]:20-lane};
 }
 const female=pair.find(player=>player?.gender==='female'),male=pair.find(player=>player?.gender==='male');
 // Pro mixed pairs commonly protect the right lane with the female player.
 // Lower-level mixed pairs can choose the same shape, but their traits and
 // lower level make the adaptive decision less likely.
 if(metrics?.mixed&&female&&male)return {[male.id]:5,[female.id]:15};
 if(handOf(pair[0])!==handOf(pair[1]))return {[pair[0].id]:laneForHand(handOf(pair[0])),[pair[1].id]:laneForHand(handOf(pair[1]))};
 return {[strong.id]:5,[weak.id]:15};
}

export function createStackPlans({players,server,receiver,score,config,random=Math.random}){
 if(players.filter(p=>p.team===0).length<2||players.filter(p=>p.team===1).length<2)return [];
 const normalized=normalizeStackingSelection(config);
 return [0,1].map(team=>{
  const pair=players.filter(p=>p.team===team),opponents=players.filter(p=>p.team!==team),active=team===score.team?server:receiver,partner=pair.find(p=>p!==active);
  const settings=normalized.teams[team],metrics=stackMetrics(pair,opponents),probability=stackProbability(metrics,score);
  const roll=settings.mode==='adaptive'?(typeof random==='function'?random():finite(random,.5)):1;
  const strong=strongerPlayer(pair),weak=pair.find(p=>p!==strong),targetLanes=resolveTargetLanes(pair,settings,strong,weak,metrics);
  const activeLane=active.x<10?5:15,partnerLane=20-activeLane,stackRequired=targetLanes[active.id]!==activeLane||targetLanes[partner.id]!==partnerLane;
  const selected=stackRequired&&(settings.mode==='cross'||settings.mode==='stay'||(settings.mode==='adaptive'&&roll<probability));
  const mover=targetLanes[partner.id]!==activeLane?partner:active;
  return {
   team,mode:settings.mode,teamType:teamType(pair,metrics),handPair:metrics.handPair,metrics:structuredClone(metrics),preferredSide:settings.preferredSide,preferredLane:targetLanes[strong.id],initialLane:activeLane,stackPartnerX:activeLane<10?-2.2:22.2,
   activeId:active.id,partnerId:partner.id,strongId:strong.id,weakId:weak.id,moverId:mover.id,targetLanes,stackRequired,
   selected,adaptiveProbability:probability,triggerRole:team===score.team?'serve':'return',triggerShot:team===score.team?0:1,
   activated:false,trigger:null,crossAfter:false,crossed:false,fallback:null
  };
 });
}
export function stackTargetXFor(player,plan){
 if(!plan?.selected||player.id!==plan.partnerId||plan.activated)return null;
 return plan.stackPartnerX;
}
export function stackLaneFor(player,plan){
 if(!plan?.selected)return null;
 if(plan.mode==='stay')return player.coverLane??plan.initialLane;
 if(plan.fallback||!plan.activated)return plan.initialLane;
 if(plan.crossed)return player.coverLane??plan.targetLanes?.[player.id]??plan.initialLane;
 return plan.targetLanes?.[player.id]??plan.initialLane;
}

export function stackFallbackReason(plan,{players=[],lastShot='',ball={}}={}){
 if(!plan?.selected||!plan.activated||plan.mode==='stay'||plan.crossed||plan.fallback||!plan.crossAfter)return null;
 const mover=players.find(p=>p.id===plan.moverId),partner=players.find(p=>p.team===plan.team&&p.id!==plan.moverId);
 if(!mover)return 'missing-player';
 if(lastShot==='lob'||ball.shot==='lob')return 'lob';
 if((plan.trigger?.quality??1)<.8||plan.trigger?.mishit)return 'mishit';
 if((mover.stamina??1)<.25)return 'fatigue';
 if((plan.trigger?.shotNumber??0)>0&&mover.volleyMomentum)return 'volley-momentum';
 if(partner&&Math.hypot(mover.x-partner.x,mover.y-partner.y)<2.35)return 'collision-risk';
 return null;
}

export function commitStackingCoverage(players,plan,clock){
 if(!plan?.selected||!plan.activated||plan.mode==='stay'||plan.crossed||plan.fallback||!plan.crossAfter)return false;
 const mover=players.find(p=>p.id===plan.moverId);
 if(!mover)return false;
 const crossed=plan.initialLane<10?mover.x>11.5:mover.x<8.5;
 if(!crossed)return false;
 for(const p of players.filter(player=>player.team===plan.team)){
  p.coverLane=plan.targetLanes?.[p.id]??plan.initialLane;
  p.coverChangedAt=clock;
 }
 plan.crossed=true;
 return true;
}
