// Career mode user interface.
//
// The UI is plain DOM. It reads the career from local storage on load, and
// every action writes the career back immediately so a closed tab never
// costs progress.

import {CHARACTERS,RATING_KEYS,RATING_LABELS,PADDLE_SHAPES,CLOTHING_COLORS,PADDLE_COLORS,HAIR_COLORS,SKIN_COLORS,HEADWEAR_OPTIONS,EYEWEAR_OPTIONS,OUTFIT_OPTIONS,DEFAULT_SELECTION,normalizeSelection,buildProfile,hairStylesFor} from '../roster.js';
import {onCharacterSpritesReady} from '../pixel-character.js';
import {createAnimeGameRenderer} from '../anime-game.js';
import {REGIONS,allCities,cityById,COMPETITION_EVENTS,ratingBand,formatRating,reliability,divisionFor,tourFor,tourRank,formatLabel,FORMATS,RATING_BRACKETS,PRO_FLOOR_RATING} from './geography.js';
import {buildClubIndex,buildClubRoster,buildRegionRoster,summarizeClub} from './population.js';
import {
  createCareer,train,attendEvent,joinClub,leaveClub,moveToCity,advanceWeek,
  currentEvents,canAct,canTrain,canEnterEvent,eventBlockReason,trainingCost,trainingGain,trainingSessionsThisWeek,weeklyRecovery,MAX_TRAINING_SESSIONS,INTERNATIONAL_TRAVEL_COST,advanceToNextEvent,formatsPlayed,eventEntryCost,trainingSessionsLimit,AMATEUR_TOURNAMENTS_PER_MONTH,amateurTournamentSlotsUsed
} from './state.js';
import {loadCareer,saveCareer,clearCareer,careerStorage} from './save.js';
import {exportCareerPortable,importCareerPortable} from './portable-save.js';
import {archiveCareer,hydrateCareerWithArchive} from './career-archive.js';
import {startCareerMatch,finishCareerMatch,quickSimCareerMatch,simulateCompetitionToEnd,matchSimulationPolicy} from './career-match.js';
import {isPlayerDone} from './tournament.js';
import {writePendingMatch,takeMatchResult,pendingMatchId} from './handshake.js';
import {boardPosition,nearbyRivals,findRival,topPlayers,qualificationStatus,sponsorsFor,careerForm,QUALIFICATION_POINTS} from './standings.js';
import {weekLabel,upcomingWeeks,generateWeekEvents,weekShortLabel} from './calendar.js';
import {rankingSummary} from './ranking.js';
import {isContracted,isIneligible,obligationProgress,contractLevel,SEASON_WEEKS} from './contracts.js';
import {analyticsSummary} from './analytics.js';
import {retire,retirementAdvice,allTimeBoard} from './retirement.js';
import {choosePartner,resolvePartner,clubAccess,partnerGenderAllowed,currentCoachFeedback,partnerCandidates} from './club-life.js';
import {opponentHistory} from './opponents.js';
import {EXPERIENCE_OPTIONS,STARTING_TRAITS,centimetersToFeetInches,feetInchesToCentimeters,kilogramsToPounds,poundsToKilograms} from './creation.js';
import {directoryPage} from './directory.js';
import {financeSummary,COACHING_FEE} from './finance.js';
import {weeklyActivityPlan,projectEventLoad} from './planning.js';
import {cpuWorldSummary,createCpuWorld} from './cpu-careers.js';
import {currentInjury,activeInjuries} from './injuries.js';
import {equipmentCatalog,signatureEligible,purchaseEquipment,equipPaddle,equippedPaddle,createSignaturePaddle,equipmentStats} from './equipment.js';
import {teamCareerSummary} from './team-league.js';
import {pendingInvitations,acceptInvitation,declineInvitation,withdrawInvitation,inviteClubMate} from './invitations.js';
import {inboxMessages,unreadCount,markMessageRead,archiveMessage,INBOX_CATEGORIES} from './inbox.js';

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
  draft:{name:'',gender:'female',archetypeId:'quinn',regionId:'north-america',cityId:'',age:25,height:164,weight:64,experience:'athlete',trait:'none',
    handedness:DEFAULT_SELECTION.handedness,shirtColor:DEFAULT_SELECTION.shirtColor,paddleColor:DEFAULT_SELECTION.paddleColor,highlightColor:DEFAULT_SELECTION.highlightColor,hairStyle:DEFAULT_SELECTION.hairStyle,hairColor:DEFAULT_SELECTION.hairColor,skinColor:DEFAULT_SELECTION.skinColor,headwear:DEFAULT_SELECTION.headwear,eyewear:DEFAULT_SELECTION.eyewear,outfit:DEFAULT_SELECTION.outfit,court:DEFAULT_SELECTION.court},
  filters:{areaId:'',cityId:'',tier:'',query:'',gender:'',bracket:'',minAge:'',maxAge:'',sort:'rating-desc',page:0},
  move:{regionId:'',cityId:''},
  standingsFormat:null,
  inboxFilters:{category:'',query:'',archived:false},
  expandedClub:null,
  directoryCache:null,
  storage:careerStorage()
};

const view=document.getElementById('career-view');
const nav=document.getElementById('career-nav');
const statusStrip=document.getElementById('career-status');
const toastEl=document.getElementById('career-toast');
const resetButton=document.getElementById('career-reset');

const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>{const amount=Math.round(Number(value)||0);return (amount<0?'-$':'$')+Math.abs(amount).toLocaleString('en-US')};
const EQUIPMENT_STAT_LABELS=Object.freeze({power:'Power',control:'Control',spin:'Spin',reach:'Reach',hands:'Hands',sweetSpot:'Sweet spot'});
function equipmentStatRows(item){
  const stats=equipmentStats(item);
  return `<div class="paddle-stats" aria-label="${escapeHtml(item.label)} attributes">${Object.entries(stats).map(([key,value])=>`<div class="paddle-stat"><span>${escapeHtml(EQUIPMENT_STAT_LABELS[key]??key)}</span><div><i style="width:${value}%"></i></div><strong>${value}</strong></div>`).join('')}</div>`;
}

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
  if(hasCareer&&Object.keys(app.career.cpuWorld?.records??{}).length===0){
    app.career.cpuWorld=createCpuWorld(app.career.seed,app.career.regionId,app.career.week);
    persist();
  }
  nav.hidden=!hasCareer;
  statusStrip.hidden=!hasCareer;
  resetButton.hidden=!hasCareer;
  if(hasCareer)renderStatus();
  for(const button of nav.querySelectorAll('button'))button.classList.toggle('active',button.dataset.view===app.view);
  const inboxButton=nav.querySelector('[data-view="inbox"]');
  if(inboxButton){const unread=hasCareer?unreadCount(app.career):0;inboxButton.textContent=unread?`INBOX · ${unread}`:'INBOX';}
  const renderer={home:renderHome,clubs:renderClubs,team:renderTeam,inbox:renderInbox,players:renderPlayers,calendar:renderCalendar,standings:renderStandings,record:renderRecord}[app.view]??renderHome;
  view.innerHTML=hasCareer?renderer():renderCreate();
  if(!hasCareer)requestAnimationFrame(drawCareerDraftPreview);
}

function renderStatus(){
  const career=app.career;
  statusStrip.innerHTML=`
    <div><small>WEEK</small><strong>${career.week+1}</strong></div>
    <div><small>ENERGY</small><strong>${career.energy}</strong></div>
    <div><small>BEST RATING</small><strong>${formatRating(Math.max(...Object.values(career.athlete.formats??{doubles:0})))}</strong></div>
    <div><small>LOCATION</small><strong>${escapeHtml(career.cityLabel)}</strong></div>
    <div><small>TOUR</small><strong>${escapeHtml(contractLevel(career)==='none'?'NO CONTRACT':contractLevel(career).toUpperCase())}</strong></div>
    <div><small>MONEY</small><strong>${money(career.money)}</strong></div>
    <div><small>AGE</small><strong>${career.athlete.age}</strong></div>`;
}

