// Career mode user interface.
//
// The UI is plain DOM. It reads the career from local storage on load, and
// every action writes the career back immediately so a closed tab never
// costs progress.

import {CHARACTERS,RATING_KEYS,RATING_LABELS} from '../roster.js';
import {REGIONS,allCities,cityById,COMPETITION_EVENTS,ratingBand,formatRating,reliability,divisionFor,tourFor,tourRank,formatLabel,FORMATS} from './geography.js';
import {buildClubIndex,buildClubRoster,buildRegionRoster,summarizeClub} from './population.js';
import {
  createCareer,train,attendEvent,joinClub,leaveClub,moveToCity,advanceWeek,
  currentEvents,canAct,canTrain,canEnterEvent,trainingCost,trainingGain,trainingSessionsThisWeek,weeklyRecovery,MAX_TRAINING_SESSIONS,INTERNATIONAL_TRAVEL_COST,advanceToNextEvent,formatsPlayed,eventEntryCost
} from './state.js';
import {loadCareer,saveCareer,clearCareer,careerStorage} from './save.js';
import {startCareerMatch,finishCareerMatch} from './career-match.js';
import {isPlayerDone} from './tournament.js';
import {writePendingMatch,readMatchResult,clearMatchResult} from './handshake.js';
import {boardPosition,nearbyRivals,findRival,qualificationStatus,sponsorsFor,careerForm,QUALIFICATION_POINTS} from './standings.js';
import {weekLabel,upcomingWeeks,generateWeekEvents,weekShortLabel} from './calendar.js';
import {rankingSummary} from './ranking.js';
import {isContracted,isIneligible,obligationProgress,contractLevel,SEASON_WEEKS} from './contracts.js';
import {analyticsSummary} from './analytics.js';
import {retire,retirementAdvice,allTimeBoard} from './retirement.js';

const RATING_GROUPS=Object.freeze([
  {label:'Attack',keys:['serve','drive','smash','power','aggression']},
  {label:'Soft game',keys:['drop','dink','lob','control']},
  {label:'Net & defense',keys:['volley','defense']},
  {label:'Movement',keys:['agility','reach']},
  {label:'Court IQ',keys:['courtIQ']}
]);

const app={
  career:null,
  view:'home',
  draft:{name:'',gender:'female',archetypeId:'quinn',regionId:'north-america',cityId:'',age:25},
  filters:{areaId:'',cityId:'',tier:'',query:''},
  move:{regionId:'',cityId:''},
  standingsFormat:null,
  expandedClub:null,
  storage:careerStorage()
};

const view=document.getElementById('career-view');
const nav=document.getElementById('career-nav');
const statusStrip=document.getElementById('career-status');
const toastEl=document.getElementById('career-toast');
const resetButton=document.getElementById('career-reset');

const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

let toastTimer=null;
function toast(message,warn=false){
  if(!message)return;
  toastEl.textContent=message;
  toastEl.classList.toggle('warn',warn);
  toastEl.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{toastEl.hidden=true},4200);
}

function persist(){
  if(!app.career)return;
  const result=saveCareer(app.career,app.storage);
  if(!result.ok)toast(result.reason,true);
}

// ---- views ----------------------------------------------------------------

function render(){
  const hasCareer=Boolean(app.career);
  nav.hidden=!hasCareer;
  statusStrip.hidden=!hasCareer;
  resetButton.hidden=!hasCareer;
  if(hasCareer)renderStatus();
  for(const button of nav.querySelectorAll('button'))button.classList.toggle('active',button.dataset.view===app.view);
  const renderer={home:renderHome,clubs:renderClubs,players:renderPlayers,calendar:renderCalendar,standings:renderStandings,record:renderRecord}[app.view]??renderHome;
  view.innerHTML=hasCareer?renderer():renderCreate();
}

function renderStatus(){
  const career=app.career;
  statusStrip.innerHTML=`
    <div><small>WEEK</small><strong>${career.week+1}</strong></div>
    <div><small>ENERGY</small><strong>${career.energy}</strong></div>
    <div><small>BEST RATING</small><strong>${formatRating(Math.max(...Object.values(career.athlete.formats??{doubles:0})))}</strong></div>
    <div><small>LOCATION</small><strong>${escapeHtml(career.cityLabel)}</strong></div>
    <div><small>TOUR</small><strong>${escapeHtml(contractLevel(career)==='none'?'NO CONTRACT':contractLevel(career).toUpperCase())}</strong></div>
    <div><small>AGE</small><strong>${career.athlete.age}</strong></div>`;
}

