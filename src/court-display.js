export function courtSize(width,height){
 // Touch controls share the court rather than reserving side/bottom space.
 return Math.max(1,Math.floor(Math.min(width,height-46)));
}
export function courtFrame(width,height,stacked){
 if(!stacked)return {width:Math.max(1,Math.floor(width)),height:Math.max(1,Math.floor(height))};
 const size=Math.max(1,Math.floor(Math.min(width,height-46-116)));return {width:size,height:size+116};
}
export function controlLaneWidth(width){return Math.min(160,Math.max(144,width*.14))}
export async function toggleFullscreen(doc,element){
 if(doc.fullscreenElement||doc.webkitFullscreenElement){const exit=doc.exitFullscreen??doc.webkitExitFullscreen;if(exit)await exit.call(doc);return false}
 const request=element.requestFullscreen??element.webkitRequestFullscreen;
 if(!request)throw new Error('Fullscreen is unavailable');
 await request.call(element,{navigationUI:'hide'});return true;
}
export function setupCourtDisplay(){
 document.body.classList.add('court-app');
 const main=document.querySelector('main'),field=document.querySelector('.playfield'),header=document.querySelector('header'),actions=document.querySelector('.header-actions');
 document.querySelector('.game').append(document.querySelector('.controls'));
 for(const [i,button] of [...document.querySelectorAll('#shots [data-shot]')].entries()){
 button.firstChild.textContent=button.dataset.shot.toUpperCase()+' ';
 button.setAttribute('aria-keyshortcuts',String(i+1));
 }
 const hud=document.createElement('div');hud.id='court-hud';hud.setAttribute('aria-live','off');field.prepend(hud);
 const full=document.createElement('button');full.id='fullscreen-button';full.textContent='FULL SCREEN';actions.prepend(full);
 const menu=document.createElement('button');menu.id='court-menu';menu.textContent='SETTINGS';menu.setAttribute('aria-expanded','false');header.append(menu);menu.onclick=()=>{const open=main.classList.toggle('settings-open');menu.setAttribute('aria-expanded',String(open))};
 const help=document.createElement('dialog');help.id='fullscreen-help';help.innerHTML='<h2>Play without browser bars</h2><p>This browser did not allow full screen. Open this page in Chrome or Safari using the browser menu, then try Full Screen again.</p><p>You can also choose Add to Home Screen (or Install app) and launch Drives &amp; Dinks from that icon.</p><form method="dialog"><button>BACK TO GAME</button></form>';main.append(help);
 const sync=()=>{const active=!!(document.fullscreenElement||document.webkitFullscreenElement);full.textContent=active?'EXIT FULL SCREEN':'FULL SCREEN';full.setAttribute('aria-pressed',String(active))};
 full.onclick=async()=>{try{await toggleFullscreen(document,main);sync()}catch{help.showModal()}};
 document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);
 const resize=()=>{const box=field.getBoundingClientRect(),stacked=innerWidth/innerHeight<1.2;main.dataset.courtLayout=stacked?'stacked':'wide';const frame=courtFrame(box.width,box.height,stacked);field.style.setProperty('--control-lane',controlLaneWidth(box.width)+'px');field.style.setProperty('--court-size',Math.min(frame.width,frame.height)+'px');field.style.setProperty('--court-width',frame.width+'px');field.style.setProperty('--court-height',frame.height+'px')};
 new ResizeObserver(resize).observe(field);window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();sync();
 let previous='';return game=>{const key=[...game.score.points,game.mode,game.score.call,game.message].join('|');if(key===previous)return;previous=key;hud.replaceChildren();const score=document.createElement('strong');score.textContent=`YOU ${game.score.points[0]}  /  CPU ${game.score.points[1]}`;const status=document.createElement('span');status.textContent=`${game.mode.toUpperCase()} / SERVE ${game.score.call} / ${game.message}`;hud.append(score,status)};
}
