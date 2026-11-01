import {selectShot} from './core.js?v=43';
import {strokeForContact} from './player-facing.js?v=43';

const clamp=t=>Math.max(0,Math.min(1,t));
export function matchStrokeMode(player,shot=player.animationShot,stroke=player.stroke){
 const back=stroke==='backhand',kitchen=player.team===0?player.y<=32:player.y>=12;
 if(['overhead','serve','lob'].includes(shot))return shot;
 if(shot==='dink')return back?'backhandDink':'forehandDink';
 if(shot==='drop')return back?'backhandDrop':'forehandDrop';
 // A baseline attack in the air still needs a full stroke. Only an actual
 // kitchen block uses the compact volley clip.
 if(player.contactType==='volley'&&kitchen&&shot==='drive')return 'volley';
 return back?(player.gender==='female'?'twoBackhand':'backhand'):'forehand';
}
export function strokeDuration(player,shot=player.animationShot){
 const mode=matchStrokeMode(player,shot);
 return mode==='overhead'?.9:mode==='volley'?.5:mode.endsWith('Dink')?.58:mode.endsWith('Drop')?.74:mode==='serve'?.72:mode==='lob'?.84:.8;
}
export function prepareReceiver(player,game){
 const plan=game.teamPlan,eta=plan?.created+(plan?.point?.time??Infinity)-game.clock;
 if(!plan||plan.receiverId!==player.id||player.swing>0||eta>.26||eta<-.06){player.preparation=null;return}
 const forecast={...plan.point,z:plan.point.z??game.ball.z};
 if(player.preparation?.shotNumber!==game.shots){
  const kitchen=player.team===0?player.y<33:player.y>11;
  const desired=player.id===0&&game.mode==='play'?game.shot:game.shots===1?'drive':kitchen?(forecast.z>2.7?'drive':'dink'):'drop';
  player.preparation={shotNumber:game.shots,shot:selectShot(player,forecast,desired),stroke:strokeForContact(player,forecast),phase:0};
 }
 player.preparation.phase=Math.max(player.preparation.phase,.5*clamp(1-eta/.26));
}
export function sampleMatchAnimation(player,game){
 if(player.swing>0){
  const progress=clamp(1-player.swing/(player.swingDuration||.8)),phase=player.animationContactStart?.52+.48*progress:progress;
  const release=clamp(progress/.16);
  return {mode:matchStrokeMode(player),phase,progress,alignStrength:player.animationContactStart?1-release*release*(3-2*release):0};
 }
 if(game.phase==='serve'&&game.server===player)return {mode:'serve',phase:.28*clamp(game.timer/.4),alignStrength:0};
 if(game.phase==='rally'&&player.preparation)return {mode:matchStrokeMode({...player,contactType:null},player.preparation.shot,player.preparation.stroke),phase:player.preparation.phase,alignStrength:0};
 if(player.windup>0)return {mode:matchStrokeMode(player,selectShot(player,game.ball,game.shot),strokeForContact(player,game.ball)),phase:.28,alignStrength:0};
 return null;
}
