import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const allowed=new Map([
 ['/manifest.webmanifest',['manifest.webmanifest','application/manifest+json']],...['192','512'].map(n=>[`/assets/app-${n}.png`,[`assets/app-${n}.png`,'image/png']]),
  ['/style-lab.html',['style-lab.html','text/html']],['/character-lab.html',['character-lab.html','text/html']],['/character-lab.css',['character-lab.css','text/css']],['/', ['index.html','text/html']],['/studio.html',['studio.html','text/html']],['/studio.css',['studio.css','text/css']],['/art-directions.html',['art-directions.html','text/html']],['/art-directions.css',['art-directions.css','text/css']],['/assets/art-direction-3d-concept.png',['assets/art-direction-3d-concept.png','image/png']],['/assets/drives-dinks-logo-v1.png',['assets/drives-dinks-logo-v1.png','image/png']],['/index.html',['index.html','text/html']],['/style.css',['style.css','text/css']],['/build-info.js',['build-info.js','text/javascript']],['/sw.js',['sw.js','text/javascript']],
]);
// Modules and venue plates are resolved straight from disk, so a newly added
// file is served without restarting the dev server.
const dynamic=[[/^\/src\/([a-z0-9-]+\.js)$/,'src/','text/javascript'],[/^\/assets\/venues\/([a-z0-9._-]+\.png)$/,'assets/venues/','image/png']];
const port=Number(process.argv[2]||8768);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a port from 1024 to 65535');
const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
  const pathname=new URL(req.url,'http://localhost').pathname;
  const route=pathname.startsWith('/dev/')?pathname.slice(4):pathname==='/dev'?'/':pathname;
  let entry=allowed.get(route),onDisk=false;
  if(!entry)for(const [pattern,folder,type] of dynamic){const match=route.match(pattern);if(match){entry=[folder+match[1],type];onDisk=true;break}}
  if(!entry){res.writeHead(404);res.end();return}
  try{const data=await readFile(fileURLToPath(new URL(entry[0],root)));res.writeHead(200,{'Content-Type':entry[1],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(onDisk?404:500);res.end(onDisk?'Unknown game asset':'Unable to load game asset')}
});
server.on('error',error=>{
  if(error.code!=='EADDRINUSE')throw error;
  console.warn(`Port ${port} is busy; choosing a free port.`);
  server.listen(0,'127.0.0.1');
});
server.on('listening',()=>console.log(`Game ready at http://127.0.0.1:${server.address().port}`));
server.listen(port,'127.0.0.1');
