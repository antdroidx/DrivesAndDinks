// Career geography.
//
// Two playable regions, each split into major areas, each area holding the
// cities where clubs, leagues and tournaments live. The competition ladder
// is data, not code, so later milestones can extend it without reshaping the
// geography that already ships.

// The citizenship pool for each region. A player almost always holds the
// citizenship of the country they play in, and the rest of the pool is the
// international traffic a professional circuit actually carries.
export const CITIZENSHIP_POOLS=Object.freeze({
  'north-america':Object.freeze(['United States','Canada']),
  'asia':Object.freeze(['Singapore','Thailand','Malaysia','Indonesia','Philippines','Vietnam'])
});

export const REGIONS = Object.freeze([
  {
    id:'north-america',
    label:'North America',
    short:'NA',
    blurb:'Dense club networks from Vancouver to Miami. The widest ladder of local leagues and the deepest amateur field.',
    // Culture weights drive generated athlete names and appearance.
    cultureWeights:{white_american:.40,latin:.18,asian:.16,indian:.12,middle_eastern:.08,european:.06},
    areas:[
      {id:'na-pacific',label:'Pacific Coast',cities:[
        {id:'seattle',label:'Seattle',country:'United States',tier:'major'},
        {id:'portland',label:'Portland',country:'United States',tier:'secondary'},
        {id:'san-francisco',label:'San Francisco',country:'United States',tier:'major'},
        {id:'los-angeles',label:'Los Angeles',country:'United States',tier:'major'},
        {id:'san-diego',label:'San Diego',country:'United States',tier:'secondary'}
      ]},
      {id:'na-mountain',label:'Mountain & Desert',cities:[
        {id:'denver',label:'Denver',country:'United States',tier:'major'},
        {id:'salt-lake-city',label:'Salt Lake City',country:'United States',tier:'secondary'},
        {id:'phoenix',label:'Phoenix',country:'United States',tier:'major'},
        {id:'las-vegas',label:'Las Vegas',country:'United States',tier:'secondary'},
        {id:'albuquerque',label:'Albuquerque',country:'United States',tier:'secondary'}
      ]},
      {id:'na-southwest',label:'Southwest',cities:[
        {id:'dallas',label:'Dallas',country:'United States',tier:'major'},
        {id:'austin',label:'Austin',country:'United States',tier:'major'},
        {id:'houston',label:'Houston',country:'United States',tier:'major'},
        {id:'oklahoma-city',label:'Oklahoma City',country:'United States',tier:'secondary'},
        {id:'san-antonio',label:'San Antonio',country:'United States',tier:'secondary'}
      ]},
      {id:'na-midwest',label:'Midwest',cities:[
        {id:'chicago',label:'Chicago',country:'United States',tier:'major'},
        {id:'minneapolis',label:'Minneapolis',country:'United States',tier:'secondary'},
        {id:'st-louis',label:'St. Louis',country:'United States',tier:'secondary'},
        {id:'kansas-city',label:'Kansas City',country:'United States',tier:'secondary'},
        {id:'indianapolis',label:'Indianapolis',country:'United States',tier:'secondary'}
      ]},
      {id:'na-great-lakes',label:'Great Lakes',cities:[
        {id:'detroit',label:'Detroit',country:'United States',tier:'secondary'},
        {id:'cleveland',label:'Cleveland',country:'United States',tier:'secondary'},
        {id:'columbus',label:'Columbus',country:'United States',tier:'secondary'},
        {id:'pittsburgh',label:'Pittsburgh',country:'United States',tier:'secondary'},
        {id:'buffalo',label:'Buffalo',country:'United States',tier:'secondary'}
      ]},
      {id:'na-southeast',label:'Southeast',cities:[
        {id:'atlanta',label:'Atlanta',country:'United States',tier:'major'},
        {id:'charlotte',label:'Charlotte',country:'United States',tier:'secondary'},
        {id:'nashville',label:'Nashville',country:'United States',tier:'secondary'},
        {id:'orlando',label:'Orlando',country:'United States',tier:'secondary'},
        {id:'miami',label:'Miami',country:'United States',tier:'major'},
        {id:'new-orleans',label:'New Orleans',country:'United States',tier:'secondary'}
      ]},
      {id:'na-northeast',label:'Northeast Corridor',cities:[
        {id:'boston',label:'Boston',country:'United States',tier:'major'},
        {id:'philadelphia',label:'Philadelphia',country:'United States',tier:'major'},
        {id:'new-york',label:'New York',country:'United States',tier:'major'},
        {id:'baltimore',label:'Baltimore',country:'United States',tier:'secondary'},
        {id:'washington',label:'Washington',country:'United States',tier:'major'}
      ]},
      {id:'na-canada',label:'Canada',cities:[
        {id:'vancouver',label:'Vancouver',country:'Canada',tier:'major'},
        {id:'calgary',label:'Calgary',country:'Canada',tier:'secondary'},
        {id:'edmonton',label:'Edmonton',country:'Canada',tier:'secondary'},
        {id:'toronto',label:'Toronto',country:'Canada',tier:'major'},
        {id:'ottawa',label:'Ottawa',country:'Canada',tier:'secondary'},
        {id:'montreal',label:'Montreal',country:'Canada',tier:'secondary'}
      ]}
    ]
  },
  {
    id:'asia',
    label:'Asia',
    short:'AS',
    blurb:'Fast-growing circuits from Taipei to Singapore. Schedules are dense and qualifying routes are longer.',
    cultureWeights:{asian:.52,indian:.16,european:.14,middle_eastern:.12,latin:.06},
    areas:[
      {id:'asia-east',label:'East Asia',cities:[
        {id:'beijing',label:'Beijing',country:'China',tier:'major'},
        {id:'shanghai',label:'Shanghai',country:'China',tier:'major'},
        {id:'shenzhen',label:'Shenzhen',country:'China',tier:'major'},
        {id:'taipei',label:'Taipei',country:'Taiwan',tier:'secondary'},
        {id:'seoul',label:'Seoul',country:'South Korea',tier:'major'},
        {id:'tokyo',label:'Tokyo',country:'Japan',tier:'major'}
      ]},
      {id:'asia-northeast',label:'Northeast Asia',cities:[
        {id:'sapporo',label:'Sapporo',country:'Japan',tier:'secondary'},
        {id:'sendai',label:'Sendai',country:'Japan',tier:'secondary'},
        {id:'busan',label:'Busan',country:'South Korea',tier:'secondary'},
        {id:'incheon',label:'Incheon',country:'South Korea',tier:'secondary'},
        {id:'jeju-city',label:'Jeju City',country:'South Korea',tier:'secondary'}
      ]},
      {id:'asia-southeast',label:'Southeast Asia',cities:[
        {id:'bangkok',label:'Bangkok',country:'Thailand',tier:'major'},
        {id:'singapore',label:'Singapore',country:'Singapore',tier:'major'},
        {id:'kuala-lumpur',label:'Kuala Lumpur',country:'Malaysia',tier:'major'},
        {id:'jakarta',label:'Jakarta',country:'Indonesia',tier:'major'},
        {id:'manila',label:'Manila',country:'Philippines',tier:'secondary'},
        {id:'ho-chi-minh-city',label:'Ho Chi Minh City',country:'Vietnam',tier:'secondary'}
      ]},
      {id:'asia-south',label:'South Asia',cities:[
        {id:'mumbai',label:'Mumbai',country:'India',tier:'major'},
        {id:'delhi',label:'Delhi',country:'India',tier:'major'},
        {id:'bengaluru',label:'Bengaluru',country:'India',tier:'major'},
        {id:'chennai',label:'Chennai',country:'India',tier:'secondary'},
        {id:'karachi',label:'Karachi',country:'Pakistan',tier:'secondary'},
        {id:'dhaka',label:'Dhaka',country:'Bangladesh',tier:'secondary'}
      ]},
      {id:'asia-central',label:'Central Asia',cities:[
        {id:'almaty',label:'Almaty',country:'Kazakhstan',tier:'secondary'},
        {id:'tashkent',label:'Tashkent',country:'Uzbekistan',tier:'secondary'},
        {id:'bishkek',label:'Bishkek',country:'Kyrgyzstan',tier:'secondary'},
        {id:'baku',label:'Baku',country:'Azerbaijan',tier:'secondary'}
      ]},
      {id:'asia-west',label:'West Asia',cities:[
        {id:'dubai',label:'Dubai',country:'United Arab Emirates',tier:'major'},
        {id:'doha',label:'Doha',country:'Qatar',tier:'secondary'},
        {id:'riyadh',label:'Riyadh',country:'Saudi Arabia',tier:'secondary'},
        {id:'tel-aviv',label:'Tel Aviv',country:'Israel',tier:'secondary'},
        {id:'istanbul',label:'Istanbul',country:'Türkiye',tier:'major'}
      ]}
    ]
  }
]);

