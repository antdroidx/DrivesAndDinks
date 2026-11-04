// Court-space shoe soles shared by rule detection, artwork and replay markers.
export function playerFeet(player){
 const speed=Math.hypot(player.vx||0,player.vy||0),moving=speed>1.1,cycle=Math.sin((player.stride||0)*1.35*Math.PI/2),airborne=(player.airborneTimer||0)>0;
 return [0,1].map(index=>{
  const sign=index?1:-1,lift=airborne?.5:moving?Math.max(0,cycle*sign)*.18:0;
  return {index,x:(player.x??10)+sign*.48+(moving?(player.vx||0)/Math.max(1,speed)*cycle*sign*.18:0),y:player.y+sign*.08+(moving?(player.vy||0)/Math.max(1,speed)*cycle*sign*.18:0),z:lift,grounded:!airborne&&lift<.025,halfWidth:.22,halfDepth:.34};
 });
}
export function kitchenContact(player){
 const boundary=player.team===0?29:15;
 const foot=playerFeet(player).find(f=>f.grounded&&f.x+f.halfWidth>=0&&f.x-f.halfWidth<=20&&(player.team===0?f.y-f.halfDepth<=boundary+1e-9:f.y+f.halfDepth>=boundary-1e-9));
 return foot?{...foot,playerId:player.id,team:player.team,boundary}:null;
}
export function footSole(foot){return [[foot.x-foot.halfWidth,foot.y-foot.halfDepth],[foot.x+foot.halfWidth,foot.y-foot.halfDepth],[foot.x+foot.halfWidth,foot.y+foot.halfDepth],[foot.x-foot.halfWidth,foot.y+foot.halfDepth]];}
