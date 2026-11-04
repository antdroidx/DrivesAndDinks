import {selectShot,backhandGrip} from './core.js?v=109';
import {strokeForContact} from './player-facing.js?v=109';

const clamp=t=>Math.max(0,Math.min(1,t));
export function matchStrokeMode(player,shot=player.animationShot,stroke=player.stroke){
 const back=stroke==='backhand',kitchen=player.team===0?player.y<=32:player.y>=12;
 if(shot==='tweener')return 'tweener';
 if(shot==='erne')return 'erne';
 if(['overhead','serve','lob'].includes(shot))return shot;
 if(shot==='drive'&&player.wasPoach&&(player.contactDifficulty??0)>.25)return 'poachLunge';
 if(shot==='drive'&&(player.contactMotion==='slide'||(player.contactSpeed??0)>9)&&(player.contactDifficulty??0)>.35)return 'slideReturn';
 if(player.contactType==='groundstroke'&&(player.contactAge??1)<.18&&(player.contactPoint?.z??2)<1.1)return 'halfVolley';
 if((player.contactDifficulty??0)>.65&&shot==='drive')return back?'wideBackhand':'wideForehand';
 if(['drop','dink'].includes(shot)&&player.contactType==='volley'&&(player.incomingSpeed??0)>28)return 'resetBlock';
 if(shot==='drive'&&player.contactType==='volley'&&kitchen&&(player.incomingSpeed??0)>30)return 'counterVolley';
 const two=player.contactGrip?player.contactGrip==='two':backhandGrip(player,player.contactPoint??{x:player.x+(player.team===0?-1:1),z:2},shot)==='two';
 if(shot==='dink')return back?(two?'twoBackhandDink':'backhandDink'):'forehandDink';
 if(shot==='drop')return back?'backhandDrop':'forehandDrop';
 // A baseline attack in the air still needs a full stroke. Only an actual
 // kitchen block uses the compact volley clip.
 if(player.contactType==='volley'&&kitchen&&shot==='drive')return 'volley';
 return back?(two?'twoBackhand':'backhand'):'forehand';
}
export function strokeDuration(player,shot=player.animationShot){
 const mode=matchStrokeMode(player,shot),base=mode==='resetBlock'?.48:mode==='counterVolley'?.52:mode==='halfVolley'?.62:mode==='tweener'?1:mode==='overhead'?.9:mode==='erne'?1.2:mode==='volley'?.5:mode.endsWith('Dink')?.58:mode.endsWith('Drop')?.74:mode==='serve'?.72:mode==='lob'?.84:.8,handSpeed=Math.max(.8,Math.min(1.2,player.paddle?.shapeHandSpeed??1));
 return base/handSpeed;
}
export function prepareReceiver(player,game){
 const plan=game.teamPlan,eta=plan?.created+(plan?.point?.time??Infinity)-game.clock;
 if(!plan||plan.receiverId!==player.id||player.swing>0||eta>.26||eta<-.06){player.preparation=null;return}
 const forecast={...plan.point,z:plan.point.z??game.ball.z};
 if(player.preparation?.shotNumber!==game.shots){
  const kitchen=player.team===0?player.y<33:player.y>11;
  if(player.splitStepShot!==game.shots){player.splitStepArmed=false;player.splitStepShot=game.shots}
  const desired=player.id===0&&game.mode==='play'?game.shot:game.shots===1?'drive':kitchen?(forecast.z>2.7?'drive':'dink'):'drop';
  player.preparation={shotNumber:game.shots,shot:selectShot(player,forecast,desired),stroke:strokeForContact(player,forecast),phase:0};
 }
 if(eta<=.22&&eta>=-.04&&!player.splitStepArmed&&Math.hypot(player.x-plan.point.x,player.y-plan.point.y)<2.5){player.splitStepArmed=true;player.splitStepTimer=0}
 player.preparation.phase=Math.max(player.preparation.phase,.5*clamp(1-eta/.26));
}
export function sampleMatchAnimation(player,game){
 if((player.splitStepTimer||0)>0)return {mode:'splitStep',phase:1-player.splitStepTimer/.18,alignStrength:0};
 if(player.swing>0){
  const progress=clamp(1-player.swing/(player.swingDuration||.8)),phase=player.animationContactStart?.52+.48*progress:progress;
  const release=clamp(progress/.16);
  return {mode:matchStrokeMode(player),phase,progress,alignStrength:player.animationContactStart?1-release*release*(3-2*release):0};
 }
 if(game.phase==='serve'&&game.server===player){const toss=game.serveToss,progress=toss?clamp(toss.time/toss.duration):clamp(game.timer/.4);return {mode:'serve',phase:.12+.4*progress,alignStrength:0}};
 if(game.phase==='rally'&&player.preparation)return {mode:matchStrokeMode({...player,contactType:null},player.preparation.shot,player.preparation.stroke),phase:player.preparation.phase,alignStrength:0};
 if(player.windup>0)return {mode:matchStrokeMode(player,selectShot(player,game.ball,game.shot),strokeForContact(player,game.ball)),phase:.28,alignStrength:0};
 return null;
}
