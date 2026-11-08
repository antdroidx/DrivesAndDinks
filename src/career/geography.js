// Career geography.
//
// Two playable regions, each split into major areas, each area holding the
// cities where clubs, leagues and tournaments live. The competition ladder
// is data, not code, so later milestones can extend it without reshaping the
// geography that already ships.

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
export const COMPETITION_TIERS = Object.freeze([
  {id:'club-night',label:'Club Night',scope:'club',minRating:2,kind:'practice',energy:20,skillFocus:'control'},
  {id:'local-league',label:'Local League',scope:'city',minRating:3.5,kind:'match',energy:15,skillFocus:'serve'},
  {id:'city-open',label:'City Open',scope:'city',minRating:4,kind:'match',energy:15,skillFocus:'drive'},
  {id:'regional-open',label:'Regional Open',scope:'area',minRating:4.5,kind:'match',energy:20,skillFocus:'volley'},
  {id:'semi-pro',label:'Semi-Pro Circuit',scope:'region',minRating:5,kind:'match',energy:25,skillFocus:'defense'},
  {id:'national',label:'National Championship',scope:'nation',minRating:5.75,kind:'match',energy:30,skillFocus:'courtIQ'},
  {id:'international',label:'International Series',scope:'world',minRating:7,kind:'match',energy:35,skillFocus:'aggression'},
  {id:'pro-league',label:'Pro League',scope:'world',minRating:7.75,kind:'match',energy:40,skillFocus:'reach'}
]);

export const TIER_BY_ID = Object.freeze(Object.fromEntries(COMPETITION_TIERS.map(tier=>[tier.id,tier])));

export function regionById(id){return REGIONS.find(region=>region.id===id)??null}
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
export function allCities(regionId){return allAreas(regionId).flatMap(area=>area.cities.map(city=>({...city,areaId:area.id,areaLabel:area.label,regionId})))}
export function citiesForArea(regionId,areaId){return areaById(regionId,areaId)?.cities??[]}
export function majorCities(regionId){return allCities(regionId).filter(city=>city.tier==='major')}

// ---- career rating -------------------------------------------------------
// The career rating follows the DUPR convention: a 2.00 to 5.50 scale in
// quarter-point steps, where 4.00 is a solid advanced doubles player and
// 5.00 is the threshold for the pro level. It is derived from the same 14
// skill ratings the match engine simulates with, so a career athlete and a
// match athlete are the same kind of object.
//
// Once career matches land (milestone 2) the rating should be driven by
// results, with the skill ratings acting as the starting prior.
export const DUPR_MIN=2;
export const DUPR_MAX=8;
// DUPR publishes a precise number rather than a banded one, so the rating is
// stored at full precision and only rounded for display.
export const DUPR_DISPLAY_STEP=0.01;
export const DUPR_TOP_SKILL=99;
export const DUPR_LABELS=Object.freeze({
  beginner:{label:'Beginner',note:'Learning the game. Club nights and practice.'},
  novice:{label:'Novice',note:'Getting the basics down and finding a club.'},
  intermediate:{label:'Intermediate',note:'Reliable rallies. Local league ready.'},
  intermediatePlus:{label:'Intermediate +',note:'Good read of the kitchen. City opens.'},
  advanced:{label:'Advanced',note:'Pressure the net. Regional and semi-pro ready.'},
  expert:{label:'Expert',note:'National and international level.'},
  pro:{label:'Pro',note:'Top of the ladder. Pro league ready.'}
});
const DUPR_BANDS=Object.freeze([
  {max:2.99,band:'beginner'},
  {max:3.49,band:'novice'},
  {max:3.99,band:'intermediate'},
  {max:4.49,band:'intermediatePlus'},
  {max:5.49,band:'advanced'},
  {max:6.99,band:'expert'},
  {max:DUPR_MAX,band:'pro'}
]);

export function duprRating(skillAverage){
  const skill=Math.max(0,Math.min(DUPR_TOP_SKILL,Number(skillAverage)||0));
  const raw=DUPR_MIN+(skill-30)/(DUPR_TOP_SKILL-30)*(DUPR_MAX-DUPR_MIN);
  return Math.max(DUPR_MIN,Math.min(DUPR_MAX,raw));
}
export function duprBand(rating){
  const value=Number(rating)||DUPR_MIN;
  const match=DUPR_BANDS.find(band=>value<=band.max)??DUPR_BANDS.at(-1);
  return DUPR_LABELS[match.band];
}
export function formatDupr(rating){
  const value=Math.max(DUPR_MIN,Math.min(DUPR_MAX,Number(rating)||DUPR_MIN));
  return value.toFixed(2);
}

// DUPR publishes a reliability figure beside the rating: how much the number
// can be trusted, which grows with matches played.
export function reliabilityPercent(matches){
  const count=Math.max(0,Number(matches)||0);
  return Math.min(99,Math.round(100*(1-Math.exp(-count/12))));
}
// How much skill a player still needs for the next quarter point.
export function skillForDupr(rating){
  const target=Math.max(DUPR_MIN,Math.min(DUPR_MAX,Number(rating)||DUPR_MIN));
  return 30+(target-DUPR_MIN)/(DUPR_MAX-DUPR_MIN)*(DUPR_TOP_SKILL-30);
}

