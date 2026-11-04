export const COURT_VENUES=Object.freeze([
 {id:'garden',name:'Garden club',sky:'#b7d6d0',hills:'#779a84',foliage:'#466d58',accent:'#e6c1a9',court:'#658a87',kitchen:'#d7b489',outer:'#354e48',outerLight:'#4b695b',apron:'#88a18a',line:'#fff3d9',background:'#9ab9a0'},
 {id:'campus',name:'School courtyard',sky:'#b8d6e4',hills:'#83978e',foliage:'#527866',accent:'#d4b28b',court:'#6c8b9b',kitchen:'#aabcac',outer:'#465867',outerLight:'#697a85',apron:'#bcc4b5',line:'#fff6df',background:'#aebead'},
 {id:'sunset',name:'Sunset coast',sky:'#e6b8aa',hills:'#9a8e9a',foliage:'#5d7771',accent:'#efd49b',court:'#778d9b',kitchen:'#c69a84',outer:'#5c5966',outerLight:'#7a7480',apron:'#c5b2a0',line:'#fff3d9',background:'#c7b6a0'},
 {id:'mountain',name:'Mountain park',sky:'#b9cbdc',hills:'#738c99',foliage:'#496d65',accent:'#d9c9a6',court:'#7b9185',kitchen:'#c6b687',outer:'#3c5459',outerLight:'#5c7575',apron:'#9baa96',line:'#fff4da',background:'#99aea3'}
]);
export function chooseCourtVenue(previousId,random=Math.random){const choices=COURT_VENUES.filter(v=>v.id!==previousId);return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];}
function polygon(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill()}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill()}
export function drawCourtVenue(c,v,camera){
 c.save();c.fillStyle=v.background;c.fillRect(camera.x,camera.y,camera.width,camera.height);
 c.fillStyle=v.sky;c.fillRect(camera.x,camera.y,camera.width,Math.max(0,205-camera.y));
 oval(c,v.id==='sunset'?755:160,Math.max(camera.y+35,96),v.id==='sunset'?30:19,v.id==='sunset'?30:19,v.accent);
 // Painted cloud clusters and distant hills use broad quiet shapes behind play.
 for(let i=0;i<5;i++){const x=80+i*205,y=120+(i%3)*15;oval(c,x,y,42,9,'#f4ebd9');oval(c,x+19,y-4,25,12,'#f4ebd9')}
 polygon(c,[[-100,205],[10,153],[100,180],[210,132],[355,183],[500,141],[670,175],[800,133],[1100,205]],v.hills);
 if(v.id==='mountain'){
  polygon(c,[[270,182],[370,85],[480,182]],'#879aa8');polygon(c,[[330,124],[370,85],[411,124],[380,115],[363,126],[351,116]],'#e7e5da');
  polygon(c,[[570,185],[675,101],[790,185]],'#8c9fa6');
 }
 if(v.id==='sunset'){c.fillStyle='#b2b7b6';c.fillRect(-100,183,1200,24);for(let i=0;i<8;i++){c.fillStyle='#e5cdb0';c.fillRect(i*140,190+(i%2)*5,75,1)}}
 if(v.id==='campus'){
  c.fillStyle='#d4c6ac';c.fillRect(200,123,580,65);c.fillStyle='#a58e77';c.fillRect(194,119,592,7);
  for(let i=0;i<13;i++){c.fillStyle='#728e98';c.fillRect(218+i*43,133,23,17);c.fillRect(218+i*43,159,23,17)}
 }
 function tree(x,y,size){c.fillStyle='#6d6453';c.fillRect(x-3*size,y-35*size,6*size,40*size);for(const [dx,dy,rx,ry] of [[-17,-35,23,22],[15,-34,25,25],[0,-57,26,25]])oval(c,x+dx*size,y+dy*size,rx*size,ry*size,v.foliage);oval(c,x-9*size,y-54*size,21*size,17*size,v.hills)}
 for(const [x,y,size] of [[35,206,1.4],[130,200,.8],[855,204,1.05],[954,220,1.4]])tree(x,y,size);
 // Fence and seating sit beyond the court; the play surface stays unobstructed.
 c.strokeStyle='#516b6880';c.lineWidth=1;for(let x=-40;x<1040;x+=55){c.beginPath();c.moveTo(x,184);c.lineTo(x,240);c.stroke()}for(const y of [188,211,235]){c.beginPath();c.moveTo(-100,y);c.lineTo(1060,y);c.stroke()}
 for(const x of [25,868]){c.fillStyle='#785f4b';c.fillRect(x,244,65,5);c.fillRect(x,254,65,5);c.fillRect(x+6,259,4,13);c.fillRect(x+54,259,4,13)}
 c.restore();
}
