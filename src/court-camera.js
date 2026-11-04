// Virtual court coordinates stay unchanged; only the visible camera changes.
export function courtCamera(aspect=1){const ratio=typeof aspect==='number'&&Number.isFinite(aspect)&&aspect>0?aspect:1,width=520*Math.max(1,ratio),height=width/ratio;return {x:480-width/2,y:600-height,width,height}}
export function courtAim(clientX,rect,camera){
 const worldX=camera.x+(clientX-rect.left)/rect.width*camera.width;
 return Math.max(1,Math.min(19,(worldX-250)/460*20));
}
