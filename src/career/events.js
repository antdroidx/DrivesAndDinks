// Competition templates.
//
// An event type is a shape of competition that can run at any level, from a
// club night to a national championship. Each template carries the rules it
// is played under, and a tournament organiser can vary those rules.
//
// Every template answers four questions: who is on court, how the matches
// are arranged, how a player moves between matches, and how the competition
// is won.

export const EVENT_TEMPLATES=Object.freeze([
  {
    id:'round-robin-league',
    label:'Round Robin League',
    kind:'league',
    shape:'round-robin',
    teams:'fixed',
    scope:['club','city','area','region'],
    formats:['doubles','mixed'],
    maxTeams:16,
    playoffSize:4,
    summary:'Fixed teams play every other team once. The top four go to a playoff.'
  },
  {
    id:'round-robin-open',
    label:'Round Robin League, Open Partners',
    kind:'league',
    shape:'round-robin',
    teams:'random',
    scope:['city','area','region','nation'],
    formats:['doubles','singles','mixed'],
    maxTeams:16,
    playoffSize:0,
    summary:'Every player is drawn a new partner each game. The best record wins the league.'
  },
  {
    id:'tournament-bracket',
    label:'Bracket Tournament',
    kind:'tournament',
    shape:'bracket',
    teams:'fixed',
    scope:['club','city','area','region','nation'],
    formats:['doubles','singles','mixed'],
    maxTeams:16,
    bracketSize:8,
    playoffSize:4,
    summary:'Players are split into brackets, each plays a short round robin, and the round robins decide the playoff.'
  },
  {
    id:'tournament-double-elimination',
    label:'Double Elimination',
    kind:'tournament',
    shape:'double-elimination',
    teams:'fixed',
    scope:['area','region','nation'],
    formats:['doubles','singles','mixed'],
    maxTeams:16,
    summary:'Nobody is out until they have lost twice. Each round is drawn at random until one team is left.'
  },
  {
    id:'ladder-fixed',
    label:'Ladder, Fixed Teams',
    kind:'ladder',
    shape:'ladder',
    teams:'fixed',
    scope:['club','city','area','region'],
    formats:['doubles','mixed'],
    maxTeams:16,
    summary:'Teams are ranked onto courts by their combined rating. Win and you move up a rung, lose and you move down.'
  },
  {
    id:'ladder-open',
    label:'Ladder, Open Partners',
    kind:'ladder',
    shape:'ladder',
    teams:'random',
    scope:['city','area','region','nation'],
    formats:['doubles','singles','mixed'],
    maxTeams:16,
    summary:'Players are placed on courts by rating and given a random partner, then re-paired so they meet each other.'
  },
  {
    id:'mlp-style',
    label:'MLP',
    kind:'league',
    shape:'mlp',
    teams:'fixed',
    scope:['region','nation','world'],
    formats:['doubles','singles','mixed'],
    maxTeams:16,
    teamSize:[4,5],
    summary:'A team of four or five plays doubles and singles against combinations of the other side.'
  }
]);

export const TEMPLATE_BY_ID=Object.freeze(Object.fromEntries(EVENT_TEMPLATES.map(template=>[template.id,template])));

// The default rules. A tournament organiser can vary any of them.
export const DEFAULT_RULES=Object.freeze({
  points:11,
  playoffPoints:15,
  finalBestOf:3,
  doubleEliminationPoints:15,
  roundsPerBracket:7,
  ladderRounds:8,
  ladderCourts:8
});

// The rules a template starts with, before an organiser changes them.
export function rulesFor(template,overrides={}){
  const base={...DEFAULT_RULES};
  if(template.shape==='double-elimination')base.points=DEFAULT_RULES.doubleEliminationPoints;
  if(template.shape==='ladder')base.points=DEFAULT_RULES.playoffPoints;
  return Object.assign(base,overrides);
}

// The levels a competition may be fielded at, as the lowest bracket it runs.
export const COMPETITION_LEVELS=Object.freeze(['2.0','2.5','3.0','3.5','4.0','4.5','5.0+']);

export function templateById(id){return TEMPLATE_BY_ID[id]??null}
export function templatesForScope(scope){return EVENT_TEMPLATES.filter(template=>template.scope.includes(scope))}
export function templatesForFormat(format){return EVENT_TEMPLATES.filter(template=>template.formats.includes(format))}
