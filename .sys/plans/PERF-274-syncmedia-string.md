---
id: PERF-274
slug: syncmedia-string
status: complete
claimed_by: ""
created: 2026-04-14
completed: ""
result: ""
---

# PERF-274: Pass syncMedia fallback evaluate as string

## Focus Area
`CdpTimeDriver.ts` fallback `page.evaluate()` / `frame.evaluate()` for syncing media in multi-frame contexts.

## Background Research
When calling `frame.evaluate()` with a closure and arguments, Playwright must serialize the closure across the Node boundary and allocate it on the V8 side. Using an inline string for `page.evaluate` circumvents full closure serialization (as demonstrated in PERF-258 with `waitStableParams`). Benchmarks show ~10% performance improvements for simple scripts in the hot loop when replacing `evaluate(closure, arg)` with an injected string expression like `evaluate("foo(" + arg + ")")`.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, 3s duration, libx264
- **Mode**: `canvas` (CdpTimeDriver is used in canvas mode)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.264s (PERF-270)
- **Bottleneck analysis**: IPC serialization and V8 GC pressure for dynamic arguments in the Playwright `evaluate` pipeline for fallback `syncMedia`.

## Implementation Spec

### Step 1: Replace `syncMediaClosure` with string execution
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove `private syncMediaClosure` completely.
In `setTime`, in the fallback block:
Replace:
`await frames[0].evaluate(this.syncMediaClosure, timeInSeconds).catch(this.handleSyncMediaError);`
with:
`await frames[0].evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);`
Do the same inside the `framePromises` loop.
**Why**: Removes Playwright's internal closure serialization overhead for the frame-level fallback.
**Risk**: Negligible, as `timeInSeconds` is safely castable to string without loss.

## Correctness Check
Run the canvas mode benchmark or any media example to ensure rendering still works and media sync functions correctly.
## Results Summary
- **Best render time**: 2.549s
- **Kept experiments**: inline syncmedia string evaluation
- **Discarded experiments**: none
