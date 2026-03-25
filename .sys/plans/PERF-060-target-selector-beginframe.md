---
id: PERF-060
slug: target-selector-beginframe
status: unclaimed
claimed_by: ""
created: 2024-03-24
completed: ""
result: ""
---

# PERF-060: Use HeadlessExperimental.beginFrame for Target Selector Captures

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
In the `capture()` method, find the `if (this.options.targetSelector)` block. Inside, where the `cdpSession` exists, use `HeadlessExperimental.beginFrame` to capture the `targetSelector`. First, retrieve the `element.boundingBox()`. Then, format the `screenshot.clip` payload passing `x`, `y`, `width`, `height`, and `scale: 1`. Send the CDP command `HeadlessExperimental.beginFrame` with the `screenshot` payload. If `screenshotData` is returned, decode and return it. Handle damage-driven omissions by returning `this.lastFrameBuffer`, and fallback to `Page.captureScreenshot` (with identical `clip` parameters) if no previous frame buffer exists.
**Why**: This manually advances the compositor and captures the region without relying on the deadlocked native Playwright API.
**Risk**: Element bounds calculation could be slightly off if complex CSS transforms are applied.

### Step 2: Verify the change locally
Run the DOM selector verification script:
`npx tsx packages/renderer/tests/verify-dom-selector.ts`
All tests (including light and shadow DOM selections, and error handling for missing selectors) should pass without hanging.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure canvas mode is unharmed.

## Correctness Check
Run the DOM selector verification script:
`npx tsx packages/renderer/tests/verify-dom-selector.ts`
All tests should pass without hanging.

## Prior Art
PERF-059 attempted this change but had a badly formatted plan. PERF-045 implemented `beginFrame` globally.
