import {CLOTHING_COLORS,PADDLE_COLORS} from './roster.js?v=28';

const SHEET_PATHS={
 female:{near:'../assets/player-human-female-near-v1.png',far:'../assets/player-human-female-far-v1.png'},
 male:{near:'../assets/player-human-male-near-v1.png',far:'../assets/player-human-male-far-v1.png'}
};
const sheets=typeof Image==='undefined'?{}:Object.fromEntries(Object.entries(SHEET_PATHS).map(([body,views])=>[body,Object.fromEntries(Object.entries(views).map(([view,path])=>{const image=new Image();image.src=path;return [view,image]}))]));
const allSheets=()=>Object.values(sheets).flatMap(views=>Object.values(views));
const recoloredSheets=new Map();
const readyListeners=[];

export function onCharacterSpritesReady(callback){if(characterSpritesReady()){if(typeof callback==='function')callback();return true}if(typeof callback==='function')readyListeners.push(callback);return false}
export function characterSpritesReady(){return allSheets().every(sheet=>sheet.complete&&sheet.naturalWidth>1)}
for(const sheet of allSheets())sheet.addEventListener('load',()=>{if(characterSpritesReady())for(const callback of readyListeners.splice(0))callback()},{once:true});

const resolve=(items,id,fallback)=>items.find(item=>item.id===id)??items.find(item=>item.id===fallback)??items[0];
const hexRgb=hex=>{const value=hex.replace('#','');return [0,2,4].map(index=>parseInt(value.slice(index,index+2),16))};
const rgbHex=rgb=>`#${rgb.map(value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,'0')).join('')}`;
function mix(hex,target,amount){const source=hexRgb(hex);return rgbHex(source.map((value,index)=>value+(target[index]-value)*amount))}
export function appearancePalette(appearance={}){
 const shirt=resolve(CLOTHING_COLORS,appearance.shirtColor,'green').color,paddle=resolve(PADDLE_COLORS,appearance.paddleColor,'mint').color,bottom=mix(shirt,[12,17,35],.55);
 return {outline:'#11172c',shirt,shirtDark:mix(shirt,[15,20,40],.4),shirtLight:mix(shirt,[255,248,222],.3),bottom,bottomDark:mix(bottom,[12,17,35],.42),paddle,paddleDark:mix(paddle,[16,24,43],.38),paddleLight:mix(paddle,[255,248,221],.24)};
}

// The sheet is authored for a vertical court. Near-court players are seen from
// behind while far-court players face the camera, so never mirror by side.
const FRAME_ORDER={
 idle:[[0,0]],ready:[[0,0]],run:[[0,0],[0,1]],
 forehand:[[0,0],[0,0],[0,2],[0,2],[0,3],[0,3],[1,3],[0,0]],
 backhand:[[0,0],[0,0],[0,2],[0,2],[1,0],[1,0],[1,3],[0,0]],
 overhead:[[0,0],[0,0],[1,1],[1,1],[1,2],[1,2],[1,3],[0,0]],
 erne:[[0,0],[0,0],[1,1],[1,1],[1,2],[1,2],[1,3],[0,0]],
 atp:[[0,0],[0,0],[1,0],[1,0],[1,2],[1,2],[1,3],[0,0]],
 serve:[[0,0],[0,0],[1,1],[1,1],[1,2],[1,2],[1,3],[0,0]]
};
function rgbToHsl(r,g,b){
 r/=255;g/=255;b/=255;
 const max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/2;
 if(max===min)return {h:0,s:0,l:light};
 const d=max-min,s=light>.5?d/(2-max-min):d/(max+min);
 let h;
 if(max===r)h=(g-b)/d+(g<b?6:0);
 else if(max===g)h=(b-r)/d+2;
 else h=(r-g)/d+4;
 return {h:h/6,s,l:light};
}
function hslToRgb({h,s,l}){
 if(s===0){const value=Math.round(l*255);return [value,value,value]}
 const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
 const channel=t=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};
 return [channel(h+1/3),channel(h),channel(h-1/3)].map(value=>Math.round(value*255));
}
function recolorPixel(data,index,target,baseLight){
 const source=rgbToHsl(data[index],data[index+1],data[index+2]);
 const lightness=Math.max(.04,Math.min(.95,target.l+(source.l-baseLight)*.55));
 const [r,g,b]=hslToRgb({h:target.h,s:Math.max(.08,Math.min(1,target.s*.82+source.s*.18)),l:lightness});
 data[index]=r;data[index+1]=g;data[index+2]=b;
}
function preparedSheet(body,view,appearance){
 const source=sheets[body]?.[view];if(!source?.complete||!source.naturalWidth||typeof document==='undefined')return null;
 const shirt=resolve(CLOTHING_COLORS,appearance.shirtColor,'green').color;
 const paddle=resolve(PADDLE_COLORS,appearance.paddleColor,'mint').color;
 const key=[body,view,shirt,paddle].join('|');
 const cached=recoloredSheets.get(key);if(cached)return cached;
 const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
 const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
 const image=context.getImageData(0,0,canvas.width,canvas.height),data=image.data;
 const shirtHsl=rgbToHsl(...hexRgb(shirt)),bottomHsl={...shirtHsl,l:Math.max(.08,shirtHsl.l*.43)},paddleHsl=rgbToHsl(...hexRgb(paddle));
 for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2],alpha=data[i+3];if(alpha<48)continue;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),spread=max-min;
  const jersey=body==='female'?(r>125&&g<125&&b>g*.72&&r>g*1.35&&r>b*1.08):(g>70&&g>r*1.12&&b>r*.94);
  const shorts=body==='male'&&b>r*1.12&&g>r*1.08&&b>55;
  const paddleFace=max>=18&&max<115&&spread<36&&b>=r-8;
  if(jersey)recolorPixel(data,i,shirtHsl,body==='female'?.46:.4);
  else if(shorts)recolorPixel(data,i,bottomHsl,.23);
  else if(paddleFace)recolorPixel(data,i,paddleHsl,.2);
 }
 context.putImageData(image,0,0);
 recoloredSheets.set(key,canvas);
 if(recoloredSheets.size>24)recoloredSheets.delete(recoloredSheets.keys().next().value);
 return canvas;
}
export function characterFrame(mode='idle',phase=0,frame=0){
 const sequence=FRAME_ORDER[mode]??FRAME_ORDER.idle;
 const index=sequence===FRAME_ORDER.run?Math.abs(Math.floor(frame))%sequence.length:Math.max(0,Math.min(sequence.length-1,Math.floor(Math.max(0,Math.min(.999,phase))*sequence.length)));
 return {row:sequence[index][0],col:sequence[index][1]};
}
export function drawPixelCharacter(target,{appearance={},mode='idle',frame=0,phase=0,x=0,y=0,width=100,height=100,view='near'}={}){
 const body=appearance.body==='female'?'female':'male';
 const sheet=preparedSheet(body,view==='far'?'far':'near',appearance);
 if(!sheet)return false;
 const {row,col}=characterFrame(mode,phase,frame),sheetWidth=sheet.naturalWidth||sheet.width,sheetHeight=sheet.naturalHeight||sheet.height,cellWidth=sheetWidth/4,cellHeight=sheetHeight/2;
 const idleBob=mode==='idle'&&Math.floor(frame)%4>1?Math.max(1,height*.012):0;
 target.save();target.imageSmoothingEnabled=true;target.drawImage(sheet,col*cellWidth,row*cellHeight,cellWidth,cellHeight,x,y+idleBob,width,height);target.restore();return true;
}
