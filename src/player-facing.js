// The near team faces upcourt; the far team faces downcourt.
export function courtView(team){return team===0?'near':'far'}
export function strokeForContact(player,ball){return (ball.x-player.x)*(player.team===0?1:-1)<0?'backhand':'forehand'}
