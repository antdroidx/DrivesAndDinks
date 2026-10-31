export const C={width:20,length:44,net:22,kitchen:7,gravity:32,bounce:.72,dt:1/120,speed:12,accel:45,reach:2.6};
export const side=y=>y>22?0:1;
export function stepBall(b,dt=C.dt){const oldY=b.y,oldZ=b.z;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vz-=C.gravity*dt; b.vx*=1-(b.spin||0)*dt*.015;b.vy*=1-(b.spin||0)*dt*.015;
 if((oldY-22)*(b.y-22)<=0&&oldY!==b.y){const f=(22-oldY)/(b.y-oldY);if(oldZ+(b.z-oldZ)*f<3)return 'net'}
 if(b.z<=0&&b.vz<0){b.z=0;b.vz=-b.vz*C.bounce;return 'bounce'}return null}
export function launch(b,x,y,shot='drive'){const specs={serve:[1.15,0],drive:[1.05,1],drop:[1.1,-1],dink:[.8,-1],lob:[1.4,0]};const [t,spin]=specs[shot]||specs.drive;b.vx=(x-b.x)/t;b.vy=(y-b.y)/t;b.vz=(C.gravity*t*t/2-b.z)/t;b.spin=spin}
export function inBounds(x,y){return x>=0&&x<=20&&y>=0&&y<=44}
export function legalVolley(team,y,bounces,shotCount){if(shotCount<=2&&bounces===0)return 'Two-bounce fault';if(bounces===0&&(team===0?y<=29:y>=15))return 'Kitchen volley fault';return null}
export class Score {
 constructor(){this.points=[0,0];this.team=0;this.server=2;this.first=true;this.rightPlayer=[1,0];this.serverPlayer=1;this.winner=null}
 point(winner){if(winner===this.team){this.points[winner]++;this.rightPlayer[winner]=1-this.rightPlayer[winner];if(this.points[winner]>=11&&this.points[winner]-this.points[1-winner]>=2)this.winner=winner}else if(this.first||this.server===2){this.team=1-this.team;this.server=1;this.first=false;this.serverPlayer=this.rightPlayer[this.team]}else{this.server=2;this.serverPlayer=1-this.serverPlayer}}
 get player(){return this.serverPlayer}
 get call(){return `${this.points[this.team]} - ${this.points[1-this.team]} - ${this.server}`}
}
export function move(p,tx,ty,dt){const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);const speed=Math.min(C.speed,d/dt);const vx=d?dx/d*speed:0,vy=d?dy/d*speed:0;const a=Math.min(1,C.accel*dt/C.speed);p.vx+=(vx-p.vx)*a;p.vy+=(vy-p.vy)*a;p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=Math.max(0,Math.min(20,p.x));p.y=p.team===0?Math.max(23,Math.min(44,p.y)):Math.max(0,Math.min(21,p.y))}
export function receiver(players,team,x,y){return players.filter(p=>p.team===team).reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b)}



// Tactical approximation: deep returns, third-shot transition, and kitchen exchanges.
export function chooseCpuShot({shots, team, y, height, random=Math.random()}){
 const nearKitchen=team===0?y<33:y>11;
 if(shots===1)return 'drive';
 if(shots===2)return height>3.3&&random<.35?'drive':'drop';
 if(nearKitchen)return height>2.7?'drive':'dink';
 return height>3.2&&random<.45?'drive':'drop';
}

