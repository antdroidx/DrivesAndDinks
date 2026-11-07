export const COURT_VENUES=Object.freeze([
 {id:'outdoor',name:'Outdoor pickleball park',sky:'#b7d6d0',hills:'#779a84',foliage:'#466d58',accent:'#e6c1a9',court:'#658a87',kitchen:'#d7b489',outer:'#354e48',outerLight:'#4b695b',apron:'#88a18a',line:'#fff3d9',background:'#9ab9a0'},
 {id:'indoor',name:'Indoor pickleball hall',sky:'#b8d6e4',hills:'#83978e',foliage:'#527866',accent:'#d4b28b',court:'#6c8b9b',kitchen:'#aabcac',outer:'#465867',outerLight:'#697a85',apron:'#bcc4b5',line:'#fff6df',background:'#aebead'},
 {id:'stadium',name:'Crowded championship stadium',sky:'#b7d5de',hills:'#718c81',foliage:'#4c7562',accent:'#e4c2a0',court:'#557f89',kitchen:'#b2bba0',outer:'#3c5459',outerLight:'#5c7575',apron:'#9baa96',line:'#fff4da',background:'#99aea3'},
 {id:'indoor-stadium',name:'Indoor championship stadium',sky:'#26323b',hills:'#3d4b55',foliage:'#25434b',accent:'#d8c58f',court:'#587481',kitchen:'#9aa88f',outer:'#26343c',outerLight:'#42535a',apron:'#748087',line:'#f3ecd7',background:'#6d7b82'}
]);
export function chooseCourtVenue(previousId,random=Math.random){const choices=COURT_VENUES.filter(v=>v.id!==previousId);return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];}
// Flat, quiet surround used both intentionally and while illustrations load.
export function courtBackdropColor(palette){
 const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
 const a=rgb(palette.court),b=rgb(palette.kitchen);
 return '#'+a.map((v,i)=>Math.round((v*.7+b[i]*.3)*.42).toString(16).padStart(2,'0')).join('');
}
export function drawCourtBackdrop(c,palette,camera){
 c.save();c.fillStyle=courtBackdropColor(palette);c.fillRect(camera.x,camera.y,camera.width,camera.height);c.restore();
}
