import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function run(script,args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[script,...args],{cwd:root,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${script} exited with ${code}`)));});}
await run('scripts/validate-levels-mirrored.js',['20','--output','validation/gameplay-balance-mirrored.json']);
await run('scripts/sweep-level-curves.js',['--games','10','--output','validation/level-curve-sweep.json']);
await run('scripts/sweep-level-curves.js',['--candidates','tight-2','--games','40','--output','validation/level-curve-tight-2-confirm.json']);
await run('scripts/sweep-level-curves.js',['--candidates','tight-3','--games','10','--output','validation/level-curve-tight.json']);
await run('scripts/sweep-level-curves.js',['--candidates','tight-1','--games','40','--output','validation/level-curve-tight-1-confirm.json']);
await run('scripts/summarize-gameplay-balance.js',[]);