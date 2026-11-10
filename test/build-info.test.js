import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the in-game header uses the dashboard wordmark styling',()=>{
 const html=read('index.html'),css=read('style.css');
 assert.match(html,/class="game-wordmark"/);
 assert.match(css,/\.game-wordmark\{font:800 15px\/1\.2/);
 assert.match(css,/\.game-wordmark span\{color:#4be3c2\}/);
});

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
test("DEV packages branch assets separately from public main",async()=>{const workflow=readFileSync(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");assert.match(workflow,/cp -R src assets _site\/dev\//);assert.match(workflow,/cp -R _release\/src _release\/assets _site\/\r?\n/)});


test('promotion preserves the exact previous public build and enables the public renderer',()=>{
 const workflow=read('.github/workflows/pages.yml'),main=read('src/main.js');
 assert.match(workflow,/ref: 764e17c106be25cc4e75985246ce66fd6313efe0/);
 assert.match(workflow,/_public122\/ _site\/archive\/build-122\//);
 assert.doesNotMatch(workflow,/version-build\.js[^\n]*_site\/archive\/build-122/);
 assert.match(main,/const detailedArtAvailable=true/);
 assert.match(workflow,/_release\/style-lab\.html _site\//);
});


test('feature deployments preserve the public root and replace DEV only',()=>{
 const workflow=read('.github/workflows/pages.yml');
 assert.match(workflow,/ref: gh-pages/);
 assert.match(workflow,/path: _published/);
 assert.match(workflow,/rsync -a --exclude=\.git --exclude=dev --exclude=preview _published\/ _site\//);
 assert.doesNotMatch(workflow,/rm -rf _site\/dev/);
 assert.match(workflow,/Feature deployments replace DEV only/);
});
