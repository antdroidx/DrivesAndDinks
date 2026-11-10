import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {setupDialogBounds} from '../src/selection.js';
test('setup remains inside portrait, landscape and keyboard-sized visible viewports',()=>{
 for(const [width,height] of [[390,800],[844,390],[925,1180],[1240,810],[320,256]]){const b=setupDialogBounds({width,height});assert.ok(b.left>=0);assert.ok(b.top>=0);assert.ok(b.left+b.width<=width);assert.ok(b.top+b.height<=height);assert.equal(b.compact,b.width<650)}
});
test('zoomed and panned browser viewports position setup in the visible region',()=>{
 const v={width:360,height:580,offsetLeft:170,offsetTop:90},b=setupDialogBounds(v);
 assert.equal(b.left,178);assert.equal(b.top,98);assert.equal(b.width,344);assert.ok(b.left+b.width<=v.offsetLeft+v.width);assert.ok(b.top+b.height<=v.offsetTop+v.height);assert.equal(b.compact,true);
});
test('orientation change recomputes dialog dimensions rather than preserving the old width',()=>{
 const portrait=setupDialogBounds({width:390,height:800}),landscape=setupDialogBounds({width:800,height:390});assert.equal(portrait.width,374);assert.equal(landscape.width,740);assert.equal(landscape.height,374);assert.ok(landscape.top+landscape.height<=390);
});
test('browser zoom remains available and dialogs keep their own scrolling',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=readFileSync(new URL('../style.css',import.meta.url),'utf8'),main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),selection=readFileSync(new URL('../src/selection.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
 assert.match(css,/dialog\{touch-action:pan-y\}/);
 assert.match(css,/body:has\(dialog\[open\]\)\{overscroll-behavior:none\}/);
 assert.doesNotMatch(css,/\.game #shots @media/);
 assert.match(selection,/select\('hairStyle'/);
 assert.match(selection,/hairStyleField/);
 assert.match(selection,/headwearField/);
 assert.match(selection,/eyewearField/);
 assert.match(main,/game-art-outfit" name="outfit/);
 assert.match(css,/\.score-team\{display:grid/);
 assert.match(css,/\.score-meta\{grid-column:1\/-1/);
 assert.doesNotMatch(html,/name="showNameTags"/);
 assert.doesNotMatch(html,/id="stacking-options"/);
 assert.doesNotMatch(html,/id="display-options"/);
 assert.match(main,/nameTagsButton\.id='name-tags-button'/);
 assert.match(main,/name-tags-button/);
 assert.doesNotMatch(main,/game-art-style|game-art-look/);
 assert.match(main,/body-effects-info/);
 assert.match(main,/output id="body-effects"/);
 assert.match(selection,/mainIdentity\.append\(archetypeField,designButton,playerDescription\)/);
 assert.match(selection,/designer\.append\(back,preview,profileBox,outfitBox\)/);
 assert.match(selection,/profileGrid\.prepend\(nameField,archetypeField\)/);
 assert.doesNotMatch(html,/download-report|DOWNLOAD REPORT/);
 assert.match(selection,/select\('gender'/);
 assert.match(selection,/player\.gender==='female'\?'Female':'Male'/);
 assert.match(selection,/player\.handedness==='left'\?'Left-handed':'Right-handed'/);
 assert.match(main,/artPreferences\.style='anime'/);
 assert.match(main,/artPreferences\.look='storybook'/);
 assert.match(html,/id="player-name-slot"/);
 assert.match(html,/id="paddle-brief"/);
 assert.match(html,/id="footer-controls"|class="footer-controls"/);
 assert.match(main,/Weight \(lbs\)/);
 assert.match(main,/buildFromWeight/);
 assert.match(selection,/paddleSelects\.append\(field\('Paddle family',paddleFamily\),field\('Paddle shape',paddleShape\),paddleColorField\)/);
 assert.match(selection,/select\('highlightColor'/);
 assert.match(selection,/highlightColorField/);
 assert.match(selection,/outfitGrid\.append\(outfitField,shirtColorField,highlightColorField,/);
 assert.doesNotMatch(selection,/outfitGrid\.append\(outfitField,shirtColorField,headwearField,eyewearField,paddleColorField/);
 assert.match(selection,/paddleDescription\.textContent/);
 assert.match(selection,/footerControls\.append/);
 assert.match(selection,/nameInput\.placeholder='Auto-generated name'/);
 assert.match(selection,/select\('handedness'/);
 assert.doesNotMatch(main,/downloadReport|export-report|DOWNLOAD REPORT/);
 assert.match(html,/id="side-switch-dialog"/);
 assert.match(html,/id="side-switch-continue"/);
 assert.match(html,/id="side-switch-copy"/);
 assert.match(main,/showSideSwitchNotice/);
 assert.match(main,/view:'far'/);
 assert.doesNotMatch(main,/view:card\.team===0\?'near':'far'/);
 assert.match(html,/id="match-intro"/);
 assert.match(html,/id="match-intro-teams"/);
 assert.match(html,/id="begin-match"/);
});


test('compact setup and matchup portraits stay dense and proportional',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8'),main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),selection=readFileSync(new URL('../src/selection.js',import.meta.url),'utf8');
 assert.ok(css.includes('#match-setup[data-compact="true"] .setup-footer{grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(css.includes('#match-setup[data-compact="true"] .footer-controls{display:contents}'));
 assert.ok(css.includes('#match-setup[data-compact="true"] .start-match{grid-column:auto;'));
 assert.ok(selection.includes('footerControls.append(formatField,difficultyField,matchModeField,stackModeField,stackSideField,cpuStackField,venueField,courtField)'));
 assert.ok(css.includes('.intro-player canvas{width:132px;height:auto;aspect-ratio:264/316;object-fit:contain;'));
 assert.ok(!css.includes('.intro-player canvas{width:100%;height:170px}'));
 assert.ok(main.includes('introHeading.focus({preventScroll:true});matchIntroDialog.scrollTop=0'));
});

test('focused name editor preserves a typed space until blur',()=>{
 const selection=readFileSync(new URL('../src/selection.js',import.meta.url),'utf8');
 assert.match(selection,/nameInput\.addEventListener\('focus'/);
 assert.match(selection,/if\(input===nameInput&&editingName\)return/);
 assert.match(selection,/if\(!editingName\)nameInput\.value=/);
 assert.match(selection,/nameInput\.addEventListener\('blur'/);
});

test('design labs use the current anime renderer and roster colors',()=>{
 const characterLab=readFileSync(new URL('../src/character-lab.js',import.meta.url),'utf8'),styleLab=readFileSync(new URL('../src/style-lab.js',import.meta.url),'utf8'),styleHtml=readFileSync(new URL('../style-lab.html',import.meta.url),'utf8');
 assert.match(characterLab,/drawAnimeAthlete as athlete/);assert.match(characterLab,/look:'storybook'/);assert.match(characterLab,/appearancePalette/);
 assert.match(styleLab,/CLOTHING_COLORS,HAIR_COLORS,PADDLE_COLORS,SKIN_COLORS/);assert.match(styleLab,/appearancePalette/);
 for(const id of ['hair-color','highlight','paddle','skin','color'])assert.match(styleHtml,new RegExp(`id="${id}"`));
});