import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('deployments expose a sequential build number at the release root and dev mirror',()=>{
 const html=read('index.html'),fallback=read('build-info.js'),workflow=read('.github/workflows/pages.yml'),main=read('src/main.js');
 assert.match(html,/id="build-label"/);
 assert.match(html,/src="build-info.js"/);
 assert.match(fallback,/DRIVES_DINKS_BUILD = 'dev'/);
 assert.match(workflow,/github\.run_number/);
 assert.match(workflow,/_site\/dev/);
 assert.match(workflow,/_site\/dev\/build-info\.js/);
 assert.match(workflow,/> _site\/build-info\.js/);
 assert.match(workflow,/node scripts\/version-build\.js "\$\{\{ github\.run_number \}\}" _site/);
 assert.match(workflow,/scripts\/version-build\.js/);
 assert.match(html,/src="src\/update-check\.js"/);
 assert.match(main,/BUILD \$\{buildNumber\}/);
});

test('Pages promotes main to the public root and preserves Build 48 and Build 15',()=>{
 const workflow=read('.github/workflows/pages.yml');
 assert.match(workflow,/ref: main/);
 assert.match(workflow,/ce59a6af09c78309ac30c7c3f7d362fd6c370dc8/);
 assert.match(workflow,/dd6eae74fc3ae3a32c2d2a15cb27a27e4629124e/);
 assert.match(workflow,/_site\/archive\/build-15/);
 assert.match(workflow,/_site\/prototype/);
 assert.match(workflow,/_prototype\/studio\.html[^\n]*_site\/prototype\//);
 assert.match(workflow,/cp _release\/index\.html _release\/style\.css _release\/studio\.html _release\/studio\.css _site\//);
 assert.match(workflow,/Current main is the public release at the Pages root/);
 assert.doesNotMatch(workflow,/cp _prototype\/index\.html[^\n]*_site\/\n/);
});