const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const PLAYER_EXPRESSIONS=Object.freeze(['focus','effort','fatigue','surprise','aggression','happy']);

export function playerEmotionState(player,context={}){
 const stamina=clamp(player.stamina??1,0,1),rallyShots=Math.max(0,Number(context.rallyShots)||0);
 const fatigue=clamp((.38-stamina)/.38+rallyShots/90,0,1);
 const surprise=Boolean(player.surpriseTimer>0||context.incomingShot==='atp'||context.incomingShot==='erne'||context.incomingShot==='tweener');
 const aggression=Boolean(player.aggressionTimer>0||(player.swing>0&&['drive','overhead','atp','erne'].includes(player.animationShot)&&(player.playstyle?.aggression??player.abilities?.aggression??.5)>.62));
 const happy=Boolean(player.celebrateTimer>0||(context.phase==='pause'||context.phase==='over')&&context.lastPointWinner===player.team);
 const mishit=Boolean(player.mishit&&player.swing>.12);
 let expression='focus';
 if(happy)expression='happy';
 else if(mishit||surprise)expression='surprise';
 else if(fatigue>.68&&(player.swing<=0||stamina<.22))expression='fatigue';
 else if(aggression)expression='aggression';
 else if(player.swing>0||player.effortTimer>0||Math.hypot(player.vx||0,player.vy||0)>7)expression='effort';
 const sweat=clamp((1-stamina)*.78+fatigue*.32+(player.effortTimer??0)*.28+Math.max(0,rallyShots-10)*.004,0,1);
 return {expression,intensity:clamp(Math.max(fatigue,player.surpriseTimer??0,player.aggressionTimer??0,player.celebrateTimer??0),0,1),fatigue,sweat,marks:expression};
}
