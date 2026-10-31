const BUILD_PATTERN=/DRIVES_DINKS_BUILD\s*=\s*['"](\d+)['"]/;
const currentBuild=String(globalThis.DRIVES_DINKS_BUILD||'dev');

export function readDeploymentBuild(source){
  return BUILD_PATTERN.exec(String(source))?.[1]??null;
}

let checking=false;
async function checkForUpdate(){
  if(checking||!document.body||!navigator.onLine||document.visibilityState==='hidden')return;
  checking=true;
  try{
    const buildUrl=new URL('build-info.js',document.baseURI);
    buildUrl.searchParams.set('check',Date.now().toString());
    const response=await fetch(buildUrl,{cache:'no-store'});
    if(!response.ok)return;
    const latestBuild=readDeploymentBuild(await response.text());
    if(!latestBuild||latestBuild===currentBuild)return;
    const nextUrl=new URL(location.href);
    nextUrl.searchParams.set('build',latestBuild);
    nextUrl.searchParams.set('checked',Date.now().toString());
    location.replace(nextUrl);
  }catch{
    // Keep the current build playable while offline or during a deployment.
  }finally{
    checking=false;
  }
}

if(/^\d+$/.test(currentBuild)){
  const scheduleInitialCheck=()=>setTimeout(checkForUpdate,250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleInitialCheck,{once:true});
  else scheduleInitialCheck();
  addEventListener('focus',checkForUpdate);
  addEventListener('pageshow',checkForUpdate);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForUpdate()});
  setInterval(checkForUpdate,60000);
}