function optionTags(items,value,labelKey='name'){
  return items.map(item=>`<option value="${item.id}"${item.id===value?' selected':''}>${escapeHtml(item[labelKey]??item.label??item.id)}</option>`).join('');
}

function careerDraftSelection(){
  return normalizeSelection({
    character:app.draft.archetypeId,
    gender:app.draft.gender,
    handedness:app.draft.handedness,
    customName:app.draft.name,
    paddle:'balanced',
    paddleShape:'hybrid',
    shirtColor:app.draft.shirtColor,
    paddleColor:app.draft.paddleColor,
    highlightColor:app.draft.highlightColor,
    hairStyle:app.draft.hairStyle,
    hairColor:app.draft.hairColor,
    skinColor:app.draft.skinColor,
    headwear:app.draft.headwear,
    eyewear:app.draft.eyewear,
    outfit:app.draft.outfit,
    court:app.draft.court
  });
}

function drawCareerDraftPreview(){
  const canvas=document.getElementById('career-player-preview');
  if(!canvas)return;
  const selection=careerDraftSelection(),profile=buildProfile(selection),ctx=canvas.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(2,0,0,2,0,0);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#173039';ctx.fillRect(0,0,150,180);ctx.fillStyle='#355e60';ctx.fillRect(0,142,150,38);ctx.fillStyle='#eff3cf55';ctx.fillRect(0,150,150,2);
  drawCareerCharacter(ctx,{personalize:true,appearance:profile.appearance,characterId:selection.character,handedness:selection.handedness,mode:'idle',frame:0,phase:0,x:8,y:28,width:130,height:130,view:'far',side:selection.handedness==='left'?-1:1,paddleShape:selection.paddleShape,lighting:'depth',style:'anime',look:'storybook',outfit:selection.outfit});
  canvas.setAttribute('aria-label',`${app.draft.name||'Career player'} appearance preview`);
}

const drawCareerCharacter=createAnimeGameRenderer();
onCharacterSpritesReady(()=>{if(!app.career)drawCareerDraftPreview()});

