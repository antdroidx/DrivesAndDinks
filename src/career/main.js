// Career mode user interface.
//
// The UI is plain DOM. It reads the career from local storage on load, and
// every action writes the career back immediately so a closed tab never
// costs progress.

import {CHARACTERS,RATING_KEYS,RATING_LABELS} from '../roster.js';
import {REGIONS,allCities,cityById,COMPETITION_TIERS,TIER_BY_ID,duprBand,formatDupr,reliabilityPercent} from './geography.js';
import {buildClubIndex,buildClubRoster,buildRegionRoster,summarizeClub} from './population.js';
import {
  createCareer,train,attendEvent,joinClub,leaveClub,moveToCity,advanceWeek,
  currentEvents,canAct,trainingCost,trainingGain
} from './state.js';
import {loadCareer,saveCareer,clearCareer,careerStorage} from './save.js';
import {weekLabel,upcomingWeeks,seasonLabel,generateWeekEvents} from './calendar.js';

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
  draft:{name:'',gender:'female',archetypeId:'quinn',regionId:'north-america',cityId:''},
  filters:{areaId:'',cityId:'',tier:'',query:''},
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
  const renderer={home:renderHome,clubs:renderClubs,players:renderPlayers,calendar:renderCalendar}[app.view]??renderHome;
  view.innerHTML=hasCareer?renderer():renderCreate();
}

