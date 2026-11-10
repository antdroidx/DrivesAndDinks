import {toggleFullscreen} from './court-display.js?v=214';

export function formatGameVersion(version,build){
 return `VERSION ${version} · BUILD ${String(build).toUpperCase()}`;
}

export function fullscreenButtonLabel(active){
 return `FULL SCREEN: ${active?'ON':'OFF'}`;
}

export function setupStartScreen({onPlay,version='0.1.0',build='dev',fullscreenElement=document.documentElement}){
 const screen=document.querySelector('#game-start'),playButton=document.querySelector('#start-play'),howToButton=document.querySelector('#start-how-to'),fullscreenButton=document.querySelector('#start-fullscreen'),instructions=document.querySelector('#game-instructions'),versionLabel=document.querySelector('#game-version'),fullscreenStatus=document.querySelector('#start-fullscreen-status'),gameRoot=document.querySelector('main');

 versionLabel.textContent=formatGameVersion(version,build);
 versionLabel.setAttribute('aria-label',`Game version ${version}, build ${build}`);

 const syncFullscreen=()=>{
  const active=Boolean(document.fullscreenElement||document.webkitFullscreenElement);
  fullscreenButton.textContent=fullscreenButtonLabel(active);
  fullscreenButton.setAttribute('aria-pressed',String(active));
 };

 fullscreenButton.onclick=async()=>{
  try{
   await toggleFullscreen(document,fullscreenElement);
   fullscreenStatus.textContent='';
  }catch{
   fullscreenStatus.textContent='Full screen is unavailable in this browser.';
  }
  syncFullscreen();
 };

 playButton.onclick=()=>{
  screen.hidden=true;
  gameRoot.removeAttribute('aria-hidden');
  onPlay();
 };

 howToButton.onclick=()=>instructions.showModal();

 document.addEventListener('fullscreenchange',syncFullscreen);
 document.addEventListener('webkitfullscreenchange',syncFullscreen);
 gameRoot.setAttribute('aria-hidden','true');
 syncFullscreen();

 return {
  isOpen:()=>!screen.hidden,
  open(){
   screen.hidden=false;
   gameRoot.setAttribute('aria-hidden','true');
   syncFullscreen();
   playButton.focus();
  },
  close(){
   screen.hidden=true;
   gameRoot.removeAttribute('aria-hidden');
  }
 };
}
