// Open mesh: only threads, binding tape, straps and posts cover the court.
export function drawCourtNet(c,left,right,height,{retro=false,centerHeight=height}={}){
 const top=left.y-height,width=right.x-left.x,sag=Math.max(0,height-centerHeight);
 const netY=(x,y)=>y+sag*(1-((x-left.x)/width*2-1)**2)*(1-(y-top)/Math.max(1,height));
 c.save();c.lineWidth=retro?1:.65;c.strokeStyle='#2036409c';
 for(let y=top+7;y<left.y;y+=6){c.beginPath();c.moveTo(left.x,y);c.quadraticCurveTo((left.x+right.x)/2,y+sag*(1-(y-top)/Math.max(1,height)),right.x,y);c.stroke()}
 c.strokeStyle='#294852e8';c.lineWidth=retro?1.15:.85;
 for(let x=left.x+7;x<right.x;x+=8){c.beginPath();c.moveTo(x,netY(x,top));c.lineTo(x,left.y);c.stroke()} c.strokeStyle='#263a40bb';c.lineWidth=1.2;c.beginPath();c.moveTo(left.x,left.y);c.lineTo(right.x,right.y);c.stroke();
 // Curved white headband with the regulation center dip.
 c.beginPath();c.moveTo(left.x,top-2);c.quadraticCurveTo((left.x+right.x)/2,top+sag-2,right.x,top-2);c.lineTo(right.x,top+2);c.quadraticCurveTo((left.x+right.x)/2,top+sag+2,left.x,top+2);c.closePath();c.fillStyle='#f3ead4';c.fill();
 c.strokeStyle='#d8d1bd';c.lineWidth=1.1;c.beginPath();c.moveTo((left.x+right.x)/2,top+sag+2);c.lineTo((left.x+right.x)/2,left.y);c.stroke();
 for(const p of [left,right]){c.fillStyle='#243e47';c.fillRect(p.x-2,p.y-height-6,4,height+9);c.fillStyle='#91a3a0';c.fillRect(p.x-1,p.y-height-5,1.2,height+7);c.beginPath();c.ellipse(p.x,p.y+3,5,1.5,0,0,Math.PI*2);c.fillStyle='#20383b55';c.fill()}
 c.restore();
}

export function drawNetContact(c,mark,project,{scale=1,labels=true}={}){
 if(!mark||!(mark.time>0))return;
 const p=project(mark.x,mark.y,mark.z),base=project(mark.x,mark.y,0),duration=mark.duration??.55,age=Math.max(0,Math.min(1,1-mark.time/duration)),fade=Math.max(0,Math.min(1,mark.time/.18)),cord=mark.kind==='cord',color=cord?'#ffd86a':'#8de8e2',s=Number.isFinite(scale)&&scale>0?scale:1;
 c.save();c.globalAlpha=fade;
 // A local tape/mesh shock makes the otherwise transparent net contact readable.
 c.strokeStyle=color;c.lineWidth=Math.max(1.2,2.2*s);c.beginPath();c.moveTo(p.x-15*s,p.y+Math.sin(age*Math.PI)*2*s);c.quadraticCurveTo(p.x,p.y+(cord?3:-3)*s*(1-age*.45),p.x+15*s,p.y-Math.sin(age*Math.PI)*2*s);c.stroke();
 c.lineWidth=Math.max(1,1.4*s);for(let i=0;i<4;i++){const angle=Math.PI*.25+i*Math.PI*.5,inner=(4+age*4)*s,outer=(9+age*8)*s;c.beginPath();c.moveTo(p.x+Math.cos(angle)*inner,p.y+Math.sin(angle)*inner);c.lineTo(p.x+Math.cos(angle)*outer,p.y+Math.sin(angle)*outer);c.stroke()}
 const vx=Number(mark.vx)||0,vy=Number(mark.vy)||0,vz=Number(mark.vz)||0,len=Math.hypot(vx,vy,vz)||1,redirect=project(mark.x+vx/len*.8,mark.y+vy/len*.8,mark.z+vz/len*.25);
 c.lineWidth=Math.max(1,1.5*s);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(redirect.x,redirect.y);c.stroke();const angle=Math.atan2(redirect.y-p.y,redirect.x-p.x);c.beginPath();c.moveTo(redirect.x,redirect.y);c.lineTo(redirect.x-Math.cos(angle-.55)*5*s,redirect.y-Math.sin(angle-.55)*5*s);c.moveTo(redirect.x,redirect.y);c.lineTo(redirect.x-Math.cos(angle+.55)*5*s,redirect.y-Math.sin(angle+.55)*5*s);c.stroke();
 c.strokeStyle=cord?'#fff2a8':'#d8ffff';c.lineWidth=Math.max(.8,1*s);c.beginPath();c.ellipse(p.x,p.y,(7+age*10)*s,(3+age*5)*s,0,0,Math.PI*2);c.stroke();
 if(labels){const label=cord?'NET CORD':'NET TOUCH',width=(label.length*6+12)*s,x=Math.max(4,p.x-width/2),y=Math.max(4,base.y-31*s);c.globalAlpha=Math.min(1,fade*1.2);c.fillStyle='#10252ddd';c.fillRect(x,y,width,16*s);c.fillStyle=cord?'#ffe59a':'#d9ffff';c.font=`bold ${Math.max(8,9*s)}px Arial, Helvetica, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(label,x+width/2,y+8*s);c.textAlign='left';c.textBaseline='alphabetic'}
 c.restore();
}