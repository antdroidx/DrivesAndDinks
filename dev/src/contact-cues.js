const clamp=n=>Math.max(0,Math.min(1,n));
export function contactCue(contact){
 if(!contact||!(contact.time>0))return null;
 const kind=(contact.quality??1)<.8?'mishit':(contact.difficulty??0)>.65?'stretched':(contact.sweetSpot??1)<.25?'edge':'clean';
 return {kind,label:kind==='mishit'?'MISHIT':kind==='stretched'?'UNDER PRESSURE':kind==='edge'?'OFF-CENTER':'CLEAN CONTACT',color:kind==='mishit'?'#ffbc89':kind==='clean'?'#caffd6':'#ffe1a0',age:1-clamp(contact.time/.12)};
}
export function replayContactAt(clip,clock){
 for(let i=clip.frames.length-1;i>=0;i--){const frame=clip.frames[i];if(frame.clock>clock||!frame.contact||frame.contact.time<=0)continue;
  const age=clock-frame.clock+Math.max(0,.12-frame.contact.time);return age<=.32?{...frame.contact,time:.12*(1-age/.32)}:null;
 }
 return null;
}
export function drawContactCue(c,contact,project,{scale=1,labels=false}={}){
 const cue=contactCue(contact);if(!cue)return;
 const p=project(contact.x,contact.y,contact.z),radius=(4+cue.age*8)*scale;
 c.save();c.globalAlpha=(1-cue.age)*.65;c.strokeStyle=cue.color;c.lineWidth=1.25*scale;c.beginPath();c.ellipse(p.x,p.y,radius,radius*.7,0,0,Math.PI*2);c.stroke();
 for(const angle of [-.9,.3,2.1]){c.beginPath();c.moveTo(p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius*.7);c.lineTo(p.x+Math.cos(angle)*(radius+3*scale),p.y+Math.sin(angle)*(radius+3*scale)*.7);c.stroke()}
 if(labels){c.font=`bold ${10*scale}px Arial, Helvetica, sans-serif`;c.fillStyle=cue.color;c.textAlign='center';c.fillText(cue.label,p.x,p.y-14*scale)}
 c.restore();
}
