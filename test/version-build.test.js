import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {versionModuleImports,versionSite} from '../scripts/version-build.js';

test('module imports receive the deployment build query',()=>{
  const source="import {x} from './core.js';\nconst lazy=()=>import('./game.js');\n";
  const result=versionModuleImports(source,'23');
  assert.match(result,/from '\.\/core\.js\?v=23'/);
  assert.match(result,/import\('\.\/game\.js\?v=23'\)/);
});

test('static build versions the page and all module entry points',()=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'drives-dinks-version-'));
  try{
    mkdirSync(path.join(root,'src'));
    writeFileSync(path.join(root,'index.html'),'<link href="style.css"><script src="build-info.js"></script><script type="module" src="src/update-check.js"></script><script type="module" src="src/main.js"></script>');
    writeFileSync(path.join(root,'src','main.js'),"import {Game} from './game.js';\n");
    writeFileSync(path.join(root,'src','update-check.js'),'export {};\n');
    writeFileSync(path.join(root,'src','game.js'),'export const Game=1;\n');
    writeFileSync(path.join(root,'studio.html'),'<link href="studio.css"><script src="src/studio.js"></script>');
    writeFileSync(path.join(root,'src','studio.js'),"import {Game} from './game.js';\n");
    versionSite(root,'23');
    const html=readFileSync(path.join(root,'index.html'),'utf8');
    const main=readFileSync(path.join(root,'src','main.js'),'utf8');
    assert.match(html,/href="style\.css\?v=23"/);
    assert.match(html,/src="build-info\.js\?v=23"/);
    assert.match(html,/src="src\/update-check\.js\?v=23"/);
    assert.match(html,/src="src\/main\.js\?v=23"/);
    assert.match(main,/from '\.\/game\.js\?v=23'/);
    assert.match(readFileSync(path.join(root,'studio.html'),'utf8'),/studio\.css\?v=23/);
    assert.match(readFileSync(path.join(root,'studio.html'),'utf8'),/src\/studio\.js\?v=23/);
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});
