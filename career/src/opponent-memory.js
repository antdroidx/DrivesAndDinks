const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Match-local observations only. No access to an opponent's next aim or input.
export class OpponentMemory{
 constructor(snapshot=null){this.players=new Map();this.restore(snapshot)}
 // Rebuilds what a previous match learned about these opponents, so a
 // career's opponents stay readable from one match to the next.
 restore(snapshot){
  if(!Array.isArray(snapshot))return this;
  for(const entry of snapshot){
   if(!entry||entry.playerId===null||entry.playerId===undefined||!Array.isArray(entry.recent))continue;
   this.players.set(entry.playerId,structuredClone(entry.recent).slice(-16));
  }
  return this;
 }
 observe({playerId,shot,x,y}){
  if(playerId===null||playerId===undefined||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>20||y<0||y>44||String(shot).startsWith('serve'))return;
  if(!this.players.has(playerId)){if(this.players.size===4)this.players.delete(this.players.keys().next().value);this.players.set(playerId,[])}
  const recent=this.players.get(playerId);recent.push({shot,x,y});if(recent.length>16)recent.shift();
 }
 read(playerId){
  const recent=this.players.get(playerId)??[],bins=[0,0,0];let total=0,xTotal=0,lobs=0;
  recent.forEach((shot,index)=>{const weight=.84**(recent.length-index-1);total+=weight;xTotal+=shot.x*weight;bins[shot.x<7?0:shot.x>13?2:1]+=weight;if(shot.shot==='lob'||shot.shot==='tweener')lobs+=weight});
  const samples=recent.length,experience=samples<4?0:Math.min(1,(samples-3)/5),dominance=total?Math.max(...bins)/total:0,lobRate=total?lobs/total:0;
  return {samples,expectedX:total?xTotal/total:10,confidence:clamp((dominance-.5)*2,0,.85)*experience,lobRate,lobConfidence:clamp((lobRate-.35)/.65,0,.85)*experience};
 }
 snapshot(){return [...this.players].map(([playerId,recent])=>({playerId,...this.read(playerId),recent:structuredClone(recent)}))}
}

export function anticipateReturn(player,target,pattern,{singles=false}={}){
 const iq=clamp(((player.abilities?.courtIQ??1)-.7)/.55,0,1),limit=singles?1.5:1;
 const shift=clamp(pattern.expectedX-target.x,-limit,limit)*pattern.confidence*iq,retreat=1.5*pattern.lobConfidence*iq;
 return {...target,x:clamp(target.x+shift,1.3,18.7),y:clamp(target.y+(player.team===0?retreat:-retreat),player.team===0?23:-3,player.team===0?47:21),read:Math.abs(shift)+retreat>.05?{confidence:Math.max(pattern.confidence,pattern.lobConfidence),shift,retreat}:null};
}
