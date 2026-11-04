// The source artwork contains neutral, unmarked ground with no court patch. Baselines are aligned to the
// engine projection; all rules, line positions and collision geometry stay live.
export const SCENE_LAYOUTS=Object.freeze({
 outdoor:{file:'outdoor-v2.png',far:.42,near:.97,edge:'#b9a58b'},
 indoor:{file:'indoor-v2.png',far:.47,near:.97,edge:'#a79987'},
 stadium:{file:'stadium-v2.png',far:.44,near:.97,edge:'#9ba38d'}
});
export function scenePlacement(layout){const height=374/(layout.near-layout.far);return {x:0,y:204-layout.far*height,width:960,height};}
export function retroCourtPalette(palette){return {...palette,court:'#376e8c',kitchen:'#b97855',line:'#fff1bd'};}
export function createCourtSurfaceRenderer(project,createCanvas=()=>document.createElement('canvas')){
 let previous='',surface;
 return (c,palette,style='painted')=>{
  const key=JSON.stringify([palette.court,palette.kitchen,palette.line,style]);
  if(key!==previous){
   surface??=createCanvas();surface.width=style==='retro'?320:960;surface.height=style==='retro'?200:600;
   const paint=surface.getContext('2d'),scale=surface.width/960,position=(x,y)=>{const p=project(x,y);return style==='retro'?{x:Math.round(p.x/3)*3+1.5,y:Math.round(p.y/3)*3+1.5}:p};paint.setTransform(scale,0,0,scale,0,0);
   const poly=(points,fill,stroke)=>{paint.beginPath();points.forEach(([x,y],i)=>{const p=position(x,y);i?paint.lineTo(p.x,p.y):paint.moveTo(p.x,p.y)});paint.closePath();if(fill){paint.fillStyle=fill;paint.fill()}if(stroke){paint.strokeStyle=stroke;paint.lineWidth=3;paint.stroke()}};
   poly([[0,0],[20,0],[20,44],[0,44]],palette.court);
   poly([[0,15],[20,15],[20,29],[0,29]],palette.kitchen);
   paint.save();poly([[0,0],[20,0],[20,44],[0,44]]);paint.clip();
   for(let i=0;i<450;i++){const p=project((i*137%1000)/50,(i*269%1000)/1000*44);paint.fillStyle=i%2?'#fff3db09':'#182e3709';paint.fillRect(Math.floor(p.x/3)*3,Math.floor(p.y/3)*3,style==='retro'?3:1.5,style==='retro'?3:1)}paint.restore();
   poly([[0,0],[20,0],[20,44],[0,44]],null,palette.line);
   for(const [a,b] of [[[0,15],[20,15]],[[0,29],[20,29]],[[10,0],[10,15]],[[10,29],[10,44]]]){const p=position(...a),q=position(...b);paint.beginPath();paint.moveTo(p.x,p.y);paint.lineTo(q.x,q.y);paint.strokeStyle=palette.line;paint.lineWidth=style==='retro'?3:2;paint.stroke()}
   previous=key;
  }
  c.save();c.imageSmoothingEnabled=style!=='retro';c.drawImage(surface,0,0,960,600);c.restore();
 };
}
export function createCourtArtRenderer(createImage=()=>new Image(),createCanvas=()=>document.createElement('canvas')){
 const scenes=new Map();
 function getScene(id){
  if(scenes.has(id))return scenes.get(id);const layout=SCENE_LAYOUTS[id];if(!layout)return null;
  const image=createImage(),record={image,layout,ready:false,pixel:null};scenes.set(id,record);
  image.onload=()=>{record.ready=true;const canvas=createCanvas();canvas.width=320;canvas.height=200;const pc=canvas.getContext('2d',{willReadFrequently:true});pc.drawImage(image,0,0,320,200);const data=pc.getImageData(0,0,320,200);for(let i=0;i<data.data.length;i+=4)for(let j=0;j<3;j++)data.data[i+j]=Math.round(data.data[i+j]/24)*24;pc.putImageData(data,0,0);record.pixel=canvas};
  image.src=new URL('../assets/venues/'+layout.file,import.meta.url).href;return record;
 }
 return (c,venue,camera,style='painted')=>{
  const scene=getScene(venue.id);if(!scene?.ready)return false;
  const {layout}=scene,placement=scenePlacement(layout);c.save();c.fillStyle=layout.edge;c.fillRect(camera.x,camera.y,camera.width,camera.height);
  // Extend the painted edges into unusually tall/wide viewports without scaling
  // the court independently or putting a new horizon through the playing area.
  c.imageSmoothingEnabled=style!=='retro';const source=style==='retro'&&scene.pixel?scene.pixel:scene.image;
  if(camera.y<placement.y)c.drawImage(source,0,0,source.width,1,camera.x,camera.y,camera.width,placement.y-camera.y);
  if(camera.x<0)c.drawImage(source,0,0,1,source.height,camera.x,placement.y,-camera.x,placement.height);
  if(camera.x+camera.width>960)c.drawImage(source,source.width-1,0,1,source.height,960,placement.y,camera.x+camera.width-960,placement.height);
  c.drawImage(source,placement.x,placement.y,placement.width,placement.height);c.restore();return true;
 };
}
