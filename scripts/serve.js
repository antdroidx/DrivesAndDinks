import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const allowed=new Map([
  ['/', ['index.html','text/html']],['/studio.html',['studio.html','text/html']],['/studio.css',['studio.css','text/css']],['/index.html',['index.html','text/html']],['/style.css',['style.css','text/css']],['/build-info.js',['build-info.js','text/javascript']],
  ...['player-facing','studio','animation-test','update-check','core','game','main','pixel-character','roster','selection','tactics'].map(name=>[`/src/${name}.js`,[`src/${name}.js`,'text/javascript']]),

]);
const port=Number(process.argv[2]||8768);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a port from 1024 to 65535');
const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
  const pathname=new URL(req.url,'http://localhost').pathname;
  const entry=allowed.get(pathname.startsWith('/dev/')?pathname.slice(4):pathname==='/dev'?'/':pathname);
  if(!entry){res.writeHead(404);res.end();return}
  try{const data=await readFile(fileURLToPath(new URL(entry[0],root)));res.writeHead(200,{'Content-Type':entry[1],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(500);res.end('Unable to load game asset')}
});
server.on('error',error=>{
  if(error.code!=='EADDRINUSE')throw error;
  console.warn(`Port ${port} is busy; choosing a free port.`);
  server.listen(0,'127.0.0.1');
});
server.on('listening',()=>console.log(`Game ready at http://127.0.0.1:${server.address().port}`));
server.listen(port,'127.0.0.1');
