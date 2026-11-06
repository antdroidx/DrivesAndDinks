import {C} from './core.js?v=169';

// Virtual court coordinates stay unchanged; only the visible camera changes.
// The game camera is a single perspective: the same depth term drives ground
// compression, court width and upright height.
const GAME_FAR_Y=204,GAME_NEAR_Y=578,GAME_CAMERA_DISTANCE=95,GAME_FOCAL=1250;
const rawDepth=y=>1/(GAME_CAMERA_DISTANCE-y);
const yScale=(GAME_NEAR_Y-GAME_FAR_Y)/(rawDepth(C.length)-rawDepth(0));
const yOrigin=GAME_FAR_Y-yScale*rawDepth(0);
let sideSwitched=false;

export function setCourtSideSwitched(value){sideSwitched=Boolean(value);return sideSwitched}
const visibleX=x=>sideSwitched?C.width-x:x,visibleY=y=>sideSwitched?C.length-y:y;

export function gameProjection(x,y,z=0){
 const vx=visibleX(x),vy=visibleY(y),depth=GAME_CAMERA_DISTANCE-vy,perspective=GAME_FOCAL/depth;
 return {x:480+(vx-C.width/2)*perspective,y:yOrigin+yScale*rawDepth(vy)-z*perspective};
}
export function gameLift(y){return GAME_FOCAL/(GAME_CAMERA_DISTANCE-visibleY(y))}
export function gameGroundSpan(y){const a=gameProjection(0,y),b=gameProjection(0,y+1);return Math.hypot(b.x-a.x,b.y-a.y)}

export function courtCamera(aspect=1){
 const ratio=typeof aspect==='number'&&Number.isFinite(aspect)&&aspect>0?aspect:1;
 const width=520*Math.max(1,ratio),height=width/ratio;
 return {x:480-width/2,y:600-height,width,height};
}
export function courtAim(clientX,rect,camera){
 const worldX=camera.x+(clientX-rect.left)/rect.width*camera.width;
 const aim=Math.max(1,Math.min(19,(worldX-250)/460*C.width));
 return sideSwitched?C.width-aim:aim;
}
export function padControl(clientX,clientY,rect){
 const x=Math.max(0,Math.min(1,(clientX-rect.left)/Math.max(1,rect.width)));
 const depth=1-Math.max(0,Math.min(1,(clientY-rect.top)/Math.max(1,rect.height)));
 const aim=1+x*18;
 return {aim:sideSwitched?C.width-aim:aim,depth};
}
