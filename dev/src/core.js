import {strokeForContact} from './player-facing.js?v=64';
export const C={width:20,length:44,net:22,kitchen:7,gravity:32.174,bounce:.72,airDrag:.0024,spinLift:.065,spinDecay:.42,magnus:.05,ballRadius:.125,netCenterHeight:2.833,netPostHeight:3,dt:1/120,speed:12,accel:45,reach:2.6};
export const DEFAULT_ABILITIES=Object.freeze({speed:12,acceleration:45,reach:1,control:1,reaction:.09,serve:1,power:1,spin:1,drive:1,volley:1,drop:1,dink:1,lob:1,smash:1,defense:1,courtIQ:1,aggression:1});
export const DEFAULT_PADDLE=Object.freeze({power:1,control:1,spin:1});
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
 if(shot==='overhead')return abilities.smash??abilities.power??1;
 if(shot==='atp')return ((abilities.volley??1)+(abilities.reach??1))/2;
 if(shot==='erne')return ((abilities.volley??1)+(abilities.courtIQ??1))/2;
 if(shot==='slice')return ((abilities.drive??1)+(abilities.control??1))/2;
 return abilities[shot]??abilities.drive??1;
}
export function paddleContactTarget(p,b,shot='drive'){
 const reach=p.abilities?.reach??1,side=b.x>=p.x?1:-1,netward=p.team===0?-.46:.46;
 if(shot==='overhead')return {x:p.x+side*.42*reach,y:p.y+netward*.55,z:Math.max(5.2,Math.min(7,b.z??5.8))};
 return {x:p.x+side*(.62+.2*reach),y:p.y+netward,z:Math.max(.35,Math.min(4.5,b.z??1.2))};
}
export function paddleContactAvailable(p,b,shot='drive'){
 const target=paddleContactTarget(p,b,shot),reach=(p.abilities?.reach??1)*gripModifiers(p,b,shot).reach;
 return b.z>=0&&b.z<=(shot==='overhead'?7.4:5.2)&&((b.x-target.x)/(.95*reach))**2+((b.y-target.y)/.9)**2+((b.z-target.z)/1.1)**2<=1;
}
export function contactQuality(p,b,shot,buffered=false,random=Math.random(),difficulty='normal'){
 const reach=p.abilities?.reach??1
 const paddle=paddleContactTarget(p,b,shot),radial=Math.sqrt(((b.x-paddle.x)/(.95*reach))**2+((b.y-paddle.y)/.9)**2+((b.z-paddle.z)/1.1)**2)
 const motion=Math.hypot(p.vx??0,p.vy??0)/(p.abilities?.speed??C.speed)
 const shotDifficulty={serve:.78,drive:1.08,drop:.92,dink:.68,lob:.94,slice:1.08}[shot] ?? .95
 const easy=difficulty==='easy',highContact=shot==='overhead'?7:4.5
 let chance=.009+.064*radial**2+.035*radial**4+.034*motion**2+.029*Math.max(0,.9-(b.z??1))/.9+.022*Math.max(0,(b.z??1)-highContact)/.7
 chance*=shotDifficulty
 if(easy)chance*=.62
 if(buffered)chance*=easy?.52:.84
 const control=Math.max(.55,(p.abilities?.control??1)*(p.paddle?.control??1)*gripModifiers(p,b,shot).control),technique=Math.max(.72,shotSkill(p,shot)),defense=Math.max(.75,p.abilities?.defense??1)
 chance/=Math.max(.55,control**2.2*technique*(shot==='dink'||shot==='drop'?defense:1))
 chance=Math.min(easy?.3:.42,Math.max(0,chance))
 const mishit=random<chance;
 return {chance,mishit,quality:mishit?Math.max(easy?.65:.45,.74-chance*.55):1-Math.min(.12,chance*.2)}
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
 if((oldY-C.net)*(b.y-C.net)<=0&&oldY!==b.y){const f=(C.net-oldY)/(b.y-oldY),crossX=b.x-b.vx*dt*(1-f),crossZ=oldZ+(b.z-oldZ)*f;if(crossX>=0&&crossX<=C.width&&crossZ-radius<netHeightAt(crossX))return 'net'}
 if(b.z<=radius&&b.vz<0){
  b.z=radius;
  const impactSpeed=Math.abs(b.vz),restitution=Math.max(.58,C.bounce-Math.max(0,impactSpeed-22)*.003)+(spin>0?.025:spin<0?-.045:0);
  b.vz=-b.vz*restitution;
  const surface=Math.max(.82,.91+(spin<0?.018:-.012));
  const spinKick=Math.max(-.16,Math.min(.16,spin*.025));
  b.vx*=surface*(1+spinKick);b.vy*=surface*(1+spinKick);
  if(b.shot==='slice'){b.vz*=.84;b.vx*=.95;b.vy*=.95}
  return 'bounce';
 }
 return null;
}
export function launch(b,x,y,shot='drive',paddle=DEFAULT_PADDLE,quality=1){
 const specs={serve:[1.15,0],'serve-hard':[.92,1.2],'serve-soft':[1.38,-.35],drive:[1.05,1],drop:[1.1,-1],dink:[.8,-1],lob:[1.4,0],slice:[1.18,-1.8],overhead:[.95,1],atp:[1.05,1],erne:[1.05,1]};
 let [t,spin]=specs[shot]||specs.drive;
 const slow=1/(.72+.28*quality),technique=Math.max(.72,Math.min(1.28,paddle.skill??1));t*=slow;if(shot==='lob')t*=paddle.loft??1;
 if(['drive','overhead','atp','erne'].includes(shot))t=Math.max(.38,Math.hypot(x-b.x,y-b.y)/(48*(paddle.power??1)*technique*(shot==='overhead'?1.12:1)))*slow;
 const f=(22-b.y)/(y-b.y);let clearance=['drive','overhead','atp','erne'].includes(shot)?Math.max(C.netCenterHeight+C.ballRadius+.25,(shot==='overhead'?3.35:3.65)/(paddle.power??1)):shot==='drop'?3.7:3.4;if(quality<.8)clearance*=1+(0.8-quality)*.35;
 if(f>0&&f<1)t=Math.max(t,Math.sqrt(Math.max(0,2*(clearance-b.z*(1-f))/(C.gravity*f*(1-f)))));
 b.vx=(x-b.x)/t;b.vy=(y-b.y)/t;b.vz=(C.gravity*t*t/2-b.z)/t;b.spin=spin*(paddle.spin??1);b.spinX=0;b.spinY=0;b.spinZ=0;b.radius=C.ballRadius;b.shot=shot;
}
export function inBounds(x,y){return x>=0&&x<=20&&y>=0&&y<=44}
export function legalVolley(team,y,bounces,shotCount){if(shotCount<=2&&bounces===0)return 'Two-bounce fault';if(bounces===0&&(team===0?y<=29:y>=15))return 'Kitchen volley fault';return null}
export class Score {
 constructor(){this.points=[0,0];this.team=0;this.server=2;this.first=true;this.rightPlayer=[1,0];this.serverPlayer=1;this.winner=null}
 point(winner){if(winner===this.team){this.points[winner]++;this.rightPlayer[winner]=1-this.rightPlayer[winner];if(this.points[winner]>=11&&this.points[winner]-this.points[1-winner]>=2)this.winner=winner}else if(this.first||this.server===2){this.team=1-this.team;this.server=1;this.first=false;this.serverPlayer=this.rightPlayer[this.team]}else{this.server=2;this.serverPlayer=1-this.serverPlayer}}
 get player(){return this.serverPlayer}
 get call(){return `${this.points[this.team]} - ${this.points[1-this.team]} - ${this.server}`}
}
export function move(p,tx,ty,dt){const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),maxSpeed=p.abilities?.speed??C.speed;const contactLock=p.swing>(p.swingDuration||.36)*.82;const speed=Math.min(maxSpeed*(contactLock?.72:1),d/dt);const vx=d?dx/d*speed:0,vy=d?dy/d*speed:0;const response=1-Math.exp(-((p.abilities?.acceleration??C.accel)/2.2)*dt);p.vx+=(vx-p.vx)*Math.min(1,response);p.vy+=(vy-p.vy)*Math.min(1,response);p.x+=p.vx*dt;p.y+=p.vy*dt;p.stride=(p.stride||0)+Math.hypot(p.vx,p.vy)*dt;const movingSpeed=Math.hypot(p.vx,p.vy);if(!contactLock&&(!p.slideTimer||p.slideTimer<=0)&&Math.abs(p.vx)>Math.abs(p.vy)*1.25&&Math.abs(p.vx)>=7.2)p.slideTimer=.16;p.slideTimer=Math.max(0,(p.slideTimer||0)-dt);p.motion=p.slideTimer>0?'slide':movingSpeed<.7?'ready':Math.abs(p.vx)>Math.abs(p.vy)*1.3?'shuffle':'run';const outside=p.outsideTimer>0; p.x=Math.max(outside?-2.2:0,Math.min(outside?22.2:20,p.x));p.y=p.team===0?Math.max(23,Math.min(44,p.y)):Math.max(0,Math.min(21,p.y))}
export function receiver(players,team,x,y){return players.filter(p=>p.team===team).reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b)}



