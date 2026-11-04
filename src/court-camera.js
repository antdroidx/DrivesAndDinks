// Virtual court coordinates stay unchanged; only the visible camera changes.
export function courtCamera(aspect=1){const width=520*(typeof aspect==='number'&&Number.isFinite(aspect)&&aspect>0?aspect:1);return {x:480-width/2,y:80,width,height:520}}
export function courtAim(clientX,rect,camera){
 const worldX=camera.x+(clientX-rect.left)/rect.width*camera.width;
 return Math.max(1,Math.min(19,(worldX-250)/460*20));
}
