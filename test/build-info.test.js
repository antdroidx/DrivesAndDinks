import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('deployments expose a sequential build number in the visible header',()=>{
 const html=read('index.html'),fallback=read('build-info.js'),workflow=read('.github/workflows/pages.yml'),main=read('src/main.js');
 assert.match(html,/id="build-label"/);
 assert.match(html,/src="build-info.js"/);
 assert.match(fallback,/DRIVES_DINKS_BUILD = 'dev'/);
 assert.match(workflow,/github\.run_number/);
 assert.match(workflow,/_site\/build-info\.js/);
 assert.match(workflow,/scripts\/version-build\.js/);
  assert.match(workflow,/friends-build-15/);
  assert.match(workflow,/path: _friends/);
  assert.match(workflow,/cp _friends\/index\.html _friends\/style\.css _site\//);
  assert.match(workflow,/DRIVES_DINKS_BUILD = "15"/);
  assert.match(workflow,/mkdir -p _site\/dev/);
  assert.match(workflow,/cp index\.html style\.css _site\/dev\//);
  assert.match(workflow,/_site\/dev\/build-info\.js/);
  assert.doesNotMatch(workflow,/_site\/friends/);
  assert.match(html,/src="src\/update-check\.js"/);
 assert.match(main,/BUILD \$\{buildNumber\}/);
});
