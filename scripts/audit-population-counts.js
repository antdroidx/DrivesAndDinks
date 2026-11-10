import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {buildClubIndex} from '../src/career/population.js';
import {REGIONS,allCities} from '../src/career/geography.js';

const seedIndex=process.argv.indexOf('--seed');
const seed=seedIndex>=0?Number(process.argv[seedIndex+1]):4242;
if(!Number.isFinite(seed))throw new Error('--seed needs a number');
const outputIndex=process.argv.indexOf('--output');
const output=outputIndex>=0?process.argv[outputIndex+1]:`validation/population-counts-${seed}.json`;
const regions=[];
const cities=[];
for(const region of REGIONS){
  const clubs=buildClubIndex(seed,region.id);
  const cityRows=allCities(region.id).map(city=>{
    const entries=clubs.filter(club=>club.cityId===city.id);
    return {
      regionId:region.id,
      cityId:city.id,
      city:city.label,
      country:city.country,
      clubs:entries.length,
      players:entries.reduce((sum,club)=>sum+club.memberCount,0),
      recreational:entries.filter(club=>club.tier==='recreational').length,
      competitive:entries.filter(club=>club.tier==='competitive').length,
      elite:entries.filter(club=>club.tier==='elite').length
    };
  });
  const players=cityRows.reduce((sum,city)=>sum+city.players,0);
  regions.push({
    regionId:region.id,
    region:region.label,
    cities:cityRows.length,
    clubs:clubs.length,
    players,
    averagePlayersPerCity:Number((players/cityRows.length).toFixed(1)),
    minimumPlayersPerCity:Math.min(...cityRows.map(city=>city.players)),
    maximumPlayersPerCity:Math.max(...cityRows.map(city=>city.players))
  });
  cities.push(...cityRows);
}
const report={
  seed,
  generatedAt:new Date().toISOString(),
  note:'Counts are deterministic for this seed. Each region is generated independently; a career loads one region.',
  totals:{
    cities:cities.length,
    clubs:regions.reduce((sum,region)=>sum+region.clubs,0),
    players:regions.reduce((sum,region)=>sum+region.players,0),
    averagePlayersPerCity:Number((cities.reduce((sum,city)=>sum+city.players,0)/cities.length).toFixed(1)),
    minimumPlayersPerCity:Math.min(...cities.map(city=>city.players)),
    maximumPlayersPerCity:Math.max(...cities.map(city=>city.players))
  },
  regions,
  cities:[...cities].sort((a,b)=>a.regionId.localeCompare(b.regionId)||a.city.localeCompare(b.city))
};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({seed,totals:report.totals,regions},null,2));