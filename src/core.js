import {kitchenContact} from './player-feet.js?v=204';
import {strokeForContact} from './player-facing.js?v=204';
export const C={width:20,length:44,net:22,kitchen:7,gravity:32.174,bounce:.72,courtFriction:.91,airDrag:.0024,spinLift:.065,spinDecay:.42,magnus:.05,ballRadius:.125,netCenterHeight:34/12,netPostHeight:3,netRestitution:.12,netPostLeft:-.5,netPostRight:20.5,netPostRadius:.1,dt:1/120,speed:12,accel:45,reach:2.6};
export function venueConditions(surfaceKind='outdoor',random=Math.random){
 if(surfaceKind==='indoor')return {type:'indoor',label:'INDOOR · CALM',wind:0,humidity:0};
 const wind=.22+random()*.58,humidity=.46+random()*.34;
 return {type:'outdoor',label:`OUTDOOR · LIGHT WIND · ${humidity>.68?'HUMID':'MILD'}`,wind:Number(wind.toFixed(3)),humidity:Number(humidity.toFixed(3))};
}
export const DEFAULT_ABILITIES=Object.freeze({speed:12,acceleration:45,reach:1,control:1,reaction:.09,serve:1,power:1,spin:1,drive:1,volley:1,drop:1,dink:1,lob:1,smash:1,defense:1,courtIQ:1,aggression:1});
export const DEFAULT_PADDLE=Object.freeze({power:1,control:1,spin:1,shapeId:'hybrid',shapePower:1,shapeControl:1,shapeReach:1,shapeHandSpeed:1,shapeSweetSpot:1});
const DEFAULT_SHAPE_MODIFIERS=Object.freeze({power:1,control:1,reach:1,handSpeed:1,sweetSpot:1});
export const PADDLE_SWEET_SPOT_PROFILES=Object.freeze({
 wide:Object.freeze({centerX:0,centerZ:0,radiusX:1.2,radiusZ:1,powerGain:.96,controlGain:1.05,spinGain:.96,edgePenalty:.82}),
 elongated:Object.freeze({centerX:0,centerZ:.55,radiusX:.8,radiusZ:1.3,powerGain:1.12,controlGain:.95,spinGain:1.08,edgePenalty:1.15}),
 hybrid:Object.freeze({centerX:0,centerZ:.1,radiusX:1,radiusZ:1.15,powerGain:1.03,controlGain:1,spinGain:1,edgePenalty:1})
});
export function paddleSweetSpotProfile(shapeId='hybrid'){return PADDLE_SWEET_SPOT_PROFILES[shapeId]??PADDLE_SWEET_SPOT_PROFILES.hybrid}
export function paddleShapeModifiers(playerOrPaddle={}){
 const paddle=playerOrPaddle?.paddle??playerOrPaddle??{};
  const spot=paddleSweetSpotProfile(paddle.shapeId);
  return {power:paddle.shapePower??1,control:paddle.shapeControl??1,reach:paddle.shapeReach??1,handSpeed:paddle.shapeHandSpeed??1,sweetSpot:paddle.shapeSweetSpot??1,centerX:paddle.sweetSpotCenterX??spot.centerX,centerZ:paddle.sweetSpotCenterZ??spot.centerZ,radiusX:paddle.sweetSpotRadiusX??spot.radiusX,radiusZ:paddle.sweetSpotRadiusZ??spot.radiusZ,powerGain:paddle.sweetSpotPowerGain??spot.powerGain,controlGain:paddle.sweetSpotControlGain??spot.controlGain,spinGain:paddle.sweetSpotSpinGain??spot.spinGain,edgePenalty:paddle.sweetSpotEdgePenalty??spot.edgePenalty};
}
export function playerProfile(){return {handedness:'right',abilities:{...DEFAULT_ABILITIES},paddle:{...DEFAULT_PADDLE},appearance:{body:'male',shirtColor:'green',paddleColor:'mint',highlightColor:'yellow',court:'blue-gray'}}}
export function serveAim(player,aim){
 const value=Math.max(1,Math.min(19,Number(aim)||10));
 return player.x<10?Math.max(10.8,value):Math.min(9.2,value)
}
export function serveTarget(player,aim,type='hard',random=Math.random()){
 const spread=(type==='soft'?.95:1.65)/Math.max(.55,(player.abilities?.serve??1)*(player.paddle?.control??1));
 return serveAim(player,(Number(aim)||10)+(random-.5)*spread)
}
export function aimStep(player,fine=false){const placement=(player.abilities?.control??1)*(player.paddle?.control??1);return Math.max(1.5,Math.min(3.5,2.5/placement))*(fine?.25:1)}
export function shotDepthTarget(team,shot,depth=.5){
 const ranges={drive:[9,4,1.5],slice:[10,6,2.5],drop:[16,12,10],dink:[17,14,12],lob:[5,2.8,1.5],tweener:[5,2.8,1.5],overhead:[13,7.5,3]};
 const [short,normal,deep]=ranges[shot]??ranges.drive,value=Math.max(0,Math.min(1,Number.isFinite(depth)?depth:.5));
 const y=value<=.5?short+(normal-short)*value*2:normal+(deep-normal)*(value-.5)*2;
 return team===0?y:44-y;
}
export function contactAvailable(p,b){const reach=p.abilities?.reach??1;return ((p.x-b.x)/(1.6*reach))**2+((p.y-b.y)/(1.9*reach))**2<=1&&b.z>=0&&b.z<=3.5}
export function backhandGrip(p,b,shot='drive'){
 if(strokeForContact(p,b)!=='backhand'||['overhead','serve','lob'].includes(shot))return 'none';
 const style=p.backhandStyle??'mixed',stretch=Math.abs(b.x-p.x)>1.25*(p.abilities?.reach??1);
 if(shot==='slice'||style==='one'||stretch)return 'one';
 if(style==='two')return 'two';
 return ['drive','dink'].includes(shot)&&b.z>.7?'two':'one';
}
export function gripModifiers(p,b,shot){const grip=backhandGrip(p,b,shot);return grip==='two'?{grip,power:1.07,control:1.08,spin:1.15,reach:.94}:grip==='one'?{grip,power:1,control:1,spin:shot==='slice'?1.2:1,reach:1.1}:{grip,power:1,control:1,spin:1,reach:1};}
export function shotSkill(player,shot='drive'){
 const abilities=player.abilities??{};
 if(shot==='serve'||shot==='serve-hard'||shot==='serve-soft')return abilities.serve??1;
 if(shot==='tweener')return Math.min(abilities.lob??1,abilities.defense??1)*.7;
 if(shot==='overhead')return abilities.smash??abilities.power??1;
 if(shot==='atp')return ((abilities.volley??1)+(abilities.reach??1))/2;
 if(shot==='erne')return ((abilities.volley??1)+(abilities.courtIQ??1))/2;
 if(shot==='slice')return ((abilities.drive??1)+(abilities.control??1))/2;
 return abilities[shot]??abilities.drive??1;
}
// An arcade stroke model: technique and paddle speed can compensate for strength.
// These are normalized gameplay factors, not a measured biomechanical solver.
export function strokePower(player,shot='drive',quality=1,difficulty=0){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const strength=clamp(player.abilities?.power??1,.55,1.6),technique=clamp(shotSkill(player,shot),.72,1.28),handSpeed=clamp(paddleShapeModifiers(player).handSpeed,.8,1.2);
 const fatigue=1-clamp(player.stamina??1,0,1),fluidity=clamp(1-.09*clamp(difficulty,0,1)-.06*fatigue-.12*(1-clamp(quality,.45,1)),.78,1);
 const swingSpeed=clamp(technique*(1+.35*(handSpeed-1))*fluidity,.6,1.5),power=clamp(.4*strength+.6*swingSpeed*swingSpeed,.6,1.8);
 return {strength,technique,handSpeed,fluidity,swingSpeed,power};
}
export function paddleContactResponse({ball,incoming={x:0,y:0,z:0},paddleVelocity={x:0,y:0,z:0},normal={x:0,y:-1,z:0},center,power=1,control=1,spin=1,quality=1,swingDirection=1,sweetSpotScale=1,sweetSpotShape=null}){
 const profile=sweetSpotShape??paddleSweetSpotProfile(),widthScale=Math.max(.55,profile.sweetSpot??sweetSpotScale),faceX=(ball.x??0)-(center?.x??0)-(profile.centerX??0),faceZ=((ball.z??0)-(center?.z??0))-(profile.centerZ??0),depth=((ball.y??0)-(center?.y??0))*.35,offset=Math.hypot(faceX,faceZ,depth),sweetSpot=Math.exp(-((faceX/(profile.radiusX*widthScale))**2+(faceZ/(profile.radiusZ*widthScale))**2+(depth/1.45)**2));
 const relative={x:(incoming.x??0)-paddleVelocity.x,y:(incoming.y??0)-paddleVelocity.y,z:(incoming.z??0)-paddleVelocity.z};
 const closing=Math.max(0,-(relative.x*normal.x+relative.y*normal.y+relative.z*normal.z)+(paddleVelocity.x*normal.x+paddleVelocity.y*normal.y+paddleVelocity.z*normal.z));
 const closingPace=Math.max(0,Math.min(1,closing/34)),edge=1-sweetSpot,edgePenalty=profile.edgePenalty??1,tangent=Math.hypot(faceX,faceZ)*swingDirection;
 return {
  sweetSpot,offset,closing,
   paceScale:Math.max(.82,Math.min(1.18,(.88+closingPace*.09+Math.max(0,power-1)*.06+sweetSpot*.06)*(1+((profile.powerGain??1)-1)*sweetSpot)*Math.max(.72,quality))),
   spinKick:Math.max(-1.8,Math.min(1.8,tangent*edge*edgePenalty*.42*Math.max(.55,spin)*(profile.spinGain??1)*(swingDirection>=0?1:-1))),
   twist:Math.max(-1,Math.min(1,tangent*edge*edgePenalty*1.4)),
   aimError:Math.max(-.65,Math.min(.65,tangent*edge*edgePenalty*(.6/(Math.max(.7,control)*(profile.controlGain??1)))))
 };
}
export function scorpionOpportunity(p,b){
 const scale=p.physique?.heightScale??1,behind=p.team===0?b.y-p.y:p.y-b.y;
 return behind>.15&&behind<1.15&&Math.abs(b.x-p.x)<1.1&&b.z>=4.4*scale&&b.z<=6.4*scale&&(p.abilities?.volley??1)>=.85;
}
export function bodyContactDifficulty(p,b,shot){
 if(!p.physique)return 0;
 const stature=(p.physique.height-177)/33,low=Math.max(0,Math.min(1,(1.8-(b.z??1))/1.8));
 const motion=Math.min(1,Math.hypot(p.vx??0,p.vy??0)/Math.max(1,p.abilities?.speed??C.speed)),fatigue=1-Math.max(0,Math.min(1,p.stamina??1));
 const rushed=.35+.65*Math.min(1,motion+fatigue*.5);
 // Getting low is harder for taller bodies; a reflex behind-shoulder block still carries risk.
 return stature*.12*low*rushed+(shot==='overhead'&&scorpionOpportunity(p,b)?.09+stature*.04:0);
}
export function paddleContactTarget(p,b,shot='drive'){
 const shape=paddleShapeModifiers(p),reach=(p.abilities?.reach??1)*shape.reach,side=b.x>=p.x?1:-1,netward=(p.team===0?-.46:.46)*reach;
 if(shot==='tweener')return {x:p.x,y:p.y-netward*1.4,z:Math.max(.4,Math.min(1.8,b.z??1))};
 if(shot==='overhead')return {x:p.x+side*.42*reach,y:p.y+(scorpionOpportunity(p,b)?-netward*.65:netward*.55),z:Math.max((scorpionOpportunity(p,b)?4.4:5.2)*(p.physique?.heightScale??1),Math.min(7*(p.physique?.heightScale??1),b.z??5.8))};
 return {x:p.x+side*(.62+.2*reach),y:p.y+netward,z:Math.max(.35,Math.min(4.5*(p.physique?.heightScale??1),b.z??1.2))};
}
export function paddleContactDistance(p,b,shot='drive'){
 const target=paddleContactTarget(p,b,shot),shape=paddleShapeModifiers(p),reach=(p.abilities?.reach??1)*gripModifiers(p,b,shot).reach*shape.reach;
 return Math.sqrt(((b.x-target.x)/(.95*reach))**2+((b.y-target.y)/(.9*reach))**2+((b.z-target.z)/1.1)**2);
}
export function paddleContactAvailable(p,b,shot='drive'){
 return b.z>=0&&b.z<=(shot==='overhead'?7.4:5.2)*(p.physique?.heightScale??1)&&paddleContactDistance(p,b,shot)<=1;
}
export function contactQuality(p,b,shot,buffered=false,random=Math.random(),difficulty='normal'){
 const shape=paddleShapeModifiers(p),radial=paddleContactDistance(p,b,shot)
 const motion=Math.hypot(p.vx??0,p.vy??0)/(p.abilities?.speed??C.speed),fatigue=1-Math.max(0,Math.min(1,p.stamina??1))
 const shotDifficulty={tweener:1.8,serve:.78,drive:1.08,drop:.92,dink:.68,lob:.94,slice:1.08}[shot] ?? .95
 const easy=difficulty==='easy',highContact=(shot==='overhead'?7:4.5)*(p.physique?.heightScale??1)
 let chance=.009+.064*radial**2+.035*radial**4+.034*motion**2+.029*Math.max(0,.9-(b.z??1))/.9+.022*Math.max(0,(b.z??1)-highContact)/.7
 chance*=shotDifficulty*(1+fatigue*2)*(1+bodyContactDifficulty(p,b,shot)*3)
 if(easy)chance*=.62
 if(buffered)chance*=easy?.52:.84
 const specialReturn=b.shot==='atp'||b.shot==='erne'?1.55:1,control=Math.max(.55,(p.abilities?.control??1)*(p.paddle?.control??1)*shape.control*gripModifiers(p,b,shot).control),technique=Math.max(.72,shotSkill(p,shot)),defense=Math.max(.75,p.abilities?.defense??1)
 if((b.vx??0)**2+(b.vy??0)**2>1600)chance*=1.25;
 if(shot==='drive'&&b.vz>0&&(b.z??0)<1.5&&(b.shot==='serve-hard'||b.shot==='serve-soft'||b.bounces>0))chance*=1.25;
 chance*=specialReturn;chance/=Math.max(.55,control**2.2*technique*(shot==='dink'||shot==='drop'?defense:1))
 chance=Math.min(easy?.3:.42,Math.max(0,chance))
 const mishit=random<chance;
 const pressures=[['REACHING',.064*radial**2+.035*radial**4],['ON THE MOVE',.034*motion**2],['FATIGUED',fatigue*.07],['LOW CONTACT',.029*Math.max(0,.9-(b.z??1))/.9],['HIGH CONTACT',.022*Math.max(0,(b.z??1)-highContact)/.7],['UNDER PACE',Math.hypot(b.vx??0,b.vy??0)>40?.035:0]];
 const dominant=pressures.reduce((a,b)=>b[1]>a[1]?b:a);
 return {chance,mishit,reason:dominant[1]>.018?dominant[0]:'CONTACT ERROR',quality:mishit?Math.max(easy?.65:.45,.74-chance*.55):1-Math.min(.12,chance*.2)}
}
export function contactDifficulty(p,b,shot='drive'){
 const radial=paddleContactDistance(p,b,shot),motion=Math.hypot(p.vx??0,p.vy??0)/Math.max(1,p.abilities?.speed??C.speed),height=shot==='overhead'?Math.abs((b.z??1)-6*(p.physique?.heightScale??1)):Math.max(0,Math.abs((b.z??1)-1.6)-1.1)/2.4,special=b.shot==='atp'||b.shot==='erne'?.18:0;
 return Math.max(0,Math.min(1,radial*.5+motion*.32+height*.18+special+bodyContactDifficulty(p,b,shot)));
}
export function netCrossingX(start,target){
 const dy=target.y-start.y;
 return Math.abs(dy)<1e-6?start.x:start.x+(target.x-start.x)*((C.net-start.y)/dy);
}
export const side=y=>y>22?0:1;
export function netHeightAt(x){return C.netCenterHeight+(C.netPostHeight-C.netCenterHeight)*Math.min(1,Math.abs(x-C.width/2)/(C.width/2))}
export function stepBall(b,dt=C.dt){
 const oldY=b.y,oldZ=b.z,radius=b.radius??C.ballRadius,spin=b.spin||0,spinX=b.spinX||0,spinY=b.spinY||0,spinZ=b.spinZ||0,speed=Math.hypot(b.vx||0,b.vy||0,b.vz||0),drag=C.airDrag*speed,wind=b.wind||0,humidity=b.humidity||0;
 b.vx=(b.vx||0)*(1-drag*dt)+wind*dt*2.2;
 b.vy=(b.vy||0)*(1-drag*dt);
 b.vz=(b.vz||0)*(1-drag*dt);
 // Spin is carried as a signed vertical component plus optional side-spin axes.
 b.vz-=C.gravity*dt+spin*C.spinLift*dt;
 if(spinX||spinY||spinZ){b.vx+=(spinY*b.vz-spinZ*b.vy)*C.magnus*dt;b.vy+=(spinZ*b.vx-spinX*b.vz)*C.magnus*dt;b.vz+=(spinX*b.vy-spinY*b.vx)*C.magnus*dt}
 b.spin=(b.spin||0)*Math.exp(-C.spinDecay*dt);b.spinX=(b.spinX||0)*Math.exp(-C.spinDecay*dt);b.spinY=(b.spinY||0)*Math.exp(-C.spinDecay*dt);b.spinZ=(b.spinZ||0)*Math.exp(-C.spinDecay*dt);
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
 if((oldY-C.net)*(b.y-C.net)<=0&&oldY!==b.y){
  const f=(C.net-oldY)/(b.y-oldY),crossX=b.x-b.vx*dt*(1-f),crossZ=oldZ+(b.z-oldZ)*f,postHit=(Math.abs(crossX-C.netPostLeft)<=C.netPostRadius||Math.abs(crossX-C.netPostRight)<=C.netPostRadius)&&crossZ<C.netPostHeight+C.ballRadius;
  if(postHit){b.x=crossX;b.z=crossZ;b.vx*=-.2;b.vy*=-.2;b.vz*=-.15;return 'post'}
  const netTop=netHeightAt(crossX);
  if(crossX>=0&&crossX<=C.width&&crossZ-radius<netTop){
   const incomingSide=oldY<C.net? -1:1,topTape=crossZ+radius>=netTop-.04,netCord=b.netPlay==='cord'||(b.netPlay!=='mesh'&&topTape);
   if(netCord){
    const travelDirection=Math.sign(b.vy||-incomingSide)||1;
    b.x=crossX;b.y=C.net+travelDirection*radius;b.z=Math.max(netTop+radius*.7,crossZ+radius*.45);
    b.vx*=.76;b.vy*=.64;b.vz=Math.max(1.8,b.vz*.22+1.5);
    b.spin*=.72;b.spinX=(b.spinX||0)*.72;b.spinY=(b.spinY||0)*.72;b.spinZ=(b.spinZ||0)*.72;b.netCord=true;
   }else{
    b.x=crossX;b.y=C.net+incomingSide*radius;b.z=crossZ;
    b.vy=-b.vy*C.netRestitution;b.vx*=.52;b.vz*=.28;
    b.spin*=.6;b.spinX=(b.spinX||0)*.6;b.spinY=(b.spinY||0)*.6;b.spinZ=(b.spinZ||0)*.6;b.netCord=false;
   }
   b.netContact=true;b.netPlay=null;return 'net';
  }
}
 if(b.z<=radius&&b.vz<0){
   b.z=radius;b.netCord=false;
  const impactSpeed=Math.abs(b.vz),restitution=Math.max(.58,C.bounce-Math.max(0,impactSpeed-22)*.003)+(spin>0?.025:spin<0?-.045:0)-Math.max(0,humidity-.5)*.03;
  b.vz=-b.vz*restitution;
  const surface=Math.max(.82,.91+(spin<0?.018:-.012)-Math.max(0,humidity-.5)*.015);
  const spinTransfer=Math.max(-.12,Math.min(.12,spin*.022)),surfaceFriction=Math.max(.84,C.courtFriction+(spin<0?.012:-.008));
  b.vx*=surfaceFriction*(1+spinTransfer);b.vy*=surfaceFriction*(1+spinTransfer);
  b.spin=(b.spin||0)*.72;b.spinX=(b.spinX||0)*.82;b.spinY=(b.spinY||0)*.82;b.spinZ=(b.spinZ||0)*.82;
  if(b.shot==='slice'){b.vz*=.84;b.vx*=.95;b.vy*=.95}
  return 'bounce';
 }
 return null;
}
export function launch(b,x,y,shot='drive',paddle=DEFAULT_PADDLE,quality=1,options={}){
 const specs={tweener:[1.35,-.2],serve:[1.15,0],'serve-hard':[.92,1.2],'serve-soft':[1.38,-.35],drive:[1.05,1],drop:[1.1,-1],dink:[.8,-1],lob:[1.4,0],slice:[1.18,-1.8],overhead:[.95,1],atp:[1.05,1],erne:[1.05,1]};
 let [t,spin]=specs[shot]||specs.drive;
 const slow=1/(.72+.28*quality),technique=Math.max(.72,Math.min(1.28,paddle.skill??1));t*=slow;if(shot.startsWith('serve'))t/=technique;if(shot==='lob')t*=paddle.loft??1;
 if(['drive','overhead','atp','erne'].includes(shot))t=Math.max(.38,Math.hypot(x-b.x,y-b.y)/(48*(paddle.power??1)*technique*(shot==='overhead'?1.12:1)))*slow;
 const aggressive=['drive','overhead','atp','erne'].includes(shot);
 if(aggressive&&b.z<2.2)t*=1+(2.2-b.z)*.15;
 const f=(22-b.y)/(y-b.y);let clearance=['drive','overhead','atp','erne'].includes(shot)?Math.max(C.netCenterHeight+C.ballRadius+.25,(shot==='overhead'?3.35:3.65)/(paddle.power??1)):shot==='drop'?3.7:3.4+(shot==='dink'?Math.max(0,Math.min(2.4,Number(options.loftBonus)||0)):0);const netPlay=['cord','mesh'].includes(options.netPlay)?options.netPlay:null;if(netPlay&&f>0&&f<1){const crossingX=b.x+(x-b.x)*f,netTop=netHeightAt(crossingX);clearance=netPlay==='cord'?netTop+C.ballRadius*.08:netTop-C.ballRadius*.28}if(quality<.8)clearance*=1+(0.8-quality)*.35;
 if(f>0&&f<1)t=Math.max(t,Math.sqrt(Math.max(0,2*(clearance-b.z*(1-f))/(C.gravity*f*(1-f)))));
 b.vx=(x-b.x)/t;b.vy=(y-b.y)/t;b.vz=(C.gravity*t*t/2-b.z)/t;
 // Poor contact can catch the net as well as float long; clean shots keep assistance.
 const dinkPenalty=4.2-Math.min(2.2,(Number(options.loftBonus)||0)*.8);if(quality<.8)b.vz-=(1-quality)*(shot==='dink'?dinkPenalty:shot==='drop'?5.4:7);b.spin=spin*(paddle.spin??1);b.spinX=0;b.spinY=Math.max(-4,Math.min(4,Number(options.sideSpin)||0));b.spinZ=shot==='slice'?Math.sign(options.sliceSpin ?? b.vy ?? -1)*.8:Math.max(-2,Math.min(2,Number(options.sliceSpin)||0));b.radius=C.ballRadius;b.shot=shot;b.shotShape=options.shape??'standard';b.netPlay=netPlay;b.netContact=false;b.netCord=false;
}
export function inBounds(x,y){return x>=0&&x<=20&&y>=0&&y<=44}
export function legalVolley(team,y,bounces,shotCount){if(shotCount<=2&&bounces===0)return 'Two-bounce fault';if(bounces===0&&(team===0?y<=29:y>=15))return 'Kitchen volley fault';return null}
export const SCORING_MODES=Object.freeze(['side-out','rally']);

