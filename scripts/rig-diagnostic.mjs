// Reports reach and continuity problems for authored character motions.
// Usage: node scripts/rig-diagnostic.mjs [mode,mode,...]
import {sampleCharacterPose,ARM_LENGTHS} from '../src/pixel-character.js';

const modes=process.argv[2]?process.argv[2].split(','):['idle'];
const limit=ARM_LENGTHS[0]+ARM_LENGTHS[1]-.01;

for(const mode of modes){
 let worst={d:0};
 for(const view of ['near','far'])for(const side of [-1,1]){
  let previous;
  for(let i=0;i<=1000;i++){
   const pose=sampleCharacterPose({mode,view,side,phase:i/1000,frame:i/250});
   if(previous)for(let arm=0;arm<2;arm++)for(let joint=0;joint<3;joint++){
    const a=pose.arms[arm][joint],b=previous.arms[arm][joint];
    const d=Math.hypot(a.x-b.x,a.y-b.y);
    if(d>worst.d)worst={d,view,side,at:i/1000,arm,joint};
   }
   previous=pose;
  }
 }
 let maxReach=0,limited=[];
 for(const view of ['near','far'])for(const side of [-1,1])for(let i=0;i<=200;i++){
  const pose=sampleCharacterPose({mode,view,side,phase:i/200,frame:i/50});
  if(pose.reachLimited)limited.push(view+'/'+side+'@'+(i/200).toFixed(3));
  const chain=pose.arms3[pose.gripSide],shoulder=chain[0],hand=chain[2];
  maxReach=Math.max(maxReach,Math.hypot(hand.x-shoulder.x,hand.y-shoulder.y,hand.z-shoulder.z));
 }
 console.log(mode.padEnd(14),'joint jump',worst.d.toFixed(3).padStart(6),'at phase',String(worst.at).padEnd(6),'| max hand reach',maxReach.toFixed(2),'of',limit.toFixed(2),'| overreach:',limited.length?limited.join(','):'none');
}
