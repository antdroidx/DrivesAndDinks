import {drawAnimeAthlete,animePixelPalette} from './anime-character.js?v=156';
import {matchDesign} from './detailed-character.js?v=156';
import {conceptDimensions} from './character-concepts.js?v=156';
import {animationRootOffset} from './pixel-character.js?v=156';

export function animeGameLayout(options,design){
 const scale=options.height/64,cx=options.x+options.width/2,baseline=options.y+63*scale;
 const contact=options.alignTo?{x:24+(options.alignTo.x-cx)/scale-animationRootOffset(options.mode,options.phase,options.travelSide??options.side??1),y:63+(options.alignTo.y-baseline)/scale*177/design.height}:null;
 return {scale,cx,baseline,contact};
}
export function resolveAnimeGameDesign(options){
 const base=matchDesign(options.appearance??{},options.characterId??'',options.designId??'');
 const height=Number.isFinite(options.customHeight)?Math.max(145,Math.min(210,options.customHeight)):(options.appearance?.height??base.height),build=Number.isFinite(options.customBuild)?Math.max(.05,Math.min(1.1,options.customBuild)):(options.appearance?.build??base.build);
 return {...conceptDimensions(base,height-base.height,build-base.build),outfit:options.outfit??'performance',hair:options.appearance?.hairStyle??base.hair,headwear:options.appearance?.headwear??'none'};
}
export function applyAnimeLook(design,look){
 if(look!=='storybook')return design;const d={...design};
 for(const key of ['shirt','skin','hairColor','trim']){const rgb=d[key].slice(1).match(/../g).map(v=>parseInt(v,16));d[key]='#'+rgb.map((v,i)=>Math.round(v*.82+[210,187,140][i]*.18).toString(16).padStart(2,'0')).join('')}
 return d;
}
export function createAnimeGameRenderer(createCanvas=()=>document.createElement('canvas')){
 const contexts=new WeakMap(),palettes=new Map();
 return (c,options)=>{
  const {mode='idle',phase=0,view='near',appearance={},characterId='',designId='',style='anime',look='sports',outfit='performance'}=options;
  const d=applyAnimeLook(resolveAnimeGameDesign(options),look);
  const layout=animeGameLayout({...options,mode,phase},d),{scale,cx,baseline,contact}=layout;
  const root=animationRootOffset(mode,phase,options.travelSide??options.side??1),local=point=>({x:24+(point.x-cx)/scale-root,y:63+(point.y-baseline)/scale});
  const footTargets=options.feet?.map(foot=>({ankle:{...local(foot.screen),y:local(foot.screen).y-1.3},sole:foot.sole.map(local)}));
  const renderOptions={...options,footTargets,look,contact,contactWeight:options.alignStrength??0,plantWorld:{cx,baseline,scale}};
  if(style!=='anime-pixel'){drawAnimeAthlete(c,d,mode,phase,view,cx,baseline,scale,renderOptions);return true}
  let buffers=contexts.get(c);if(!buffers){buffers=new Map();contexts.set(c,buffers)}
  const key=characterId+'|'+designId+'|'+d.body;let buffer=buffers.get(key);
  if(!buffer){if(buffers.size>=16)buffers.clear();const canvas=createCanvas();canvas.width=144;canvas.height=144;buffer={canvas,context:canvas.getContext('2d',{willReadFrequently:true})};buffers.set(key,buffer)}
  const pc=buffer.context;pc.clearRect(0,0,144,144);drawAnimeAthlete(pc,d,mode,phase,view,72,126,1.5,renderOptions);
  const palette=animePixelPalette(d),paletteKey=palette.flat().join(',');let cached=palettes.get(paletteKey);
  if(!cached){if(palettes.size>=32)palettes.clear();cached=new Map();palettes.set(paletteKey,cached)}
  const data=pc.getImageData(0,0,144,144),pixels=data.data;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<160){pixels[i+3]=0;continue}pixels[i+3]=255;const rgbKey=(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];let best=cached.get(rgbKey);
   if(!best){let distance=Infinity;for(const rgb of palette){const delta=(rgb[0]-pixels[i])**2+(rgb[1]-pixels[i+1])**2+(rgb[2]-pixels[i+2])**2;if(delta<distance){best=rgb;distance=delta}}if(cached.size>4096)cached.clear();cached.set(rgbKey,best)}
   for(let j=0;j<3;j++)pixels[i+j]=best[j];
  }pc.putImageData(data,0,0);
  c.save();c.imageSmoothingEnabled=false;c.drawImage(buffer.canvas,cx-48*scale,baseline-84*scale,96*scale,96*scale);c.restore();return true;
 };
}
