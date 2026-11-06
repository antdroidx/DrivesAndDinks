export const CHARACTER_CONCEPTS=Object.freeze([
 {id:'baseline',name:'The All-Courter',tag:'Balanced / male',height:177,build:.42,shoulder:7,waist:5.4,hip:5.5,body:'male',hair:'crop',headwear:'none',shirt:'#467e80',trim:'#e3c788',skin:'#bd8969',hairColor:'#392d29',note:'A familiar athletic silhouette with a shaped polo, textured crop and warm side lighting. The closest evolution of the current roster.'},
 {id:'stride',name:'The Long Stride',tag:'Tall & lean / female',height:190,build:.22,shoulder:6.2,waist:4.5,hip:5.8,body:'female',hair:'braid',headwear:'visor',shirt:'#916276',trim:'#f0d9b1',skin:'#8c6047',hairColor:'#262329',note:'Longer legs and a lean torso. An open visor preserves the hairline; a segmented braid moves independently behind the shoulder.'},
 {id:'anchor',name:'The Anchor',tag:'Compact & broad / male',height:166,build:.86,shoulder:8.5,waist:7.1,hip:6.8,body:'male',hair:'curls',headwear:'cap',shirt:'#bb724e',trim:'#f5dfab',skin:'#d6a27f',hairColor:'#49362b',note:'A deeper torso, thicker limbs and broad shoulders. A curved-brim cap and panel seams create depth without losing the original outline language.'},
 {id:'touch',name:'The Touch Artist',tag:'Soft & strong / female',height:169,build:.78,shoulder:7,waist:6.5,hip:7.5,body:'female',hair:'bob',headwear:'none',shirt:'#e3ddd0',trim:'#5b8292',skin:'#a77559',hairColor:'#492f2d',note:'A fuller waist and hips, with a layered bob and a pleated skort. Cool fold shadows keep the light fabric readable in both court views.'},
 {id:'reach',name:'The Net Presence',tag:'Tall & broad / male',height:195,build:.72,shoulder:8.8,waist:6.8,hip:6.5,body:'male',hair:'spiky',headwear:'visor',shirt:'#666d9c',trim:'#d9c6a0',skin:'#75503b',hairColor:'#242325',note:'A taller frame with substantial shoulders and calves. The visor sits above a visible spiked crown; a two-tone jersey separates the torso planes.'},
 {id:'spark',name:'The Quick Step',tag:'Short & athletic / female',height:158,build:.35,shoulder:6.4,waist:4.9,hip:5.9,body:'female',hair:'ponytail',headwear:'headband',shirt:'#79965c',trim:'#f3dfaf',skin:'#e3b291',hairColor:'#6b4531',note:'A compact frame with defined shoulders, a high ponytail and a wide headband. Shorter proportions stay legible during low shots and crossover steps.'}
]);
export function conceptDimensions(design,heightDelta=0,buildDelta=0){
 const height=Math.max(145,Math.min(210,design.height+Number(heightDelta||0))),build=Math.max(.05,Math.min(1.1,design.build+Number(buildDelta||0)));
 return {...design,height,build,shoulder:design.shoulder+(build-design.build)*2.5,waist:design.waist+(build-design.build)*3,hip:design.hip+(build-design.build)*2};
}
export function conceptPoint(p,design){const heightScale=design.height/177;return {x:24+(p.x-24),y:63+(p.y-63)*heightScale}}

// Clothing follows the thigh rather than a fixed rectangle over moving legs.
export function thighGarment(chain,width,extent=.52){
 const [hip,knee]=chain,dx=knee.x-hip.x,dy=knee.y-hip.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
 const start={x:hip.x-dx/length,y:hip.y-dy/length},end={x:hip.x+dx*extent,y:hip.y+dy*extent},half=width/2;
 return {end,polygon:[[start.x+nx*half,start.y+ny*half],[end.x+nx*half,end.y+ny*half],[end.x-nx*half,end.y-ny*half],[start.x-nx*half,start.y-ny*half]]};
}
export function skirtGarment(hips,legs,hipWidth,limbWidth){
 const hem=hips.y-1,ends=legs.map(chain=>thighGarment(chain,limbWidth+2).end),left=Math.min(hips.x-hipWidth-2,...ends.map(p=>p.x-(limbWidth+2)/2)),right=Math.max(hips.x+hipWidth+2,...ends.map(p=>p.x+(limbWidth+2)/2)),bottom=Math.max(hem+8,...ends.map(p=>p.y+1));
 const leftY=ends[0].y+1,rightY=ends[1].y+1;
 return {left,right,bottom,ends,polygon:[[hips.x-hipWidth,hem],[hips.x+hipWidth,hem],[right,rightY],[hips.x+(right-hips.x)*.3,bottom],[hips.x-(hips.x-left)*.3,bottom],[left,leftY]]};
}

export const OUTFIT_OPTIONS=Object.freeze([{id:'performance',name:'Performance kit'},{id:'polo',name:'Court polo'},{id:'shorts',name:'Sleeveless + Shorts'}]);
export const HEADWEAR_OPTIONS=Object.freeze([{id:'none',name:'No headwear'},{id:'cap',name:'Cap'},{id:'visor',name:'Visor'},{id:'headband',name:'Headband'}]);
export const EYEWEAR_OPTIONS=Object.freeze([{id:'none',name:'No glasses'},{id:'glasses',name:'Glasses'}]);
export const HAIR_OPTIONS=Object.freeze({
 male:Object.freeze([{id:'crop',name:'Textured crop'},{id:'curls',name:'Soft curls'},{id:'spiky',name:'Spiky hair'},{id:'sidePart',name:'Swept side part'},{id:'buzz',name:'Close buzz cut'},{id:'bald',name:'Bald'}]),
 female:Object.freeze([{id:'bob',name:'Chin-length bob'},{id:'ponytail',name:'High ponytail'},{id:'braid',name:'Long braid'},{id:'pixie',name:'Feathered pixie'},{id:'waves',name:'Layered waves'},{id:'twinTails',name:'Twin tails'}])
});
export function conceptHair(body,selected,designed){return HAIR_OPTIONS[body]?.some(item=>item.id===selected)?selected:designed}
