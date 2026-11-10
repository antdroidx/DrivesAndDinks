import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the Android shell bundles the career and intercepts it on a local origin',()=>{
  const project=read('packaging/android/DrivesAndDinks.Android.csproj');
  const activity=read('packaging/android/MainActivity.cs');
  assert.match(project,/career-mode\\\*\*\\\*/);
  assert.match(project,/src\\\*\*\\\*/);
  assert.match(activity,/appassets\.local/);
  assert.match(activity,/DomStorageEnabled = true/);
  assert.match(activity,/ShouldInterceptRequest/);
});

test('the Windows shell uses WebView2 virtual hosting with bundled assets',()=>{
  const project=read('packaging/windows/DrivesAndDinks.Windows.csproj');
  const window=read('packaging/windows/MainWindow.xaml.cs');
  assert.match(project,/Microsoft\.Web\.WebView2/);
  assert.match(project,/www\\career-mode/);
  assert.match(window,/SetVirtualHostNameToFolderMapping/);
  assert.match(window,/https:\/\/app\.local\/career-mode\/index\.html/);
});

test('career PWA metadata and the service worker cover the packaged app',()=>{
  const page=read('career-mode/index.html');
  const manifest=read('career-mode/manifest.webmanifest');
  const sw=read('career-mode/sw.js');
  assert.ok(existsSync(new URL('../career-mode/manifest.webmanifest',import.meta.url)));
  assert.match(page,/href="manifest\.webmanifest"/);
  assert.match(manifest,/"start_url": "\.\/"/);
  assert.match(manifest,/"display": "standalone"/);
  for(const module of ['inbox.js','equipment.js','portable-save.js','team-league.js','invitations.js','injuries.js'])assert.match(sw,new RegExp(module.replace('.','\\.')));
});

test('package scripts produce native Windows and Android artifacts',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['package:windows'],'powershell -ExecutionPolicy Bypass -File scripts/package-windows.ps1');
  assert.equal(pkg.scripts['package:android'],'powershell -ExecutionPolicy Bypass -File scripts/package-android.ps1');
  assert.match(read('scripts/package-windows.ps1'),/dotnet publish/);
  assert.match(read('scripts/package-android.ps1'),/AndroidPackageFormat=apk/);
});