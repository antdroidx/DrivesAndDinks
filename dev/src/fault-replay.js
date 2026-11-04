export function faultReplaySample(clip,elapsed){
 const frames=clip.frames,start=frames[0].clock,end=frames.at(-1).clock;
 if(!clip.focus){const index=Math.floor(elapsed*.75*30);return index>=frames.length?null:frames[index]}
 const slowStart=Math.max(start,end-.65),lead=(slowStart-start)/.85,slow=(end-slowStart)/.28,hold=1.4;
 if(elapsed>lead+slow+hold)return null;
 const clock=elapsed<lead?start+elapsed*.85:Math.min(end,slowStart+Math.max(0,elapsed-lead)*.28);
 let selected=frames[0];for(const frame of frames){if(frame.clock>clock)break;selected=frame}return selected;
}
export function faultReplayCamera(base,focus,project,clock){
 if(!focus)return null;const t=Math.max(0,Math.min(1,(clock-focus.time+.8)/.8)),ease=t*t*(3-2*t),zoom=1+ease*.7,target=project(focus.x,focus.y),width=base.width/zoom,height=base.height/zoom;
 const cx=(base.x+base.width/2)*(1-ease)+target.x*ease,cy=(base.y+base.height/2)*(1-ease)+(target.y-25)*ease;
 return {x:cx-width/2,y:cy-height/2,width,height};
}
export function drawFaultContact(c,focus,project){
 const foot=project(focus.x,focus.y),a=project(Math.max(0,focus.x-2),focus.boundary),b=project(Math.min(20,focus.x+2),focus.boundary);
 c.save();c.strokeStyle='#ff694e';c.lineWidth=2.5;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.beginPath();c.ellipse(foot.x,foot.y,8,5,0,0,Math.PI*2);c.stroke();
 const text=focus.reason==='Kitchen momentum fault'?'MOMENTUM · FOOT CONTACT':'KITCHEN · FOOT CONTACT';c.font='bold 9px monospace';c.textAlign='center';c.fillStyle='#112a35ed';c.fillRect(foot.x-86,foot.y+10,172,16);c.fillStyle='#ffe2b5';c.fillText(text,foot.x,foot.y+21);c.restore();
}


// Broadcast highlights track flight and retain the bounce/outcome inside a padded frame.
export function highlightReplayCamera(base,clip,project,snapshot){
 if(clip.focus?.boundary!==undefined)return faultReplayCamera(base,clip.focus,project,snapshot.clock);
 const start=clip.frames[0].clock,t=Math.max(0,Math.min(1,(snapshot.clock-start)/.65)),ease=t*t*(3-2*t);
 const zoom=1+.38*ease,width=base.width/zoom,height=base.height/zoom;
 const neighbors=clip.frames.filter(f=>Math.abs(f.clock-snapshot.clock)<=.14);
 const points=(neighbors.length?neighbors:[snapshot]).map(f=>project(f.ball.x,f.ball.y,f.ball.z));
 const current=project(snapshot.ball.x,snapshot.ball.y,snapshot.ball.z);
 const target={x:points.reduce((v,p)=>v+p.x,0)/points.length,y:points.reduce((v,p)=>v+p.y,0)/points.length};
 let cx=(base.x+base.width/2)*(1-ease)+target.x*ease,cy=(base.y+base.height/2)*(1-ease)+target.y*ease;
 // Include both ball and surface position so high lobs do not hide their landing.
 const ground=project(snapshot.ball.x,snapshot.ball.y,0);
 if(Math.abs(ground.y-current.y)<height*.7)cy=(cy+ground.y)*.5;
 cx=Math.max(current.x-width*.36,Math.min(current.x+width*.36,cx));
 cy=Math.max(current.y-height*.36,Math.min(current.y+height*.36,cy));
 return {x:cx-width/2,y:cy-height/2,width,height};
}