function renderCreate(){
  const region=REGIONS.find(entry=>entry.id===app.draft.regionId)??REGIONS[0];
  const cities=allCities(region.id);
  const cityId=cities.some(city=>city.id===app.draft.cityId)?app.draft.cityId:cities[0].id;
  const archetypes=CHARACTERS.map(character=>`<option value="${character.id}"${character.id===app.draft.archetypeId?' selected':''}>${escapeHtml(character.style)} — ${escapeHtml(character.description)}</option>`).join('');
  const cityOptions=cities.map(city=>`<option value="${city.id}"${city.id===cityId?' selected':''}>${escapeHtml(city.label)}, ${escapeHtml(city.country)}</option>`).join('');
  return `
  <section class="panel">
    <h2>START A CAREER</h2>
    <p>Two regions, eight areas each, and a ladder from club night to the pro league. Everything runs on this device — no account, no network.</p>
    <div class="field">
      <label for="draft-name">PLAYER NAME</label>
      <input id="draft-name" type="text" maxlength="28" placeholder="Your name" value="${escapeHtml(app.draft.name)}" autocomplete="off">
    </div>
    <div class="field-row">
      <div class="field">
        <label for="draft-gender">GENDER</label>
        <select id="draft-gender">
          <option value="female"${app.draft.gender==='female'?' selected':''}>Female</option>
          <option value="male"${app.draft.gender==='male'?' selected':''}>Male</option>
        </select>
      </div>
      <div class="field">
        <label for="draft-archetype">ARCHETYPE</label>
        <select id="draft-archetype">${archetypes}</select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="draft-age">STARTING AGE</label>
        <input id="draft-age" type="number" min="10" max="70" value="${app.draft.age}" inputmode="numeric">
      </div>
      <div class="field">
        <label for="draft-region">REGION</label>
        <select id="draft-region">
          ${REGIONS.map(entry=>`<option value="${entry.id}"${entry.id===region.id?' selected':''}>${escapeHtml(entry.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="draft-city">STARTING CITY</label>
        <select id="draft-city">${cityOptions}</select>
      </div>
    </div>
    <button type="button" class="primary" data-action="create">BEGIN CAREER →</button>
    <p class="hint">The starting city decides where you train. You can move later, but moving leaves your club.</p>
  </section>`;
}

function contractLine(career){
  if(isContracted(career)){
    const progress=obligationProgress(career);
    const left=Math.max(0,(career.contractSince??career.week)+SEASON_WEEKS-career.week);
    return contractLevel(career)+' contract · '+progress.events+'/'+progress.requiredEvents+' events · '+progress.disciplines+'/2 disciplines · review in '+left+' weeks';
  }
  if(isIneligible(career))return 'Released · re-entry '+(career.reentryEvents??0)+'/8 events · biggest events reopen week '+((career.ineligibleUntil??0)+1);
  return 'No contract · division ranking decides PPA main-draw entry';
}

function renderTournament(career){
  const tournament=career.tournament;
  if(!tournament)return '';
  const done=isPlayerDone(tournament);
  const pending=career.pendingMatch;
  const teamPanel=tournament.shape==='mlp'&&tournament.teamLeague?`<p class="hint"><strong>${escapeHtml(tournament.teamLeague.teamName)}</strong> · roster and team management are handled in the background.</p><ul class="history">${[...(tournament.teams??[])].sort((a,b)=>(tournament.records?.[b.id]?.wins??0)-(tournament.records?.[a.id]?.wins??0)).map(team=>`<li><span>${escapeHtml(team.name)}</span><strong>${tournament.records?.[team.id]?.wins??0}W</strong><em>${tournament.records?.[team.id]?.losses??0}L</em></li>`).join('')}</ul>`:'';
  const history=(tournament.history??[]).map(entry=>
    `<li class="${entry.won?'won':'lost'}"><span>R${entry.round+1}</span><span>${escapeHtml(entry.opponent)}</span><span>${escapeHtml(entry.score)}</span></li>`
  ).join('');
  const total=tournament.shape==='bracket'?Math.round(Math.log2(tournament.size||16)):(tournament.rounds?.length??1);
  if(done){
    return `<section class="panel">
      <h2>${escapeHtml(tournament.label)} · COMPLETE</h2>
      <p><strong>${escapeHtml(tournament.placeText??'Finished')}</strong>${tournament.points?` · ${tournament.points} points`:''}</p>
      ${teamPanel}
      ${history?`<ul class="tournament-history">${history}</ul>`:''}
    </section>`;
  }
  const opponent=pending?.matchup?.team??pending?.matchup?.opponentNames?.join(' & ')??'the next side';
  return `<section class="panel">
    <h2>${escapeHtml(tournament.label)} · ${escapeHtml(tournament.bracket)} ${escapeHtml(tournament.format)}</h2>
    <div class="hint">Round ${(tournament.round??0)+1} of ${total} · ${tournament.teams?.length??tournament.size} teams in the draw</div>
    ${teamPanel}
    <p><strong>Next match: ${escapeHtml(opponent)}</strong></p>
    ${pending?`<div class="actions"><button type="button" class="primary" data-action="resume-match">PLAY MATCH →</button></div>`:'<p class="hint">The round is still being played. Advance the calendar.</p>'}
    ${history?`<ul class="tournament-history">${history}</ul>`:''}
  </section>`;
}

function renderRetiredHome(career){
  const epilogue=career.epilogue;
  if(!epilogue)return '<section class="panel"><h2>CAREER COMPLETE</h2><p>This career has ended.</p></section>';
  return `<section class="panel">
    <h2>CAREER COMPLETE · ${escapeHtml(epilogue.name)}</h2>
    <p><strong>${epilogue.startAge}–${epilogue.endAge}</strong> · ${epilogue.seasons} seasons · retired ${epilogue.reason}</p>
    <div class="board-head">
      <div><small>GAMES</small><strong>${epilogue.games}</strong></div>
      <div><small>RECORD</small><strong>${epilogue.wins}-${epilogue.losses}</strong></div>
      <div><small>TITLES</small><strong>${epilogue.titles}</strong></div>
      <div><small>MEDALS</small><strong>${epilogue.medals.gold}G ${epilogue.medals.silver}S ${epilogue.medals.bronze}B</strong></div>
      <div><small>EARNINGS</small><strong>$${epilogue.earnings.toLocaleString('en-US')}</strong></div>
    </div>
    <p class="hint">Open RECORD for the full event history, format splits and all-time board.</p>
  </section>`;
}

function renderHome(){
  const career=app.career;
  if(career.retired)return renderRetiredHome(career);
  const events=currentEvents(career);
  const trainReady=canTrain(career);
  const eventReady=events.some(event=>canEnterEvent(career,event));
  const sessions=trainingSessionsThisWeek(career);
  const retirement=retirementAdvice(career);
  const formatRows=FORMATS.map(format=>{
    const rating=career.athlete.formats[format]??0;
    const standing=tourRank(rating,career.athlete.gender);
    return `<div class="format-line"><strong>${formatRating(rating)}</strong><span>${escapeHtml(formatLabel(format,career.athlete.gender))}</span><small>${escapeHtml(ratingBand(rating).label)}${standing?' · tour '+standing.toLocaleString('en-US'):''}</small></div>`;
  }).join('');
  const moveRegion=REGIONS.find(region=>region.id===(app.move.regionId||career.regionId))??REGIONS[0];
  const moveCities=allCities(moveRegion.id);
  const moveCity=moveCities.find(city=>city.id===app.move.cityId)??moveCities.find(city=>city.id===career.cityId)??moveCities[0];
  const entered=new Set(career.entered??[]);
  const nextEvent=COMPETITION_EVENTS.find(event=>!entered.has(event.id))??null;
  const ranking=rankingSummary(career);
  const contractText=contractLine(career);
  const board=(label,place,points)=>`${label} ${place?'#'+place:'—'} · ${Math.round(points).toLocaleString('en-US')}`;
  const reliabilityInfo=reliability(career.athlete.record.matches);
  const reliabilityText=career.athlete.record.matches
    ? `Reliability ${reliabilityInfo.percent}% · ${reliabilityInfo.label}`
    : 'Provisional · no rated matches yet';
  const focusOptions=RATING_KEYS.map(key=>`<option value="${key}"${key===career.trainingFocus?' selected':''}>${escapeHtml(RATING_LABELS[key]??key)}</option>`).join('');
  const groups=RATING_GROUPS.map(group=>`
    <div class="rating-group">
      <h3>${escapeHtml(group.label.toUpperCase())}</h3>
      ${group.keys.map(key=>{
        const value=career.athlete.ratings[key]??0;
        return `<div class="rating${value>=85?' hi':''}"><span>${escapeHtml(RATING_LABELS[key]??key)}</span><div class="bar"><b style="width:${Math.max(2,value)}%"></b></div><i>${value}</i></div>`;
      }).join('')}
    </div>`).join('');

  const tour=tourFor(career.athlete.gender);
  const bestFormat=FORMATS.reduce((best,format)=>(career.athlete.formats[format]??0)>(career.athlete.formats[best]??0)?format:best,FORMATS[0]);
  const tourStanding=tourRank(career.athlete.formats[bestFormat]??0,career.athlete.gender);
  const highestEntered=COMPETITION_EVENTS.reduce((best,event,index)=>entered.has(event.id)?index:best,-1);
  const ladder=COMPETITION_EVENTS.map((event,index)=>{
    const done=entered.has(event.id);
    const next=!done&&index===highestEntered+1;
    const need=event.qualification==='pro-tour'
      ?`${tour.label}'s tour · ${tour.size.toLocaleString('en-US')} players · ${tour.floorRating.toFixed(2)}+ rating`
      :bracketSummary(event);
    return `<li class="${done?'done':next?'next':'locked'}"><span class="mark">${done?'✓':''}</span><span>${escapeHtml(event.label)}</span><span class="need">${escapeHtml(need)}</span></li>`;
  }).join('');

  return `
  <section class="panel">
    <div class="athlete-head">
      <div>
        <h1>${escapeHtml(career.athlete.name)}</h1>
        <div class="athlete-meta">${escapeHtml(career.athlete.archetypeLabel)} · ${career.athlete.age} · ${escapeHtml(career.athlete.citizenship ?? '')} · ${career.athlete.handedness}-handed</div>
        <div class="tags">
          <span class="tag accent">${escapeHtml(career.regionLabel)}</span>
          <span class="tag">${escapeHtml(career.areaLabel)}</span>
          <span class="tag">${escapeHtml(career.cityLabel)}</span>
          ${career.club?`<span class="tag accent">${escapeHtml(career.club.name)}</span>`:'<span class="tag">No club</span>'}
        </div>
      </div>
      <div style="text-align:right">
        <small class="muted">${escapeHtml(weekShortLabel(career.week))}</small>
        <div class="format-list">${formatRows}</div>
        <small class="muted">${tourStanding?`Tour rank ${tourStanding.toLocaleString('en-US')} of ${tour.size.toLocaleString('en-US')}`:`Not on the ${tour.label}'s tour`}</small>
        <div class="hint">${escapeHtml(reliabilityText)}</div>
        <div class="hint">${escapeHtml(board('Overall',ranking.overall,ranking.points.overall))}${ranking.finals?' · finals qualified':''}</div>
        <div class="hint">${escapeHtml([board('Doubles',ranking.doubles,ranking.points.doubles),board('Mixed',ranking.mixed,ranking.points.mixed),board('Singles',ranking.singles,ranking.points.singles)].join(' · '))}</div>
        <div class="hint">${escapeHtml(contractText)}</div>
        <div class="hint">${escapeHtml(retirement.message)}</div>
        <div class="hint">Next on the ladder: ${escapeHtml(nextEvent?nextEvent.label:'the pro league')}</div>
      </div>
    </div>
    <div class="energy-bar"><b style="width:${career.energy}%"></b></div>
    <div class="hint">${career.energy} energy · ${sessions}/${MAX_TRAINING_SESSIONS} training sessions used · ${eventReady?'an event is still open this week.':'you have entered your event this week.'} You recover ${weeklyRecovery(career)} a week.</div>
    <div class="actions">
      <div class="field" style="flex:1 1 190px;margin:0">
        <label for="focus-select">TRAINING FOCUS</label>
        <select id="focus-select">${focusOptions}</select>
      </div>
      <button type="button" class="secondary" data-action="train" ${trainReady&&!career.retired?'':'disabled'} style="flex:1 1 160px;align-self:flex-end">TRAIN · ${trainingCost(career)} ENERGY</button>
      <button type="button" class="secondary" data-action="advance" style="flex:1 1 160px;align-self:flex-end" ${career.retired?'disabled':''}>ADVANCE WEEK →</button>
      <button type="button" class="secondary" data-action="next-event" style="flex:1 1 190px;align-self:flex-end" ${career.retired?'disabled':''}>NEXT EVENT →</button>
    </div>
    <div class="hint">Training develops an attribute: +${trainingGain(career,career.trainingFocus)} to the focused rating and +1 control. It does not move your rating. Later gains are slower than early ones.</div>
  </section>

  ${renderTournament(career)}

  <div class="grid two">
    <section class="panel">
      <h2>THIS WEEK · ${escapeHtml(weekLabel(career.week))}</h2>
      ${events.length?events.map(event=>eventRow(event,career,career.athlete.gender)).join(''):'<p>No events this week. Join a club to get club night on the calendar.</p>'}
    </section>
    <section class="panel">
      <h2>THE LADDER</h2>
      <ul class="ladder">${ladder}</ul>
    </section>
  </div>

  <div class="grid two">
    <section class="panel">
      <h2>RATINGS</h2>
      ${groups}
    </section>
    <section class="panel">
      <h2>MOVE</h2>
      <p>Pick the tour up in another city, or in the other region. Moving clears your club.</p>
      <div class="filters">
        <select id="move-region">
          ${REGIONS.map(region=>`<option value="${region.id}"${region.id===moveRegion.id?' selected':''}>${escapeHtml(region.label)}</option>`).join('')}
        </select>
        <select id="move-city">
          ${moveCities.map(city=>`<option value="${city.id}"${city.id===moveCity?.id?' selected':''}>${escapeHtml(city.label)}, ${escapeHtml(city.country)}</option>`).join('')}
        </select>
      </div>
      <div class="actions">
        <button type="button" class="secondary" data-action="move" ${moveCity&&moveCity.id!==career.cityId?'':'disabled'}>${moveRegion.id===career.regionId?'MOVE':'MOVE ACROSS REGIONS'} · ${moveRegion.id===career.regionId?'10':'20'} ENERGY</button>
      </div>
    </section>
    <section class="panel">
      <h2>MATCHES</h2>
      ${career.matches.length?`<ul class="history">
        ${[...career.matches].reverse().slice(0,8).map(match=>`<li><span>${escapeHtml(match.bracket)}</span><strong>${escapeHtml(match.score)}</strong> vs ${escapeHtml(match.opponent)} <em class="${match.delta>=0?'up':'down'}">${match.delta>=0?'+':''}${match.delta.toFixed(3)}</em></li>`).join('')}
      </ul>`:'<p class="muted">No rated matches yet. Enter a bracket to earn your first rating.</p>'}
      ${career.athlete.record.matches?`<p class="hint">${career.athlete.record.wins}W ${career.athlete.record.losses}L · best rating ${formatRating(Math.max(...Object.values(career.athlete.formats??{doubles:0})))}</p>`:''}
    </section>
    <section class="panel">
      <h2>RECENT</h2>
      <ul class="history">
        ${[...career.log].reverse().slice(0,8).map(entry=>`<li><span>${escapeHtml(weekLabel(entry.week).split(' · ')[0])}</span>${escapeHtml(entry.text)}</li>`).join('')||'<li>Nothing yet.</li>'}
      </ul>
    </section>
  </div>`;
}

function bracketSummary(event){
  if(!event.brackets.length)return 'open bracket';
  const formats=(event.formats??[]).map(format=>format==='doubles'?'Doubles':format==='mixed'?'Mixed':'Singles').join('/');
  if(event.brackets.length===1)return `${event.brackets[0]} bracket · ${formats}`;
  return `${event.brackets[0]} – ${event.brackets.at(-1)} brackets · ${formats}`;
}

// The brackets an event is running, with the player's own bracket marked and
// the one above it offered as a deliberate step up.
function bracketOptions(event,gender,options){
  const ownLevel=options.find(option=>option.isPlayer)?.divisionId;
  return options.map(option=>{
    const division=event.divisions.find(entry=>entry.id===option.divisionId);
    if(!division)return '';
    const notes=[];
    if(option.isPlayer)notes.push('your bracket');
    else if(division.level>divisionFor(event.ownRatings?.[option.format]??0).level)notes.push('play up');
    const suffix=notes.length?' · '+notes.join(' · '):'';
    const label=formatLabel(option.format,gender)+' · '+division.label+suffix;
    return `<option value="${option.id}"${option.id===event.defaultOptionId?' selected':''}>${escapeHtml(label)}</option>`;
  }).join('');
}

function eventRow(event,career,gender){
  const locked=!event.eligible.ok;
  const played=formatsPlayed(career,event.eventId);
  const options=event.options.filter(option=>!played.includes(option.format));
  const ready=canEnterEvent(career,event)&&options.length>0;
  const running=event.divisions.map(division=>division.label).join(' · ');
  const cost=eventEntryCost(career,event);
  const divisionNote=played.length?' · completed '+played.join(', '):'';
  return `<div class="event">
    <div class="body">
      <strong>${escapeHtml(event.title)}</strong>
      <small>${escapeHtml(event.venue)} · ${cost} energy · rated match${escapeHtml(divisionNote)}</small>
      <small>Brackets: ${escapeHtml(running)}</small>
      ${locked?`<div class="lock">${escapeHtml(event.lockedReason)}</div>`:options.length?`<select class="bracket" data-division="${event.id}" ${ready?'':'disabled'}>${bracketOptions(event,gender,options)}</select>`:'<div class="lock">All offered divisions are complete.</div>'}
    </div>
    ${locked||!options.length?'':`<button type="button" class="secondary" data-action="attend" data-event="${event.id}" ${ready?'':'disabled'}>ENTER</button>`}
  </div>`;
}

function renderClubs(){
  const career=app.career;
  const clubs=buildClubIndex(career.seed,career.regionId);
  const areas=REGIONS.find(region=>region.id===career.regionId).areas;
  const filtered=clubs.filter(club=>
    (!app.filters.areaId||club.areaId===app.filters.areaId)&&
    (!app.filters.cityId||club.cityId===app.filters.cityId)&&
    (!app.filters.tier||club.tier===app.filters.tier));
  const areaOptions=areas.map(area=>`<option value="${area.id}"${app.filters.areaId===area.id?' selected':''}>${escapeHtml(area.label)}</option>`).join('');
  const cityOptions=allCities(career.regionId).filter(city=>!app.filters.areaId||city.areaId===app.filters.areaId).map(city=>`<option value="${city.id}"${app.filters.cityId===city.id?' selected':''}>${escapeHtml(city.label)}</option>`).join('');
  const tierOptions=['','recreational','competitive','elite'].map(tier=>`<option value="${tier}"${app.filters.tier===tier?' selected':''}>${tier?tier[0].toUpperCase()+tier.slice(1):'All tiers'}</option>`).join('');

  return `
  <section class="panel">
    <h2>CLUBS · ${escapeHtml(career.regionLabel.toUpperCase())}</h2>
    <p>${clubs.length} clubs across ${areas.length} areas. Joining a club in another city moves you there.</p>
    <div class="filters">
      <select id="filter-area"><option value="">All areas</option>${areaOptions}</select>
      <select id="filter-city"><option value="">All cities</option>${cityOptions}</select>
      <select id="filter-tier">${tierOptions}</select>
    </div>
    ${filtered.length?filtered.map(club=>clubRow(club,career)).join(''):'<p class="muted">No clubs match those filters.</p>'}
  </section>`;
}

function clubRow(club,career){
  const expanded=app.expandedClub===club.id;
  const isMember=career.clubId===club.id;
  const roster=expanded?buildClubRoster(career.seed,club):null;
  const summary=roster?summarizeClub(roster):null;
  return `
  <div class="club">
    <div class="body">
      <strong>${escapeHtml(club.name)}</strong>
      <small>${escapeHtml(club.cityLabel)}, ${escapeHtml(club.country)} · ${escapeHtml(club.tierLabel)} · ${escapeHtml(club.surface)} · ${club.memberCount} members</small>
      ${expanded&&summary?`<small>Average rating ${summary.average} · top player ${escapeHtml(summary.top.name)}</small>`:''}
    </div>
    <div class="actions">
      ${expanded?`<button type="button" class="secondary" data-action="join" data-club="${club.id}" ${isMember?'disabled':''}>${isMember?'MEMBER':'JOIN'}</button>`:''}
      <button type="button" class="secondary" data-action="expand-club" data-club="${club.id}">${expanded?'HIDE':'ROSTER'}</button>
    </div>
  </div>
  ${expanded&&roster?`<div class="roster">
    <h3>ROSTER · ${escapeHtml(club.name)}</h3>
    ${roster.map(athlete=>`<div class="player">
      <div class="body">
        <strong>${escapeHtml(athlete.name)}</strong>
        <small>${escapeHtml(athlete.archetypeLabel)} · ${escapeHtml(athlete.citizenship ?? '')} · ${athlete.age} · ${athlete.handedness}-handed · Rating ${formatRating(athlete.formats?.doubles??0)}</small>
      </div>
    </div>`).join('')}
  </div>`:''}`;
}

function recordPercent(record){
  return record.wins+record.losses?Math.round(record.wins/(record.wins+record.losses)*100):0;
}

function recordLine(label,record,eventRecord,current=null,peak=null){
  const medals=(eventRecord?.gold??0)+(eventRecord?.silver??0)+(eventRecord?.bronze??0);
  const rating=current==null?'':formatRating(current);
  const peakText=peak==null?'':' · peak '+formatRating(peak);
  const eventText=eventRecord?' · '+eventRecord.played+' events':'';
  return `<div class="club"><div class="body"><strong>${escapeHtml(label)}</strong><small>${rating?rating+peakText+' · ':''}${record.wins}W ${record.losses}L ${record.played?' · '+recordPercent(record)+'%':''}</small><small>${record.pointsFor} scored · ${record.pointsAgainst} allowed · ${record.pointDifference>=0?'+':''}${record.pointDifference} differential</small></div><div class="actions"><span class="need">${eventText}${medals?' · '+medals+' medals':''}</span></div></div>`;
}

function renderRecord(){
  const career=app.career;
  const summary=analyticsSummary(career);
  const eventTypes=summary.events;
  const medals=Object.fromEntries(['gold','silver','bronze'].map(medal=>[
    medal,Object.values(eventTypes).reduce((sum,entry)=>sum+(entry[medal]??0),0)
  ]));
  const totalEvents=Object.values(eventTypes).reduce((sum,entry)=>sum+entry.played,0);
  const totalTitles=Object.values(eventTypes).reduce((sum,entry)=>sum+entry.titles,0);
  const earnings=Object.values(eventTypes).reduce((sum,entry)=>sum+entry.prize,0);
  const rankingPoints=Object.values(eventTypes).reduce((sum,entry)=>sum+entry.rankingPoints,0);
  const current=summary.ratings;
  const peaks=summary.ratingPeaks;
  const history=[...(summary.eventHistory??[])].reverse().slice(0,30);
  return `
  <section class="panel">
    <h2>${career.retired?'CAREER COMPLETE':'CAREER RECORD'}</h2>
    <p>${career.retired?escapeHtml(career.epilogue?.reason==='voluntary'?'Retired by choice at age '+career.epilogue.endAge+'.':'Career ended at age '+career.epilogue.endAge+'.'):'Every rated game contributes durable totals, while event history keeps placings, medals, series records and points scored.'}</p>
    <div class="board-head">
      <div><small>GAMES</small><strong>${summary.overall.played}</strong></div>
      <div><small>RECORD</small><strong>${summary.overall.wins}-${summary.overall.losses}</strong></div>
      <div><small>WIN RATE</small><strong>${recordPercent(summary.overall)}%</strong></div>
      <div><small>POINTS</small><strong>${summary.overall.pointsFor}:${summary.overall.pointsAgainst}</strong></div>
      <div><small>EVENTS</small><strong>${totalEvents}</strong></div>
    </div>
    <p class="hint">${totalTitles} titles · ${medals.gold} gold · ${medals.silver} silver · ${medals.bronze} bronze · $${earnings.toLocaleString('en-US')} earned · ${rankingPoints.toLocaleString('en-US')} ranking points</p>
    ${career.retired?'':`<div class="actions"><button type="button" class="secondary" data-action="retire">RETIRE FROM COMPETITION</button></div>`}
  </section>

  ${career.retired&&career.allTimeBoard?.length?`<section class="panel"><h2>ALL-TIME BOARD</h2>${allTimeBoard(career).map((entry,index)=>`<div class="club"><div class="body"><strong>#${index+1} ${escapeHtml(entry.name)}</strong><small>${entry.startAge}–${entry.endAge} · ${entry.games} games · ${entry.titles} titles</small></div><div class="actions"><span class="need">${entry.medals.gold}G ${entry.medals.silver}S ${entry.medals.bronze}B</span></div></div>`).join('')}</section>`:''}

  <div class="grid two">
    <section class="panel">
      <h2>BY FORMAT</h2>
      ${recordLine('Singles',summary.formats.singles,null,current.singles,peaks.singles)}
      ${recordLine('Gender doubles',summary.formats.doubles,null,current.doubles,peaks.doubles)}
      ${recordLine('Mixed doubles',summary.formats.mixed,null,current.mixed,peaks.mixed)}
      ${recordLine('All doubles',summary.doublesAll,null,null,null)}
    </section>

    <section class="panel">
      <h2>BY COMPETITION</h2>
      ${recordLine('Tournaments',summary.byType.tournament,eventTypes.tournament)}
      ${recordLine('Leagues',summary.byType.league,eventTypes.league)}
      ${recordLine('MLP',summary.byType.mlp,eventTypes.mlp)}
      ${recordLine('Club play',summary.byType.club,eventTypes.club)}
    </section>
  </div>

  <section class="panel">
    <h2>PERFORMANCE</h2>
    <div class="board-head">
      <div><small>POINT DIFFERENTIAL</small><strong>${summary.overall.pointDifference>=0?'+':''}${summary.overall.pointDifference}</strong></div>
      <div><small>AVG SCORED</small><strong>${summary.overall.averageFor.toFixed(1)}</strong></div>
      <div><small>AVG ALLOWED</small><strong>${summary.overall.averageAgainst.toFixed(1)}</strong></div>
      <div><small>BEST STREAK</small><strong>${summary.overall.bestWinStreak}</strong></div>
      <div><small>CURRENT STREAK</small><strong>${summary.currentStreak}</strong></div>
    </div>
    <p class="hint">Tournament medals award both semifinalists bronze. League medals go to the top three. Series records are kept separately from every rated game inside a best-of-three.</p>
  </section>

  <section class="panel">
    <h2>EVENT HISTORY</h2>
    ${history.length?`<ul class="history">${history.map(entry=>`<li><span>${escapeHtml(weekShortLabel(entry.week))}</span><strong>${escapeHtml(entry.label)} · ${escapeHtml(entry.format??'event')}</strong><small>${entry.medal?entry.medal.toUpperCase()+' · ':''}${entry.place?'place '+entry.place:'complete'} · ${entry.wins}W ${entry.losses}L · ${entry.pointsFor}:${entry.pointsAgainst}</small></li>`).join('')}</ul>`:'<p class="muted">No completed events yet.</p>'}
  </section>`;
}

function renderStandings(){
  const career=app.career;
  const format=app.standingsFormat??FORMATS[0];
  const position=boardPosition(career,format);
  const form=careerForm(career);
  const rivals=nearbyRivals(career,format,6);
  const rival=findRival(career,format);
  const sponsors=sponsorsFor(career,format);
  const formatTabs=FORMATS.map(entry=>`<button type="button" data-action="standings-format" data-format="${entry.id}" class="${entry.id===format?'active':''}">${escapeHtml(formatLabel(entry,career.athlete.gender))}</button>`).join('');
  const qualification=Object.entries(QUALIFICATION_POINTS).map(([eventId,needed])=>{
    const status=qualificationStatus(career,eventId);
    return `<li><span>${escapeHtml(eventId.replace('-',' '))}</span><span class="need ${status.ok?'ok':''}">${status.ok?'Qualified':status.points+' / '+needed+' points'}</span></li>`;
  }).join('');
  return `
  <section class="panel">
    <h2>STANDINGS</h2>
    <p>Your place in the world for each format, and who is next to you on the board.</p>
    <div class="tabs">${formatTabs}</div>
    <div class="board-head">
      <div><small>YOUR RATING</small><strong>${formatRating(position.rating)}</strong></div>
      <div><small>WORLD RANK</small><strong>${position.worldRank.toLocaleString('en-US')}</strong></div>
      <div><small>TOUR</small><strong>${position.onTour?position.rank.toLocaleString('en-US')+' of '+position.size.toLocaleString('en-US'):'Outside the tour'}</strong></div>
      <div><small>PRIZE MONEY</small><strong>${(career.money??0).toLocaleString('en-US')}</strong></div>
    </div>
    <p class="hint">The ${escapeHtml(position.label)} board holds ${position.size.toLocaleString('en-US')} players and the floor is a ${position.floor.toFixed(2)} rating.</p>
  </section>

  <div class="grid two">
    <section class="panel">
      <h2>FORM</h2>
      <div class="form-line"><strong>${form.played}</strong><span>recent matches</span><small>${form.wins}W ${form.losses}L</small></div>
      <div class="form-line"><strong>${form.streak}</strong><span>match streak</span><small>${form.streak?'unbeaten':'none'}</small></div>
      ${form.form?`<p class="hint">${escapeHtml(form.form)}</p>`:'<p class="hint">No rated matches yet.</p>'}
      <h3 style="margin-top:14px">QUALIFICATION</h3>
      <ul class="history">${qualification}</ul>
    </section>

    <section class="panel">
      <h2>YOUR RIVAL</h2>
      ${rival?`<div class="rival"><strong>${escapeHtml(rival.name)}</strong><span>Rating ${formatRating(rival.rating)}</span><small>World rank ${rival.worldRank.toLocaleString('en-US')} · ${rival.gap.toFixed(3)} away</small></div>`:'<p class="muted">No rival yet.</p>'}
      <h3 style="margin-top:14px">SPONSORS</h3>
      ${sponsors.length?`<ul class="history">${sponsors.map(sponsor=>`<li><span>${escapeHtml(sponsor.label)}</span><small>+${Math.round(sponsor.bonus*100)}% of every purse</small></li>`).join('')}</ul>`:'<p class="muted">Sponsors arrive with a standing on the tour.</p>'}
    </section>
  </div>

  <section class="panel">
    <h2>ON THE BOARD</h2>
    <p>The players nearest to you in ${escapeHtml(formatLabel(format,career.athlete.gender))}.</p>
    ${rivals.map(entry=>`<div class="club">
      <div class="body">
        <strong>${escapeHtml(entry.name)}</strong>
        <small>${escapeHtml(entry.citizenship)} · Rating ${formatRating(entry.rating)}</small>
      </div>
      <div class="actions"><span class="need">World ${entry.worldRank.toLocaleString('en-US')}</span></div>
    </div>`).join('')}
  </section>`;
}

function renderPlayers(){
  const career=app.career;
  const areas=REGIONS.find(region=>region.id===career.regionId).areas;
  const areaOptions=areas.map(area=>`<option value="${area.id}"${app.filters.areaId===area.id?' selected':''}>${escapeHtml(area.label)}</option>`).join('');
  const term=app.filters.query.trim();
  let athletes=[];
  if(term){
    const {athletes:found}=buildRegionRoster(career.seed,career.regionId,{areaId:app.filters.areaId||undefined});
    const lower=term.toLowerCase();
    athletes=found.filter(athlete=>athlete.name.toLowerCase().includes(lower)).slice(0,80);
  }
  return `
  <section class="panel">
    <h2>PLAYERS</h2>
    <p>Search every athlete in ${escapeHtml(career.regionLabel)}. Ratings are the same model the match engine uses.</p>
    <div class="filters">
      <input id="player-search" type="search" placeholder="Search players by name" value="${escapeHtml(term)}" autocomplete="off">
      <select id="filter-area"><option value="">All areas</option>${areaOptions}</select>
    </div>
    ${term?(athletes.length?athletes.map(athlete=>`<div class="player">
      <div class="body">
        <strong>${escapeHtml(athlete.name)}</strong>
        <small>${escapeHtml(athlete.archetypeLabel)} · ${escapeHtml(athlete.cityLabel)}, ${escapeHtml(athlete.citizenship ?? '')} · ${escapeHtml(athlete.clubName)}</small>
        <small>Rating ${formatRating(athlete.formats?.doubles??0)} · ${escapeHtml(ratingBand(athlete.formats?.doubles??0).label)} · best skill ${escapeHtml(RATING_LABELS[topKey(athlete.ratings)]??topKey(athlete.ratings))} ${athlete.ratings[topKey(athlete.ratings)]}</small>
      </div>
    </div>`).join(''):'<p class="muted">No players matched that name.</p>'):'<p class="muted">Type a name to search the region.</p>'}
  </section>`;
}

function topKey(ratings){
  return RATING_KEYS.reduce((best,key)=>ratings[key]>ratings[best]?key:best,RATING_KEYS[0]);
}

function renderCalendar(){
  const career=app.career;
  const weeks=upcomingWeeks(career,10);
  return `
  <section class="panel">
    <h2>CALENDAR · ${escapeHtml(career.regionLabel.toUpperCase())}</h2>
    <p>Tournaments run all year. Leagues and the amateur MLP run for a month or three. The pro league runs from January to June, the MLP is a summer circuit, and the international series runs through the autumn.</p>
    ${weeks.map(entry=>{
      const events=generateWeekEvents(career,entry.week);
      return `<div class="week${entry.isCurrent?' current':''}">
        <h3><span>${escapeHtml(entry.label)}</span><small>${escapeHtml(entry.short)}</small></h3>
        ${events.length?events.map(event=>eventRow(event,entry.isCurrent?career:{...career,week:entry.week},career.athlete.gender)).join(''):'<p class="empty">Quiet week.</p>'}
      </div>`;
    }).join('')}
    <div class="actions"><button type="button" class="secondary" data-action="advance">ADVANCE WEEK →</button></div>
  </section>`;
}

// ---- events ---------------------------------------------------------------

function apply(result){
  if(result.ok){
    app.career=result.state;
    persist();
  }
  toast(result.message,!result.ok);
  render();
}

document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-action]');
  if(trigger){
    const action=trigger.dataset.action;
    if(action==='create'){
      const name=document.getElementById('draft-name')?.value?.trim();
      if(!name){toast('Enter a player name first.',true);return}
      app.career=createCareer({
        name,
        gender:document.getElementById('draft-gender')?.value,
        archetypeId:document.getElementById('draft-archetype')?.value,
        regionId:document.getElementById('draft-region')?.value,
        cityId:document.getElementById('draft-city')?.value,
        age:Number(document.getElementById('draft-age')?.value)
      });
      persist();
      toast(`Career started in ${app.career.cityLabel}.`);
      render();
      return;
    }
    if(action==='reset'){
      clearCareer(app.storage);
      app.career=null;
      app.view='home';
      app.expandedClub=null;
      toast('Career deleted.');
      render();
      return;
    }
    if(!app.career)return;
    if(action==='train'){
      const focus=document.getElementById('focus-select')?.value??app.career.trainingFocus;
      apply(train(app.career,focus));
      return;
    }
    if(action==='retire'){
      if(!confirm('Retire from competition? This career record becomes final.'))return;
      const ended=retire(app.career,'voluntary');
      if(ended.ok){app.career=ended.state;app.view='record';persist();render();toast(ended.message);}else toast(ended.message,true);
      return;
    }
    if(action==='advance'){apply(advanceWeek(app.career));return}
    if(action==='standings-format'){
      app.standingsFormat=trigger.dataset.format;
      render();
      return;
    }
    if(action==='move'){
      const city=document.getElementById('move-city')?.value;
      apply(moveToCity(app.career,city));
      return;
    }
    if(action==='join'){apply(joinClub(app.career,trigger.dataset.club));return}
    if(action==='leave'){apply(leaveClub(app.career));return}
    if(action==='attend'){
      const picker=trigger.closest('.event')?.querySelector('select[data-division]');
      const started=startCareerMatch(app.career,trigger.dataset.event,picker?.value??null);
      if(!started.ok){toast(started.message,true);return}
      app.career=started.state;
      persist();
      writePendingMatch(started.pending);
      // The match is played on the engine page and the result comes back.
      location.href='../?career-match=1';
      return;
    }
    if(action==='next-event'){
      const jumped=advanceToNextEvent(app.career);
      app.career=jumped.state;
      persist();
      render();
      toast(jumped.message);
      return;
    }
    if(action==='resume-match'){
      if(!app.career.pendingMatch){toast('There is no match to play.',true);return}
      writePendingMatch(app.career.pendingMatch);
      location.href='../?career-match=1';
      return;
    }
    if(action==='expand-club'){
      app.expandedClub=app.expandedClub===trigger.dataset.club?null:trigger.dataset.club;
      render();
      return;
    }
  }
  const navButton=event.target.closest('[data-view]');
  if(navButton){
    app.view=navButton.dataset.view;
    app.expandedClub=null;
    render();
  }
});

document.addEventListener('change',event=>{
  const id=event.target.id;
  if(id==='draft-region'){
    app.draft.regionId=event.target.value;
    app.draft.cityId='';
    render();
  }
  if(id==='draft-city'){app.draft.cityId=event.target.value}
  if(id==='draft-age'){app.draft.age=Number(event.target.value)||25}
  if(id==='draft-gender'){app.draft.gender=event.target.value}
  if(id==='draft-archetype'){app.draft.archetypeId=event.target.value}
  if(id==='filter-area'){
    app.filters.areaId=event.target.value;
    app.filters.cityId='';
    render();
  }
  if(id==='filter-city'){app.filters.cityId=event.target.value;render()}
  if(id==='filter-tier'){app.filters.tier=event.target.value;render()}
  if(id==='move-region'){app.move.regionId=event.target.value;app.move.cityId='';render()}
  if(id==='move-city'){app.move.cityId=event.target.value}
});

document.addEventListener('input',event=>{
  if(event.target.id==='player-search'){
    app.filters.query=event.target.value;
    const caret=event.target.selectionStart;
    render();
    const field=document.getElementById('player-search');
    if(field){field.focus();field.setSelectionRange(caret,caret)}
  }
});

// ---- boot -----------------------------------------------------------------

const build=globalThis.DRIVES_DINKS_BUILD;
const buildLabel=document.getElementById('career-build');
if(buildLabel&&build)buildLabel.textContent=`BUILD ${build}`;

const loaded=loadCareer(app.storage);
if(loaded.state){app.career=loaded.state}
if(loaded.reason)toast(loaded.reason,true);

// A match played on the engine page comes back here to be scored.
const playedResult=readMatchResult();
if(playedResult&&app.career?.pendingMatch){
  clearMatchResult();
  const scored=finishCareerMatch(app.career,playedResult);
  if(scored.ok){
    app.career=scored.state;
    persist();
    toast(scored.message);
  }else toast(scored.message,true);
}
render();

if('serviceWorker' in navigator&&location.protocol!=='file:'){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
  });
}
