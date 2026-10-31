export const SPECIAL_SHOTS = Object.freeze(['overhead','atp','erne']);
export const ANIMATION_TEST_STROKES = Object.freeze([...SPECIAL_SHOTS,'forehand','backhand']);
export const ANIMATION_CYCLE_SECONDS = 1.8;
export const SWING_SECONDS = .8;

export function forceSpecialShot(game,{shot='overhead',character='avery'}){
 if(!ANIMATION_TEST_STROKES.includes(shot))throw new RangeError(`Unsupported animation stroke: ${shot}`);
 game.configure({character});
 game.mode='watch';
 game.phase='rally';
 game.shots=4;
 game.bounces=0;
 game.last=1;
 const player=game.players[0];
 Object.assign(player,{x:10,y:35,vx:0,vy:0,windup:0,swing:0,motion:'planted',contactPoint:null});
 Object.assign(game.ball,{x:player.x,y:player.y,z:3.35,vx:0,vy:0,vz:0,spin:0});
 const physicalShot=shot==='forehand'||shot==='backhand'?'drive':shot;
 game.hit(player,physicalShot,10,1);game.resolveImpact();
 if(shot==='forehand'||shot==='backhand'){player.stroke=shot;player.animationShot='drive';game.lastShot='drive'}
 player.swingDuration=SWING_SECONDS;
 player.swing=SWING_SECONDS;
 player.motion='planted';
 game.message=`ANIMATION TEST · ${shot.toUpperCase()}`;
 return player;
}

export function applySpecialShotAnimation(player,elapsedSeconds){
 if(!player)return;
 const elapsed=elapsedSeconds%ANIMATION_CYCLE_SECONDS;
 if(elapsed<SWING_SECONDS){player.swing=SWING_SECONDS-elapsed;player.windup=0}
 else if(elapsed<1.05){player.swing=0;player.windup=0}
 else{player.swing=0;player.windup=.3}
}
