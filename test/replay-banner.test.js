import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function ui(){
 const context={performance:{now:()=>0},canvas:{width:960,height:600},game:{phase:'pause',pointReplay:{frames:Array(20),label:'POINT'}},automaticallyReplayedPoints:new WeakSet(),replayEnabled:true,replayPlayback:null,replayStarted:0,replayClock:{start(){}},syncPauseButton(){},replayLabel:{},replayAngleFor:()=>"sideline",replayAngle:'overview',replayAngleButton:{setAttribute(){}},replayBar:{},pointActions:{},pointReplayLabel:{},watchPointReplay:{},document:{querySelector:()=>({open:false,classList:{add(){},remove(){}}})}};
 runInNewContext(source.slice(source.indexOf('function beginReplay('),source.indexOf('function finishReplay('))+source.slice(source.indexOf('function syncPointActions('),source.indexOf('watchPointReplay.onclick=')),context);return context;
}
test('automatic replay suppresses manual banner even after it finishes or is skipped',()=>{const c=ui();assert.equal(c.beginReplay(c.game.pointReplay,0,true),true);c.replayPlayback=null;c.syncPointActions();assert.equal(c.pointActions.hidden,true)});
test('ordinary points and points with automatic playback disabled retain manual replay',()=>{const c=ui();c.syncPointActions();assert.equal(c.pointActions.hidden,false);c.beginReplay(c.game.pointReplay,0);c.replayPlayback=null;c.syncPointActions();assert.equal(c.pointActions.hidden,false)});
test('suppression is tied to the point rather than subsequent rallies',()=>{const c=ui();c.beginReplay(c.game.pointReplay,0,true);c.replayPlayback=null;c.game.pointReplay={frames:Array(20),label:'NEXT POINT'};c.syncPointActions();assert.equal(c.pointActions.hidden,false)});
test('invalid automatic clips do not suppress a valid point replay',()=>{const c=ui();assert.equal(c.beginReplay({frames:[]},0,true),false);c.syncPointActions();assert.equal(c.pointActions.hidden,false)});

test('the manual banner stays hidden during the automatic replay delay',()=>{
 const c=ui();c.game.replayClip={frames:Array(20),readyAt:1.5};
 c.syncPointActions();assert.equal(c.pointActions.hidden,true);
 c.replayEnabled=false;c.syncPointActions();assert.equal(c.pointActions.hidden,false);
});

test('manually replaying a point cancels its pending automatic playback',()=>{
 const c=ui();c.game.replayClip=c.game.pointReplay;
 assert.equal(c.beginReplay(c.game.pointReplay),true);assert.equal(c.game.replayClip,null);
});
