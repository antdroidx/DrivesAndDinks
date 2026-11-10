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

const CACHE='drives-dinks-career-v205';
const PRECACHE=[
  './',
  './index.html',
  './career.css',
  './build-info.js',
  './manifest.webmanifest',
  './src/career/main.js?v=205',
  './src/career/state.js?v=205',
  './src/career/save.js?v=205',
  './src/career/calendar.js?v=205',
  './src/career/population.js?v=205',
  './src/career/geography.js?v=205',
  './src/career/analytics.js?v=205',
  './src/career/age.js?v=205',
  './src/career/retirement.js?v=205',
  './src/career/club-life.js?v=205',
  './src/career/creation.js?v=205',
  './src/career/directory.js?v=205',
  './src/career/opponents.js?v=205',
  './src/career/finance.js?v=205',
  './src/career/planning.js?v=205',
  './src/career/injuries.js?v=205',
  './src/career/equipment.js?v=205',
  './src/career/cpu-careers.js?v=205',
  './src/career/career-lifecycle.js?v=205',
  './src/career/team-league.js?v=205',
  './src/career/invitations.js?v=205',
  './src/career/inbox.js?v=205',
  './src/career/portable-save.js?v=205',
  './src/career/career-archive.js?v=205',
  './src/career/contracts.js?v=205',
  './src/career/rating.js?v=205',
  './src/career/tour.js?v=205',
  './src/career/ranking.js?v=205',
  './src/career/world.js?v=205',
  './src/career/tournament.js?v=205',
  './src/career/career-match.js?v=205',
  './src/career/matchmaking.js?v=205',
  './src/career/match-record.js?v=205',
  './src/career/standings.js?v=205',
  './src/career/handshake.js?v=205',
  './src/roster.js?v=205',
  './src/competition.js?v=205',
  './src/core.js?v=205',
  './src/character-concepts.js?v=205',
  './src/player-feet.js?v=205',
  './src/player-facing.js?v=205',
  './src/pixel-character.js?v=205'
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
