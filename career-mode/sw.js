// Career mode service worker.
//
// The career is a local, offline game: the app shell and every module it
// loads are precached so the entry point opens with no network at all. The
// shared engine modules sit outside the service worker scope, but a worker
// may cache any URL it fetches, so they are pulled in here explicitly.
//
// Requests go to the network first and fall back to the cache. That keeps a
// running career responsive and makes sure a code change is never masked by
// a stale precache entry, while a device with no network still opens the
// game from the cache.

const CACHE='drives-dinks-career-v8';
const PRECACHE=[
  './',
  './index.html',
  './career.css',
  '../build-info.js',
  './manifest.webmanifest',
  '../src/career/main.js',
  '../src/career/state.js',
  '../src/career/save.js',
  '../src/career/calendar.js',
  '../src/career/population.js',
  '../src/career/geography.js',
  '../src/career/analytics.js',
  '../src/career/age.js',
  '../src/career/retirement.js',
  '../src/career/club-life.js',
  '../src/career/creation.js',
  '../src/career/directory.js',
  '../src/career/opponents.js',
  '../src/career/finance.js',
  '../src/career/planning.js',
  '../src/career/injuries.js',
  '../src/career/equipment.js',
  '../src/career/cpu-careers.js',
  '../src/career/career-lifecycle.js',
  '../src/career/cpu-trajectory.js',
  '../src/career/team-league.js',
  '../src/career/invitations.js',
  '../src/career/inbox.js',
  '../src/career/portable-save.js',
  '../src/career/career-archive.js',
  '../src/career/contracts.js',
  '../src/career/rating.js',
  '../src/career/tour.js',
  '../src/career/ranking.js',
  '../src/career/world.js',
  '../src/career/tournament.js',
  '../src/career/career-match.js',
  '../src/career/matchmaking.js',
  '../src/career/match-record.js',
  '../src/career/standings.js',
  '../src/career/handshake.js',
  '../src/roster.js',
  '../src/name-data.js',
  '../src/competition.js',
  '../src/core.js',
  '../src/character-concepts.js',
  '../src/player-feet.js',
  '../src/player-facing.js',
  '../src/pixel-character.js'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async url=>{
      try{await cache.add(new Request(url,{cache:'reload'}))}catch{}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('drives-dinks-career')&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request);
      if(response.ok&&response.type!=='opaque')cache.put(request,response.clone());
      return response;
    }catch{
      const cached=await cache.match(request);
      if(cached)return cached;
      if(request.mode==='navigate'){
        const shell=await cache.match('./index.html');
        if(shell)return shell;
      }
      throw new Error('Career mode is offline and this file is not cached yet');
    }
  })());
});