function renderStatus(){
  const career=app.career;
  statusStrip.innerHTML=`
    <div><small>WEEK</small><strong>${career.week+1}</strong></div>
    <div><small>ENERGY</small><strong>${career.energy}</strong></div>
    <div><small>DUPR</small><strong>${formatDupr(career.athlete.dupr)}</strong></div>
    <div><small>LOCATION</small><strong>${escapeHtml(career.cityLabel)}</strong></div>`;
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

function renderHome(){
  const career=app.career;
  const events=currentEvents(career);
  const actReady=canAct(career);
  const band=duprBand(career.athlete.dupr);
  const nextTier=COMPETITION_TIERS.find(tier=>tier.minRating>career.athlete.dupr)??null;
  const reliability=career.athlete.record.matches
    ? `${reliabilityPercent(career.athlete.record.matches)}% reliability`
    : 'Unrated · no matches yet';
  const focusOptions=RATING_KEYS.map(key=>`<option value="${key}"${key===career.trainingFocus?' selected':''}>${escapeHtml(RATING_LABELS[key]??key)}</option>`).join('');
  const groups=RATING_GROUPS.map(group=>`
    <div class="rating-group">
      <h3>${escapeHtml(group.label.toUpperCase())}</h3>
      ${group.keys.map(key=>{
        const value=career.athlete.ratings[key]??0;
        return `<div class="rating${value>=85?' hi':''}"><span>${escapeHtml(RATING_LABELS[key]??key)}</span><div class="bar"><b style="width:${Math.max(2,value)}%"></b></div><i>${value}</i></div>`;
      }).join('')}
    </div>`).join('');

  const ladder=COMPETITION_TIERS.map((tier,index)=>{
    const needsClub=tier.scope==='club'&&!career.clubId;
    const reached=career.athlete.dupr>=tier.minRating&&!needsClub;
    const next=!reached&&COMPETITION_TIERS.slice(0,index).every(earlier=>career.athlete.dupr>=earlier.minRating);
    const need=needsClub?'Needs a club':reached?'Open':`${formatDupr(tier.minRating)} rating`;
    return `<li class="${reached?'done':next?'next':'locked'}"><span class="mark">${reached?'✓':''}</span><span>${escapeHtml(tier.label)}</span><span class="need">${need}</span></li>`;
  }).join('');

  return `
  <section class="panel">
    <div class="athlete-head">
      <div>
        <h1>${escapeHtml(career.athlete.name)}</h1>
        <div class="athlete-meta">${escapeHtml(career.athlete.archetypeLabel)} · ${career.athlete.age} · ${escapeHtml(career.athlete.cultureLabel ?? career.athlete.culture)} · ${career.athlete.handedness}-handed</div>
        <div class="tags">
          <span class="tag accent">${escapeHtml(career.regionLabel)}</span>
          <span class="tag">${escapeHtml(career.areaLabel)}</span>
          <span class="tag">${escapeHtml(career.cityLabel)}</span>
          ${career.club?`<span class="tag accent">${escapeHtml(career.club.name)}</span>`:'<span class="tag">No club</span>'}
        </div>
      </div>
      <div style="text-align:right">
        <small class="muted">${escapeHtml(seasonLabel(career.week))}</small>
        <div style="font-size:30px;font-weight:700">${formatDupr(career.athlete.dupr)}</div>
        <small class="muted">DUPR · ${escapeHtml(band.label)}</small>
        <div class="hint">${escapeHtml(reliability)}</div>
        <div class="hint">Next: ${escapeHtml(nextTier?nextTier.label:'the pro league')} at ${formatDupr(nextTier?nextTier.minRating:5)}</div>
      </div>
    </div>
    <div class="energy-bar"><b style="width:${career.energy}%"></b></div>
    <div class="hint">${career.energy} energy · ${actReady?'You have an action left this week.':'You have used this week. Advance the calendar.'}</div>
    <div class="actions">
      <div class="field" style="flex:1 1 190px;margin:0">
        <label for="focus-select">TRAINING FOCUS</label>
        <select id="focus-select" ${actReady?'':'disabled'}>${focusOptions}</select>
      </div>
      <button type="button" class="secondary" data-action="train" ${actReady&&career.energy>=trainingCost(career)?'':'disabled'} style="flex:1 1 160px;align-self:flex-end">PRACTISE · ${trainingCost(career)} ENERGY</button>
      <button type="button" class="secondary" data-action="advance" style="flex:1 1 160px;align-self:flex-end">ADVANCE WEEK →</button>
    </div>
    <div class="hint">Practice gives +${trainingGain(career,career.trainingFocus)} to the focused rating and +1 control. Later gains are slower than early ones.</div>
  </section>

  <div class="grid two">
    <section class="panel">
      <h2>THIS WEEK · ${escapeHtml(weekLabel(career.week))}</h2>
      ${events.length?events.map(event=>eventRow(event,actReady)).join(''):'<p>No events this week. Join a club to get club night on the calendar.</p>'}
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
      <h2>RECENT</h2>
      <ul class="history">
        ${[...career.log].reverse().slice(0,8).map(entry=>`<li><span>${escapeHtml(weekLabel(entry.week).split(' · ')[0])}</span>${escapeHtml(entry.text)}</li>`).join('')||'<li>Nothing yet.</li>'}
      </ul>
    </section>
  </div>`;
}

function eventRow(event,actReady){
  const locked=!event.eligible.ok;
  return `<div class="event">
    <div class="body">
      <strong>${escapeHtml(event.title)}</strong>
      <small>${escapeHtml(event.venue)} · ${event.energyCost} energy${event.kind==='practice'?'':' · match'}</small>
      ${locked?`<div class="lock">${escapeHtml(event.lockedReason)}</div>`:''}
    </div>
    ${locked?'':`<button type="button" class="secondary" data-action="attend" data-event="${event.id}" ${actReady?'':'disabled'}>${event.kind==='practice'?'PRACTISE':'ENTER'}</button>`}
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
        <small>${escapeHtml(athlete.archetypeLabel)} · ${escapeHtml(athlete.cultureLabel)} · ${athlete.age} · ${athlete.handedness}-handed · DUPR ${formatDupr(athlete.dupr)}</small>
      </div>
    </div>`).join('')}
  </div>`:''}`;
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
        <small>${escapeHtml(athlete.archetypeLabel)} · ${escapeHtml(athlete.cultureLabel)} · ${escapeHtml(athlete.cityLabel)} · ${escapeHtml(athlete.clubName)}</small>
        <small>DUPR ${formatDupr(athlete.dupr)} · ${escapeHtml(duprBand(athlete.dupr).label)} · best skill ${escapeHtml(RATING_LABELS[topKey(athlete.ratings)]??topKey(athlete.ratings))} ${athlete.ratings[topKey(athlete.ratings)]}</small>
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
  const actReady=canAct(career);
  return `
  <section class="panel">
    <h2>CALENDAR · ${escapeHtml(career.regionLabel.toUpperCase())}</h2>
    <p>${escapeHtml(seasonLabel(career.week))} · club nights weekly, city and regional rounds on their own cycles.</p>
    ${weeks.map(entry=>{
      const events=generateWeekEvents(career,entry.week);
      return `<div class="week${entry.isCurrent?' current':''}">
        <h3><span>${escapeHtml(entry.label)}</span><small>${escapeHtml(entry.season)}</small></h3>
        ${events.length?events.map(event=>eventRow(event,actReady&&entry.isCurrent)).join(''):'<p class="empty">Quiet week.</p>'}
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
        cityId:document.getElementById('draft-city')?.value
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
    if(action==='advance'){apply(advanceWeek(app.career));return}
    if(action==='join'){apply(joinClub(app.career,trigger.dataset.club));return}
    if(action==='leave'){apply(leaveClub(app.career));return}
    if(action==='attend'){apply(attendEvent(app.career,trigger.dataset.event));return}
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
  if(id==='draft-gender'){app.draft.gender=event.target.value}
  if(id==='draft-archetype'){app.draft.archetypeId=event.target.value}
  if(id==='filter-area'){
    app.filters.areaId=event.target.value;
    app.filters.cityId='';
    render();
  }
  if(id==='filter-city'){app.filters.cityId=event.target.value;render()}
  if(id==='filter-tier'){app.filters.tier=event.target.value;render()}
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
render();

if('serviceWorker' in navigator&&location.protocol!=='file:'){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
  });
}
