---
id: PERF-148
slug: evaluate-handle
status: unclaimed
claimed_by: ""
created: 2024-10-25
completed: ""
result: ""
---

# PERF-148: Investigate `page.evaluateHandle()` vs `HeadlessExperimental.beginFrame` for DOM Screen Capture

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` in the `capture` method. The open question from the journal is whether switching to `page.evaluateHandle()` or another more direct API for capturing DOM screenshots would be faster than the current `HeadlessExperimental.beginFrame` approach.

## Background Research
The `RENDERER-EXPERIMENTS.md` journal poses an open question:
"Would switching to \`page.evaluateHandle()\` or another more direct API for capturing DOM screenshots be faster than \`HeadlessExperimental.beginFrame\`?"

Currently, `DomStrategy` uses `HeadlessExperimental.beginFrame` to capture screenshots directly via CDP. The hypothesis behind this open question is that `page.evaluateHandle` (or an equivalent API) could provide a faster path, potentially avoiding some overhead associated with `beginFrame` or IPC serialization, particularly if we can grab a screenshot of a specific element handle.

Playwright's `ElementHandle.screenshot()` API allows taking a screenshot of a specific DOM element. Under the hood, this still uses CDP (often `Page.captureScreenshot` with a clip rect). We need to benchmark if Playwright's `ElementHandle.screenshot()` (obtained via `page.evaluateHandle()`) on the `document.documentElement` or `document.body` is faster than our custom `HeadlessExperimental.beginFrame` polling, especially given the various optimizations already applied to the loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture (\`output/example-build/examples/simple-animation/composition.html\`)
- **Render Settings**: Standard benchmark settings
- **Mode**: \`dom\`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: [To be measured]
- **Bottleneck analysis**: IPC latency and browser-side rendering/encoding of screenshots.

## Implementation Spec

### Step 1: Use \`page.evaluateHandle\` and \`ElementHandle.screenshot\` in \`DomStrategy.ts\`
**File**: \`packages/renderer/src/strategies/DomStrategy.ts\`
**What to change**:
Modify the \`capture\` method (and potentially \`prepare\`) to use \`ElementHandle.screenshot()\` instead of \`HeadlessExperimental.beginFrame\` for the main capture path (when \`targetSelector\` is not used).

1.  **In \`prepare\`**: Use \`page.evaluateHandle('document.documentElement')\` to get a handle to the root element and store it.
    \`\`\`typescript
    this.rootElementHandle = await page.evaluateHandle('document.documentElement');
    \`\`\`
    Add \`private rootElementHandle: any = null;\` to the class properties.

2.  **In \`capture\`**: For the non-targetSelector path, replace the \`beginFrame\` call with \`this.rootElementHandle.screenshot(...)\`.

    *Note: We also need to consider if we can keep \`HeadlessExperimental.enable\` and just swap the capture method, or if we should completely bypass CDP for this experiment to fully test the hypothesis.* For this experiment, we will swap the capture call itself.

**Why**: To test the hypothesis that \`page.evaluateHandle\` combined with \`ElementHandle.screenshot()\` is faster than \`HeadlessExperimental.beginFrame\`.
**Risk**: \`ElementHandle.screenshot\` might still use \`Page.captureScreenshot\` under the hood, which has historically been slower than \`beginFrame\` due to lack of damage detection and different pipeline routing. This experiment will definitively answer the open question.

## Variations
### Variation A: Use \`page.screenshot\` directly
Instead of \`page.evaluateHandle('document.documentElement')\`, just use \`page.screenshot()\`. This is already implemented as the fallback, so we can test it by simply disabling the \`if (this.cdpSession)\` check in \`capture\`.

## Canvas Smoke Test
Run \`npx tsx packages/renderer/tests/verify-canvas-strategy.ts\` to ensure basic canvas rendering isn't broken.

## Correctness Check
Run \`npx tsx packages/renderer/tests/fixtures/benchmark.ts\` to verify the DOM rendering still succeeds and produces a valid output.
