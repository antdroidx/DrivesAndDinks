import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerformanceMonitor} from '../src/performance-monitor.js';

test('browser performance monitor summarizes frame, render and input timing',()=>{
 let clock=0;const monitor=new PerformanceMonitor({now:()=>clock,canvas:{clientWidth:390,clientHeight:844,width:780,height:1688}});
 monitor.frame(0);monitor.input(2);
 clock=10;monitor.frame(10);monitor.nextFrameAfterInput(10);monitor.renderStart();
 clock=13;monitor.renderEnd();
 clock=25;monitor.frame(25);
 const report=monitor.snapshot();
 assert.equal(report.frameMs.samples,2);assert.equal(report.frameMs.p50,12.5);
 assert.equal(report.renderMs.p95,3);assert.equal(report.inputLatencyMs.p95,8);
 assert.equal(report.canvas.pixels,780*1688);assert.ok(report.fps>0);
 monitor.stop();
});

test('monitor tolerates missing canvas and irregular timestamps',()=>{
 const monitor=new PerformanceMonitor({now:()=>0});monitor.frame(NaN);monitor.frame(100);monitor.renderEnd();
 const report=monitor.snapshot();assert.equal(report.canvas,null);assert.equal(report.renderMs.samples,0);monitor.stop();
});
