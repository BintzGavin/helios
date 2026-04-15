---
id: PERF-286
slug: raw-cdp-multi-frame
status: unclaimed
claimed_by: ""
created: 2026-04-15
completed: ""
result: ""
---

# PERF-286: Replace Multi-Frame Playwright Closure IPC with Raw CDP Evaluate in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `setTime()` method.

## Background Research
In PERF-285, we saw a performance improvement when bypassing Playwright's `frame.evaluate()` closure serialization for single-frame executions in `SeekTimeDriver.ts`, directly utilizing raw CDP (`Runtime.evaluate`). In Playwright, `frame.evaluate` adds layers of overhead by constructing an argument array, serializing it, communicating it over IPC via `Runtime.callFunctionOn` across the Node-Browser boundary, executing it in V8, and deserializing the result.

The `test-multi-frame-evaluate.js` benchmark confirms this theory extends to multi-frame scenarios. Executing `Runtime.evaluate` directly via raw CDP IPC is ~15% faster (7.5s) than using Playwright's `frame.evaluate()` closure execution (8.9s) or Playwright's string evaluation (8.2s).

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.083s
- **Bottleneck analysis**: Playwright `frame.evaluate()` overhead for multi-frame DOM captures.

## Implementation Spec

### Step 1: Pre-fetch Execution Context IDs in `prepare()`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `prepare()`, after establishing the CDP session (`this.cdpSession = ...`), listen to `Runtime.executionContextCreated` to store the Context IDs for all loaded frames.
Enable the runtime domain (`await this.cdpSession.send('Runtime.enable')`) so we receive these events. Wait until the contexts array length matches the number of frames loaded in `this.cachedFrames = page.frames()`.

**Why**: To perform raw CDP `Runtime.evaluate` on specific iframes, we need their exact V8 execution context IDs.
**Risk**: If contexts are destroyed and recreated dynamically during rendering, the cached IDs would become stale. In our benchmark, the DOM structure is static during rendering.

### Step 2: Use Raw CDP `Runtime.evaluate` for Multi-Frame Iteration
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, instead of using `frames[i].evaluate(this.evaluateClosure, this.evaluateArgs)`, iterate over the gathered execution context IDs and dispatch raw `Runtime.evaluate` commands via CDP using `Promise.all`.

**Why**: Bypasses the Playwright `evaluate` closure array serialization and deserialization IPC overhead for every frame, replacing it with a leaner, direct CDP payload.
**Risk**: Misses any implicit Playwright context validity checks, but rendering environments are controlled and static.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas logic is unbroken by running basic canvas scripts.

## Correctness Check
Run the benchmark script `npx tsx scripts/benchmark-test.js` to ensure the multi-frame seek synchronization operates exactly as before without visual regressions.

## Prior Art
- PERF-285 optimized single-frame execution using `Runtime.evaluate`.
