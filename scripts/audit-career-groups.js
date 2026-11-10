import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const samples=process.argv.find(arg=>arg.startsWith('--samples='))?.split('=')[1]??'100';
const years=process.argv.find(arg=>arg.startsWith('--years='))?.split('=')[1]??'10';
const groups=['new','casual','athlete','racket','competitive'];

function run(script,args){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd:root,stdio:'inherit'});
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(new Error(`${script} exited with ${code}`)));
  });
}

await Promise.all(groups.map(experience=>run('scripts/audit-career-prospects.js',[
  '--samples',samples,'--ages','15,20,30,40,50','--years',years,
  '--experience',experience,'--output',`validation/career-groups-${experience}.json`
])));
await run('scripts/audit-cpu-careers.js',[
  '--samples',samples,'--ages','15,20,25,30,35,40,50','--years',years,
  '--output','validation/cpu-careers-balanced.json'
]);
await run('scripts/summarize-career-groups.js',[]);