function renderCreate(){
  const region=REGIONS.find(entry=>entry.id===app.draft.regionId)??REGIONS[0];
  const cities=allCities(region.id);
  const cityId=cities.some(city=>city.id===app.draft.cityId)?app.draft.cityId:cities[0].id;
  const archetypes=CHARACTERS.map(character=>`<option value="${character.id}"${character.id===app.draft.archetypeId?' selected':''}>${escapeHtml(character.style)} — ${escapeHtml(character.description)}</option>`).join('');
  const cityOptions=cities.map(city=>`<option value="${city.id}"${city.id===cityId?' selected':''}>${escapeHtml(city.label)}, ${escapeHtml(city.country)}</option>`).join('');
  const experienceOptions=EXPERIENCE_OPTIONS.map(option=>`<option value="${option.id}"${option.id===app.draft.experience?' selected':''}>${escapeHtml(option.label)} — ${escapeHtml(option.description)}</option>`).join('');
  const traitOptions=STARTING_TRAITS.map(option=>`<option value="${option.id}"${option.id===app.draft.trait?' selected':''}>${escapeHtml(option.label)} — ${escapeHtml(option.description)}</option>`).join('');
  const imperialHeight=centimetersToFeetInches(app.draft.height),imperialWeight=kilogramsToPounds(app.draft.weight);
  const hairChoices=[{id:'design',name:'As designed'},...hairStylesFor(app.draft.gender)];
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
        <input id="draft-age" type="number" min="10" max="80" value="${app.draft.age}" inputmode="numeric">
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
    <details class="career-profile-designer" open>
      <summary>CHARACTER PROFILE <small>Built with the on-court game renderer</small></summary>
      <div class="career-profile-layout">
        <div class="career-profile-preview"><canvas id="career-player-preview" width="300" height="360" aria-label="Career player appearance preview"></canvas><small>${escapeHtml(CHARACTERS.find(item=>item.id===app.draft.archetypeId)?.style??'Career player')}</small></div>
        <div class="career-profile-controls">
          <div class="field-row">
            <div class="field"><label for="draft-look-hand">HANDEDNESS</label><select id="draft-look-hand"><option value="right"${app.draft.handedness==='right'?' selected':''}>Right-handed</option><option value="left"${app.draft.handedness==='left'?' selected':''}>Left-handed</option></select></div>
            <div class="field"><label for="draft-look-outfit">OUTFIT</label><select id="draft-look-outfit">${optionTags(OUTFIT_OPTIONS,app.draft.outfit)}</select></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="draft-look-hair">HAIR</label><select id="draft-look-hair">${optionTags(hairChoices,app.draft.hairStyle)}</select></div>
            <div class="field"><label for="draft-look-hair-color">HAIR COLOR</label><select id="draft-look-hair-color">${optionTags(HAIR_COLORS,app.draft.hairColor)}</select></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="draft-look-skin">SKIN TONE</label><select id="draft-look-skin">${optionTags(SKIN_COLORS,app.draft.skinColor)}</select></div>
            <div class="field"><label for="draft-look-shirt">KIT COLOR</label><select id="draft-look-shirt">${optionTags(CLOTHING_COLORS,app.draft.shirtColor)}</select></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="draft-look-paddle-color">PADDLE COLOR</label><select id="draft-look-paddle-color">${optionTags(PADDLE_COLORS,app.draft.paddleColor)}</select></div>
            <div class="field"><label for="draft-look-highlight">ACCENT COLOR</label><select id="draft-look-highlight">${optionTags(PADDLE_COLORS,app.draft.highlightColor)}</select></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="draft-look-headwear">HEADWEAR</label><select id="draft-look-headwear">${optionTags(HEADWEAR_OPTIONS,app.draft.headwear)}</select></div>
            <div class="field"><label for="draft-look-eyewear">EYEWEAR</label><select id="draft-look-eyewear">${optionTags(EYEWEAR_OPTIONS,app.draft.eyewear)}</select></div>
          </div>
        </div>
      </div>
    </details>    <div class="field-row">
      <div class="field">
        <label>HEIGHT · FT / IN</label>
        <div class="measurement-pair">
          <input id="draft-height-ft" type="number" min="4" max="6" value="${imperialHeight.feet}" inputmode="numeric" aria-label="Height feet">
          <span>ft</span>
          <input id="draft-height-in" type="number" min="0" max="11" value="${imperialHeight.inches}" inputmode="numeric" aria-label="Height inches">
          <span>in</span>
        </div>
      </div>
      <div class="field">
        <label for="draft-weight-lb">WEIGHT · LBS</label>
        <input id="draft-weight-lb" type="number" min="88" max="309" value="${imperialWeight}" inputmode="numeric">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="draft-experience">PLAYING EXPERIENCE</label>
        <select id="draft-experience">${experienceOptions}</select>
      </div>
      <div class="field">
        <label for="draft-trait">STARTING TRAIT</label>
        <select id="draft-trait">${traitOptions}</select>
      </div>
    </div>
    <button type="button" class="primary" data-action="create">BEGIN CAREER →</button>
    <div class="career-save-load">
      <button type="button" class="secondary" data-action="import-career">LOAD EXISTING CAREER FILE</button>
      <input id="career-import-file" type="file" accept=".dnd,.txt,.json" hidden>
      <p class="hint">Careers save automatically on this device. Import a portable career file here if you are starting from a backup.</p>
    </div>
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
    `<li class="${entry.won?'won':'lost'}"><span class="tournament-round">R${entry.round+1}</span><span class="tournament-result">${entry.won?'W':'L'}</span><span class="tournament-opponent">${escapeHtml(entry.opponent)}</span><span class="tournament-score">${escapeHtml(entry.score)}</span></li>`
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
  const quickPolicy=pending?matchSimulationPolicy(pending,tournament):null;
  return `<section class="panel">
    <h2>${escapeHtml(tournament.label)} · ${escapeHtml(tournament.bracket)} ${escapeHtml(tournament.format)}</h2>
    <div class="hint">Round ${(tournament.round??0)+1} of ${total} · ${tournament.teams?.length??tournament.size} teams in the draw</div>
    ${teamPanel}
    <p><strong>Next match: ${escapeHtml(opponent)}</strong></p>
    ${pending?`<div class="actions"><button type="button" class="primary" data-action="resume-match">PLAY MATCH →</button><button type="button" class="secondary" data-action="quick-sim" ${quickPolicy?.allowed?'':'disabled'} title="${escapeHtml(quickPolicy?.reason??'')}">QUICK SIM</button><button type="button" class="secondary" data-action="sim-competition">SIM TO NEXT DECISION</button></div>${quickPolicy&&!quickPolicy.allowed?`<p class="hint result-warning">${escapeHtml(quickPolicy.reason)}</p>`:''}`:tournament.nightComplete?'<p class="hint">League night complete. Advance the calendar, quick-sim the next card, or simulate the remaining league.</p><div class="actions"><button type="button" class="secondary" data-action="sim-competition">SIM REMAINING LEAGUE</button></div>':done?'':`<div class="actions"><button type="button" class="primary" data-action="resume-tournament">RESUME COMPETITION →</button><button type="button" class="secondary" data-action="sim-competition">SIM TO NEXT DECISION</button></div>`}
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
  const eventReady=events.some(event=>event.eligible.ok&&event.options.length&&canEnterEvent(career,event));
  const sessions=trainingSessionsThisWeek(career);
  const sessionLimit=trainingSessionsLimit(career);
  const plan=weeklyActivityPlan(career,events,{trainingCost:trainingCost(career),recovery:weeklyRecovery(career),trainingRemaining:Math.max(0,sessionLimit-sessions)});
  const world=cpuWorldSummary(career.cpuWorld);
  const injury=currentInjury(career);
  const paddle=equippedPaddle(career);
  const catalog=equipmentCatalog(career);
  const ownedPaddles=catalog.filter(item=>career.equipment?.owned?.includes(item.id));
  const paddles=catalog.filter(item=>item.id!=='allcourt-hybrid');
  const loadoutPaddleOptions=ownedPaddles.map(item=>`<option value="${item.id}"${item.id===paddle.id?' selected':''}>${escapeHtml(item.label)}</option>`).join('');
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
  const tournamentSlots=amateurTournamentSlotsUsed(career);
  const tournamentText=isContracted(career)?'Pro schedule active':`Amateur tournaments ${tournamentSlots}/${AMATEUR_TOURNAMENTS_PER_MONTH} this month`;
  const bestCareerRating=Math.max(...FORMATS.map(format=>career.athlete.formats[format]??0));
  const proRatingGap=Math.max(0,PRO_FLOOR_RATING-bestCareerRating);
  const proPointsGap=Math.max(0,1600-(career.athlete.tourPoints??0));
  const proReady=isContracted(career)&&proRatingGap===0&&proPointsGap===0;
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
          <span class="tag${injury?' warn':''}">${injury?escapeHtml(injury.severityLabel+' · '+injury.areaLabel):'Healthy'}</span>
          <span class="tag">${escapeHtml(paddle.label)}</span>
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
        <div class="hint">${escapeHtml(tournamentText)}</div>
        <div class="hint">${escapeHtml(retirement.message)}</div>
        <div class="hint">Next on the ladder: ${escapeHtml(nextEvent?nextEvent.label:'the pro league')}</div>
      </div>
    </div>
    <div class="energy-bar"><b style="width:${career.energy}%"></b></div>
    <div class="hint">${career.energy} energy · ${sessions}/${sessionLimit} training sessions used · ${eventReady?'an event is still open this week.':'you have entered your event this week.'} You recover ${weeklyRecovery(career)} a week.</div>
    <div class="actions">
      <div class="field" style="flex:1 1 190px;margin:0">
        <label for="focus-select">TRAINING FOCUS</label>
        <select id="focus-select">${focusOptions}</select>
      </div>
      <label class="coach-toggle" style="flex:0 1 170px;align-self:flex-end"><input id="coached-training" type="checkbox"${career.coachingEnabled?' checked':''} ${career.money>=COACHING_FEE&&trainReady?'':'disabled'}> COACHED · +$${COACHING_FEE}</label>
      <button type="button" class="secondary" data-action="train" ${trainReady&&!career.retired?'':'disabled'} style="flex:1 1 160px;align-self:flex-end">TRAIN · ${trainingCost(career)} ENERGY</button>
      <button type="button" class="secondary" data-action="advance" style="flex:1 1 160px;align-self:flex-end" ${career.retired?'disabled':''}>ADVANCE WEEK →</button>
      <button type="button" class="secondary" data-action="next-event" style="flex:1 1 190px;align-self:flex-end" ${career.retired?'disabled':''}>NEXT EVENT →</button>
      <button type="button" class="secondary" data-action="save-career" style="flex:1 1 140px;align-self:flex-end">SAVE NOW</button>
      <button type="button" class="secondary" data-action="export-career" style="flex:1 1 170px;align-self:flex-end">DOWNLOAD SAVE</button>
      <button type="button" class="secondary" data-action="import-career" style="flex:1 1 170px;align-self:flex-end">LOAD SAVE</button>
      <input id="career-import-file" type="file" accept=".dnd,.txt,.json" hidden>
    </div>
    <div class="hint">Training develops an attribute: +${trainingGain(career,career.trainingFocus)} to the focused rating and +1 control. Coached training adds another point and costs $${COACHING_FEE}. Training capacity is ${sessionLimit} sessions at age ${career.athlete.age}.</div>
  </section>

  <section class="panel match-loadout-panel">
    <h2>MATCH LOADOUT</h2>
    <div class="loadout-panel-grid">
      <div>
        <small class="muted">CURRENT PADDLE</small>
        <strong>${escapeHtml(paddle.label)}</strong>
        <p>${escapeHtml(paddle.familyLabel)} face · ${escapeHtml(paddle.shapeLabel)} shape · ${escapeHtml(paddle.description)}</p>
        ${equipmentStatRows(paddle)}
      </div>
      <div>
        <label for="dashboard-paddle">PADDLE BEFORE MATCH</label>
        <select id="dashboard-paddle" data-loadout-paddle>${loadoutPaddleOptions}</select>
        <small class="muted">This setup is written into the Matchup screen when you enter an event.</small>
        <div class="loadout-profile-line"><span>PROFILE</span><strong>${escapeHtml(career.athlete.appearance?.outfit??career.athlete.outfit??'performance')}</strong><small>${escapeHtml(career.athlete.appearance?.hairStyle??career.athlete.hairStyle??'design')} hair · ${escapeHtml(career.athlete.appearance?.shirtColor??career.athlete.shirtColor??'green')} kit</small></div>
      </div>
    </div>
  </section>

  ${career.lastMatchResult?`<section class="panel last-result"><h2>LAST MATCH</h2><div class="board-head"><div><small>RESULT</small><strong>${career.lastMatchResult.won?'WIN':'LOSS'}</strong></div><div><small>SCORE</small><strong>${escapeHtml(career.lastMatchResult.score)}</strong></div><div><small>RATING</small><strong>${formatRating(career.lastMatchResult.rating)}</strong></div><div><small>CHANGE</small><strong class="${career.lastMatchResult.delta>=0?'up':'down'}">${career.lastMatchResult.delta>=0?'+':''}${Number(career.lastMatchResult.delta).toFixed(3)}</strong></div></div><p>${escapeHtml(career.lastMatchResult.label)} · ${escapeHtml(career.lastMatchResult.bracket)} ${escapeHtml(career.lastMatchResult.format)} · ${escapeHtml(career.lastMatchResult.tournamentStatus)}</p>${career.lastMatchResult.nextOpponent?`<p class="hint">Next opponent: ${escapeHtml(career.lastMatchResult.nextOpponent)}</p>`:''}${career.lastMatchResult.injury?`<p class="result-warning">${escapeHtml(career.lastMatchResult.injury.severity)} · ${escapeHtml(career.lastMatchResult.injury.area)}. Available ${escapeHtml(career.lastMatchResult.injury.returnLabel)}.</p>`:''}</section>`:''}

  ${injury?`<section class="panel injury-panel"><h2>RECOVERY</h2><p><strong>${escapeHtml(injury.severityLabel)} · ${escapeHtml(injury.areaLabel)}</strong> from ${escapeHtml(injury.cause)}. You can compete again ${escapeHtml(injury.returnLabel)}. Recovery is reduced to ${Math.round((injury.recoveryFactor??.7)*100)}% while injured.</p></section>`:''}

  <section class="panel">
    <h2>PATH TO PRO</h2>
    <div class="board-head">
      <div><small>RATING GATE</small><strong>${formatRating(bestCareerRating)} / ${PRO_FLOOR_RATING.toFixed(3)}</strong></div>
      <div><small>TOUR POINTS</small><strong>${Math.round(career.athlete.tourPoints??0).toLocaleString('en-US')} / 1,600</strong></div>
      <div><small>CONTRACT</small><strong>${escapeHtml(contractLevel(career).toUpperCase())}</strong></div>
      <div><small>STATUS</small><strong>${proReady?'READY':isContracted(career)?'QUALIFYING':'LOCKED'}</strong></div>
    </div>
    <p>${proReady?'Your contract, rating and tour points meet the professional entry requirements.':escapeHtml([!isContracted(career)?'Sign a contract.':null,proRatingGap>0?proRatingGap.toFixed(3)+' rating needed.':null,proPointsGap>0?Math.round(proPointsGap).toLocaleString('en-US')+' tour points needed.':null].filter(Boolean).join(' '))}</p>
  </section>

  <section class="panel">
    <h2>WEEK PLAN</h2>
    <div class="board-head">
      <div><small>ENERGY LEFT</small><strong>${plan.energy}</strong></div>
      <div><small>BALANCE</small><strong>${money(plan.money)}</strong></div>
      <div><small>NEXT RECOVERY</small><strong>+${plan.recovery}</strong></div>
      <div><small>EVENT OPTIONS</small><strong>${plan.eventOptions}</strong></div>
    </div>
    <p class="hint">Training: ${plan.trainingCost} energy and up to ${plan.trainingRemaining} sessions. ${plan.cheapest?`Cheapest event: ${money(plan.cheapest.moneyCost)} and ${plan.cheapest.energy} energy.`:'No enterable event is currently projected.'}</p>
    <p class="hint">${plan.lightest?`Lightest event: ${plan.lightest.energy} energy · ${escapeHtml(plan.lightest.matchLabel)} · projected ${plan.lightest.energyAfter} energy and ${money(plan.lightest.moneyAfter)} after entry.`:'Advance to a week with competition to compare event loads.'}</p>
  </section>

  <section class="panel">
    <h2>EQUIPMENT</h2>
    <p>Current paddle: <strong>${escapeHtml(paddle.label)}</strong> · ${escapeHtml(paddle.description)}</p>
    ${paddles.map(item=>{
      const owned=career.equipment?.owned?.includes(item.id);
      const equipped=career.equipment?.equipped===item.id;
      const action=equipped?'<span class="tag accent">EQUIPPED</span>':owned?`<button type="button" class="secondary" data-action="equip" data-item="${item.id}">EQUIP</button>`:`<button type="button" class="secondary" data-action="buy-equipment" data-item="${item.id}" ${career.money>=item.price?'':'disabled'}>BUY · ${money(item.price)}</button>`;
      return `<div class="equipment-row"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.familyLabel)} · ${escapeHtml(item.shapeLabel)} · ${escapeHtml(item.description)}</small>${equipmentStatRows(item)}</div>${action}</div>`;
    }).join('')}
    ${signatureEligible(career)?'<div class="actions"><button type="button" class="secondary" data-action="create-signature">CREATE SIGNATURE PADDLE</button></div>':'<p class="hint">A Gold contract unlocks a personal signature release.</p>'}
  </section>

  ${renderTournament(career)}

  <section class="panel">
    <h2>WORLD PULSE</h2>
    <div class="board-head">
      <div><small>ACTIVE</small><strong>${world.active}</strong></div>
      <div><small>CIRCUIT</small><strong>${world.circuit}</strong></div>
      <div><small>BACKGROUND</small><strong>${world.background}</strong></div>
      <div><small>TOUR INVITES</small><strong>${world.tourInvites}</strong></div>
      <div><small>INJURED</small><strong>${world.injured??0}</strong></div>
    </div>
    <p class="hint">${world.population.toLocaleString('en-US')} generated athletes · average age ${world.averageAge.toFixed(1)} · average rating ${world.averageRating.toFixed(2)} · ${world.entrants} entrants and ${world.retired} retirements recorded.</p>
  </section>

  <section class="panel">
    <h2>COACH & PARTNERS</h2>
    <p>${escapeHtml(currentCoachFeedback(career).message)}</p>
    <p class="hint">Gender doubles: ${escapeHtml(resolvePartner(career,'doubles')?.name??'automatic draw')} · Mixed doubles: ${escapeHtml(resolvePartner(career,'mixed')?.name??'automatic draw')}</p>
    <p class="hint">Coached sessions cost $${COACHING_FEE} and improve focused-skill growth. Injuries reduce recovery and temporarily block training and new events.</p>
  </section>

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

function eventRow(event,career,gender,active=event.week===career.week){
  const locked=!event.eligible.ok;
  const played=formatsPlayed(career,event.eventId);
  const options=event.options.filter(option=>!played.includes(option.format));
  const ready=active&&canEnterEvent(career,event)&&options.length>0;
  const blockReason=active&&!locked&&!ready?eventBlockReason(career,event):null;
  const running=event.divisions.map(division=>division.label).join(' · ');
  const cost=eventEntryCost(career,event);
  const load=projectEventLoad(career,event,{recovery:weeklyRecovery(career)});
  const divisionNote=played.length?' · completed '+played.join(', '):'';
  const loadoutPaddle=equippedPaddle(career);
  const ownedPaddles=equipmentCatalog(career).filter(item=>career.equipment?.owned?.includes(item.id));
  const loadoutOptions=ownedPaddles.map(item=>`<option value="${item.id}"${item.id===loadoutPaddle.id?' selected':''}>${escapeHtml(item.label)} · ${equipmentStats(item).power}P / ${equipmentStats(item).control}C</option>`).join('');
  return `<div class="event">
    <div class="body">
      <strong>${escapeHtml(event.title)}</strong>
      <small>${escapeHtml(event.venue)} · ${cost} energy · ${money(load.moneyCost)} · ${escapeHtml(load.matchLabel)}${escapeHtml(divisionNote)}</small>
      <small>After entry: ${load.energyAfter} energy · ${money(load.moneyAfter)} · +${load.recovery} recovery next week</small>
      <small>Brackets: ${escapeHtml(running)}</small>
      ${locked?`<div class="lock">${escapeHtml(event.lockedReason)}</div>`:!active?'<div class="lock">Upcoming · advance the calendar to enter.</div>':blockReason?`<div class="lock">${escapeHtml(blockReason)}</div>`:options.length?`<select class="bracket" data-division="${event.id}" ${ready?'':'disabled'}>${bracketOptions(event,gender,options)}</select>`:'<div class="lock">All offered divisions are complete.</div>'}
      <label class="event-loadout"><span>PADDLE · ${escapeHtml(loadoutPaddle.label)}</span><select data-loadout-paddle aria-label="Paddle for this match">${loadoutOptions}</select></label>
    </div>
    ${locked||!active||!options.length?'':`<div class="event-actions"><button type="button" class="secondary" data-action="attend" data-event="${event.id}" ${ready?'':'disabled'}>ENTER</button><button type="button" class="secondary" data-action="quick-attend" data-event="${event.id}" ${ready?'':'disabled'}>QUICK SIM</button></div>`}
  </div>`;
}

function renderTeam(){
  const career=app.career;
  const summary=teamCareerSummary(career.teamCareer);
  const invitations=pendingInvitations(career);
  const season=career.teamCareer?.currentSeason;
  const standings=[...(season?.standings??season?.franchises??[])].sort((a,b)=>(b.wins??0)-(a.wins??0)||(b.points??0)-(a.points??0)||(b.rating??0)-(a.rating??0));
  const fixtures=(season?.fixtures??[]).flatMap(round=>round.matches??[]).filter(Boolean);
  const playerTeam=summary.playerTeam;
  const milp=summary.milp;
  const partner=career.clubId?partnerCandidates(career,'doubles').slice(0,6):[];
  const invitationRows=invitations.map(item=>`<div class="invitation-row"><div><strong>${escapeHtml(item.kind==='team'?'MLP roster invitation':item.from?.name??'Partner invitation')}</strong><small>${escapeHtml(item.context||item.format)} · expires week ${item.expiresWeek+1}</small></div><div class="actions">${item.direction==='incoming'?`<button type="button" class="secondary" data-action="accept-invite" data-invite="${item.id}">ACCEPT</button><button type="button" class="secondary" data-action="decline-invite" data-invite="${item.id}">DECLINE</button>`:`<button type="button" class="secondary" data-action="withdraw-invite" data-invite="${item.id}">WITHDRAW</button>`}</div></div>`).join('');
  return `
  <section class="panel">
    <h2>TEAM COMPETITION</h2>
    <p>${playerTeam?`You are on the <strong>${escapeHtml(playerTeam.name)}</strong> roster.`:'You are not on an MLP franchise roster yet. Teams may invite you as your rating rises.'}</p>
    <div class="board-head">
      <div><small>FRANCHISES</small><strong>${summary.franchises}</strong></div>
      <div><small>SEASON</small><strong>${escapeHtml(summary.seasonStatus?.toUpperCase()??'OFF')}</strong></div>
      <div><small>TITLES</small><strong>${career.teamCareer?.seasons?.filter(entry=>entry.champion?.id===summary.playerTeam?.id).length??0}</strong></div>
      <div><small>DRAFTS</small><strong>${summary.drafts}</strong></div>
    </div>
  </section>

  <section class="panel">
    <h2>INVITATIONS · ${invitations.length}</h2>
    ${invitationRows||'<p class="muted">No pending invitations.</p>'}
  </section>

  <div class="grid two">
    <section class="panel">
      <h2>MLP STANDINGS</h2>
      <ul class="history">${standings.map((team,index)=>`<li><span>#${team.place??index+1} ${escapeHtml(team.name)}</span><strong>${team.wins??0}W</strong><em>${team.losses??0}L</em></li>`).join('')}</ul>
    </section>
    <section class="panel">
      <h2>MLP SCHEDULE</h2>
      ${fixtures.length?`<ul class="history">${fixtures.map(match=>`<li><span>Week ${match.week+1}</span><strong>${escapeHtml(match.homeName??match.home)}</strong><em>${match.played?escapeHtml(match.score):'vs '+escapeHtml(match.awayName??match.away)}</em></li>`).join('')}</ul>`:'<p class="muted">The next season begins at the next team window.</p>'}
    </section>
  </div>

  <section class="panel">
    <h2>MiLP CLUB SERIES</h2>
    ${milp.active?`<p><strong>${escapeHtml(milp.active.clubName)} vs ${escapeHtml(milp.active.opponent)}</strong> · scheduled week ${milp.active.week+1}. CPU clubs manage the match in the background.</p>`:'<p class="muted">No active club series.</p>'}
    ${milp.history?.length?`<ul class="history">${milp.history.slice(-8).reverse().map(result=>`<li class="${result.won?'won':'lost'}"><span>Week ${result.week+1}</span><strong>${escapeHtml(result.clubName)} vs ${escapeHtml(result.opponent)}</strong><em>${escapeHtml(result.score)}</em></li>`).join('')}</ul>`:''}
  </section>

  <section class="panel">
    <h2>INVITE A CLUB MATE</h2>
    ${partner.length?partner.map(member=>`<div class="invitation-row"><div><strong>${escapeHtml(member.name)}</strong><small>Doubles ${formatRating(member.formats?.doubles??0)} · ${escapeHtml(member.archetypeLabel??'club mate')}</small></div><button type="button" class="secondary" data-action="invite-mate" data-athlete="${member.id}" data-format="doubles">INVITE</button></div>`).join(''):'<p class="muted">Join a club to invite a doubles partner.</p>'}
  </section>`;
}
function renderInbox(){
  const career=app.career;
  const filters=app.inboxFilters;
  const messages=inboxMessages(career,filters);
  const categoryOptions=INBOX_CATEGORIES.map(category=>`<option value="${category}"${filters.category===category?' selected':''}>${escapeHtml(category[0].toUpperCase()+category.slice(1))}</option>`).join('');
  return `
  <section class="panel">
    <h2>CAREER INBOX · ${unreadCount(career)} UNREAD</h2>
    <div class="filters">
      <input id="inbox-search" type="search" placeholder="Search news and messages" value="${escapeHtml(filters.query)}">
      <select id="inbox-category"><option value="">All categories</option>${categoryOptions}</select>
      <select id="inbox-archive"><option value="">Active</option><option value="true"${filters.archived?' selected':''}>Archived</option></select>
    </div>
    ${messages.length?messages.map(item=>`<article class="inbox-message${item.read?' read':''}">
      <div class="inbox-top"><span class="tag">${escapeHtml(item.category.toUpperCase())}</span><small>Week ${item.week+1}</small></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <div class="actions">
        ${!item.read?`<button type="button" class="secondary" data-action="read-message" data-key="${escapeHtml(item.key)}">MARK READ</button>`:''}
        ${item.action?.type==='view'?`<button type="button" class="secondary" data-action="open-message" data-key="${escapeHtml(item.key)}" data-view="${escapeHtml(item.action.view)}">OPEN</button>`:''}
        ${item.action?.type==='invitation'?`<button type="button" class="secondary" data-action="accept-invite" data-invite="${escapeHtml(item.action.invitationId)}">ACCEPT</button><button type="button" class="secondary" data-action="decline-invite" data-invite="${escapeHtml(item.action.invitationId)}">DECLINE</button>`:''}
        ${!filters.archived?`<button type="button" class="secondary" data-action="archive-message" data-key="${escapeHtml(item.key)}">ARCHIVE</button>`:''}
      </div>
    </article>`).join(''):'<p class="muted">No messages match these filters.</p>'}
  </section>`;
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
    <p>${clubs.length} clubs across ${areas.length} areas. Joining a club in another city moves you there. Club reputation: ${career.clubReputation??0}.</p>
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
  const roster=expanded?buildClubRoster(career.seed,club,career.week):null;
  const summary=roster?summarizeClub(roster):null;
  const access=clubAccess(career,club);
  return `
  <div class="club">
    <div class="body">
      <strong>${escapeHtml(club.name)}</strong>
      <small>${escapeHtml(club.cityLabel)}, ${escapeHtml(club.country)} · ${escapeHtml(club.tierLabel)} · ${escapeHtml(club.surface)} · ${club.memberCount} members</small>
      ${expanded&&summary?`<small>Average rating ${summary.average} · top player ${escapeHtml(summary.top.name)} · needs ${access.required} club reputation</small>`:''}
    </div>
    <div class="actions">
      ${expanded?`<button type="button" class="secondary" data-action="join" data-club="${club.id}" ${isMember||!access.ok?'disabled':''}>${isMember?'MEMBER':access.ok?'JOIN':'REP '+access.required}</button>`:''}
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
      ${isMember?`<div class="actions">
        ${partnerGenderAllowed(career.athlete.gender,athlete.gender,'doubles')?`<button type="button" class="secondary" data-action="choose-partner" data-format="doubles" data-athlete="${athlete.id}">${career.partners?.doubles?.id===athlete.id?'SELECTED':'GENDER PARTNER'}</button>`:''}
        ${partnerGenderAllowed(career.athlete.gender,athlete.gender,'mixed')?`<button type="button" class="secondary" data-action="choose-partner" data-format="mixed" data-athlete="${athlete.id}">${career.partners?.mixed?.id===athlete.id?'SELECTED':'MIXED PARTNER'}</button>`:''}
      </div>`:''}
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
  const finance=financeSummary(career);
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
    <h2>FINANCE</h2>
    <div class="board-head">
      <div><small>BALANCE</small><strong>${money(finance.balance)}</strong></div>
      <div><small>INCOME</small><strong>${money(finance.income)}</strong></div>
      <div><small>SPENT</small><strong>${money(finance.expenses)}</strong></div>
    </div>
    ${finance.ledger.length?`<ul class="history">${[...finance.ledger].reverse().slice(0,16).map(entry=>`<li><span>${escapeHtml(entry.date)}</span><strong>${escapeHtml(entry.label)}</strong><em class="${entry.amount>0?'up':'down'}">${entry.amount>0?'+':''}${money(entry.amount)}</em><small>${money(entry.balanceAfter)} balance</small></li>`).join('')}</ul>`:'<p class="muted">No finance entries yet. The opening balance is '+money(finance.balance)+'.</p>'}
  </section>

  <section class="panel">
    <h2>OPPONENTS</h2>
    ${opponentHistory(career).length?`<ul class="history">${opponentHistory(career).slice(0,15).map(opponent=>`<li><span>${escapeHtml(opponent.name)}</span><strong>${opponent.wins}-${opponent.losses}</strong><small>${escapeHtml(opponent.lastEventLabel??'match')} · last ${opponent.lastResult} · week ${opponent.lastWeek+1}</small></li>`).join('')}</ul>`:'<p class="muted">No persistent opponents yet.</p>'}
  </section>

  <section class="panel">
    <h2>EVENT HISTORY</h2>
    ${history.length?`<ul class="history">${history.map(entry=>`<li><span>${escapeHtml(weekShortLabel(entry.week))}</span><strong>${escapeHtml(entry.label)} · ${escapeHtml(entry.format??'event')}</strong><small>${entry.medal?entry.medal.toUpperCase()+' · ':''}${entry.place?'place '+entry.place:'complete'} · ${entry.wins}W ${entry.losses}L · ${entry.pointsFor}:${entry.pointsAgainst}</small></li>`).join('')}</ul>`:'<p class="muted">No completed events yet.</p>'}
  </section>`;
}

function renderStandings(){
  const career=app.career;
  const format=FORMATS.includes(app.standingsFormat)?app.standingsFormat:FORMATS[0];
  app.standingsFormat=format;
  const position=boardPosition(career,format);
  const form=careerForm(career);
  const rivals=nearbyRivals(career,format,6);
  const leaders=topPlayers(career,format,25);
  const rival=findRival(career,format);
  const sponsors=sponsorsFor(career,format);
  const formatTabs=FORMATS.map(entry=>`<button type="button" data-action="standings-format" data-format="${entry}" class="${entry===format?'active':''}">${escapeHtml(formatLabel(entry,career.athlete.gender))}</button>`).join('');
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
      <div><small>BALANCE</small><strong>${money(career.money)}</strong></div>
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
    <h2>TOP OF THE BOARD</h2>
    <p>Highest current ${escapeHtml(formatLabel(format,career.athlete.gender))} ratings across North America and Asia. This is the rating board; PPA tour points decide event entry and qualification.</p>
    ${leaders.map(entry=>`<div class="club">
      <div class="body"><strong>#${entry.rank} ${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.cityLabel)} · ${escapeHtml(entry.regionId==='asia'?'Asia':'North America')} · ${escapeHtml(entry.citizenship)} · Rating ${formatRating(entry.rating)}</small></div>
      <div class="actions"><span class="need">World ${entry.worldRank.toLocaleString('en-US')}</span></div>
    </div>`).join('')}
  </section>

  <section class="panel">
    <h2>NEAR YOU</h2>
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

function playerDirectory(career){
  const cache=app.directoryCache;
  if(cache&&cache.seed===career.seed&&cache.regionId===career.regionId)return cache.athletes;
  const athletes=buildRegionRoster(career.seed,career.regionId,{},career.week).athletes;
  app.directoryCache={seed:career.seed,regionId:career.regionId,athletes};
  return athletes;
}

function renderPlayers(){
  const career=app.career;
  const areas=REGIONS.find(region=>region.id===career.regionId).areas;
  const areaOptions=areas.map(area=>`<option value="${area.id}"${app.filters.areaId===area.id?' selected':''}>${escapeHtml(area.label)}</option>`).join('');
  const cities=allCities(career.regionId).filter(city=>!app.filters.areaId||city.areaId===app.filters.areaId);
  const cityOptions=cities.map(city=>`<option value="${city.id}"${app.filters.cityId===city.id?' selected':''}>${escapeHtml(city.label)}</option>`).join('');
  const bracketOptions=RATING_BRACKETS.map(division=>`<option value="${division.id}"${app.filters.bracket===division.id?' selected':''}>${escapeHtml(division.label)}</option>`).join('');
  const directory=directoryPage(playerDirectory(career),app.filters,app.filters.page??0);
  app.filters.page=directory.page;
  return `
  <section class="panel">
    <h2>PLAYERS · ${escapeHtml(career.regionLabel.toUpperCase())}</h2>
    <p>Browse every athlete in the region. Name search is optional. Ratings are the same model used by the match engine.</p>
    <div class="filters">
      <input id="player-search" type="search" placeholder="Filter by name" value="${escapeHtml(app.filters.query)}" autocomplete="off">
      <select id="filter-area"><option value="">All areas</option>${areaOptions}</select>
      <select id="filter-city"><option value="">All cities</option>${cityOptions}</select>
      <select id="filter-gender">
        <option value="">Any gender</option>
        <option value="female"${app.filters.gender==='female'?' selected':''}>Female</option>
        <option value="male"${app.filters.gender==='male'?' selected':''}>Male</option>
      </select>
      <select id="filter-bracket"><option value="">Any doubles rating</option>${bracketOptions}</select>
      <select id="filter-sort">
        <option value="rating-desc"${app.filters.sort==='rating-desc'?' selected':''}>Highest rating</option>
        <option value="rating-asc"${app.filters.sort==='rating-asc'?' selected':''}>Lowest rating</option>
        <option value="age-asc"${app.filters.sort==='age-asc'?' selected':''}>Youngest first</option>
        <option value="age-desc"${app.filters.sort==='age-desc'?' selected':''}>Oldest first</option>
        <option value="name"${app.filters.sort==='name'?' selected':''}>Name A–Z</option>
      </select>
      <input id="filter-age-min" type="number" min="18" max="54" placeholder="Min age" value="${escapeHtml(app.filters.minAge)}" inputmode="numeric">
      <input id="filter-age-max" type="number" min="18" max="54" placeholder="Max age" value="${escapeHtml(app.filters.maxAge)}" inputmode="numeric">
    </div>
    <p class="hint">${directory.total.toLocaleString('en-US')} matching players · page ${directory.page+1} of ${directory.pages}</p>
    ${directory.rows.length?directory.rows.map(athlete=>`<div class="player">
      <div class="body">
        <strong>${escapeHtml(athlete.name)}</strong>
        <small>${escapeHtml(athlete.archetypeLabel)} · ${athlete.gender} · age ${athlete.age} · ${escapeHtml(athlete.cityLabel)}, ${escapeHtml(athlete.citizenship ?? '')} · ${escapeHtml(athlete.clubName)}</small>
        <small>Doubles ${formatRating(athlete.formats?.doubles??0)} · Singles ${formatRating(athlete.formats?.singles??0)} · Mixed ${formatRating(athlete.formats?.mixed??0)} · best skill ${escapeHtml(RATING_LABELS[topKey(athlete.ratings)]??topKey(athlete.ratings))} ${athlete.ratings[topKey(athlete.ratings)]}</small>
      </div>
    </div>`).join(''):'<p class="muted">No players match those filters.</p>'}
    <div class="actions">
      <button type="button" class="secondary" data-action="players-page" data-page="${directory.page-1}" ${directory.page<=0?'disabled':''}>← PREVIOUS</button>
      <button type="button" class="secondary" data-action="players-page" data-page="${directory.page+1}" ${directory.page>=directory.pages-1?'disabled':''}>NEXT →</button>
    </div>
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
        ${events.length?events.map(event=>eventRow(event,entry.isCurrent?career:{...career,week:entry.week},career.athlete.gender,entry.isCurrent)).join(''):'<p class="empty">Quiet week.</p>'}
      </div>`;
    }).join('')}
    <div class="actions"><button type="button" class="secondary" data-action="advance">ADVANCE WEEK →</button></div>
  </section>`;
}

