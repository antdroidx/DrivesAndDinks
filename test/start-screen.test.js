import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatGameVersion,fullscreenButtonLabel} from '../src/start-screen.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('start screen reports game version, build and fullscreen state clearly',()=>{
 assert.equal(formatGameVersion('0.1.0','128'),'VERSION 0.1.0 · BUILD 128');
 assert.equal(formatGameVersion('0.1.0','dev'),'VERSION 0.1.0 · BUILD DEV');
 assert.equal(fullscreenButtonLabel(false),'FULL SCREEN: OFF');
 assert.equal(fullscreenButtonLabel(true),'FULL SCREEN: ON');
});

test('start screen gates setup and includes the logo, actions and instructions popup',()=>{
 const html=read('index.html'),selection=read('src/selection.js'),main=read('src/main.js');
 for(const id of ['game-start','start-fullscreen','start-play','start-how-to','game-version','game-instructions']){
  assert.match(html,new RegExp(`id="${id}"`));
 }
 assert.match(html,/assets\/drives-dinks-logo-v1\.png/);
 assert.match(html,/DRIVES &amp; DINKS/);
 assert.match(selection,/setupSelection\(\{game,onStart,drawPreview,getPhysique/);
 assert.ok(selection.includes('openOnStart=true'));
 assert.match(selection,/if\(openOnStart\)open\(\)/);
 assert.ok(main.includes('openOnStart:false'));
});
