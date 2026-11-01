// Keep navigations on the network so GitHub Pages HTML cache does not pin a release.
const scopeUrl=new URL('../../',import.meta.url);
const workerUrl=new URL('../../sw.js',import.meta.url);
let refreshing=false;

if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshing)return;
    refreshing=true;
    location.reload();
  });
  navigator.serviceWorker.register(workerUrl,{scope:scopeUrl.pathname,updateViaCache:'none'})
    .then(registration=>registration.update())
    .catch(()=>{});
}

addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
