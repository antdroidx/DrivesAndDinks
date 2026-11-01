export const STROKE_CLIPS = Object.freeze({
 overhead:{sheet:'atlas',frames:[0,1,2,3,4,5,6,7],lift:[0,-1,-4,-9,-12,-11,-4,2],tilt:[0,-.03,-.07,-.12,-.15,-.1,.04,.11],scaleY:[1,1.01,1.04,1.07,1.09,1.05,.98,.94]},
 forehand:{sheet:'atlas',frames:[0,1,2,3,4,5,6,7],lift:[0,0,-1,-1,-2,-1,-1,0],tilt:[0,-.01,-.025,-.04,-.035,-.02,-.01,0],scaleY:[1,1.01,1.02,1.03,1.02,1.01,1,1]},
 backhand:{sheet:'atlas',frames:[0,1,2,3,4,5,6,7],lift:[0,-1,-1,0,-1,-1,0,0],tilt:[0,.015,.03,.045,.04,.025,.01,0],scaleY:[1,1,.99,1,1.01,1,.99,1]},
 atp:{sheet:'atlas',frames:[0,1,2,3,4,5,6,7],lift:[0,-1,-2,-3,-2,-1,0,0],tilt:[0,.025,.055,.08,.07,.04,.01,0],scaleY:[1,1.01,1.03,1.04,1.03,1.02,1,1]},
 erne:{sheet:'atlas',frames:[0,1,2,3,4,5,6,7],lift:[0,-2,-5,-8,-7,-4,-1,0],tilt:[0,-.03,-.06,-.1,-.08,-.05,-.02,0],scaleY:[1,1.02,1.04,1.07,1.05,1.03,1.01,1]}
,
 serve:{sheet:'atlas',frames:[0,1,2,3,4,5,6,7],lift:[0,-1,-3,-7,-6,-2,2,0],tilt:[0,-.02,-.04,-.09,-.07,-.02,.05,0],scaleY:[1,1.01,1.03,1.06,1.05,1.02,.98,1]}
});

function clipFor(player){
 const shot=player.animationShot;
 if(shot==='overhead')return ['overhead',STROKE_CLIPS.overhead];
 if(shot==='serve')return ['serve',STROKE_CLIPS.serve];
 if(shot==='erne')return ['erne',STROKE_CLIPS.erne];
 if(shot==='atp')return ['atp',STROKE_CLIPS.atp];
 if(player.stroke==='backhand')return ['backhand',STROKE_CLIPS.backhand];
 return ['forehand',STROKE_CLIPS.forehand];
}

export function sampleStrokeAnimation(player,progress=0){
 const [kind,clip]=clipFor(player),phase=Math.max(0,Math.min(1,Number(progress)||0));
 const position=phase*(clip.frames.length-1),index=Math.floor(position),next=Math.min(clip.frames.length-1,index+1),blend=position-index;
 const lerp=(a,b)=>a+(b-a)*blend,contactRight=(player.swingSide??1)>=0,twoHanded=kind==='backhand'&&(player.gender==='female'||player.appearance?.body==='female');
 const mirror=kind==='forehand'?contactRight:kind==='backhand'? !contactRight:kind==='atp'?!contactRight:false;
 return {
  kind,
  frameColumn:clip.frames[Math.round(position)],
  useSwingSheet:false,
  artRowOffset:0,
  offsetY:lerp(clip.lift[index],clip.lift[next]),
  rotation:lerp(clip.tilt[index],clip.tilt[next]),
  scaleY:lerp(clip.scaleY[index],clip.scaleY[next]),
  mirror,
  twoHanded,
  supportHandX:0,
  supportHandY:0
 };
}
