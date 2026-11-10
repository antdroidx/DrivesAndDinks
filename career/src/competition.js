// Results-based strength estimate. Never consumed by movement, physics or AI.
export function competitionRecord(value=3){return {value,confidence:0,matches:0,wins:0,losses:0}}
export function recordResult(record,opponentValue,won){
 if(!Number.isFinite(record.value)||!Number.isFinite(opponentValue))throw new Error('Invalid competitive rating');
 const expected=1/(1+10**((opponentValue-record.value)/1.5)),step=.18*(1-.65*Math.min(1,record.confidence));
 return {...record,value:Math.max(1,Math.min(8,record.value+step*((won?1:0)-expected))),matches:record.matches+1,wins:record.wins+(won?1:0),losses:record.losses+(won?0:1),confidence:1-Math.exp(-(record.matches+1)/20)};
}
export function seededRandom(seed=1){let state=seed>>>0;const next=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296};next.state=()=>state;next.restore=value=>{state=value>>>0};return next}
