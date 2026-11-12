// Browser regression checks. Install Playwright separately or provide its module
// path through PLAYWRIGHT_MODULE; no production dependency is needed.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const {chromium,webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.argv[2]||'http://127.0.0.1:8768/';
const output=resolve(process.argv[3]||'.codex-attachments/mobile-scaling/after');
const baseline=process.argv.includes('--baseline');
const patchLayout=process.argv.includes('--patch-layout');
await mkdir(output,{recursive:true});
const cases=[
 {name:'desktop',options:{viewport:{width:1440,height:900},deviceScaleFactor:1}},
 {name:'desktop-retina',options:{viewport:{width:1920,height:1080},deviceScaleFactor:2}},
 {name:'tablet',options:{viewport:{width:820,height:1180},deviceScaleFactor:2,isMobile:true,hasTouch:true}},
 {name:'android-portrait',options:devices['Pixel 7']},
 {name:'android-landscape',options:devices['Pixel 7 landscape']},
 {name:'iphone-portrait-bars',options:devices['iPhone 16 Pro']},
 {name:'iphone-portrait-full',options:{...devices['iPhone 16 Pro'],viewport:{width:402,height:874}}},
 {name:'iphone-landscape-bars',options:devices['iPhone 16 Pro landscape']},
 // Insets are simulated: desktop WebKit does not emulate iOS cutout hardware.
 {name:'iphone-landscape-safe-area',options:{...devices['iPhone 16 Pro landscape'],viewport:{width:874,height:402}},insets:[3,62,21,62]},
 {name:'narrow-phone',options:{...devices['iPhone 16 Pro'],viewport:{width:320,height:568}}},
 // Explicitly simulate distinct layout/visual viewports, rather than claiming
 // that ordinary device emulation reproduces Safari browser-chrome behavior.
 {name:'visual-viewport',options:devices['iPhone 16 Pro'],visual:{width:350,height:600,offsetLeft:0,offsetTop:0,scale:1}},
 {name:'visual-viewport-offset',options:devices['iPhone 16 Pro'],visual:{width:350,height:580,offsetLeft:12,offsetTop:20,scale:1}}
];
const results=[];
for(const [engineName,engine] of [['webkit',webkit],['chromium',chromium]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const scenario of cases){
   const context=await browser.newContext({...scenario.options,serviceWorkers:'block'});
   if(patchLayout)await context.route(/\/(?:style\.css|src\/court-display\.js)(?:\?|$)/,async route=>{
    const css=new URL(route.request().url()).pathname.endsWith('style.css');
    await route.fulfill({path:fileURLToPath(new URL(css?'../style.css':'../src/court-display.js',import.meta.url)),contentType:css?'text/css':'text/javascript'});
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   if(scenario.visual)await page.addInitScript(visible=>{
    const viewport=new EventTarget();Object.assign(viewport,visible);
    Object.defineProperty(window,'visualViewport',{value:viewport});
   },scenario.visual);
   const checks=[],measurements=[];
   const check=(label,run)=>{try{run();checks.push({label,pass:true})}catch(error){checks.push({label,pass:false,error:error.message})}};
   try{
    await page.goto(base,{waitUntil:'networkidle'});
    if(scenario.insets)await page.addStyleTag({content:`.court-app main{padding:${scenario.insets.map(n=>n+'px').join(' ')}}`});
    const startBounds=await page.evaluate(()=>{
     const v=visualViewport||{width:innerWidth,height:innerHeight,offsetLeft:0,offsetTop:0};
     return ['.game-logo','#start-fullscreen','#start-play','#start-how-to'].every(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.left>=v.offsetLeft-.6&&r.right<=v.offsetLeft+v.width+.6&&r.top>=v.offsetTop-.6&&r.bottom<=v.offsetTop+v.height+.6});
    });
    check('start screen fits',()=>assert.equal(startBounds,true));
    await page.locator('#start-play').click();
    await page.locator('#match-setup[open]').waitFor();
    // Submit through the real form handler; avoid name-field blur reflow during
    // coordinate-based setup clicks. Gameplay input below uses real pointers.
    await page.locator('#match-setup form').evaluate(form=>form.requestSubmit());
    await page.locator('#match-intro[open]').waitFor();
    await page.locator('#begin-match').press('Enter');
    await page.locator('#match-intro').waitFor({state:'hidden'});
    await page.waitForTimeout(250);

    async function measure(){
     return page.evaluate(async()=>{
      const selectors=['body','main','header h1','#fullscreen-button','#pause-button','#court-menu','.playfield','.game','#court','#court-hud','#aim-pad',...['attack','soft','lob'].map(s=>`[data-shot="${s}"]`)];
      const boxes=Object.fromEntries(selectors.map(selector=>[selector,document.querySelector(selector).getBoundingClientRect().toJSON()]));
      const canvas=document.querySelector('#court'),rect=boxes['#court'];
      const {courtCamera,gameProjection}=await import(new URL('src/court-camera.js',document.baseURI));
      const camera=courtCamera(rect.width/rect.height);
      const courtCorners=[[0,0],[20,0],[0,44],[20,44]].map(([x,y])=>{const p=gameProjection(x,y);return {x:rect.x+(p.x-camera.x)/camera.width*rect.width,y:rect.y+(p.y-camera.y)/camera.height*rect.height}});
      const vv=visualViewport;
      return {build:globalThis.DRIVES_DINKS_BUILD,inner:[innerWidth,innerHeight],visual:vv?{width:vv.width,height:vv.height,offsetLeft:vv.offsetLeft,offsetTop:vv.offsetTop,scale:vv.scale}:null,dpr:devicePixelRatio,backing:[canvas.width,canvas.height],camera,boxes,courtCorners,layout:document.querySelector('main').dataset.courtLayout,scrollWidth:document.documentElement.scrollWidth};
     });
    }
    function checkGeometry(metrics,label='initial'){
     const v=metrics.visual||{width:metrics.inner[0],height:metrics.inner[1],offsetLeft:0,offsetTop:0};
     const b=metrics.boxes,c=b['#court'],density=Math.min(2,metrics.dpr);
     check(label+' visible bounds',()=>{for(const [selector,r] of Object.entries(b)){
      assert.ok(r.left>=v.offsetLeft-.6&&r.right<=v.offsetLeft+v.width+.6&&r.top>=v.offsetTop-.6&&r.bottom<=v.offsetTop+v.height+.6,`${selector}: ${JSON.stringify(r)} outside ${JSON.stringify(v)}`);
     }});
     check(label+' full court and uniform scale',()=>{
      for(const point of metrics.courtCorners)assert.ok(point.x>=c.left&&point.x<=c.right&&point.y>=c.top&&point.y<=c.bottom);
      assert.ok(Math.abs(c.width/metrics.camera.width-c.height/metrics.camera.height)<1e-9);
     });
     check(label+' backing density',()=>{assert.equal(metrics.backing[0],Math.round(c.width*density));assert.equal(metrics.backing[1],Math.round(c.height*density))});
     check(label+' touch targets and hit testing',()=>{for(const s of ['#aim-pad','[data-shot="attack"]','[data-shot="soft"]','[data-shot="lob"]'])assert.ok(b[s].width>=44&&b[s].height>=44,s)});
    }
    const initial=await measure();measurements.push({label:'initial',...initial});checkGeometry(initial);
    check('no JavaScript errors',()=>assert.deepEqual(errors,[]));
    const click=async locator=>scenario.options.hasTouch?locator.tap():locator.click();
    await click(page.locator('[data-shot="soft"]'));
    const selected=await page.locator('[data-shot="soft"]').getAttribute('aria-pressed');
    check('shot pointer input',()=>assert.equal(selected,'true'));
    const point=async(x,y)=>{if(scenario.options.hasTouch)await page.touchscreen.tap(x,y);else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up()}};
    const track=await page.locator('.aim-pad-track').boundingBox();
    await point(track.x+track.width*.1,track.y+track.height*.5);
    const padLeft=Number(await page.locator('#aim-pad').getAttribute('aria-valuenow'));
    await point(track.x+track.width*.9,track.y+track.height*.5);
    const padRight=Number(await page.locator('#aim-pad').getAttribute('aria-valuenow'));
    check('aim pad pointer input',()=>assert.ok(padRight>padLeft,`${padLeft} -> ${padRight}`));
    const canvas=initial.boxes['#court'];
    await point(canvas.x+canvas.width*.3,canvas.y+canvas.height*.3);
    const courtLeft=Number(await page.locator('#aim-pad').getAttribute('aria-valuenow'));
    await point(canvas.x+canvas.width*.7,canvas.y+canvas.height*.3);
    const courtRight=Number(await page.locator('#aim-pad').getAttribute('aria-valuenow'));
    check('court pointer input',()=>assert.ok(courtRight>courtLeft,`${courtLeft} -> ${courtRight}`));
    const targetsHit=await page.evaluate(()=>['#aim-pad','[data-shot="attack"]','[data-shot="soft"]','[data-shot="lob"]'].every(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));
    check('unobstructed control centers',()=>assert.equal(targetsHit,true));
    await page.screenshot({path:resolve(output,`${engineName}-${scenario.name}.png`)});
    if(scenario.name==='iphone-portrait-bars'){
     for(const viewport of [{width:874,height:402},{width:402,height:681}]){
      await page.setViewportSize(viewport);await page.waitForTimeout(150);
      const metrics=await measure(),label=`rotate-${viewport.width}`;checkGeometry(metrics,label);measurements.push({label,...metrics});
     }
    }
    if(scenario.visual){
     await page.evaluate(()=>{Object.assign(visualViewport,{width:330,height:540,offsetLeft:12,offsetTop:20});visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'))});
     await page.waitForTimeout(150);const shrunk=await measure();checkGeometry(shrunk,'visual resize');measurements.push({label:'visual resize',...shrunk});
     await page.evaluate(()=>{Object.assign(visualViewport,{width:165,height:270,scale:2});visualViewport.dispatchEvent(new Event('resize'))});
     await page.waitForTimeout(100);const zoomed=await measure();
     check('pinch zoom preserves layout',()=>assert.deepEqual(zoomed.boxes['.game'],shrunk.boxes['.game']));
     await page.evaluate(()=>{Object.assign(visualViewport,{width:innerWidth,height:innerHeight,offsetLeft:0,offsetTop:0,scale:1});visualViewport.dispatchEvent(new Event('resize'))});
     await page.waitForTimeout(150);const restored=await measure();checkGeometry(restored,'visual restored');measurements.push({label:'visual restored',...restored});
    }
    check('no errors after resize and input',()=>assert.deepEqual(errors,[]));
   }catch(error){checks.push({label:'browser flow',pass:false,error:error.stack})}
   await context.close();
   const result={engine:engineName,version:browser.version(),name:scenario.name,checks,measurements,errors};results.push(result);
   console.log(`${checks.every(c=>c.pass)?'PASS':'FAIL'} ${engineName} ${scenario.name}: ${checks.filter(c=>c.pass).length}/${checks.length}`);
  }
 }finally{await browser.close()}
}
await writeFile(resolve(output,'results.json'),JSON.stringify({base,baseline,patchLayout,results},null,2)+'\n');
if(!baseline&&results.some(r=>r.checks.some(c=>!c.pass)))process.exitCode=1;