// The competition ladder, lowest rung first. Rating gates are the career
// rating the player must hold to enter, and they only describe entry rules:
// Milestone 1 schedules events, it does not resolve match results.
// The competition ladder.
//
// Real events do not gate entry on a rating, so nothing here carries an entry
// threshold. Every event except the pro league runs a bracket for each level
// of play, and the player chooses the bracket they enter. The pro league is
// the exception: entry is by world ranking.
// The competition ladder.
//
// Real events do not gate entry on a rating, so nothing here carries an entry
// threshold. Every event runs the brackets it is large enough to field, and
// the player chooses the bracket they enter. Larger events run fewer, higher
// brackets: a club night fields beginners, a national championship fields
// only the 5.0+ bracket, and the pro league is entered by world ranking
// rather than by bracket.
export const COMPETITION_EVENTS = Object.freeze([
  {id:'club-night',label:'Club Night',scope:'club',brackets:['2.0','2.5','3.0','3.5'],formats:['doubles'],open:true,energy:12,skillFocus:'control',matchType:'club',duration:1,months:null,difficulty:'easy',championPoints:0,tier:'local',drawSize:16,gateBasis:'open',shapes:['ladder-open','round-robin-open']},
  {id:'local-league',label:'Local League',scope:'city',brackets:['2.5','3.0','3.5','4.0'],formats:['doubles'],open:true,energy:8,skillFocus:'serve',matchType:'league',nightMatches:1,careerRounds:3,targetScore:15,duration:6,months:null,difficulty:'easy',championPoints:125,tier:'challenger',drawSize:8,gateBasis:'open',shapes:['round-robin-league','round-robin-open']},
  {id:'city-open',label:'City Open',scope:'city',brackets:['3.0','3.5','4.0','4.5'],formats:['singles','doubles','mixed'],open:true,energy:24,skillFocus:'drive',matchType:'tournament',duration:1,months:null,difficulty:'normal',championPoints:250,tier:'challenger',drawSize:16,qualifierSlots:2,qualifierFieldSize:8,wildCardSlots:0,gateBasis:'open',shapes:['tournament-bracket','round-robin-league']},
  {id:'regional-open',label:'Regional Open',scope:'area',brackets:['3.5','4.0','4.5','5.0+'],formats:['singles','doubles'],open:false,energy:30,skillFocus:'volley',matchType:'tournament',duration:1,months:null,difficulty:'normal',championPoints:500,tier:'challenger',drawSize:32,gateBasis:'highest',qualifierSlots:4,qualifierFieldSize:8,wildCardSlots:0,shapes:['tournament-bracket','tournament-double-elimination']},
  {id:'mlp-amateur',label:'Amateur MLP',scope:'region',brackets:['3.5','4.0','4.5'],formats:['doubles'],open:false,energy:12,skillFocus:'defense',matchType:'league',nightMatches:1,careerRounds:4,duration:10,months:null,difficulty:'normal',championPoints:500,tier:'challenger',scoring:'rally',targetScore:21,drawSize:8,gateBasis:'combined',shapes:['mlp-style']},
  {id:'semi-pro',label:'Semi-Pro Circuit',scope:'region',brackets:['4.5','5.0+'],formats:['doubles'],open:false,energy:16,skillFocus:'defense',matchType:'league',nightMatches:1,careerRounds:4,targetScore:15,duration:12,months:null,difficulty:'normal',championPoints:1000,tier:'open',drawSize:16,qualifierSlots:2,qualifierFieldSize:8,wildCardSlots:0,gateBasis:'highest',shapes:['round-robin-league','tournament-bracket']},
  {id:'national',label:'National Championship',scope:'nation',brackets:['5.0+'],formats:['singles','doubles','mixed'],open:false,qualificationPoints:400,energy:44,skillFocus:'courtIQ',matchType:'tournament',duration:1,months:null,difficulty:'hard',championPoints:1500,tier:'cup',drawSize:32,gateBasis:'highest',qualifierSlots:4,qualifierFieldSize:8,wildCardSlots:2,shapes:['tournament-bracket','tournament-double-elimination']},
  {id:'international',label:'International Series',scope:'world',brackets:['5.0+'],formats:['singles','doubles'],open:false,qualificationPoints:900,energy:52,skillFocus:'aggression',matchType:'tournament',duration:17,months:[8,9,10,11],difficulty:'hard',championPoints:1500,tier:'cup',drawSize:32,gateBasis:'highest',qualifierSlots:4,qualifierFieldSize:8,wildCardSlots:2,shapes:['tournament-double-elimination','tournament-bracket']},
  {id:'pro-league',label:'Pro League',scope:'world',brackets:[],formats:['doubles'],qualification:'pro-tour',qualificationPoints:1600,open:false,energy:64,skillFocus:'reach',matchType:'tournament',duration:26,months:[0,1,2,3,4,5],difficulty:'hard',championPoints:2000,tier:'major',drawSize:32,gateBasis:'highest',qualifierSlots:4,qualifierFieldSize:8,wildCardSlots:2,shapes:['tournament-bracket','tournament-double-elimination']},
  {id:'mlp',label:'MLP',scope:'world',brackets:['5.0+'],formats:['doubles'],qualification:'pro-tour',qualificationPoints:1400,open:false,energy:20,skillFocus:'reach',matchType:'league',careerRounds:3,duration:14,months:[5,6,7],difficulty:'hard',championPoints:1400,tier:'major',scoring:'rally',targetScore:21,drawSize:8,nightMatches:1,gateBasis:'highest',shapes:['mlp-style']},
  {id:'world-championship',label:'World Championship',scope:'world',brackets:['5.0+'],formats:['singles','doubles','mixed'],open:false,qualificationPoints:1200,energy:68,skillFocus:'courtIQ',matchType:'tournament',duration:1,months:[3],difficulty:'hard',championPoints:3000,tier:'world',drawSize:64,gateBasis:'highest',qualifierSlots:8,qualifierFieldSize:16,wildCardSlots:2,shapes:['tournament-bracket','tournament-double-elimination']},
  {id:'ppa-finals',label:'PPA Finals',scope:'world',brackets:['5.0+'],formats:['singles','doubles','mixed'],qualification:'finals',open:false,energy:70,skillFocus:'courtIQ',matchType:'tournament',duration:1,months:[11],difficulty:'hard',championPoints:2000,tier:'world',drawSize:8,gateBasis:'highest',shapes:['round-robin-league']}
]);

