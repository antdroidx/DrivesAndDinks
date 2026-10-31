export const STROKE_CLIPS = Object.freeze({
 overhead:{sheet:'vertical',frames:[0,1,2,2,3],lift:[0,-2,-7,-8,-3],tilt:[0,-.025,-.075,-.06,-.015],scaleY:[1,1.02,1.05,1.04,1]},
 forehand:{sheet:'body',frames:[0,1,2,3],lift:[0,0,-1,-1,0],tilt:[0,-.015,-.035,-.02,0],scaleY:[1,1,1.01,1,1]},
 backhand:{sheet:'body',frames:[0,3,2,1],lift:[0,-1,0,-1,0],tilt:[0,.02,.04,.025,0],scaleY:[1,.99,1,.99,1],supportHandX:[1,13,14,-10,-2],supportHandY:[-38,-39,-40,-41,-39]},
 atp:{sheet:'body',frames:[0,3,2,3,1],lift:[0,-1,-2,-1,0],tilt:[0,.04,.08,.05,0],scaleY:[1,1,1.03,1.02,1]},
 erne:{sheet:'vertical',frames:[0,1,1,2,3],lift:[0,-3,-8,-7,-2],tilt:[0,-.04,-.09,-.06,-.02],scaleY:[1,1.03,1.06,1.04,1]}
});

function clipFor(player){
 const shot=player.animationShot;
 if(shot==='overhead')return ['overhead',STROKE_CLIPS.overhead];
 if(shot==='erne')return ['erne',STROKE_CLIPS.erne];
 if(shot==='atp')return ['atp',STROKE_CLIPS.atp];
 if(player.stroke==='backhand')return ['backhand',STROKE_CLIPS.backhand];
 return ['forehand',STROKE_CLIPS.forehand];
}

export function sampleStrokeAnimation(player,progress=0){
 const [kind,clip]=clipFor(player),phase=Math.max(0,Math.min(1,Number(progress)||0));
 const index=Math.min(clip.frames.length-1,Math.floor(phase*clip.frames.length));
 const contactRight=(player.swingSide??1)>=0,twoHanded=kind==='backhand'&&(player.gender==='female'||player.appearance?.body==='female');
 const mirror=kind==='forehand'?contactRight:kind==='backhand'? !contactRight:kind==='atp'?!contactRight:false;
 return {
  kind,
  frameColumn:clip.frames[index],
  useSwingSheet:clip.sheet==='vertical',
  artRowOffset:clip.sheet==='vertical'?0:2,
  offsetY:clip.lift[index],
  rotation:clip.tilt[index],
  scaleY:clip.scaleY[index],
  mirror,
  twoHanded,
  supportHandX:twoHanded?clip.supportHandX[index]:0,
  supportHandY:twoHanded?clip.supportHandY[index]:0
 };
}
