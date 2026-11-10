import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function versionModuleImports(source,version){
  const suffix=`?v=${version}`;
  return source
    .replace(/(\bfrom\s*['"])(\.\.?\/[^'"]+?\.js)(['"])/g,(_,start,url,end)=>`${start}${url}${suffix}${end}`)
    .replace(/(\bimport\s*\(\s*['"])(\.\.?\/[^'"]+?\.js)(['"]\s*\))/g,(_,start,url,end)=>`${start}${url}${suffix}${end}`);
}

function versionSourceTree(root,version){
  for(const entry of readdirSync(root,{withFileTypes:true})){
    const file=path.join(root,entry.name);
    if(entry.isDirectory())versionSourceTree(file,version);
    else if(entry.name.endsWith('.js'))writeFileSync(file,versionModuleImports(readFileSync(file,'utf8'),version));
  }
}

export function versionCareerSite(root,version){
  if(!/^\d+$/.test(String(version)))throw new Error(`Invalid build number: ${version}`);
  const site=path.resolve(root);
  const indexPath=path.join(site,'index.html');
  let html=readFileSync(indexPath,'utf8');
  for(const [from,to] of [
    ['href="career.css"',`href="career.css?v=${version}"`],
    ['src="build-info.js"',`src="build-info.js?v=${version}"`],
    ['src="src/career/main.js"',`src="src/career/main.js?v=${version}"`]
  ]){
    if(!html.includes(from))throw new Error(`Missing career asset reference: ${from}`);
    html=html.replace(from,to);
  }
  writeFileSync(indexPath,html);
  versionSourceTree(path.join(site,'src'),version);
  const swPath=path.join(site,'sw.js');
  if(existsSync(swPath)){
    let sw=readFileSync(swPath,'utf8').replace(/drives-dinks-career-v\d+/,'drives-dinks-career-v'+version);
    sw=sw.replace(/(['"])(\.\/(?:src|build-info)[^'"]+\.js)\1/g,(_,quote,url)=>`${quote}${url}?v=${version}${quote}`);
    writeFileSync(swPath,sw);
  }
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
    ['src="src/cache-refresh.js"',`src="src/cache-refresh.js?v=${version}"`],
    ['src="src/main.js"',`src="src/main.js?v=${version}"`]
  ];
  for(const [from,to] of replacements){
    if(!html.includes(from))throw new Error(`Missing versioned asset reference: ${from}`);
    html=html.replace(from,to);
  }
  writeFileSync(indexPath,html);

  // Version the motion studio whenever it is included in a deployment.
  if(readdirSync(site).includes('studio.html')){
    const studioPath=path.join(site,'studio.html');
    writeFileSync(studioPath,readFileSync(studioPath,'utf8')
      .replace('href="studio.css"',`href="studio.css?v=${version}"`)
      .replace('src="src/studio.js"',`src="src/studio.js?v=${version}"`)
      .replace('src="src/cache-refresh.js"',`src="src/cache-refresh.js?v=${version}"`));
  }

  if(readdirSync(site).includes('character-lab.html')){
    const labPath=path.join(site,'character-lab.html');
    writeFileSync(labPath,readFileSync(labPath,'utf8').replace('href="character-lab.css"',`href="character-lab.css?v=${version}"`).replace('src="src/character-lab.js"',`src="src/character-lab.js?v=${version}"`));
  }

  if(readdirSync(site).includes('style-lab.html')){
    const stylePath=path.join(site,'style-lab.html');
    writeFileSync(stylePath,readFileSync(stylePath,'utf8').replace('href="character-lab.css"',`href="character-lab.css?v=${version}"`).replace('src="src/style-lab.js"',`src="src/style-lab.js?v=${version}"`));
  }

  if(readdirSync(site).includes('art-directions.html')){
    const artPath=path.join(site,'art-directions.html');
    writeFileSync(artPath,readFileSync(artPath,'utf8')
      .replace('href="art-directions.css"',`href="art-directions.css?v=${version}"`)
      .replace('src="src/art-directions.js"',`src="src/art-directions.js?v=${version}"`));
  }

  const sourceDir=path.join(site,'src');
  for(const name of readdirSync(sourceDir)){
    if(!name.endsWith('.js'))continue;
    const file=path.join(sourceDir,name);
    writeFileSync(file,versionModuleImports(readFileSync(file,'utf8'),version));
  }

  // Career mode has its own entry point and a nested module folder.
  const careerDir=path.join(sourceDir,'career');
  if(existsSync(careerDir)){
    for(const name of readdirSync(careerDir)){
      if(!name.endsWith('.js'))continue;
      const file=path.join(careerDir,name);
      writeFileSync(file,versionModuleImports(readFileSync(file,'utf8'),version));
    }
  }

  const careerPage=path.join(site,'career-mode','index.html');
  if(existsSync(careerPage)){
    writeFileSync(careerPage,readFileSync(careerPage,'utf8')
      .replace('href="career.css"',`href="career.css?v=${version}"`)
      .replace('src="../build-info.js"',`src="../build-info.js?v=${version}"`)
      .replace('src="../src/career/main.js"',`src="../src/career/main.js?v=${version}"`));
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const version=process.argv[2];
  const site=process.argv[3]??'_site';
  if(!version)throw new Error('Usage: node scripts/version-build.js <build-number> [site-directory] [--career]');
  const root=path.resolve(site);
  if(process.argv.includes('--career'))versionCareerSite(root,version);
  else versionSite(root,version);
}
