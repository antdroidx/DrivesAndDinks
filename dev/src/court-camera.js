// Virtual court coordinates stay unchanged; only the visible camera changes.
export function courtCamera(portrait=false){return portrait?{x:220,y:20,width:520,height:580}:{x:0,y:0,width:960,height:600}}
export function courtAim(clientX,rect,camera){
 const worldX=camera.x+(clientX-rect.left)/rect.width*camera.width;
 return Math.max(1,Math.min(19,(worldX-250)/460*20));
}
