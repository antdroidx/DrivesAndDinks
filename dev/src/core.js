import {strokeForContact} from './player-facing.js?v=86';
export const C={width:20,length:44,net:22,kitchen:7,gravity:32.174,bounce:.72,courtFriction:.91,airDrag:.0024,spinLift:.065,spinDecay:.42,magnus:.05,ballRadius:.125,netCenterHeight:2.833,netPostHeight:3,netRestitution:.12,netPostLeft:-.5,netPostRight:20.5,netPostRadius:.1,dt:1/120,speed:12,accel:45,reach:2.6};
export const DEFAULT_ABILITIES=Object.freeze({speed:12,acceleration:45,reach:1,control:1,reaction:.09,serve:1,power:1,spin:1,drive:1,volley:1,drop:1,dink:1,lob:1,smash:1,defense:1,courtIQ:1,aggression:1});
export const DEFAULT_PADDLE=Object.freeze({power:1,control:1,spin:1,shapeId:'hybrid',shapePower:1,shapeControl:1,shapeReach:1,shapeHandSpeed:1,shapeSweetSpot:1});
const DEFAULT_SHAPE_MODIFIERS=Object.freeze({power:1,control:1,reach:1,handSpeed:1,sweetSpot:1});
export function paddleShapeModifiers(playerOrPaddle={}){
 const paddle=playerOrPaddle?.paddle??playerOrPaddle??{};
 return {power:paddle.shapePower??1,control:paddle.shapeControl??1,reach:paddle.shapeReach??1,handSpeed:paddle.shapeHandSpeed??1,sweetSpot:paddle.shapeSweetSpot??1};
}
export function playerProfile(){return {abilities:{...DEFAULT_ABILITIES},paddle:{...DEFAULT_PADDLE},appearance:{body:'male',shirtColor:'green',paddleColor:'mint',court:'blue-gray'}}}
export function serveAim(player,aim){
 const value=Math.max(1,Math.min(19,Number(aim)||10));
 return player.x<10?Math.max(10.8,value):Math.min(9.2,value)
}
export function serveTarget(player,aim,type='hard',random=Math.random()){
 const spread=(type==='soft'?.95:1.65)/Math.max(.55,(player.abilities?.serve??1)*(player.paddle?.control??1));
 return serveAim(player,(Number(aim)||10)+(random-.5)*spread)
}
export function aimStep(player,fine=false){const placement=(player.abilities?.control??1)*(player.paddle?.control??1);return Math.max(1.5,Math.min(3.5,2.5/placement))*(fine?.25:1)}
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
export function paddleContactResponse({ball,incoming={x:0,y:0,z:0},paddleVelocity={x:0,y:0,z:0},normal={x:0,y:-1,z:0},center,power=1,control=1,spin=1,quality=1,swingDirection=1,sweetSpotScale=1}){
 const dx=(ball.x??0)-(center?.x??0),dy=(ball.y??0)-(center?.y??0),dz=((ball.z??0)-(center?.z??0))*.55,offset=Math.hypot(dx,dy,dz),sweetSpot=Math.exp(-((offset/(.72*Math.max(.55,sweetSpotScale)))**2));
 const relative={x:(incoming.x??0)-paddleVelocity.x,y:(incoming.y??0)-paddleVelocity.y,z:(incoming.z??0)-paddleVelocity.z};
 const closing=Math.max(0,-(relative.x*normal.x+relative.y*normal.y+relative.z*normal.z)+(paddleVelocity.x*normal.x+paddleVelocity.y*normal.y+paddleVelocity.z*normal.z));
 const closingPace=Math.max(0,Math.min(1,closing/34)),edge=1-sweetSpot,tangent=Math.hypot(dx,dy)*swingDirection;
 return {
  sweetSpot,offset,closing,
  paceScale:Math.max(.82,Math.min(1.12,(.88+closingPace*.09+Math.max(0,power-1)*.06+sweetSpot*.06)*Math.max(.72,quality))),
  spinKick:Math.max(-1.8,Math.min(1.8,tangent*edge*.42*Math.max(.55,spin)*(swingDirection>=0?1:-1))),
  twist:Math.max(-1,Math.min(1,tangent*edge*1.4)),
  aimError:Math.max(-.65,Math.min(.65,tangent*edge*(.6/Math.max(.7,control))))
 };
}
export function paddleContactTarget(p,b,shot='drive'){
 const shape=paddleShapeModifiers(p),reach=(p.abilities?.reach??1)*shape.reach,side=b.x>=p.x?1:-1,netward=p.team===0?-.46:.46;
 if(shot==='tweener')return {x:p.x,y:p.y-netward*1.4,z:Math.max(.4,Math.min(1.8,b.z??1))};
 if(shot==='overhead')return {x:p.x+side*.42*reach,y:p.y+netward*.55,z:Math.max(5.2,Math.min(7,b.z??5.8))};
 return {x:p.x+side*(.62+.2*reach),y:p.y+netward,z:Math.max(.35,Math.min(4.5,b.z??1.2))};
}
export function paddleContactAvailable(p,b,shot='drive'){
 const target=paddleContactTarget(p,b,shot),shape=paddleShapeModifiers(p),reach=(p.abilities?.reach??1)*gripModifiers(p,b,shot).reach*shape.reach;
 return b.z>=0&&b.z<=(shot==='overhead'?7.4:5.2)&&((b.x-target.x)/(.95*reach))**2+((b.y-target.y)/.9)**2+((b.z-target.z)/1.1)**2<=1;
}
export function contactQuality(p,b,shot,buffered=false,random=Math.random(),difficulty='normal'){
 const shape=paddleShapeModifiers(p),reach=(p.abilities?.reach??1)*shape.reach
 const paddle=paddleContactTarget(p,b,shot),radial=Math.sqrt(((b.x-paddle.x)/(.95*reach))**2+((b.y-paddle.y)/.9)**2+((b.z-paddle.z)/1.1)**2)
 const motion=Math.hypot(p.vx??0,p.vy??0)/(p.abilities?.speed??C.speed),fatigue=1-Math.max(0,Math.min(1,p.stamina??1))
 const shotDifficulty={tweener:1.8,serve:.78,drive:1.08,drop:.92,dink:.68,lob:.94,slice:1.08}[shot] ?? .95
 const easy=difficulty==='easy',highContact=shot==='overhead'?7:4.5
 let chance=.009+.064*radial**2+.035*radial**4+.034*motion**2+.029*Math.max(0,.9-(b.z??1))/.9+.022*Math.max(0,(b.z??1)-highContact)/.7
 chance*=shotDifficulty*(1+fatigue*2)
 if(easy)chance*=.62
 if(buffered)chance*=easy?.52:.84
 const specialReturn=b.shot==='atp'||b.shot==='erne'?1.55:1,control=Math.max(.55,(p.abilities?.control??1)*(p.paddle?.control??1)*shape.control*gripModifiers(p,b,shot).control),technique=Math.max(.72,shotSkill(p,shot)),defense=Math.max(.75,p.abilities?.defense??1)
 if((b.vx??0)**2+(b.vy??0)**2>1600)chance*=1.25;
 if(shot==='drive'&&b.vz>0&&(b.z??0)<1.5&&(b.shot==='serve-hard'||b.shot==='serve-soft'||b.bounces>0))chance*=1.25;
 chance*=specialReturn;chance/=Math.max(.55,control**2.2*technique*(shot==='dink'||shot==='drop'?defense:1))
 chance=Math.min(easy?.3:.42,Math.max(0,chance))
 const mishit=random<chance;
 return {chance,mishit,quality:mishit?Math.max(easy?.65:.45,.74-chance*.55):1-Math.min(.12,chance*.2)}
}
export function contactDifficulty(p,b,shot='drive'){
 const shape=paddleShapeModifiers(p),reach=(p.abilities?.reach??1)*shape.reach,target=paddleContactTarget(p,b,shot),radial=Math.sqrt(((b.x-target.x)/(.95*reach))**2+((b.y-target.y)/.9)**2+((b.z-target.z)/1.1)**2),motion=Math.hypot(p.vx??0,p.vy??0)/Math.max(1,p.abilities?.speed??C.speed),height=shot==='overhead'?Math.abs((b.z??1)-6):Math.max(0,Math.abs((b.z??1)-1.6)-1.1)/2.4,special=b.shot==='atp'||b.shot==='erne'?.18:0;
 return Math.max(0,Math.min(1,radial*.5+motion*.32+height*.18+special));
}
export function netCrossingX(start,target){
 const dy=target.y-start.y;
 return Math.abs(dy)<1e-6?start.x:start.x+(target.x-start.x)*((C.net-start.y)/dy);
}
export const side=y=>y>22?0:1;
export function netHeightAt(x){return C.netCenterHeight+(C.netPostHeight-C.netCenterHeight)*Math.min(1,Math.abs(x-C.width/2)/(C.width/2))}
export function stepBall(b,dt=C.dt){
 const oldY=b.y,oldZ=b.z,radius=b.radius??C.ballRadius,spin=b.spin||0,spinX=b.spinX||0,spinY=b.spinY||0,spinZ=b.spinZ||0,speed=Math.hypot(b.vx||0,b.vy||0,b.vz||0),drag=C.airDrag*speed;
 b.vx=(b.vx||0)*(1-drag*dt);
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
  if(crossX>=0&&crossX<=C.width&&crossZ-radius<netHeightAt(crossX)){
   const incomingSide=oldY<C.net? -1:1;b.y=C.net+incomingSide*radius;b.z=crossZ;b.vy=-b.vy*C.netRestitution;b.vx*=.52;b.vz*=.28;b.spin*=.6;b.spinX=(b.spinX||0)*.6;b.spinY=(b.spinY||0)*.6;b.spinZ=(b.spinZ||0)*.6;b.netContact=true;return 'net';
  }
}
 if(b.z<=radius&&b.vz<0){
  b.z=radius;
  const impactSpeed=Math.abs(b.vz),restitution=Math.max(.58,C.bounce-Math.max(0,impactSpeed-22)*.003)+(spin>0?.025:spin<0?-.045:0);
  b.vz=-b.vz*restitution;
  const surface=Math.max(.82,.91+(spin<0?.018:-.012));
  const spinTransfer=Math.max(-.12,Math.min(.12,spin*.022)),surfaceFriction=Math.max(.84,C.courtFriction+(spin<0?.012:-.008));
  b.vx*=surfaceFriction*(1+spinTransfer);b.vy*=surfaceFriction*(1+spinTransfer);
  b.spin=(b.spin||0)*.72;b.spinX=(b.spinX||0)*.82;b.spinY=(b.spinY||0)*.82;b.spinZ=(b.spinZ||0)*.82;
  if(b.shot==='slice'){b.vz*=.84;b.vx*=.95;b.vy*=.95}
  return 'bounce';
 }
 return null;
}
export function launch(b,x,y,shot='drive',paddle=DEFAULT_PADDLE,quality=1){
 const specs={tweener:[1.35,-.2],serve:[1.15,0],'serve-hard':[.92,1.2],'serve-soft':[1.38,-.35],drive:[1.05,1],drop:[1.1,-1],dink:[.8,-1],lob:[1.4,0],slice:[1.18,-1.8],overhead:[.95,1],atp:[1.05,1],erne:[1.05,1]};
 let [t,spin]=specs[shot]||specs.drive;
 const slow=1/(.72+.28*quality),technique=Math.max(.72,Math.min(1.28,paddle.skill??1));t*=slow;if(shot.startsWith('serve'))t/=technique;if(shot==='lob')t*=paddle.loft??1;
 if(['drive','overhead','atp','erne'].includes(shot))t=Math.max(.38,Math.hypot(x-b.x,y-b.y)/(48*(paddle.power??1)*technique*(shot==='overhead'?1.12:1)))*slow;
 const aggressive=['drive','overhead','atp','erne'].includes(shot);
 if(aggressive&&b.z<2.2)t*=1+(2.2-b.z)*.15;
 const f=(22-b.y)/(y-b.y);let clearance=['drive','overhead','atp','erne'].includes(shot)?Math.max(C.netCenterHeight+C.ballRadius+.25,(shot==='overhead'?3.35:3.65)/(paddle.power??1)):shot==='drop'?3.7:3.4;if(quality<.8)clearance*=1+(0.8-quality)*.35;
 if(f>0&&f<1)t=Math.max(t,Math.sqrt(Math.max(0,2*(clearance-b.z*(1-f))/(C.gravity*f*(1-f)))));
 b.vx=(x-b.x)/t;b.vy=(y-b.y)/t;b.vz=(C.gravity*t*t/2-b.z)/t;
 // Poor contact can catch the net as well as float long; clean shots keep assistance.
 if(quality<.8)b.vz-=(1-quality)*7;b.spin=spin*(paddle.spin??1);b.spinX=0;b.spinY=0;b.spinZ=0;b.radius=C.ballRadius;b.shot=shot;
}
export function inBounds(x,y){return x>=0&&x<=20&&y>=0&&y<=44}
export function legalVolley(team,y,bounces,shotCount){if(shotCount<=2&&bounces===0)return 'Two-bounce fault';if(bounces===0&&(team===0?y<=29:y>=15))return 'Kitchen volley fault';return null}
export class Score {
 constructor(){this.points=[0,0];this.team=0;this.server=2;this.first=true;this.rightPlayer=[1,0];this.serverPlayer=1;this.winner=null}
 point(winner){if(winner===this.team){this.points[winner]++;this.rightPlayer[winner]=1-this.rightPlayer[winner];if(this.points[winner]>=11&&this.points[winner]-this.points[1-winner]>=2)this.winner=winner}else if(this.first||this.server===2){this.team=1-this.team;this.server=1;this.first=false;this.serverPlayer=this.rightPlayer[this.team]}else{this.server=2;this.serverPlayer=1-this.serverPlayer}}
 get player(){return this.serverPlayer}
 get call(){return `${this.points[this.team]} - ${this.points[1-this.team]} - ${this.server}`}
}
export function move(p,tx,ty,dt){
 p.stamina=Math.max(0,Math.min(1,p.stamina??1));const staminaScale=.82+.18*p.stamina,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),maxSpeed=(p.abilities?.speed??C.speed)*staminaScale,acceleration=(p.abilities?.acceleration??C.accel)*(.78+.22*p.stamina),contactLock=p.swing>(p.swingDuration||.36)*.82,recovering=(p.recoveryTimer||0)>0,settling=(p.splitStepTimer||0)>0;
 const desiredSpeed=recovering||d<.03?0:Math.min(maxSpeed*(contactLock?.72:1),Math.sqrt(Math.max(0,2*acceleration*d)));
 const desiredVx=d?dx/d*desiredSpeed:0,desiredVy=d?dy/d*desiredSpeed:0,reversing=p.vx*desiredVx+p.vy*desiredVy<0;
 const turnFactor=(reversing?.62:1)*(0.85+Math.min(.25,Math.max(0,(acceleration-C.accel)/120))),maxDelta=acceleration*1.5*turnFactor*dt;
 let dvx=desiredVx-p.vx,dvy=desiredVy-p.vy,dv=Math.hypot(dvx,dvy);if(dv>maxDelta&&dv){dvx*=maxDelta/dv;dvy*=maxDelta/dv}
 p.vx+=dvx;p.vy+=dvy;p.x+=p.vx*dt;p.y+=p.vy*dt;p.stride=(p.stride||0)+Math.hypot(p.vx,p.vy)*dt;
 const movingSpeed=Math.hypot(p.vx,p.vy),agility=Math.max(8,p.abilities?.speed??C.speed);if(movingSpeed>5)p.stamina=Math.max(0,p.stamina-dt*(movingSpeed-4)*.0045*(12/agility));else p.stamina=Math.min(1,p.stamina+dt*.009*(agility/12));if(!contactLock&&!recovering&&!settling&&(!p.slideTimer||p.slideTimer<=0)&&Math.abs(p.vx)>Math.abs(p.vy)*1.25&&Math.abs(p.vx)>=7.2)p.slideTimer=.16;
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
export function selectShot(p,b,desired,random=Math.random()){
 const nearSideline=p.x<=1.25||p.x>=18.75
 const wideBall=b.x<=.75||b.x>=19.25
 const kitchenSide=p.team===0?p.y<=31:p.y>=13
 if(desired==='soft')return kitchenSide?'dink':'drop'
 if(desired==='lob'){const behind=(p.team===0?b.y-p.y:p.y-b.y);if(behind>.3&&behind<1.5&&b.z>.4&&b.z<1.8&&Math.hypot(p.vx||0,p.vy||0)>6&&(p.abilities?.lob??1)>1.1)return 'tweener';return 'lob'}
 if(desired==='attack'||desired==='drive'){
  if(nearSideline&&wideBall&&(p.x<0||p.x>20)&&p.erneAirborne&&b.z>=3.2)return 'erne'
  if((b.x<C.netPostLeft-C.ballRadius||b.x>C.netPostRight+C.ballRadius)&&nearSideline&&b.z<3.2){const cross=netCrossingX(b,{x:b.x<0?1:19,y:p.team===0?4:40});if(cross<C.netPostLeft-C.netPostRadius-C.ballRadius||cross>C.netPostRight+C.netPostRadius+C.ballRadius)return 'atp'}
  return b.z>=5.2?'overhead':'drive'
 }
 return desired
}
export function chooseCpuShot({shots, team, y, height, opponentsAtKitchen=false, aggression=.5, courtIQ=1, attackSkill=1, softSkill=1, difficulty=0, random=Math.random()}){
 const nearKitchen=team===0?y<33:y>11;
 const bias=Math.max(0,Math.min(1,Number(aggression)||.5));
 const relativeSkill=Math.max(-.12,Math.min(.12,(Number(attackSkill||1)-Number(softSkill||1))*.32-Math.max(0,Math.min(1,Number(difficulty)||0))*.3));
 const attackBias=(bias-.5)*.24+(.95-Math.max(.7,Number(courtIQ)||1))*.14+relativeSkill;
 if(shots===1)return 'drive';
 if(shots>2&&height>=5.2&&height<=7.4)return 'drive';
 if(difficulty>.82&&height<3.2)return 'lob';
 if(shots===2)return height>3.3&&random<Math.max(.12,Math.min(.62,.35+attackBias))?'drive':'drop';
 if(nearKitchen){if(opponentsAtKitchen&&height<2&&random>.97)return 'lob';if(difficulty>.9&&height<2.7)return 'dink';return height>3.1||(height>.8&&random<Math.max(.12,Math.min(.48,.24+attackBias)))?'drive':'dink'}
 return height>3.2&&random<Math.max(.2,Math.min(.72,.45+attackBias))?'drive':'drop';
}
export function kitchenFootContact(p){if(p.x!==undefined&&(p.x+.32<0||p.x-.32>20))return false;if((p.airborneTimer||0)>0)return false;return p.team===0?p.y-.42<=29:p.y+.42>=15}
export function chooseCpuTarget(player,opponents,shot){
 const candidates=shot==='dink'?[3,7,13,17]:[2.5,6,10,14,17.5];
 return candidates.reduce((best,x)=>{
  const value=v=>Math.min(...opponents.map(o=>Math.abs(v-o.x)-Math.sign(v-o.x)*(o.vx||0)*.18));
  return value(x)>value(best)?x:best;
 },candidates[0]);
}