// A game is defined by the points it plays to, the margin it must win by, and
// whether only the serving side can score.
//
// Side-out is the traditional game: a rally only scores for the serving side,
// and losing the rally hands the serve over. Rally scoring awards a point to
// whoever wins the rally, and the winner serves next.
export function normalizeScoringRules(rules={}){
 const targetScore=Math.max(1,Math.round(Number(rules?.targetScore??rules?.points)||11));
 const winBy=Math.max(1,Math.round(Number(rules?.winBy)||2));
 const scoring=rules?.scoring==='rally'?'rally':'side-out';
 return {targetScore,winBy,scoring};
}

export class Score {
 constructor(format='doubles',rules={}){
  this.format=format;
  this.rules=normalizeScoringRules(rules);
  this.points=[0,0];this.team=0;this.server=2;this.first=true;this.rightPlayer=[1,0];this.serverPlayer=1;this.winner=null;
 }
 scorePoint(winner){
  const {targetScore,winBy}=this.rules;
  if(this.points[winner]>=targetScore&&this.points[winner]-this.points[1-winner]>=winBy)this.winner=winner;
 }
 point(winner){
  if(this.rules.scoring==='rally'){
   this.points[winner]++;
   // The rally winner serves next. In doubles the right-court player serves,
   // so the pair rotates every point.
   if(winner!==this.team){this.team=winner;this.rightPlayer[winner]=1-this.rightPlayer[winner];this.serverPlayer=this.rightPlayer[winner];}
   else{this.rightPlayer[winner]=1-this.rightPlayer[winner];this.serverPlayer=1-this.serverPlayer;}
   this.scorePoint(winner);
   return;
  }
  if(this.format==='singles'){
   if(winner===this.team){this.points[winner]++;this.scorePoint(winner);}else this.team=winner;
   return;
  }
  if(winner===this.team){this.points[winner]++;this.rightPlayer[winner]=1-this.rightPlayer[winner];this.scorePoint(winner);}
  else if(this.first||this.server===2){this.team=1-this.team;this.server=1;this.first=false;this.serverPlayer=this.rightPlayer[this.team];}
  else{this.server=2;this.serverPlayer=1-this.serverPlayer;}
 }
 get player(){return this.serverPlayer}
 get call(){if(this.format==='singles'||this.rules.scoring==='rally')return `${this.points[this.team]} - ${this.points[1-this.team]}`;return `${this.points[this.team]} - ${this.points[1-this.team]} - ${this.server}`}
}
export function move(p,tx,ty,dt,brake=false){
 p.stamina=Math.max(0,Math.min(1,p.stamina??1));const staminaScale=.82+.18*p.stamina,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),maxSpeed=(p.abilities?.speed??C.speed)*staminaScale,acceleration=(p.abilities?.acceleration??C.accel)*(.78+.22*p.stamina),contactLock=p.swing>(p.swingDuration||.36)*.82,recovering=(p.recoveryTimer||0)>0,settling=(p.splitStepTimer||0)>0;
 const desiredSpeed=brake||recovering||d<.03?0:Math.min(maxSpeed*(contactLock?.72:1),Math.sqrt(Math.max(0,2*acceleration*d)));
 const desiredVx=d?dx/d*desiredSpeed:0,desiredVy=d?dy/d*desiredSpeed:0,reversing=p.vx*desiredVx+p.vy*desiredVy<0;
 const turnFactor=(reversing?.62:1)*(0.85+Math.min(.25,Math.max(0,(acceleration-C.accel)/120))),maxDelta=acceleration*1.5*turnFactor*dt;
 let dvx=desiredVx-p.vx,dvy=desiredVy-p.vy,dv=Math.hypot(dvx,dvy);if(dv>maxDelta&&dv){dvx*=maxDelta/dv;dvy*=maxDelta/dv}
 p.vx+=dvx;p.vy+=dvy;p.x+=p.vx*dt;p.y+=p.vy*dt;p.stride=(p.stride||0)+Math.hypot(p.vx,p.vy)*dt;
 const movingSpeed=Math.hypot(p.vx,p.vy),agility=Math.max(8,p.abilities?.speed??C.speed);if(movingSpeed>5)p.stamina=Math.max(0,p.stamina-dt*(movingSpeed-4)*.0045*(12/agility)/Math.max(.5,p.abilities?.endurance??1));else p.stamina=Math.min(1,p.stamina+dt*.009*(agility/12));if(!contactLock&&!recovering&&!settling&&(!p.slideTimer||p.slideTimer<=0)&&Math.abs(p.vx)>Math.abs(p.vy)*1.25&&Math.abs(p.vx)>=7.2)p.slideTimer=.16;
 p.slideTimer=Math.max(0,(p.slideTimer||0)-dt);p.motion=settling?'splitStep':recovering?'recover':p.slideTimer>0?'slide':movingSpeed<.7?'ready':(p.team===0?p.vy>2:p.vy< -2)&&Math.abs(p.vy)>Math.abs(p.vx)?'backpedal':Math.abs(p.vx)>Math.abs(p.vy)*1.3?(d>4?'crossover':'shuffle'):'run';
 const outside=true;p.x=Math.max(outside?-4:0,Math.min(outside?24:20,p.x));const deep=true;p.y=p.team===0?Math.max(23,Math.min(deep?47:44,p.y)):Math.max(deep?-3:0,Math.min(21,p.y));
}
export function resolvePlayerCollisions(players,radius=.62,restitution=.18){
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
  const a=players[i],b=players[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),minimum=radius*2;
  if(d>=minimum)continue;
  const nx=d>.001?dx/d:(j%2?1:-1),ny=d>.001?dy/d:0,overlap=minimum-d;
  a.x-=nx*overlap*.5;a.y-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;
  const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
  if(closing<0){const impulse=-closing*(1+restitution)*.5;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse}
 }
}
export function receiver(players,team,x,y){return players.filter(p=>p.team===team).reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b)}



