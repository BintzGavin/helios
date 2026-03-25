---
id: PERF-057
slug: target-selector-beginframe
status: unclaimed
claimed_by: ""
created: 2024-03-24
completed: ""
result: ""
---

# PERF-057: Use HeadlessExperimental.beginFrame for Target Selector Captures

## Focus Area
DOM Frame Capture Loop in `DomStrategy.ts`. Specifically fixing a hang issue when rendering with a target selector under explicit compositor control.

## Background Research
Currently, when a target selector is used to capture a specific element, the renderer attempts to capture it using Playwright's native screenshot mechanisms. However, because Playwright is launched with `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` (implemented in PERF-045 to optimize layout/paint latency), native Playwright capture commands that wait for layout updates hang indefinitely. Playwright's internal mechanics expect the browser's own compositor tick, but under this configuration, the tick must be manually driven via the `HeadlessExperimental.beginFrame` CDP command.
The solution is to calculate the bounding box of the target element, and then explicitly use `HeadlessExperimental.beginFrame` with the `clip` parameter, falling back to standard capture only if the bounding box cannot be resolved.

## Benchmark Configuration
- **Composition URL**: `packages/renderer/tests/fixtures/dom-selector.html`
- **Render Settings**: Follow the settings dictated in `packages/renderer/tests/verify-dom-selector.ts`.
- **Mode**: `dom`
- **Metric**: Verification tests must pass without timing out.

## Baseline
- **Current estimated render time**: Fails due to a timeout error during the screenshot primitive.
- **Bottleneck analysis**: The Playwright page and element screenshot primitives are deadlocking waiting for compositor frames that are explicitly paused.

## Implementation Spec

### Step 1: Replace native screenshot with bounding box CDP capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Locate the logic in `DomStrategy.ts` that handles target selector capturing (it typically resolves an element handle and directly awaits a native screenshot command).
Replace the native screenshot execution with logic that attempts to retrieve the bounding box of the element:
1. Wait for the element's bounding box to be resolved by calling boundingBox() on the element handle.
2. If the box exists and the CDP session is available, use `HeadlessExperimental.beginFrame` explicitly. Add a `clip` object to the screenshot payload containing the bounding box coordinates and dimensions (extract dynamically from the bounding box object) and a `scale` of 1.
3. Handle the returned screenshot data similar to the main capture loop (cache in the last frame buffer and return the buffer, reusing the last frame buffer if the screenshot data is omitted).
4. If the box is missing (e.g., element is detached) or the CDP session is unavailable, fall back to the native screenshot command.
**Why**: This manually advances the compositor and captures the region without relying on the deadlocked native Playwright API.
**Risk**: Element bounds calculation could be slightly off if complex CSS transforms are applied.

## Canvas Smoke Test
Run a generic canvas verification script or example to ensure no unrelated changes affect the canvas path.

## Correctness Check
Run the DOM selector verification script:
`npx tsx packages/renderer/tests/verify-dom-selector.ts`
All tests (including light and shadow DOM selections, and error handling for missing selectors) should pass without hanging.
