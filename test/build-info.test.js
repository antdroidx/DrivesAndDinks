import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('deployments expose a sequential build number in the visible dev header',()=>{
 const html=read('index.html'),fallback=read('build-info.js'),workflow=read('.github/workflows/pages.yml'),main=read('src/main.js');
 assert.match(html,/id="build-label"/);
 assert.match(html,/src="build-info.js"/);
 assert.match(fallback,/DRIVES_DINKS_BUILD = 'dev'/);
 assert.match(workflow,/github\.run_number/);
 assert.match(workflow,/codex\/high-resolution-players/);
 assert.match(workflow,/_site\/dev/);
 assert.match(workflow,/_site\/dev\/build-info\.js/);
 assert.match(workflow,/scripts\/version-build\.js/);
 assert.match(html,/src="src\/update-check\.js"/);
 assert.match(main,/BUILD \$\{buildNumber\}/);
});

test('Pages preserves frozen public prototype and Build 15 alongside development',()=>{
 const workflow=read('.github/workflows/pages.yml');
 assert.match(workflow,/ref: main/);
 assert.match(workflow,/ce59a6af09c78309ac30c7c3f7d362fd6c370dc8/);
 assert.match(workflow,/dd6eae74fc3ae3a32c2d2a15cb27a27e4629124e/);
 assert.match(workflow,/_site\/archive\/build-15/);
 assert.match(workflow,/_site\/prototype/);
 assert.match(workflow,/_prototype\/studio.html/);
});
