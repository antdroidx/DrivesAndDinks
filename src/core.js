export const C={width:20,length:44,net:22,kitchen:7,gravity:32,bounce:.72,dt:1/120,speed:12,accel:45,reach:2.6};
export const DEFAULT_ABILITIES=Object.freeze({speed:12,acceleration:45,reach:1,control:1,reaction:.09});
export const DEFAULT_PADDLE=Object.freeze({power:1,control:1,spin:1});
export function playerProfile(){return {abilities:{...DEFAULT_ABILITIES},paddle:{...DEFAULT_PADDLE},appearance:{jersey:0}}}
export function aimStep(player,fine=false){const placement=(player.abilities?.control??1)*(player.paddle?.control??1);return Math.max(1.5,Math.min(3.5,2.5/placement))*(fine?.25:1)}
export function contactAvailable(p,b){const reach=p.abilities?.reach??1;return ((p.x-b.x)/(1.6*reach))**2+((p.y-b.y)/(1.9*reach))**2<=1&&b.z>=0&&b.z<=3.5}
export function contactQuality(p,b,shot,buffered=false,random=Math.random()){
 const reach=p.abilities?.reach??1
 const radial=Math.sqrt(((b.x-p.x)/(1.6*reach))**2+((b.y-p.y)/(1.9*reach))**2)
 const motion=Math.hypot(p.vx??0,p.vy??0)/(p.abilities?.speed??C.speed)
 const difficulty={serve:.78,drive:1.08,drop:.92,dink:.68,lob:.94,slice:1.08}[shot] ?? .95
 let chance=.012+.09*radial**2+.05*radial**4+.05*motion**2+.04*Math.max(0,.9-(b.z??1))/.9+.03*Math.max(0,(b.z??1)-2.8)/.7
 chance*=difficulty
 chance*=(buffered?.84:1)
 chance/=Math.max(.55,((p.abilities?.control??1)*(p.paddle?.control??1))**.8)
 chance=Math.min(.42,Math.max(0,chance))
 return {quality:Math.max(.42,1-chance),mishit:random<chance}
}
export const side=y=>y>22?0:1;
export function stepBall(b,dt=C.dt){const oldY=b.y,oldZ=b.z;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vz-=C.gravity*dt; b.vx*=1-(b.spin||0)*dt*.015;b.vy*=1-(b.spin||0)*dt*.015;
 if((oldY-22)*(b.y-22)<=0&&oldY!==b.y){const f=(22-oldY)/(b.y-oldY);if(oldZ+(b.z-oldZ)*f<3)return 'net'}
 if(b.z<=0&&b.vz<0){b.z=0;b.vz=-b.vz*C.bounce;if(b.shot==='slice'){b.vz*=.82;b.vx*=.94;b.vy*=.94}return 'bounce'}return null}
export function launch(b,x,y,shot='drive',paddle=DEFAULT_PADDLE,quality=1){
 const specs={serve:[1.15,0],drive:[1.05,1],drop:[1.1,-1],dink:[.8,-1],lob:[1.4,0],slice:[1.18,-1.8]};
 let [t,spin]=specs[shot]||specs.drive;
 const slow=1/(.72+.28*quality);t*=slow
 if(shot==='drive')t=Math.max(.42,Math.hypot(x-b.x,y-b.y)/(48*paddle.power));
 // Solve the ballistic arc at the net rather than giving short and long shots the same arc.
 const f=(22-b.y)/(y-b.y);let clearance=shot==='drive'?Math.max(3.25,3.65/paddle.power):shot==='drop'?3.7:3.4;if(quality<.8)clearance*=1+(0.8-quality)*.35;
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
export function move(p,tx,ty,dt){const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);const maxSpeed=p.abilities?.speed??C.speed;const planted=p.swing>Math.max(.12,(p.swingDuration||.36)*.55);if(planted){p.vx*=Math.exp(-18*dt);p.vy*=Math.exp(-18*dt)}const speed=Math.min(maxSpeed*(planted?.12:1),d/dt);const vx=d?dx/d*speed:0,vy=d?dy/d*speed:0;const a=Math.min(1,(p.abilities?.acceleration??C.accel)*dt/maxSpeed);p.vx+=(vx-p.vx)*a;p.vy+=(vy-p.vy)*a;p.x+=p.vx*dt;p.y+=p.vy*dt;p.stride=(p.stride||0)+Math.hypot(p.vx,p.vy)*dt;p.motion=planted?'planted':Math.hypot(p.vx,p.vy)<1?'ready':Math.abs(p.vx)>Math.abs(p.vy)*1.3?'shuffle':'run';p.x=Math.max(0,Math.min(20,p.x));p.y=p.team===0?Math.max(23,Math.min(44,p.y)):Math.max(0,Math.min(21,p.y))}
export function receiver(players,team,x,y){return players.filter(p=>p.team===team).reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b)}



// Tactical approximation: deep returns, third-shot transition, and kitchen exchanges.
export function chooseCpuShot({shots, team, y, height, opponentsAtKitchen=false, random=Math.random()}){
 const nearKitchen=team===0?y<33:y>11;
 if(shots===1)return 'drive';
 if(shots===2)return height>3.3&&random<.35?'drive':'drop';
 if(nearKitchen){if(opponentsAtKitchen&&height<2&&random>.97)return 'lob';return height>2.7||(height>.65&&random<.28)?'drive':'dink'}
 return height>3.2&&random<.45?'drive':'drop';
}




