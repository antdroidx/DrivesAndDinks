// Independent of the sound/UI queue: consuming events never erases a report.
export class MatchJournal{
 constructor(limit=2048){this.limit=limit;this.events=[];this.rallies=[];this.dropped=0;this.sequence=0;this.rallySequence=0;this.rallyStart=0;this.rallyStartSequence=0;this.contacts=0;this.mishits=0}
 record(type,time,detail={}){
  this.events.push({sequence:++this.sequence,time,type,...structuredClone(detail)});
  if(this.events.length>this.limit){this.events.shift();this.dropped++}
  if(type==='hit'){this.contacts++;if(detail.quality<.8)this.mishits++}
  if(type==='rally-end'||type==='drill-result'){
   this.rallies.push({number:++this.rallySequence,kind:type,time,duration:Math.max(0,time-this.rallyStart),startSequence:this.rallyStartSequence,endSequence:this.sequence,contacts:this.contacts,mishits:this.mishits,...structuredClone(detail)});
   if(this.rallies.length>512)this.rallies.shift();
   this.contacts=0;this.mishits=0;this.rallyStart=time;
  }
  if(type==='rally-start'){this.rallyStart=time;this.rallyStartSequence=this.sequence}
 }
 snapshot(){return structuredClone({events:this.events,rallies:this.rallies,droppedEvents:this.dropped,droppedRallies:this.rallySequence-this.rallies.length})}
}
