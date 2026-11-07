const percentile=(samples,p)=>{if(!samples.length)return null;const index=Math.max(0,Math.min(samples.length-1,(samples.length-1)*p)),lower=Math.floor(index),upper=Math.ceil(index);return samples[lower]+(samples[upper]-samples[lower])*(index-lower)};

export class PerformanceMonitor{
 constructor({canvas=null,now=()=>performance.now()}={}){
  this.canvas=canvas;this.now=now;this.frames=[];this.renderTimes=[];this.inputs=[];this.longTasks=[];this.lastFrame=null;this.renderStartedAt=null;this.observer=null;
  if(typeof PerformanceObserver!=='undefined'){
   try{this.observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())this.longTasks.push({start:entry.startTime,duration:entry.duration})});this.observer.observe({entryTypes:['longtask']})}catch{}
  }
 }
 frame(timestamp=this.now()){
  const time=Number.isFinite(timestamp)?timestamp:this.now();
  if(this.lastFrame!==null)this.frames.push(Math.max(0,time-this.lastFrame));
  this.lastFrame=time;return time;
 }
 renderStart(){this.renderStartedAt=this.now()}
 renderEnd(){
  if(this.renderStartedAt===null)return null;
  const duration=Math.max(0,this.now()-this.renderStartedAt);this.renderStartedAt=null;this.renderTimes.push(duration);return duration;
 }
 input(timestamp=this.now()){
  const time=Number.isFinite(timestamp)?timestamp:this.now();this.inputs.push({time,latency:null});return time;
 }
 nextFrameAfterInput(timestamp=this.now()){
  for(const input of this.inputs)if(input.latency===null)input.latency=Math.max(0,timestamp-input.time);
 }
 summarize(samples){
  const sorted=[...samples].sort((a,b)=>a-b);
  return {samples:sorted.length,p50:percentile(sorted,.5),p95:percentile(sorted,.95),p99:percentile(sorted,.99),max:sorted.at(-1)??null};
 }
 snapshot(){
  const frame=this.summarize(this.frames),render=this.summarize(this.renderTimes),input=this.summarize(this.inputs.map(row=>row.latency).filter(Number.isFinite));
  return {frameMs:frame,renderMs:render,inputLatencyMs:input,fps:frame.p50?1000/frame.p50:null,longTasks:{count:this.longTasks.length,p95:this.summarize(this.longTasks.map(task=>task.duration)).p95},canvas:this.canvas?{cssWidth:this.canvas.clientWidth,cssHeight:this.canvas.clientHeight,backingWidth:this.canvas.width,backingHeight:this.canvas.height,devicePixelRatio:globalThis.window?.devicePixelRatio||1,pixels:this.canvas.width*this.canvas.height}:null};
 }
 stop(){this.observer?.disconnect();this.observer=null}
}