// Tactical approximation: deep returns, third-shot transition, and kitchen exchanges.
export function selectShot(p,b,desired,random=Math.random()){
 const nearSideline=p.x<=1.25||p.x>=18.75
 const wideBall=b.x<=.75||b.x>=19.25
 const kitchenSide=p.team===0?p.y<=31:p.y>=13
 if(desired==='soft')return kitchenSide?'dink':'drop'
 if(desired==='lob')return 'lob'
 if(desired==='attack'||desired==='drive'){
  if(nearSideline&&wideBall&&b.z>=3.2)return 'erne'
  if(nearSideline&&wideBall)return 'atp'
  return b.z>=5.2?'overhead':'drive'
 }
 return desired
}
export function chooseCpuShot({shots, team, y, height, opponentsAtKitchen=false, aggression=.5, courtIQ=1, attackSkill=1, softSkill=1, random=Math.random()}){
 const nearKitchen=team===0?y<33:y>11,bias=Math.max(0,Math.min(1,Number(aggression)||.5)),relativeSkill=Math.max(-.12,Math.min(.12,(Number(attackSkill||1)-Number(softSkill||1))*.32)),attackBias=(bias-.5)*.24+(.95-Math.max(.7,Number(courtIQ)||1))*.14+relativeSkill;
 if(shots>2&&height>=5.2&&height<=7.4)return 'drive';
 if(shots===1)return 'drive';
 if(shots===2)return height>3.3&&random<Math.max(.12,Math.min(.62,.35+attackBias))?'drive':'drop';
 if(nearKitchen){if(opponentsAtKitchen&&height<2&&random>.97)return 'lob';return height>2.7||(height>.65&&random<Math.max(.1,Math.min(.55,.28+attackBias)))?'drive':'dink'}
 return height>3.2&&random<Math.max(.2,Math.min(.72,.45+attackBias))?'drive':'drop';
}
