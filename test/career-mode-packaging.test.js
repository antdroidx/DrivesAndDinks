import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('career mode has its own entry point that leaves the root prototype alone',()=>{
  assert.ok(existsSync(new URL('../career-mode/index.html',import.meta.url)));
  const page=read('career-mode/index.html');
  assert.match(page,/src="\.\.\/src\/career\/main\.js"/);
  assert.match(page,/href="career\.css"/);
  assert.match(page,/src="\.\.\/build-info\.js"/);
  const root=read('index.html');
  assert.doesNotMatch(root,/career/i,'the root gameplay page must not reference career mode');
  assert.match(root,/src="src\/main\.js"/);
});

test('the standalone career test build uses local source and assets',()=>{
  assert.ok(existsSync(new URL('../career/index.html',import.meta.url)));
  const page=read('career/index.html');
  assert.match(page,/src="src\/career\/main\.js"/);
  assert.match(page,/src="build-info.js"/);
  assert.match(page,/href="career\.css"/);
  const manifest=JSON.parse(read('career/manifest.webmanifest'));
  assert.match(manifest.icons[0].src,/^assets\//);
  const sw=read('career/sw.js');
  assert.match(sw,/\.\/src\/career\/main\.js/);
  assert.match(sw,/\.\/src\/roster\.js/);
});

test('Pages publishes the standalone career folder with the current source',()=>{
  const workflow=read('.github/workflows/pages.yml');
  assert.match(workflow,/rm -rf _site\/career/);
  assert.match(workflow,/cp -R src assets _site\/career\//);
  assert.match(workflow,/version-build\.js "\$\{\{ github\.run_number \}\}" _site\/career --career/);
});

test('the career entry point loads its own stylesheet',()=>{
  const page=read('career-mode/index.html');
  const css=read('career-mode/career.css');
  assert.match(page,/career\.css/);
  assert.match(css,/\.career-nav/);
  assert.doesNotMatch(css,/^body\{[^}]*position:\s*fixed/m);
});

test('every career module is present in the engine tree',()=>{
  const files=readdirSync(new URL('../src/career/',import.meta.url));
  for(const name of ['main.js','state.js','save.js','calendar.js','population.js','geography.js'])assert.ok(files.includes(name),`missing src/career/${name}`);
});

test('the dev server serves the career entry point and its nested modules',()=>{
  const server=read('scripts/serve.js');
  assert.match(server,/\['\/career-mode\/',/);
  assert.match(server,/career-mode\/index\.html/);
  assert.match(server,/career-mode\/career\.css/);
  assert.match(server,/career-mode\/sw\.js/);
  assert.match(server,/\^\\\/src\\\/career\\\//);
});

test('the dev server serves the standalone career test build',()=>{
  const server=read('scripts/serve.js');
  assert.match(server,/\['\/career\/',/);
  assert.match(server,/career\/build-info\.js/);
  assert.match(server,/career\\\/src\\\/career/);
  assert.match(server,/career\\\/assets/);
});

test('the build numbers the career page and its nested modules',()=>{
  const script=read('scripts/version-build.js');
  assert.match(script,/career-mode/);
  assert.match(script,/src'\,'career'|careerDir/);
  assert.match(script,/career\.css\?v=/);
  assert.match(script,/\.\.\/src\/career\/main\.js\?v=/);
});

test('Pages publishes career mode beside the prototype and the dev mirror',()=>{
  const workflow=read('.github/workflows/pages.yml');
  assert.match(workflow,/cp -R career-mode _site\/dev\/career-mode\//);
  assert.match(workflow,/cp -R _release\/career-mode _site\/career-mode\//);
  // The gameplay prototype and the public root stay where they are.
  assert.match(workflow,/cp _release\/index\.html _release\/style\.css _release\/studio\.html _release\/studio\.css _site\//);
  assert.match(workflow,/cp -R _prototype\/src _prototype\/assets _site\/prototype\//);
});

test('standings format tabs submit valid format ids',()=>{
  const main=read('src/career/main.js');
  assert.ok(main.includes('data-format="${entry}"'),'format tabs must use the string id from FORMATS');
  assert.ok(!main.includes('data-format="${entry.id}"'),'format tabs must not read an id from a string');
  assert.ok(main.includes('FORMATS.includes(app.standingsFormat)'),'standings must reject an invalid remembered format');
});

test('the career service worker precaches the app shell and the shared engine',()=>{
  const sw=read('career-mode/sw.js');
  for(const entry of ['./index.html','./career.css','../src/career/main.js','../src/roster.js','../src/competition.js','../src/core.js']){
    assert.ok(sw.includes(entry),`service worker must precache ${entry}`);
  }
});

test('the career entry point registers the service worker for offline use',()=>{
  const main=read('src/career/main.js');
  assert.match(main,/serviceWorker\.register\('\.\/sw\.js'/);
});
