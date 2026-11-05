// The near team faces upcourt; the far team faces downcourt.
export function courtView(team){return team===0?'near':'far'}
export function strokeForContact(player,ball){
 const left=player?.handedness==='left'||player?.hand==='left';
 const towardBackhand=(ball.x-player.x)*(player.team===0?1:-1)<0;
 return towardBackhand!==left?'backhand':'forehand';
}