// Tactical approximation: deep returns, third-shot transition, and kitchen exchanges.
export function atpTargetX(ballX){return ballX<0?.25:C.width-.25}
export function atpOpportunity(p,b){
 const left=b.x<0,right=b.x>C.width;
 if(!left&&!right||b.z<0||b.z>3.2)return false;
 const reach=Math.max(.8,p.abilities?.reach??1),speed=p.abilities?.speed??C.speed;
 const nearBall=Math.hypot(p.x-b.x,p.y-b.y)<=3.6*reach;
 const settled=(p.recoveryTimer??0)<=.15&&(p.splitStepTimer??0)<=0&&(p.airborneTimer??0)<=0;
 const goodSpeed=Math.hypot(p.vx??0,p.vy??0)<=Math.max(5,speed*.88);
 const nearLane=left?p.x<=5:p.x>=C.width-5;
 const outsidePost=left?b.x<C.netPostLeft:b.x>C.netPostRight;
 const cross=netCrossingX(b,{x:atpTargetX(b.x),y:p.team===0?4:C.length-4});
 const crossOutside=left?cross<C.netPostLeft+.35:cross>C.netPostRight-.35;
 const reachable=paddleContactAvailable(p,b,'atp')||(nearBall&&b.z<=2.8);
 return nearBall&&settled&&goodSpeed&&nearLane&&(outsidePost||crossOutside)&&reachable;
}
export function selectShot(p,b,desired){
 const nearSideline=p.x<=1.25||p.x>=18.75;
 const wideBall=b.x<=.75||b.x>=19.25;
 const kitchenSide=p.team===0?p.y<=31:p.y>=13;
 if(desired==='soft')return kitchenSide?'dink':'drop';
 if(desired==='lob'){const behind=(p.team===0?b.y-p.y:p.y-b.y);if((p.team===0?(p.vy||0)>2.2:(p.vy||0)<-2.2)&&behind>.05&&behind<2.8&&b.z>.2&&b.z<2.5&&Math.hypot(p.vx||0,p.vy||0)>2.5&&(Math.max(p.abilities?.lob??1,p.abilities?.defense??1)>1.02))return 'tweener';return 'lob'}
 if(desired==='attack'||desired==='drive'){
  if(nearSideline&&wideBall&&(p.x<0||p.x>20)&&p.erneAirborne&&b.z>=3.2)return 'erne';
  if(atpOpportunity(p,b))return 'atp';
  return scorpionOpportunity(p,b)||b.z>=5.2*(p.physique?.heightScale??1)?'overhead':'drive';
 }
 return desired;
}
export function chooseCpuShot({shots, team, y, height, opponentsAtKitchen=false, aggression=.5, courtIQ=1, attackSkill=1, softSkill=1, difficulty=0, tendency='balanced',patience=.7,singles=false, partnerReady=true, balanced=true, opponentsDeep=false, transition=false, pattern=null, incomingShot='dink', lobExchange=0, random=Math.random()}){
 const nearKitchen=team===0?y<33:y>11;
 const bias=Math.max(0,Math.min(1,Number(aggression)||.5));
 const relativeSkill=Math.max(-.12,Math.min(.12,(Number(attackSkill||1)-Number(softSkill||1))*.32-Math.max(0,Math.min(1,Number(difficulty)||0))*.3));
 const styleBias=({banger:.1,soft:-.1,speed:-.04,net:nearKitchen?.07:-.03})[tendency]??0;
 const attackBias=(bias-.5)*.24+(.95-Math.max(.7,Number(courtIQ)||1))*.14+relativeSkill+styleBias+(.7-Math.max(0,Math.min(1,patience)))*.12;
 if(shots===1)return 'drive';
 // shots counts completed hits: 2 is the third shot, 4 the fifth.
 // Later transition resets are opt-in so ordinary rallies keep their choices.
 if(!singles&&(shots===2||(transition&&shots>=4))){
  const pressure=Math.max(0,Math.min(1,Number(difficulty)||0));
  const iq=Math.max(.7,Math.min(1.4,Number(courtIQ)||1));
  const attack=Math.max(.4,Math.min(1.6,Number(attackSkill)||1));
  const soft=Math.max(.4,Math.min(1.6,Number(softSkill)||1));
  const reset=shots===2||!nearKitchen?'drop':'dink';
  // Readiness is a feasibility gate, not a preference that aggression can override.
  if(!balanced||pressure>.78||(!partnerReady&&shots>=4))return reset;
  if(shots>=4&&opponentsAtKitchen&&(height<3.2||pressure>.55))return reset;
  if(shots>=4&&height>=5.2&&height<=7.4)return 'drive';
  const deep=opponentsDeep&&!opponentsAtKitchen;
  const driveFloor=(deep?1.4:2.6)+Math.max(0,1-attack)*.5;
  const driveFeasible=height>=driveFloor&&pressure<.72&&attack>=.65;
  if(!driveFeasible)return reset;
  // A deep pair leaves a useful drive; a set kitchen rewards a feasible drop.
  const dropFeasible=soft>=.7&&pressure<.65;
  const driveChance=Math.max(.05,Math.min(.9,.35+attackBias+
   (deep?.22:opponentsAtKitchen?-.14:.05)+
   Math.max(-.1,Math.min(.16,(height-3.3)*.1))+
   (attack-soft)*.12-(iq-1)*(opponentsAtKitchen?.25:.1)+
   (!partnerReady?-.2:0)+(dropFeasible?0:.16)-pressure*.18));
  return random<driveChance?'drive':reset;
 }
 if(shots>2&&height>=5.2)return 'drive';
 const incomingLob=['lob','tweener'].includes(incomingShot),canLob=Number(lobExchange||0)<1;
 if(incomingLob&&height>=.75&&(difficulty<.96||!opponentsAtKitchen))return 'drive';
 if(canLob&&difficulty>.94&&height<2.4&&opponentsAtKitchen&&random>.55)return 'lob';
 if(shots===2)return height>1.2&&difficulty<.75&&random<Math.max(.35,Math.min(.82,.62+attackBias))?'drive':'drop';
 if(nearKitchen){const readConfidence=Math.max(0,Math.min(.85,pattern?.confidence??0)),lobRead=Math.max(0,Math.min(.85,pattern?.lobConfidence??0));if(canLob&&opponentsAtKitchen&&height<2&&random>(lobRead>.5?.92:.97))return 'lob';if(difficulty>.9&&height<2.7)return 'dink';const rallyEscalation=shots>=6?Math.min(.36,(shots-6)*.025):0;const attackChance=Math.max(.12,Math.min(.76,.22+attackBias+rallyEscalation+(height-1.4)*.08+readConfidence*.03));const speedupReady=balanced&&partnerReady&&difficulty<.78&&height>=2.15&&height<=5.2&&(opponentsAtKitchen||!opponentsDeep);if(height>=2.15){if(incomingShot==='dink')return speedupReady&&(height>2.85||random<attackChance+.22)?'drive':'dink';return height>3.05||random<attackChance?'drive':'dink'}if(shots>=18)return canLob&&difficulty>.94&&random>.55?'lob':'drive';return height>1.25&&random<attackChance?'drive':'dink'}
 return height>3.2&&random<Math.max(.2,Math.min(.72,.45+attackBias))?'drive':'drop';
}
export function kitchenFootContact(p){return kitchenContact(p)!==null}
export function chooseCpuTarget(player,opponents,shot){
 const candidates=shot==='dink'?[3,7,13,17]:[2.5,6,10,14,17.5];
 return candidates.reduce((best,x)=>{
  const value=v=>Math.min(...opponents.map(o=>Math.abs(v-o.x)-Math.sign(v-o.x)*(o.vx||0)*.18));
  return value(x)>value(best)?x:best;
 },candidates[0]);
}

