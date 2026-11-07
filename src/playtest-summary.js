export function percentile(values,p){
 const sorted=[...values].sort((a,b)=>a-b);
 if(!sorted.length)return null;
 return sorted[Math.min(sorted.length-1,Math.max(0,Math.floor((sorted.length-1)*p)))];
}

const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const rate=(part,total)=>total?part/total:null;
const count=(object,key,value=1)=>{object[key]=(object[key]??0)+value};

export function summarizePlaytest(journal,stats,tactics={}){
 const events=journal.events??[];
 const rallyRows=journal.rallies??[];
 const hits=events.filter(event=>event.type==='hit');
 const shotQuality={};
 for(const hit of hits){
  const row=shotQuality[hit.shot]??={contacts:0,clean:0,mishits:0,meanQuality:null,qualities:[],meanDifficulty:null,difficulties:[]};
  row.contacts++;if((hit.quality??1)<.8)row.mishits++;else row.clean++;
  row.qualities.push(hit.quality??1);if(Number.isFinite(hit.difficulty))row.difficulties.push(hit.difficulty);
 }
 for(const row of Object.values(shotQuality)){
  row.meanQuality=mean(row.qualities);row.meanDifficulty=mean(row.difficulties);delete row.qualities;delete row.difficulties;
 }
 const rallyDurations=rallyRows.map(row=>row.duration).filter(Number.isFinite);
 const rallyShots=rallyRows.map(row=>row.shots).filter(Number.isFinite);
 const faults={};
 const faultContext=[];
 for(const rally of rallyRows){
  const rallyHits=hits.filter(hit=>hit.sequence>rally.startSequence&&hit.sequence<=rally.endSequence);
  const last=rallyHits.at(-1);
  count(faults,rally.reason??'Unknown');
  if(rally.reason)faultContext.push({
   reason:rally.reason,
   shot:last?.shot??null,
   quality:last?.quality??null,
   difficulty:last?.difficulty??null,
   distance:last?.distance??null,
   movement:last?.movement??null,
   netMargin:last?.netMargin??null,
   shots:rally.shots??0
  });
 }
 const faultByShot={};
 for(const row of faultContext){
  const key=`${row.reason} / ${row.shot??'no-contact'}`;
  const item=faultByShot[key]??={count:0,meanQuality:null,qualities:[],meanDifficulty:null,difficulties:[],meanDistance:null,distances:[]};
  item.count++;if(Number.isFinite(row.quality))item.qualities.push(row.quality);
  if(Number.isFinite(row.difficulty))item.difficulties.push(row.difficulty);
  if(Number.isFinite(row.distance))item.distances.push(row.distance);
 }
 for(const row of Object.values(faultByShot)){
  row.meanQuality=mean(row.qualities);row.meanDifficulty=mean(row.difficulties);row.meanDistance=mean(row.distances);
  delete row.qualities;delete row.difficulties;delete row.distances;
 }
 const transitions=hits.reduce((summary,hit)=>{
  const stage=hit.transition?'transition':hit.shotNumber===3?'third':hit.shotNumber===5?'fifth':'rally';
  const row=summary[stage]??={contacts:0,meanQuality:null,qualities:[]};
  row.contacts++;row.qualities.push(hit.quality??1);return summary;
 }, {});
 for(const row of Object.values(transitions)){row.meanQuality=mean(row.qualities);delete row.qualities}
 return {
  schemaVersion:1,
  generatedFrom:'MatchJournal',
  rallies:{count:rallyRows.length,meanDuration:mean(rallyDurations),medianDuration:percentile(rallyDurations,.5),p95Duration:percentile(rallyDurations,.95),meanShots:mean(rallyShots),medianShots:percentile(rallyShots,.5),p95Shots:percentile(rallyShots,.95),maxShots:rallyShots.length?Math.max(...rallyShots):0},
  contacts:{count:hits.length,meanQuality:mean(hits.map(hit=>hit.quality??1)),mishits:hits.filter(hit=>(hit.quality??1)<.8).length},
  shots:shotQuality,
  faults:{counts:faults,byLastShot:faultByShot},
  transitions,
  tactics:{...tactics},
  scorecardHints:[
   'Record participant, device, format, difficulty, seed and build in the test notes.',
   'Use the same seeded match for before/after comparisons and keep CPU self-play separate from human evidence.',
   'Compare these generated rates with touch input notes and visible control ergonomics.'
  ]
 };
}
