// The near team faces upcourt; the far team faces downcourt.
export function courtView(team){return team===0?'near':'far'}
export function strokeForContact(player,ball){return (ball.x-player.x)*(player.team===0?1:-1)<0?'backhand':'forehand'}

// DEV court diagnostics remain available locally and under the GitHub Pages
// development path. A query override makes them available in any build.
export function staminaOverlayEnabled({pathname='',hostname='',search=''}={}){
  const override=new URLSearchParams(search).get('stamina');
  if(override==='1')return true;
  if(override==='0')return false;
  return /\/dev(?:\/|$)/.test(pathname)||['localhost','127.0.0.1','::1'].includes(hostname);
}

export function staminaPercent(value){
  const normalized=Number.isFinite(Number(value))?Number(value):1;
  return Math.round(Math.max(0,Math.min(1,normalized))*100);
}