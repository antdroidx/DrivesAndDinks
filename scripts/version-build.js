import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function versionModuleImports(source,version){
  const suffix=`?v=${version}`;
  return source
    .replace(/(\bfrom\s*['"])(\.\.?\/[^'"]+?\.js)(['"])/g,(_,start,url,end)=>`${start}${url}${suffix}${end}`)
    .replace(/(\bimport\s*\(\s*['"])(\.\.?\/[^'"]+?\.js)(['"]\s*\))/g,(_,start,url,end)=>`${start}${url}${suffix}${end}`);
}

export function versionSite(root,version){
  if(!/^\d+$/.test(String(version)))throw new Error(`Invalid build number: ${version}`);
  const site=path.resolve(root);
  const indexPath=path.join(site,'index.html');
  let html=readFileSync(indexPath,'utf8');
  const replacements=[
    ['href="style.css"',`href="style.css?v=${version}"`],
    ['src="build-info.js"',`src="build-info.js?v=${version}"`],
    ['src="src/update-check.js"',`src="src/update-check.js?v=${version}"`],
    ['src="src/main.js"',`src="src/main.js?v=${version}"`]
  ];
  for(const [from,to] of replacements){
    if(!html.includes(from))throw new Error(`Missing versioned asset reference: ${from}`);
    html=html.replace(from,to);
  }
  writeFileSync(indexPath,html);

  // The motion studio is optional in the frozen public build.
  if(readdirSync(site).includes('studio.html')){
    const studioPath=path.join(site,'studio.html');
    writeFileSync(studioPath,readFileSync(studioPath,'utf8')
      .replace('href="studio.css"',`href="studio.css?v=${version}"`)
      .replace('src="src/studio.js"',`src="src/studio.js?v=${version}"`));
  }

  const sourceDir=path.join(site,'src');
  for(const name of readdirSync(sourceDir)){
    if(!name.endsWith('.js'))continue;
    const file=path.join(sourceDir,name);
    writeFileSync(file,versionModuleImports(readFileSync(file,'utf8'),version));
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const version=process.argv[2];
  const site=process.argv[3]??'_site';
  if(!version)throw new Error('Usage: node scripts/version-build.js <build-number> [site-directory]');
  versionSite(path.resolve(site),version);
}