// The pro league runs one open bracket rather than a ladder of them.
export const PRO_LEAGUE_DIVISION=Object.freeze({id:'pro-league',label:'Pro League Open',min:5.5,max:8,level:5.5});

export const EVENT_SCOPE_LABELS=Object.freeze({
  club:'your club',
  city:'your city',
  area:'your area',
  region:'your region',
  nation:'your nation',
  world:'world'
});

export const EVENT_BY_ID = Object.freeze(Object.fromEntries(COMPETITION_EVENTS.map(event=>[event.id,event])));

export function regionById(id){return REGIONS.find(region=>region.id===id)??null}

// The passport a player holds. Cities in the pool are the usual case, and
// the rest of the pool covers the players who come from elsewhere.
export function citizenshipFor(regionId,city,random=Math.random){
  const pool=CITIZENSHIP_POOLS[regionId]??[city?.country].filter(Boolean);
  if(!pool.length)return city?.country??'';
  if(pool.includes(city?.country)&&random()<0.78)return city.country;
  const rest=pool.filter(country=>country!==city?.country);
  return rest.length?rest[Math.floor(random()*rest.length)]:city?.country??pool[0];
}
export function regionIds(){return REGIONS.map(region=>region.id)}
export function areaById(regionId,areaId){return regionById(regionId)?.areas.find(area=>area.id===areaId)??null}
export function allAreas(regionId){return regionById(regionId)?.areas??[]}
export function cityById(regionId,cityId){
  for(const area of allAreas(regionId)){
    const city=area.cities.find(entry=>entry.id===cityId);
    if(city)return{...city,areaId:area.id,areaLabel:area.label,regionId};
  }
  return null;
}
export function cityByIdAnywhere(cityId){
  for(const region of REGIONS){
    const city=cityById(region.id,cityId);
    if(city)return city;
  }
  return null;
}
export function allCities(regionId){return allAreas(regionId).flatMap(area=>area.cities.map(city=>({...city,areaId:area.id,areaLabel:area.label,regionId})))}
export function citiesForArea(regionId,areaId){return areaById(regionId,areaId)?.cities??[]}
export function majorCities(regionId){return allCities(regionId).filter(city=>city.tier==='major')}

// The career rating lives in its own module. It is re-exported here so the
// world and the rating can be imported together.
export {
  RATING_MIN,RATING_MAX,RATING_ELITE,RATING_BANDS,RATING_LABELS,RATING_PRECISION,
  ratingFromSkill,ratingBand,formatRating,skillForRating,reliability,divisionFor,
  RATING_BRACKETS,FORMATS,FORMAT_LABELS,formatLabel,
MATCH_TYPES,expectedScore,matchPerformance,updateRating,rateMatch,regressRating,simulateOutcome
} from './rating.js?v=216';

export {
  PRO_TOURS,tourFor,tourRank,onTheTour,pointsForEntry,pointsInWindow,addPoints,
  EVENT_POINTS,TOUR_POINTS_WINDOW,PLAY_UP_MULTIPLIER,PRO_FLOOR_RATING
} from './tour.js?v=216';
