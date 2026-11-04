// Virtual court coordinates stay unchanged; only the visible camera changes.
export function courtCamera(){return {x:220,y:80,width:520,height:520}}
export function courtAim(clientX,rect,camera){
 const worldX=camera.x+(clientX-rect.left)/rect.width*camera.width;
 return Math.max(1,Math.min(19,(worldX-250)/460*20));
}
