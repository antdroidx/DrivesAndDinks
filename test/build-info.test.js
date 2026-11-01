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
 assert.match(workflow,/mkdir -p _site\/dev/);
 assert.match(workflow,/_site\/dev\/build-info\.js/);
 assert.match(workflow,/scripts\/version-build\.js/);
 assert.match(html,/src="src\/update-check\.js"/);
 assert.match(main,/BUILD \$\{buildNumber\}/);
});

test('the Pages workflow keeps the public root, publishes dev, and preserves the motion studio',()=>{
 const workflow=read('.github/workflows/pages.yml');
 assert.match(workflow,/cp index\.html style\.css studio\.html studio\.css _site\/dev\//);
 assert.match(workflow,/ref: ce59a6af09c78309ac30c7c3f7d362fd6c370dc8/);
 assert.match(workflow,/path: _public/);
 assert.match(workflow,/rsync -a --exclude=\.git --exclude=dev --exclude=preview _public\/ _site\//);
 assert.match(workflow,/cp sw\.js _site\//);
 assert.match(workflow,/src\/cache-refresh\.js\?v=15/);
 assert.match(read('sw.js'),/request\.mode!=='navigate'/);
 assert.match(read('sw.js'),/cache:'no-store'/);
 assert.match(read('src\/cache-refresh\.js'),/updateViaCache:'none'/);
 assert.doesNotMatch(read('studio.html'),/art-directions\.html/);
 assert.doesNotMatch(workflow,/2efbddc8f4b56546e0b2ef9a108db7e6f42ee3ab|_friends|cat > _site\/index\.html/);
 const workflows=readdirSync(new URL('../.github/workflows/',import.meta.url));
 assert.deepEqual(workflows,['pages.yml']);
});
