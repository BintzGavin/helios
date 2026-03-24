---
id: PERF-054
slug: target-selector-beginframe
status: unclaimed
claimed_by: ""
created: 2024-03-24
completed: ""
result: ""
---

# PERF-054: Use HeadlessExperimental.beginFrame for Target Selector Captures

## Focus Area
DOM Frame Capture Loop in `DomStrategy.ts`. Specifically fixing a hang issue when rendering with a `targetSelector` under explicit compositor control.

## Background Research
Currently, when `targetSelector` is enabled, the renderer attempts to capture the target element using Playwright's native `element.screenshot()`. However, because Playwright is launched with `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` (implemented in PERF-045 to optimize layout/paint latency), native Playwright capture commands that wait for layout updates hang indefinitely. Playwright's internal mechanics expect the browser's own compositor tick, but under this configuration, the tick must be manually driven via the `HeadlessExperimental.beginFrame` CDP command.
The solution is to calculate the bounding box of the target element, and then explicitly use `HeadlessExperimental.beginFrame` with the `clip` parameter, falling back to standard capture only if the bounding box cannot be resolved.

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/dom-selector.html`
- **Render Settings**: 1920x1080, 30fps, 0.5s duration
- **Mode**: `dom`
- **Metric**: Verification tests must pass (timeout removed).

## Baseline
- **Current estimated render time**: Fails due to a 30-second timeout error inside `element.screenshot()`.
- **Bottleneck analysis**: The Playwright page and element `screenshot` primitives are deadlocking waiting for compositor frames that are explicitly paused.

## Implementation Spec

### Step 1: Replace native screenshot with bounding box CDP capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, locate the block for `if (this.options.targetSelector)`. Replace the single `await element.screenshot(screenshotOptions)` line with logic that attempts to retrieve the bounding box of the element:
1. `const box = await element.boundingBox();`
2. If `box` exists and `this.cdpSession` exists, use `HeadlessExperimental.beginFrame` explicitly, adding a `clip` object to the `screenshot` payload (`clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }`).
3. Handle the returned `screenshotData` similar to the main capture loop (cache and return buffer).
4. If `box` is missing (e.g., element is detached) or `this.cdpSession` is unavailable, fall back to `element.screenshot(screenshotOptions)`.
**Why**: This manually advances the compositor and captures the region without relying on the deadlocked native Playwright API.
**Risk**: Element bounds calculation could be slightly off if transforms are applied.

## Canvas Smoke Test
Run a generic canvas verification script or example to ensure no unrelated changes affect the canvas path.

## Correctness Check
Run the DOM selector verification script:
`npx tsx packages/renderer/tests/verify-dom-selector.ts`
All tests (including light and shadow DOM selections, and error handling for missing selectors) should pass without hanging.
