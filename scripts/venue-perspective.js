// Measures the venue plates against the court's own camera and prints the
// placement that satisfies the compositing rules. The court is drawn in a fixed
// projection on a 960x600 stage, and the camera only shows virtual rows 80 to
// 600, so a plate has to cover that band and put the court baseline on open
// ground below the venue barrier.
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {SCENE_LAYOUTS,scenePlacement} from '../src/court-art.js';

const STAGE_TOP=80,STAGE_BOTTOM=600,BASELINE=204,COURT_DEPTH=374,MIN_STRIP=35;

function decodePng(buffer){
 if(buffer.readUInt32BE(0)!==0x89504e47)throw new Error('not a png');
 let offset=8,width=0,height=0,bitDepth=0,colorType=0,interlace=0;
 const idat=[];
 while(offset<buffer.length){
  const length=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8),data=buffer.subarray(offset+8,offset+8+length);
  if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12]}
  else if(type==='IDAT')idat.push(data);
  else if(type==='IEND')break;
  offset+=12+length;
 }
 if(bitDepth!==8||interlace!==0)throw new Error('unsupported png: depth '+bitDepth+' interlace '+interlace);
 const channels=colorType===2?3:colorType===6?4:colorType===0?1:0;
 if(!channels)throw new Error('unsupported color type '+colorType);
 const raw=inflateSync(Buffer.concat(idat)),stride=width*channels,pixels=Buffer.alloc(width*height*channels);
 let pos=0;
 for(let y=0;y<height;y++){
  const filter=raw[pos++],row=y*stride,prev=row-stride;
  for(let i=0;i<stride;i++){
   const value=raw[pos++],left=i>=channels?pixels[row+i-channels]:0,up=y>0?pixels[prev+i]:0,upLeft=y>0&&i>=channels?pixels[prev+i-channels]:0;
   let out;
   if(filter===0)out=value;
   else if(filter===1)out=value+left;
   else if(filter===2)out=value+up;
   else if(filter===3)out=value+((left+up)>>1);
   else if(filter===4){const p=left+up-upLeft,pa=Math.abs(p-left),pb=Math.abs(p-up),pc=Math.abs(p-upLeft);out=value+(pa<=pb&&pa<=pc?left:pb<=pc?up:upLeft)}
   else throw new Error('bad filter '+filter);
   pixels[row+i]=out&255;
  }
 }
 return {width,height,channels,pixels};
}
const luminance=(image,x,y)=>{const i=(y*image.width+x)*image.channels;return 0.299*image.pixels[i]+0.587*image.pixels[i+1]+0.114*image.pixels[i+2]};

// The backdrop is a dark wall or fence standing above a pale apron, so the
// barrier base is the strongest dark-above-light-below step down the centre of
// the plate. That step is what the court baseline has to land below.
function measureBarrier(image){
 const x0=Math.round(image.width*0.42),x1=Math.round(image.width*0.58);
 let best=-Infinity,row=0;
 for(let y=2;y<Math.round(image.height*0.55);y++){
  const steps=[];
  for(let x=x0;x<x1;x++)steps.push(luminance(image,x,y)-luminance(image,x,y-1));
  steps.sort((a,b)=>a-b);
  // The barrier runs the whole width of the plate, so the median step finds it
  // even when a planter or a bench casts a stronger local edge.
  const step=steps[steps.length>>1];
  if(step>best){best=step;row=y;}
 }
 return row/image.height;
}

// Smallest drawn height that covers the visible stage for a given `far`, plus
// the ground strip it leaves between the barrier and the court baseline.
function solve(far,barrier){
 const height=Math.max(124/far,396/(1-far),MIN_STRIP/(far-barrier),COURT_DEPTH/(1-far));
 return {height,near:far+COURT_DEPTH/height,strip:(far-barrier)*height};
}
const root=new URL('../',import.meta.url);
for(const [id,layout] of Object.entries(SCENE_LAYOUTS)){
 const image=decodePng(readFileSync(fileURLToPath(new URL('assets/venues/'+layout.file,root))));
 const barrier=measureBarrier(image);
 const placement=scenePlacement(layout);
 const strip=(layout.far-barrier)*placement.height;
 const backdrop=((BASELINE-strip)-STAGE_TOP)/placement.height;
 let best=null;
 for(let far=barrier+0.002;far<0.999;far+=0.0005){
  const candidate=solve(far,barrier);
  if(candidate.near>1)continue;
  const visible=((BASELINE-candidate.strip)-STAGE_TOP)/candidate.height;
  if(visible<=0)continue;
  if(!best||visible>best.visible)best={far,visible,...candidate};
 }
 console.log('=== '+id+' ('+layout.file+') ===');
 console.log('  measured barrier      : '+barrier.toFixed(4));
 console.log('  current far/near      : '+layout.far+' / '+layout.near);
 console.log('  current height/top    : '+placement.height.toFixed(1)+' / '+placement.y.toFixed(1)+'  (stage top '+STAGE_TOP+')');
 console.log('  current ground strip  : '+strip.toFixed(1)+' units'+(strip>=MIN_STRIP?' ok':' TOO THIN'));
 console.log('  visible backdrop band : '+(backdrop*100).toFixed(1)+'% of the plate');
 console.log('  best far/near         : '+best.far.toFixed(3)+' / '+best.near.toFixed(4)+'  height '+best.height.toFixed(1)+', strip '+best.strip.toFixed(1)+', backdrop '+(best.visible*100).toFixed(1)+'%');
}


