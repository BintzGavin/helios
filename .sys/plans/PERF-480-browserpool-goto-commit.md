---
id: PERF-480
slug: browserpool-goto-commit
status: complete
claimed_by: "executor-session"
created: 2026-05-11
completed: "2026-10-31"
result: "kept"
---

# PERF-480: Change BrowserPool waitUntil from load to commit

## Focus Area
`BrowserPool.ts` page initialization wait.

## Background Research
In PERF-470, changing `waitUntil: 'networkidle'` to `waitUntil: 'load'` improved render time by ~30% (1.64s to 1.13s) by eliminating the strict 500ms network inactivity block.
However, `waitUntil: 'load'` still explicitly waits for the browser's `load` event, meaning it waits for all images, stylesheets, and iframes to finish downloading and rendering *before* returning control to Node.js.
For offline DOM rendering, we do not need the page to be fully loaded at this step. We have `timeDriver.prepare(page)` and our virtual time synchronization loop (which waits for `window.helios.waitUntilStable()`) specifically designed to handle deterministic loading during the capture loop.
By changing `waitUntil: 'load'` to `waitUntil: 'commit'`, we instruct Playwright to return control as soon as the network response is received and the document starts rendering, bypassing the wait for resources. This should shave off additional milliseconds of idle waiting during initialization.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 600x600, 30fps, mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.13s (from PERF-470)
- **Bottleneck analysis**: The Playwright `page.goto` call forces the main thread to block until all resources are fully loaded and the `load` event fires, delaying the initialization of the capture pipeline and concurrent worker spawn.

## Implementation Spec

### Step 1: Change waitUntil to commit
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `createPage` function:
```typescript
<<<<<<< SEARCH
      await page.goto(compositionUrl, { waitUntil: 'load' });
=======
      await page.goto(compositionUrl, { waitUntil: 'commit' });
>>>>>>> REPLACE
```
**Why**: Returns control to the Node.js orchestration loop immediately after the network response is committed, allowing worker initialization to finish faster. The deterministic loading of resources will be handled naturally by the virtual time/stability checks during the first frame capture.
**Risk**: If `commit` returns too early, the `DOM` might not be ready for `timeDriver.prepare(page)` to inject its init scripts. However, Playwright's `addInitScript` guarantees execution before any page scripts, and `commit` guarantees the execution context is alive. If `commit` fails due to page lifecycle, we can fallback to `domcontentloaded`.

## Variations
### Variation A: Use domcontentloaded
If `commit` causes test failures or `timeDriver` script injection errors because the DOM is not parsed enough, fall back to:
```typescript
      await page.goto(compositionUrl, { waitUntil: 'domcontentloaded' });
```

## Correctness Check
Run `npm run build` and tests in the `packages/renderer` directory. Ensure the final video output is still generated correctly without missing frames.

## Results Summary
- **Best render time**: 4.047s (vs baseline ~4.047s)
- **Improvement**: 0%
- **Kept experiments**: [Change waitUntil to commit in BrowserPool]
- **Discarded experiments**: []