// ---- events ---------------------------------------------------------------

function careerMatchUrl(){
  const standalone=location.pathname.includes('/career/');
  return standalone?'../dev/?career-match=1&career-return=career':'../?career-match=1&career-return=career-mode';
}

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
      const gender=document.getElementById('draft-gender')?.value??app.draft.gender;
      const height=feetInchesToCentimeters(
        Number(document.getElementById('draft-height-ft')?.value),
        Number(document.getElementById('draft-height-in')?.value),
        gender
      );
      app.career=hydrateCareerWithArchive(createCareer({
        name,
        gender,
        archetypeId:document.getElementById('draft-archetype')?.value,
        regionId:document.getElementById('draft-region')?.value,
        cityId:document.getElementById('draft-city')?.value,
        age:Number(document.getElementById('draft-age')?.value),
        height,
        weight:poundsToKilograms(Number(document.getElementById('draft-weight-lb')?.value),height,gender),
        experience:document.getElementById('draft-experience')?.value,
        trait:document.getElementById('draft-trait')?.value,
        appearance:{
          handedness:app.draft.handedness,
          shirtColor:app.draft.shirtColor,
          paddleColor:app.draft.paddleColor,
          highlightColor:app.draft.highlightColor,
          hairStyle:app.draft.hairStyle,
          hairColor:app.draft.hairColor,
          skinColor:app.draft.skinColor,
          headwear:app.draft.headwear,
          eyewear:app.draft.eyewear,
          outfit:app.draft.outfit,
          court:app.draft.court
        }
      }),app.storage);
      persist();
      toast(`Career started in ${app.career.cityLabel}.`);
      render();
      return;
    }
    if(action==='reset'){
      if(!confirm('Delete this career and start over? This cannot be undone.'))return;
      clearCareer(app.storage);
      app.career=null;
      app.view='home';
      app.expandedClub=null;
      toast('Career deleted.');
      render();
      return;
    }
    if(action==='import-career'){document.getElementById('career-import-file')?.click();return}
    if(!app.career)return;
    if(action==='save-career'){
      persist();
      toast('Career saved on this device.');
      render();
      return;
    }
    if(action==='train'){
      const focus=document.getElementById('focus-select')?.value??app.career.trainingFocus;
      const coached=Boolean(document.getElementById('coached-training')?.checked);
      apply(train(app.career,focus,{coached}));
      return;
    }
    if(action==='export-career'){
      exportCareerPortable(app.career).then(text=>{
        const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);
        const link=document.createElement('a');link.href=url;link.download=`drives-dinks-${app.career.athlete.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.dnd`;
        link.click();URL.revokeObjectURL(url);toast('Portable career exported.');
      }).catch(error=>toast(error.message,true));
      return;
    }
    if(action==='buy-equipment'){apply(purchaseEquipment(app.career,trigger.dataset.item));return}
    if(action==='equip'){apply(equipPaddle(app.career,trigger.dataset.item));return}
    if(action==='create-signature'){apply(createSignaturePaddle(app.career));return}
    if(action==='accept-invite'){
      const result=acceptInvitation(app.career,trigger.dataset.invite);
      if(result.ok)app.career=archiveMessage(result.state,`invite:${trigger.dataset.invite}`);
      persist();render();toast(result.message,!result.ok);return;
    }
    if(action==='decline-invite'){
      const result=declineInvitation(app.career,trigger.dataset.invite);
      if(result.ok)app.career=archiveMessage(result.state,`invite:${trigger.dataset.invite}`);
      persist();render();toast(result.message,!result.ok);return;
    }
    if(action==='withdraw-invite'){apply(withdrawInvitation(app.career,trigger.dataset.invite));return}
    if(action==='invite-mate'){apply(inviteClubMate(app.career,trigger.dataset.athlete,trigger.dataset.format,'local-league'));return}
    if(action==='read-message'){app.career=markMessageRead(app.career,trigger.dataset.key);persist();render();return}
    if(action==='archive-message'){app.career=archiveMessage(app.career,trigger.dataset.key);persist();render();return}
    if(action==='open-message'){
      app.career=markMessageRead(app.career,trigger.dataset.key);
      app.view=trigger.dataset.view??'home';persist();render();return;
    }
    if(action==='accept-invite'){
      const result=acceptInvitation(app.career,trigger.dataset.invite);
      if(result.ok)app.career=archiveMessage(result.state,`invite:${trigger.dataset.invite}`);
      persist();render();toast(result.message,!result.ok);return;
    }
    if(action==='decline-invite'){
      const result=declineInvitation(app.career,trigger.dataset.invite);
      if(result.ok)app.career=archiveMessage(result.state,`invite:${trigger.dataset.invite}`);
      persist();render();toast(result.message,!result.ok);return;
    }
    if(action==='withdraw-invite'){apply(withdrawInvitation(app.career,trigger.dataset.invite));return}
    if(action==='invite-mate'){apply(inviteClubMate(app.career,trigger.dataset.athlete,trigger.dataset.format,'local-league'));return}
    if(action==='read-message'){app.career=markMessageRead(app.career,trigger.dataset.key);persist();render();return}
    if(action==='archive-message'){app.career=archiveMessage(app.career,trigger.dataset.key);persist();render();return}
    if(action==='open-message'){
      app.career=markMessageRead(app.career,trigger.dataset.key);
      app.view=trigger.dataset.view??'home';persist();render();return;
    }
    if(action==='retire'){
      if(!confirm('Retire from competition? This career record becomes final.'))return;
      const ended=retire(app.career,'voluntary');
      if(ended.ok){app.career=ended.state;archiveCareer(app.career,app.storage);app.view='record';persist();render();toast(ended.message);}else toast(ended.message,true);
      return;
    }
    if(action==='advance'){apply(advanceWeek(app.career));return}
    if(action==='players-page'){
      app.filters.page=Math.max(0,Number(trigger.dataset.page)||0);
      render();
      return;
    }
    if(action==='standings-format'){
      const format=trigger.dataset.format;
      if(FORMATS.includes(format))app.standingsFormat=format;
      render();
      return;
    }
    if(action==='move'){
      const city=document.getElementById('move-city')?.value;
      apply(moveToCity(app.career,city));
      return;
    }
    if(action==='join'){apply(joinClub(app.career,trigger.dataset.club));return}
    if(action==='choose-partner'){apply(choosePartner(app.career,trigger.dataset.format,trigger.dataset.athlete));return}
    if(action==='leave'){apply(leaveClub(app.career));return}
    if(action==='attend'){
      const picker=trigger.closest('.event')?.querySelector('select[data-division]');
      const started=startCareerMatch(app.career,trigger.dataset.event,picker?.value??null);
      if(!started.ok){toast(started.message,true);return}
      app.career=started.state;
      persist();
      writePendingMatch(started.pending);
      // The match is played on the engine page and the result comes back.
      location.href=careerMatchUrl();
      return;
    }
    if(action==='quick-attend'){
      const picker=trigger.closest('.event')?.querySelector('select[data-division]');
      const started=startCareerMatch(app.career,trigger.dataset.event,picker?.value??null);
      if(!started.ok){toast(started.message,true);return}
      apply(simulateCompetitionToEnd(started.state));
      return;
    }
    if(action==='quick-sim'){apply(quickSimCareerMatch(app.career));return}
    if(action==='sim-competition'){apply(simulateCompetitionToEnd(app.career));return}
    if(action==='next-event'){
      const jumped=advanceToNextEvent(app.career);
      app.career=jumped.state;
      persist();
      render();
      toast(jumped.message);
      return;
    }
    if(action==='resume-tournament'){
      const tournament=app.career.tournament;
      if(!tournament||tournament.finished||tournament.playerOut){toast('There is no competition to resume.',true);return}
      if(tournament.nightComplete){toast('Advance the calendar for the next league night.',true);return}
      const started=startCareerMatch(app.career,tournament.eventId,tournament.optionId);
      if(!started.ok){toast(started.message,true);return}
      app.career=started.state;
      persist();
      if(!started.pending){render();toast(started.message);return}
      writePendingMatch(started.pending);
      location.href=careerMatchUrl();
      return;
    }
    if(action==='resume-match'){
      if(!app.career.pendingMatch){toast('There is no match to play.',true);return}
      writePendingMatch(app.career.pendingMatch);
      location.href=careerMatchUrl();
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

document.addEventListener('change',async event=>{
  const id=event.target.id;
  if(id==='career-import-file'){
    const file=event.target.files?.[0];
    if(!file)return;
    const imported=await importCareerPortable(await file.text());
    if(imported.ok){app.career=imported.state;persist();app.view='home';render();toast('Portable career imported.');}
    else toast(imported.reason,true);
    event.target.value='';
    return;
  }
  if(id==='draft-region'){
    app.draft.regionId=event.target.value;
    app.draft.cityId='';
    render();
  }
  if(id==='draft-city'){app.draft.cityId=event.target.value}
  if(id==='draft-age'){app.draft.age=Number(event.target.value)||25}
  if(id==='draft-height-ft'||id==='draft-height-in'){
    const feet=Number(document.getElementById('draft-height-ft')?.value);
    const inches=Number(document.getElementById('draft-height-in')?.value);
    app.draft.height=feetInchesToCentimeters(feet,inches,app.draft.gender);
    render();
  }
  if(id==='draft-weight-lb'){
    app.draft.weight=poundsToKilograms(Number(event.target.value),app.draft.height,app.draft.gender);
    render();
  }
  if(id==='draft-experience'){app.draft.experience=event.target.value}
  if(id==='draft-trait'){app.draft.trait=event.target.value}
  if(id==='draft-gender'){app.draft.gender=event.target.value;app.draft.hairStyle='design';render()}
  if(id==='draft-archetype'){app.draft.archetypeId=event.target.value;render()}
  if(id==='draft-look-hand'){app.draft.handedness=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-outfit'){app.draft.outfit=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-hair'){app.draft.hairStyle=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-hair-color'){app.draft.hairColor=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-skin'){app.draft.skinColor=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-shirt'){app.draft.shirtColor=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-paddle-color'){app.draft.paddleColor=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-highlight'){app.draft.highlightColor=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-headwear'){app.draft.headwear=event.target.value;drawCareerDraftPreview()}
  if(id==='draft-look-eyewear'){app.draft.eyewear=event.target.value;drawCareerDraftPreview()}
  if(event.target.matches?.('[data-loadout-paddle]')){
    apply(equipPaddle(app.career,event.target.value));
    return;
  }
  if(id==='filter-area'){
    app.filters.areaId=event.target.value;
    app.filters.cityId='';
    app.filters.page=0;
    render();
  }
  if(id==='filter-city'){app.filters.cityId=event.target.value;app.filters.page=0;render()}
  if(id==='filter-tier'){app.filters.tier=event.target.value;app.filters.page=0;render()}
  if(id==='filter-gender'){app.filters.gender=event.target.value;app.filters.page=0;render()}
  if(id==='filter-bracket'){app.filters.bracket=event.target.value;app.filters.page=0;render()}
  if(id==='filter-sort'){app.filters.sort=event.target.value;app.filters.page=0;render()}
  if(id==='filter-age-min'){app.filters.minAge=event.target.value;app.filters.page=0;render()}
  if(id==='filter-age-max'){app.filters.maxAge=event.target.value;app.filters.page=0;render()}
  if(id==='move-region'){app.move.regionId=event.target.value;app.move.cityId='';render()}
  if(id==='move-city'){app.move.cityId=event.target.value}
  if(id==='inbox-category'){app.inboxFilters.category=event.target.value;render()}
  if(id==='inbox-archive'){app.inboxFilters.archived=event.target.value==='true';render()}
});

document.addEventListener('input',event=>{
  if(event.target.id==='draft-name'){
    app.draft.name=event.target.value;
    return;
  }
  if(event.target.id==='inbox-search'){
    app.inboxFilters.query=event.target.value;render();
    const field=document.getElementById('inbox-search');
    if(field){field.focus();field.setSelectionRange(field.value.length,field.value.length)}
    return;
  }
  if(event.target.id==='player-search'){
    app.filters.query=event.target.value;
    app.filters.page=0;
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
if(loaded.state){app.career=hydrateCareerWithArchive(loaded.state,app.storage)}
if(loaded.reason)toast(loaded.reason,true);

// A match played on the engine page comes back here to be scored.
const playedResult=takeMatchResult(pendingMatchId(app.career?.pendingMatch));
if(playedResult&&app.career?.pendingMatch){
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
