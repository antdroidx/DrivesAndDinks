import {readFileSync,writeFileSync} from 'node:fs';

const groups=['new','casual','athlete','racket','competitive'];
const labels={new:'New player',casual:'Casual player',athlete:'General athlete',racket:'Racket-sport cross-over',competitive:'Competitive background'};
const ages=[15,20,30,40,50];
const rows=[];
for(const experience of groups){
  const report=JSON.parse(readFileSync(`validation/career-groups-${experience}.json`,'utf8'));
  for(const result of report.results){
    const summary=result.summary;
    const startRatings=result.samplePreview?.[0]?.startRatings??{};
    const startAverage=Object.values(startRatings).length?Object.values(startRatings).reduce((sum,value)=>sum+value,0)/Object.values(startRatings).length:null;
    rows.push({
      experience,label:labels[experience],age:result.age,policy:result.policy,
      startRating:startAverage,
      contractRate:summary.contract.rate,
      proRate:summary.proEvent.rate,
      finalsRate:summary.finals.rate,
      medianProWeek:summary.medianWeeksTo.proEvent,
      medianContractWeek:summary.medianWeeksTo.contract,
      bestRatingP50:summary.end.bestRatingP50,
      matchesMean:summary.end.matchesMean,
      eventsMean:summary.end.eventsMean
    });
  }
}
const mean=values=>{const finite=values.filter(Number.isFinite);return finite.length?finite.reduce((sum,value)=>sum+value,0)/finite.length:null};
const groupSummary=groups.map(experience=>{
  const groupRows=rows.filter(row=>row.experience===experience);
  const committed=groupRows.filter(row=>row.policy==='committed');
  const light=groupRows.filter(row=>row.policy==='light');
  return {
    experience,label:labels[experience],
    startRatingMean:mean(committed.map(row=>row.startRating)),
    committedProRate:mean(committed.map(row=>row.proRate)),
    committedMedianProWeek:mean(committed.map(row=>row.medianProWeek)),
    lightProRate:mean(light.map(row=>row.proRate)),
    lightMedianProWeek:mean(light.map(row=>row.medianProWeek)),
    lightBestRatingMean:mean(light.map(row=>row.bestRatingP50)),
    lightMatchesMean:mean(light.map(row=>row.matchesMean))
  };
});
const cpu=JSON.parse(readFileSync('validation/cpu-careers-balanced.json','utf8'));
const report={generatedAt:new Date().toISOString(),methodology:{samplesPerCohort:100,years:10,ages,groups,limitations:'Statistical career and event model. It does not run every match through the full physics engine or model player injury and equipment decisions.'},groupSummary,rows,cpu: cpu.results.map(row=>({age:row.age,detail:row.detail,proInvite:row.summary.proInvite,medianProWeek:row.summary.medianWeeksTo.proInvite,ratingGain:row.summary.end.ratingGainMean,professionalYear10:row.summary.stages.year10.professional}))};
writeFileSync('validation/career-groups-summary.json',JSON.stringify(report,null,2)+'\n');

const pct=value=>value==null?'—':`${(value*100).toFixed(1)}%`;
const week=value=>value==null?'—':`${Math.round(value)}`;
const rating=value=>value==null?'—':Number(value).toFixed(3);
const lineGroup=['| Group | Start rating | Committed pro | Median week | Light pro | Median week | Light best rating | Matches / 10y |','|---|---:|---:|---:|---:|---:|---:|---:|',...groupSummary.map(row=>`| ${row.label} | ${rating(row.startRatingMean)} | ${pct(row.committedProRate)} | ${week(row.committedMedianProWeek)} | ${pct(row.lightProRate)} | ${week(row.lightMedianProWeek)} | ${rating(row.lightBestRatingMean)} | ${Math.round(row.lightMatchesMean).toLocaleString('en-US')} |`)].join('\n');
const lineAges=['| Group | Age | Committed pro | Week | Light pro | Week | Light rating p50 |','|---|---:|---:|---:|---:|---:|---:|',...rows.filter(row=>row.policy==='light').map(row=>{const committed=rows.find(entry=>entry.experience===row.experience&&entry.age===row.age&&entry.policy==='committed');return `| ${row.label} | ${row.age} | ${pct(committed.proRate)} | ${week(committed.medianProWeek)} | ${pct(row.proRate)} | ${week(row.medianProWeek)} | ${rating(row.bestRatingP50)} |`})].join('\n');
const lineCpu=['| Start age | Detail | Pro invite by year 10 | Median invite week | Rating gain | Professional year 10 |','|---:|---|---:|---:|---:|---:|',...report.cpu.map(row=>`| ${row.age} | ${row.detail} | ${pct(row.proInvite)} | ${week(row.medianProWeek)} | ${rating(row.ratingGain)} | ${pct(row.professionalYear10/100)} |`)].join('\n');
const markdown=`# Career Group Simulation Report\n\nGenerated: ${report.generatedAt}\n\n## Method\n\n100 careers per experience level, start age and schedule over ten years. The statistical harness uses the real creation, age, training, rating, ranking, contract and finance functions, but not full physics matches, injuries or equipment decisions.\n\n## Group summary\n\n${lineGroup}\n\n## Age detail — light schedule\n\nCommitted figures are shown alongside light results for context.\n\n${lineAges}\n\n## CPU careers\n\n${lineCpu}\n\n## Balance verdict\n\n**Promising, but not fully balanced.**\n\n- Experience clearly changes development speed. New players typically take 74–127 weeks on a committed schedule, while racket and competitive starters reach a pro event around week 27.\n- Every committed cohort eventually reaches a professional event. That makes the strongest progression variable time rather than success.\n- Light schedules are more selective, with pro-event rates mainly between 91% and 99%. The spread by experience is real but narrow.\n- Ten-year workload is bounded around 650–685 matches on the light schedule and roughly 780–870 on the committed schedule; Quick Sim keeps this playable.\n- Age differentiation is visible in the light group's rating outcome, especially at 40 and 50, but committed schedules compress the difference.\n- No sampled player career reached the PPA Finals, so top-eight qualification remains an unresolved progression endpoint.\n- CPU age 20 has a fast-track anomaly: active 20-year-olds receive a pro invitation at median week 8, compared with week 27 for ages 25–30. Success remains 61%, but the timing is too early.\n\n## Recommended tuning\n\n1. Set explicit committed pro-debut targets below 100% for new/casual backgrounds, especially older starters.\n2. Delay the youth CPU fast track so age 20 does not bypass the 25–30 pathway.\n3. Increase late-career performance separation without reducing technique growth.\n4. Review the Overall ranking and finals cut so strong careers can reach the top eight.\n5. Re-run this report after tuning and compare distributions, not only averages.\n`;
writeFileSync('CAREER-GROUP-REPORT.md',markdown);
console.log(JSON.stringify({output:'validation/career-groups-summary.json',report:'CAREER-GROUP-REPORT.md',groups:groupSummary},null,2));