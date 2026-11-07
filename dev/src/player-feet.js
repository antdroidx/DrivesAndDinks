// Court-space shoe soles shared by rule detection, artwork and replay markers.
export function playerFeet(player){
 const speed=Math.hypot(player.vx||0,player.vy||0),moving=speed>1.1,cycle=Math.sin((player.stride||0)*1.35*Math.PI/2),airborne=(player.airborneTimer||0)>0;
 return [0,1].map(index=>{
  const sign=index?1:-1,lift=airborne?.5:moving?Math.max(0,cycle*sign)*.18:0;
  return {index,x:(player.x??10)+sign*.48+(moving?(player.vx||0)/Math.max(1,speed)*cycle*sign*.18:0),y:player.y+sign*.08+(moving?(player.vy||0)/Math.max(1,speed)*cycle*sign*.18:0),z:lift,grounded:!airborne&&lift<.025,halfWidth:.22,halfDepth:.34};
 });
}
// Entry may use a lead foot; grounded soles remain authoritative for faults.
function footCrossesKitchenLine(foot,team,boundary){
 return foot.x+foot.halfWidth>=0&&foot.x-foot.halfWidth<=20&&(team===0?foot.y-foot.halfDepth<=boundary+1e-9:foot.y+foot.halfDepth>=boundary-1e-9);
}
export function kitchenEntryContact(player){
 const boundary=player.team===0?29:15,foot=playerFeet(player).find(f=>footCrossesKitchenLine(f,player.team,boundary));
 return foot?{...foot,playerId:player.id,team:player.team,boundary}:null;
}
export function kitchenContact(player){
 const boundary=player.team===0?29:15,foot=playerFeet(player).find(f=>f.grounded&&footCrossesKitchenLine(f,player.team,boundary));
 return foot?{...foot,playerId:player.id,team:player.team,boundary}:null;
}
export function footSole(foot){return [[foot.x-foot.halfWidth,foot.y-foot.halfDepth],[foot.x+foot.halfWidth,foot.y-foot.halfDepth],[foot.x+foot.halfWidth,foot.y+foot.halfDepth],[foot.x-foot.halfWidth,foot.y+foot.halfDepth]];}

// Check prohibited contact before releasing momentum. A lateral/rearward player
// can regain control without coming to a complete stop in both axes.
export function volleyMomentumFault(player){
 if(!player.volleyMomentum)return false;
 if(kitchenContact(player))return true;
 const towardNet=(player.vy||0)*(player.team===0?-1:1),grounded=!(player.airborneTimer>0);
 const followThrough=(player.swing||0)>(player.swingDuration||.36)*.45;
 if(grounded&&(Math.hypot(player.vx||0,player.vy||0)<.8||towardNet<=.05&&!followThrough))player.volleyMomentum=false;
 return false;
}
