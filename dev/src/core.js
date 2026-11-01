export const C={width:20,length:44,net:22,kitchen:7,gravity:32,bounce:.72,airDrag:.018,spinLift:.055,dt:1/120,speed:12,accel:45,reach:2.6};
export const DEFAULT_ABILITIES=Object.freeze({speed:12,acceleration:45,reach:1,control:1,reaction:.09,serve:1,power:1,spin:1});
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
export function contactQuality(p,b,shot,buffered=false,random=Math.random(),difficulty='normal'){
 const reach=p.abilities?.reach??1
 const radial=Math.sqrt(((b.x-p.x)/(1.6*reach))**2+((b.y-p.y)/(1.9*reach))**2)
 const motion=Math.hypot(p.vx??0,p.vy??0)/(p.abilities?.speed??C.speed)
 const shotDifficulty={serve:.78,drive:1.08,drop:.92,dink:.68,lob:.94,slice:1.08}[shot] ?? .95
 const easy=difficulty==='easy'
 let chance=.012+.09*radial**2+.05*radial**4+.05*motion**2+.04*Math.max(0,.9-(b.z??1))/.9+.03*Math.max(0,(b.z??1)-2.8)/.7
 chance*=shotDifficulty
 if(easy)chance*=.62
 if(buffered)chance*=easy?.52:.84
 chance/=Math.max(.55,((p.abilities?.control??1)*(p.paddle?.control??1))**.8)
 chance=Math.min(easy?.3:.42,Math.max(0,chance))
 return {quality:Math.max(easy?.65:.42,1-chance),mishit:random<chance}
}
export const side=y=>y>22?0:1;
export function stepBall(b,dt=C.dt){const oldY=b.y,oldZ=b.z,spin=b.spin||0,drag=Math.max(.94,1-(C.airDrag+Math.abs(spin)*.002)*dt);b.vx*=drag;b.vy*=drag;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vz-=C.gravity*dt+spin*C.spinLift*dt; if((oldY-22)*(b.y-22)<=0&&oldY!==b.y){const f=(22-oldY)/(b.y-oldY);if(oldZ+(b.z-oldZ)*f<3)return 'net'} if(b.z<=0&&b.vz<0){b.z=0;b.vz=-b.vz*C.bounce;const surface=.89+(spin<0?.015:-.012);b.vx*=surface;b.vy*=surface;if(b.shot==='slice'){b.vz*=.82;b.vx*=.94;b.vy*=.94}return 'bounce'}return null}
export function launch(b,x,y,shot='drive',paddle=DEFAULT_PADDLE,quality=1){
 const specs={serve:[1.15,0],'serve-hard':[.92,1.2],'serve-soft':[1.38,-.35],drive:[1.05,1],drop:[1.1,-1],dink:[.8,-1],lob:[1.4,0],slice:[1.18,-1.8],overhead:[.95,1],atp:[1.05,1],erne:[1.05,1]};
 let [t,spin]=specs[shot]||specs.drive;
 const slow=1/(.72+.28*quality);t*=slow
 if(['drive','overhead','atp','erne'].includes(shot))t=Math.max(.42,Math.hypot(x-b.x,y-b.y)/(48*paddle.power*(shot==='overhead'?1.12:1)));
 // Solve the ballistic arc at the net rather than giving short and long shots the same arc.
 const f=(22-b.y)/(y-b.y);let clearance=['drive','overhead','atp','erne'].includes(shot)?Math.max(3.25,(shot==='overhead'?3.35:3.65)/paddle.power):shot==='drop'?3.7:3.4;if(quality<.8)clearance*=1+(0.8-quality)*.35;
 if(f>0&&f<1)t=Math.max(t,Math.sqrt(Math.max(0,2*(clearance-b.z*(1-f))/(C.gravity*f*(1-f)))));
 b.vx=(x-b.x)/t;b.vy=(y-b.y)/t;b.vz=(C.gravity*t*t/2-b.z)/t;b.spin=spin*paddle.spin;b.shot=shot;
}
export function inBounds(x,y){return x>=0&&x<=20&&y>=0&&y<=44}
export function legalVolley(team,y,bounces,shotCount){if(shotCount<=2&&bounces===0)return 'Two-bounce fault';if(bounces===0&&(team===0?y<=29:y>=15))return 'Kitchen volley fault';return null}
export class Score {
 constructor(){this.points=[0,0];this.team=0;this.server=2;this.first=true;this.rightPlayer=[1,0];this.serverPlayer=1;this.winner=null}
 point(winner){if(winner===this.team){this.points[winner]++;this.rightPlayer[winner]=1-this.rightPlayer[winner];if(this.points[winner]>=11&&this.points[winner]-this.points[1-winner]>=2)this.winner=winner}else if(this.first||this.server===2){this.team=1-this.team;this.server=1;this.first=false;this.serverPlayer=this.rightPlayer[this.team]}else{this.server=2;this.serverPlayer=1-this.serverPlayer}}
 get player(){return this.serverPlayer}
 get call(){return `${this.points[this.team]} - ${this.points[1-this.team]} - ${this.server}`}
}
export function move(p,tx,ty,dt){const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),maxSpeed=p.abilities?.speed??C.speed;const contactLock=p.swing>(p.swingDuration||.36)*.82;const speed=Math.min(maxSpeed*(contactLock?.72:1),d/dt);const vx=d?dx/d*speed:0,vy=d?dy/d*speed:0;const response=1-Math.exp(-((p.abilities?.acceleration??C.accel)/2.2)*dt);p.vx+=(vx-p.vx)*Math.min(1,response);p.vy+=(vy-p.vy)*Math.min(1,response);p.x+=p.vx*dt;p.y+=p.vy*dt;p.stride=(p.stride||0)+Math.hypot(p.vx,p.vy)*dt;const movingSpeed=Math.hypot(p.vx,p.vy);if(!contactLock&&(!p.slideTimer||p.slideTimer<=0)&&Math.abs(p.vx)>Math.abs(p.vy)*1.25&&Math.abs(p.vx)>=7.2)p.slideTimer=.16;p.slideTimer=Math.max(0,(p.slideTimer||0)-dt);p.motion=p.slideTimer>0?'slide':movingSpeed<.7?'ready':Math.abs(p.vx)>Math.abs(p.vy)*1.3?'shuffle':'run';p.x=Math.max(0,Math.min(20,p.x));p.y=p.team===0?Math.max(23,Math.min(44,p.y)):Math.max(0,Math.min(21,p.y))}
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
  return b.z>=3.2?'overhead':'drive'
 }
 return desired
}
export function chooseCpuShot({shots, team, y, height, opponentsAtKitchen=false, random=Math.random()}){
 const nearKitchen=team===0?y<33:y>11;
 if(shots===1)return 'drive';
 if(shots===2)return height>3.3&&random<.35?'drive':'drop';
 if(nearKitchen){if(opponentsAtKitchen&&height<2&&random>.97)return 'lob';return height>2.7||(height>.65&&random<.28)?'drive':'dink'}
 return height>3.2&&random<.45?'drive':'drop';
}
