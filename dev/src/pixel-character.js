import {CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS} from './roster.js?v=37';

const readyListeners=[];

export function onCharacterSpritesReady(callback){if(characterSpritesReady()){if(typeof callback==='function')callback();return true}if(typeof callback==='function')readyListeners.push(callback);return false}
export function characterSpritesReady(){return true}
for(const callback of []) callback();

const resolve=(items,id,fallback)=>items.find(item=>item.id===id)??items.find(item=>item.id===fallback)??items[0];
const hexRgb=hex=>{const value=hex.replace('#','');return [0,2,4].map(index=>parseInt(value.slice(index,index+2),16))};
const rgbHex=rgb=>`#${rgb.map(value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,'0')).join('')}`;
function mix(hex,target,amount){const source=hexRgb(hex);return rgbHex(source.map((value,index)=>value+(target[index]-value)*amount))}
export function appearancePalette(appearance={}){
 const shirt=resolve(CLOTHING_COLORS,appearance.shirtColor,'green'),paddleItem=resolve(PADDLE_COLORS,appearance.paddleColor,'mint'),hair=resolve(HAIR_COLORS,appearance.hairColor,'brown'),skin=resolve(SKIN_COLORS,appearance.skinColor,'medium');
 const shirtColor=shirt.color,paddleColor=paddleItem.edgeColor??paddleItem.color,paddleInterior=paddleItem.interiorColor??mix(paddleColor,[16,24,43],.8);
 return {outline:'#11172c',shirt:shirtColor,shirtDark:mix(shirtColor,[15,20,40],.4),shirtLight:mix(shirtColor,[255,248,222],.3),bottom:mix(shirtColor,[12,17,35],.55),bottomDark:mix(mix(shirtColor,[12,17,35],.55),[12,17,35],.42),paddle:paddleColor,paddleInterior,paddleDark:mix(paddleColor,[16,24,43],.38),paddleLight:mix(paddleColor,[255,248,221],.24),hair:hair.color,skin:skin.color};
}

const FRAME_ORDER={
 idle:[[0,0]],ready:[[0,0]],run:[[0,0],[0,1],[0,2],[0,3]],
 shuffle:[[1,0],[1,1],[1,2],[1,3]],slide:[[1,0],[1,1],[1,2],[1,3]],
 volley:[[2,0],[2,1],[2,2],[2,3]],
 forehand:[[3,0],[3,1],[3,2],[3,3]],
 backhand:[[4,0],[4,1],[4,2],[4,3]],
 forehandDink:[[5,0],[5,1],[5,2],[5,3]],
 backhandDink:[[6,0],[6,1],[6,2],[6,3]],
 forehandDrop:[[7,0],[7,1],[7,2],[7,3]],
 backhandDrop:[[8,0],[8,1],[8,2],[8,3]],
 overhead:[[9,0],[9,1],[9,2],[9,3]],
 lob:[[10,0],[10,1],[10,2],[10,3]],
 serve:[[10,0],[10,1],[10,2],[10,3]],
 twoBackhand:[[11,0],[11,1],[11,2],[11,3]]
}
export function characterFrame(mode='idle',phase=0,frame=0){
 const sequence=FRAME_ORDER[mode]??FRAME_ORDER.idle;
 const cyclical=[FRAME_ORDER.run,FRAME_ORDER.shuffle,FRAME_ORDER.slide].includes(sequence),index=cyclical?Math.abs(Math.floor(frame))%sequence.length:Math.max(0,Math.min(sequence.length-1,Math.floor(Math.max(0,Math.min(.999,phase))*sequence.length)));
 return {row:sequence[index][0],col:sequence[index][1]};
}
export function characterPaddleAnchor({appearance={},view='near',row=0,col=0}={}){
 // The drawn paddle is now attached to the sprite, so we let it align naturally.
 return null;
}

function pixelBlock(target,x,y,w,h,color){target.fillStyle=color;target.fillRect(x,y,w,h)}

function motionPose(mode,phase=0,frame=0){
 const moving=['run','shuffle','slide'].includes(mode);
 const action=['volley','forehand','backhand','forehandDink','backhandDink','forehandDrop','backhandDrop','overhead','lob','serve','twoBackhand'].includes(mode);
 const sway=moving?Math.sin(frame*Math.PI):0;
 if(action){
  const lift=['overhead','lob','serve'].includes(mode)?-3:-1;
  return {dx:0,dy:lift*Math.sin(phase*Math.PI)};
 }
 return {dx:sway*2,dy:Math.abs(sway),paddleShift:0};
}

function paddlePose(mode,phase=0){
 if(['overhead','lob','serve'].includes(mode)){
  return {x:7,y:0,w:4,h:4,interior:{x:8,y:1,w:2,h:2}};
 }
 if(['volley'].includes(mode)) return {x:8,y:1,w:4,h:4,interior:{x:9,y:2,w:2,h:2}};
 if(['forehand','forehandDink','forehandDrop'].includes(mode)) return {x:10,y:2,w:5,h:4,interior:{x:11,y:3,w:3,h:2}};
 if(['backhand','backhandDink','backhandDrop'].includes(mode)) return {x:9,y:2,w:5,h:4,interior:{x:10,y:3,w:3,h:2}};
 return {x:9,y:2,w:4,h:4,interior:{x:10,y:3,w:2,h:2}};
}

export function drawPixelCharacter(target,{appearance={},mode='idle',frame=0,phase=0,x=0,y=0,width=100,height=100,view='near'}={}){
 const colors=appearancePalette(appearance);
 target.save();
 target.imageSmoothingEnabled=false;
 target.translate(Math.round(x),Math.round(y));
 target.scale(width/16,height/16);
 target.globalCompositeOperation='source-over';
 target.lineWidth=1;
 // silhouette
 pixelBlock(target,4,0,9,17,colors.outline);
 // head/hair
 pixelBlock(target,5,1,7,3,colors.hair);
 pixelBlock(target,5,2,7,2,colors.skin);
 // torso
 pixelBlock(target,5,4,7,6,colors.shirt);
 // bottom
 pixelBlock(target,5,10,7,2,colors.bottom);
 pixelBlock(target,5,12,3,3,colors.bottom);
 pixelBlock(target,9,12,3,3,colors.bottom);
 // arms
 pixelBlock(target,3,4,2,5,colors.shirt);
 pixelBlock(target,10,4,2,5,colors.shirt);
 // paddle
 const paddle=paddlePose(mode,phase);
 pixelBlock(target,paddle.x+1,paddle.y,paddle.w-2,paddle.h,colors.paddle);
 pixelBlock(target,paddle.x+2,paddle.y+1,2,2,colors.paddleInterior);
 target.restore();
 return true;
}
