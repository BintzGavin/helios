---
id: PERF-059
slug: target-selector-beginframe
status: unclaimed
claimed_by: ""
created: 2024-03-24
completed: ""
result: ""
---

# PERF-059: Use HeadlessExperimental.beginFrame for Target Selector Captures

## Focus Area
DOM Frame Capture Loop in `packages/renderer/src/strategies/DomStrategy.ts`. Fixing an indefinite hang when using `targetSelector` under explicit compositor control (`--enable-begin-frame-control`).

## Background Research
Currently, when a `targetSelector` is used, the renderer captures it using Playwright's native `element.screenshot()`. However, because Playwright is launched with `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw`, native Playwright capture commands that wait for layout updates hang indefinitely waiting for the browser's own compositor tick. Under this configuration, the tick must be manually driven via the `HeadlessExperimental.beginFrame` CDP command.

## Benchmark Configuration
- **Composition URL**: `packages/renderer/tests/fixtures/dom-selector.html`
- **Render Settings**: Follow the settings dictated in `packages/renderer/tests/verify-dom-selector.ts`.
- **Mode**: `dom`
- **Metric**: Verification tests must pass without timing out.

## Baseline
- **Current estimated render time**: Fails due to a timeout error during the screenshot primitive.
- **Bottleneck analysis**: The Playwright element screenshot primitive is deadlocked waiting for compositor frames that are explicitly paused.

## Implementation Spec

### Step 1: Replace native screenshot with bounding box CDP capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Locate the logic in the `capture` method that handles target selector capturing (currently returning `await element.screenshot(screenshotOptions)`). Replace this native execution with logic that uses `HeadlessExperimental.beginFrame`:
1. Retrieve the element's bounding box using `element.boundingBox()`.
2. If the box exists and `this.cdpSession` is available, format a `clip` object (`x`, `y`, `width`, `height`, and `scale: 1`) using the bounding box values.
3. Add this `clip` to the `screenshot` payload for `HeadlessExperimental.beginFrame`.
4. Call `HeadlessExperimental.beginFrame`. If `screenshotData` is returned, convert it to a Buffer and cache it in `this.lastFrameBuffer`. If no visual damage is detected and `screenshotData` is missing, reuse `this.lastFrameBuffer` or fall back to `Page.captureScreenshot` (with `clip`) for the first frame.
5. If the box is missing or the CDP session is unavailable, fall back to the native `element.screenshot(screenshotOptions)` command.
**Why**: This manually advances the compositor and captures the region without relying on the deadlocked native Playwright API.
**Risk**: Element bounds calculation could be slightly off if complex CSS transforms are applied.

## Correctness Check
Run the DOM selector verification script:
`npx tsx packages/renderer/tests/verify-dom-selector.ts`
All tests (including light and shadow DOM selections, and error handling for missing selectors) should pass without hanging.
