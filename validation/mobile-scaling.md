# Mobile scaling audit — 2026-11-11

The responsive fix passed browser checks. The measurements below were recorded before deployment against Build **217**.

## Finding and confidence

Inspected the repository and the public [GitHub Pages build](https://antdroidx.github.io/DrivesAndDinks/), which reports Build **217**. Its court-display code matches the pre-fix checkout. Ordinary iPhone 16 Pro viewport emulation **did not reproduce the tester's cutoff**, in either portrait or landscape. The tester's exact browser state remains unconfirmed; this report does not claim that desktop WebKit reproduces an actual iPhone Safari session.

A separate, reproducible defect exists when the visual viewport is smaller than the layout viewport at normal zoom. `setupCourtDisplay()` listened for visual-viewport resize events, but remeasured a field still sized by the layout viewport. It never consumed the visible width, height or offsets. Since the page hides overflow, content outside the visible rectangle cannot be reached by normal page scrolling.

The regression test explicitly substitutes a smaller visual viewport while retaining an iPhone layout viewport. This is a controlled simulation of the mismatch, not proof that the tester encountered it. Both browser engines reproduce the same clipping against the unmodified live build:

| Measurement, CSS pixels | Live Build 217 | Patched Build 217 |
| --- | ---: | ---: |
| Layout viewport | 402 × 681 | 402 × 681 |
| Simulated visible viewport | 350 × 600 | 350 × 600 |
| Game right edge | 399 | 347 |
| Rightmost shot button edge | 387.125 | 336.688 |
| Canvas size | 396 × 459 | 344 × 338 |
| Backing pixels at devicePixelRatio 3, capped at 2 | 792 × 918 | 688 × 676 |

## Audit and changes

- **Viewport meta:** already has `width=device-width,initial-scale=1,viewport-fit=cover`. Retained it; zoom remains available.
- **Canvas and aspect:** HTML's 1920 × 1200 is only the initial backing size. The existing ResizeObserver sizes the backing store from CSS bounds. The camera and pointer mapping already use those bounds. Retained that renderer: horizontal and vertical world-to-screen scales match, and all four projected court corners remain visible. No physics, coordinates, court geometry or camera formulas changed.
- **Pixel density:** existing `min(2, devicePixelRatio)` is correct and intentional for rendering cost. DPR 1, 2, 2.75 and 3 were exercised. DPR does not set the CSS width.
- **Visual viewport:** added a small `gameViewport()` helper and CSS variables for visible width, height, left and top. The root, start screen and fullscreen dimensions consume these values. Resize and scroll events update them. Browsers without the API use window dimensions, with CSS height fallbacks.
- **Pinch zoom:** when the viewport scale differs from 1, retain the established layout rather than shrinking the game under the user's zoom.
- **Safe areas and orientation:** retained the existing four `env(safe-area-inset-*)` paddings. Layout selection now uses the available playfield after padding and the header, rather than the outer window ratio. Rotation and viewport resizing update the existing canvas observer naturally.
- **HUD and controls:** retained the score strip, portrait thumb strip and landscape controls. Allow the header to wrap when space is constrained. Prevent the start-screen grid, logo and actions from imposing a wider minimum width than their container.

Production changes are confined to `src/court-display.js` and `style.css`. Added helper regression tests and `scripts/verify-responsive.js`. Existing unrelated career/game edits in the working tree were left intact.

## Results

Playwright **1.65.0**, Windows WebKit **27.2**, Chromium **158.0.8127.18**. The following 12 scenarios ran in **both** engines:

| Scenario | Viewport, CSS pixels | Local fix | Live build with patched assets |
| --- | --- | --- | --- |
| Desktop | 1440 × 900, DPR 1 | Pass | Pass |
| Desktop retina | 1920 × 1080, DPR 2 | Pass | Pass |
| Tablet | 820 × 1180 | Pass | Pass |
| Android Pixel 7 portrait | Playwright device preset | Pass | Pass |
| Android Pixel 7 landscape | Playwright device preset | Pass | Pass |
| iPhone 16 Pro, portrait with bars | 402 × 681 | Pass | Pass |
| iPhone 16 Pro, full portrait | 402 × 874 | Pass | Pass |
| iPhone 16 Pro, landscape with bars | 756 × 352 | Pass | Pass |
| iPhone landscape with simulated safe areas | 874 × 402; left/right 62, bottom 21 | Pass | Pass |
| Narrow phone | 320 × 568 | Pass | Pass |
| Smaller visual viewport | 350 × 600 within 402 × 681 | Pass | Pass |
| Smaller, offset visual viewport | 350 × 580 at (12,20) | Pass | Pass |

Each final run passed **24/24 scenarios and 316/316 assertions**, with no JavaScript errors. The unmodified live baseline passed 20/24 scenarios and failed visible-bound checks in the four simulated mismatch scenarios. Both engines' default iPhone scenarios passed before and after the fix.

Checks cover start-screen bounds; header, HUD, canvas and control visibility; full court bounds and uniform projection scale; backing density; touch targets of at least 44 × 44; control hit testing; actual pointer/touch shot selection, court aim and pad aim. iPhone portrait cases rotate to landscape and back. Mismatch cases resize, move, zoom to 2×, restore 1× and return to full size. Desktop fullscreen was also entered successfully in both engines; the 1434 × 794 canvas remained within the 1440 × 900 viewport.

The full `npm test` run passed **782/782 tests**. After the final start-screen CSS adjustment, the focused display/camera/setup/start suite passed **26/26 tests**. `git diff --check` passed.

The live-patch test intercepts **only `style.css` and `src/court-display.js`** inside the test browser and serves the local files. All other assets remain the actual live Build 217. This verifies the targeted change independently of unrelated local game edits and does not publish anything.

## Evidence and repeatability

Generated local evidence:

- [Unmodified live baseline](../.codex-attachments/mobile-scaling/live-baseline/results.json)
- [Final local results](../.codex-attachments/mobile-scaling/verified-local/results.json)
- [Final live build with layout patch](../.codex-attachments/mobile-scaling/verified-live-patch/results.json)
- [iPhone portrait screenshot](../.codex-attachments/mobile-scaling/verified-local/webkit-iphone-portrait-bars.png)
- [iPhone landscape screenshot with simulated safe areas](../.codex-attachments/mobile-scaling/verified-local/webkit-iphone-landscape-safe-area.png)
- [Full unit-test output](../.codex-attachments/mobile-scaling/unit-tests.log)

Run the local server with `npm start`. In a second PowerShell terminal, install the browser test tools outside the repository and run:

```powershell
$qaDir = Join-Path $env:TEMP 'drives-dinks-responsive-qa'
npm install --prefix $qaDir playwright@1.65.0 --no-audit --no-fund
npx --prefix $qaDir playwright install chromium webkit
$env:PLAYWRIGHT_MODULE = Join-Path $qaDir 'node_modules\playwright\index.mjs'
node scripts/verify-responsive.js http://127.0.0.1:8768/ .codex-attachments/mobile-scaling/local
node scripts/verify-responsive.js https://antdroidx.github.io/DrivesAndDinks/ .codex-attachments/mobile-scaling/baseline --baseline
node scripts/verify-responsive.js https://antdroidx.github.io/DrivesAndDinks/ .codex-attachments/mobile-scaling/patched --patch-layout
```

The script submits initial match setup through its real form handler to avoid coordinate-click reflow from the focused name editor; gameplay controls use real pointer/touch input. Service workers are blocked for deterministic comparisons. Device presets, safe-area injection and the substituted visual viewport do not test physical Safari browser bars, the native keyboard, installed-app behavior or hardware performance. A physical iPhone retest is still needed to confirm the original report, including the exact URL/build, browser, orientation and zoom state.

The implementation follows [WebKit's safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) while preserving the existing inset handling.
