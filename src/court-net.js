// Open mesh: only threads, binding tape, straps and posts cover the court.
export function drawCourtNet(c,left,right,height,{retro=false}={}){
 const top=left.y-height,width=right.x-left.x,sag=2.2;
 const netY=(x,y)=>y+sag*(1-((x-left.x)/width*2-1)**2)*(1-(y-top)/height);
 c.save();c.lineWidth=retro?1:.65;c.strokeStyle='#2036409c';
 for(let x=left.x+8;x<right.x;x+=9){c.beginPath();c.moveTo(x,netY(x,top));c.lineTo(x,left.y);c.stroke()}
 for(let y=top+7;y<left.y;y+=6){c.beginPath();c.moveTo(left.x,y);c.quadraticCurveTo((left.x+right.x)/2,y+sag*2*(1-(y-top)/height),right.x,y);c.stroke()}
 c.strokeStyle='#263a40bb';c.lineWidth=1.2;c.beginPath();c.moveTo(left.x,left.y);c.lineTo(right.x,right.y);c.stroke();
 // Curved white headband with a slight natural center sag.
 c.beginPath();c.moveTo(left.x,top-2);c.quadraticCurveTo((left.x+right.x)/2,top+sag*2-2,right.x,top-2);c.lineTo(right.x,top+2);c.quadraticCurveTo((left.x+right.x)/2,top+sag*2+2,left.x,top+2);c.closePath();c.fillStyle='#f3ead4';c.fill();
 c.strokeStyle='#d8d1bd';c.lineWidth=1.1;c.beginPath();c.moveTo((left.x+right.x)/2,top+sag+2);c.lineTo((left.x+right.x)/2,left.y);c.stroke();
 for(const p of [left,right]){c.fillStyle='#243e47';c.fillRect(p.x-2,p.y-height-6,4,height+9);c.fillStyle='#91a3a0';c.fillRect(p.x-1,p.y-height-5,1.2,height+7);c.beginPath();c.ellipse(p.x,p.y+3,5,1.5,0,0,Math.PI*2);c.fillStyle='#20383b55';c.fill()}
 c.restore();
}
