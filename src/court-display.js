export const COURT_HUD_HEIGHT=54;
export function courtFrame(width,height){
 // Width belongs to the available screen; the camera fits below the fixed score strip.
 return {width:Math.max(1,Math.floor(width)),height:Math.max(1,Math.floor(height-COURT_HUD_HEIGHT-4))};
}
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
 let keyboardControls=matchMedia('(pointer:fine)').matches;
 const syncShortcuts=()=>{for(const [i,button] of [...document.querySelectorAll('#shots [data-shot]')].entries()){
 button.firstChild.textContent=(keyboardControls?String(i+1)+' ':'')+button.dataset.shot.toUpperCase()+' ';
 button.setAttribute('aria-keyshortcuts',String(i+1));
 }};syncShortcuts();
 window.addEventListener('keydown',()=>{if(!keyboardControls){keyboardControls=true;syncShortcuts()}},{once:true});
 const hud=document.createElement('div');hud.id='court-hud';hud.setAttribute('aria-live','off');field.prepend(hud);
 const full=document.createElement('button');full.id='fullscreen-button';full.textContent='FULL SCREEN';actions.prepend(full);
 const menu=document.createElement('button');menu.id='court-menu';menu.textContent='SETTINGS';menu.setAttribute('aria-expanded','false');header.append(menu);menu.onclick=()=>{const open=main.classList.toggle('settings-open');menu.setAttribute('aria-expanded',String(open))};
 const help=document.createElement('dialog');help.id='fullscreen-help';help.innerHTML='<h2>Play without browser bars</h2><p>This browser did not allow full screen. Open this page in Chrome or Safari using the browser menu, then try Full Screen again.</p><p>You can also choose Add to Home Screen (or Install app) and launch Drives &amp; Dinks from that icon.</p><form method="dialog"><button>BACK TO GAME</button></form>';main.append(help);
 const sync=()=>{const active=!!(document.fullscreenElement||document.webkitFullscreenElement);full.textContent=active?'EXIT FULL SCREEN':'FULL SCREEN';full.setAttribute('aria-pressed',String(active))};
 full.onclick=async()=>{try{await toggleFullscreen(document,main);sync()}catch{help.showModal()}};
 document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);
 const resize=()=>{const box=field.getBoundingClientRect(),stacked=innerWidth/innerHeight<1.2;main.dataset.courtLayout=stacked?'stacked':'wide';const frame=courtFrame(box.width,box.height);field.style.setProperty('--court-hud-height',COURT_HUD_HEIGHT+'px');field.style.setProperty('--court-size',frame.width+'px');field.style.setProperty('--court-width',frame.width+'px');field.style.setProperty('--court-height',frame.height+'px')};
 new ResizeObserver(resize).observe(field);window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();sync();
 let previous='';const shortName=name=>String(name||'').split(/\s+/)[0];const teamBlock=(label,names,className,serving=false)=>{const block=document.createElement('div');block.className='score-team '+className;const tag=document.createElement('small'),name=document.createElement('strong');tag.textContent=label;name.textContent=names;block.append(tag,name);if(serving){const serve=document.createElement('i');serve.className='serve-ball';serve.setAttribute('role','img');serve.setAttribute('aria-label','Serving');serve.title='Serving';block.append(serve)}return block};return game=>{const practice=game.practice;const message=game.feedbackTime>0&&game.humanFeedback?game.humanFeedback:game.message;const conditions=game.conditions?.label??(game.surfaceKind==='indoor'?'INDOOR · CALM':'');const players=game.players??[];const home=players.filter(player=>player.team===0),away=players.filter(player=>player.team===1);const homeNames=practice?'PRACTICE':[String(home[0]?.name||'YOU'),...home.slice(1).map(player=>shortName(player.name))].join(' / ');const awayNames=practice?'TARGETS':away.map(player=>shortName(player.name)).join(' / ');const servingTeam=practice?null:game.score?.team;const key=[...game.score.points,game.score?.team,game.mode,game.format,game.score.call,message,conditions,homeNames,awayNames,practice?.results.length,practice?.successes].join('|');if(key===previous)return;previous=key;hud.replaceChildren();const core=document.createElement('div');core.className='score-core';const score=document.createElement('strong'),status=document.createElement('small');if(practice){score.textContent=practice.successes+' / '+practice.results.length;status.textContent='BALL '+Math.min(practice.total,practice.results.length+1)+' / '+practice.total}else{score.textContent=game.score.points[0]+' – '+game.score.points[1];status.textContent='SERVE '+game.score.call}core.append(score,status);const meta=document.createElement('div');meta.className='score-meta';meta.textContent=practice?(practice.state==='feed'?practice.drill.instruction:game.message):message+(conditions?' · '+conditions:'');hud.append(teamBlock('YOU',homeNames,'score-home',servingTeam===0),core,teamBlock('CPU',awayNames,'score-away',servingTeam===1),meta)};
}
