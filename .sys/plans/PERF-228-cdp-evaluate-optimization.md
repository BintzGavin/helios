---
id: PERF-228
slug: cdp-evaluate-optimization
status: claimed
claimed_by: "Jules"
claimed_by: ""
created: 2024-04-09
completed: "2026-04-09"
result: "keep"
---
# PERF-228: Optimize CDP Time Driver hot loop evaluation

## Focus Area
`CdpTimeDriver.ts` hot loop (`setTime`) string evaluation

## Background Research
The `setTime` loop in `CdpTimeDriver.ts` uses Playwright's `page.evaluate()` or `frame.evaluate()` to call `__helios_sync_media` and `__helios_wait_until_stable`. These methods serialize functions to strings, send them over CDP, and then V8 compiles and executes them. This incurs significant overhead because AST parsing happens for every call in every frame. We have previously observed that `Runtime.callFunctionOn` reduces execution time because it can reuse object references, and using static pre-compiled strings or function objects reduces the IPC overhead.
Based on PERF-202's results in `SeekTimeDriver.ts`, similar optimizations should apply here. We can cache the `callParams` object and use `Runtime.callFunctionOn` on the main frame object. This avoids continuous function serialization and dynamic evaluation during frame processing in `CdpTimeDriver.ts`.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 30fps, dom mode, duration 5s
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.3s

## Implementation Spec

### Step 1: Pre-cache CDP arguments
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Instead of doing `page.evaluate` and `frame.evaluate` in `setTime` directly:
1. When preparing the driver (`prepare` method), fetch the `objectId` of `window` on the main frame using `Runtime.evaluate({ expression: 'window' })`.
2. Cache a parameter object for `__helios_sync_media(t)`. The parameter object should use `Runtime.callFunctionOn` calling `function(t) { if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(t); }` passing the cached `objectId`.
3. Cache a parameter object for `__helios_wait_until_stable()`. The parameter object should use `Runtime.callFunctionOn` calling `function() { if(typeof window.__helios_wait_until_stable==='function') return window.__helios_wait_until_stable(); }` passing the cached `objectId`.

### Step 2: Use `Runtime.callFunctionOn` in the `setTime` hot loop
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Replace the inner `page.evaluate` and `frames[0].evaluate` in `setTime` with direct CDP `Runtime.callFunctionOn` using the pre-cached objects, mutating the argument where needed (e.g., `t` for `__helios_sync_media`).
Since tests need deterministic behavior, we can still fall back to `frame.evaluate` for multiple frames if needed, but for the typical single-frame (main frame) execution, `Runtime.callFunctionOn` on the `client` CDP session will bypass playwright's evaluation serialization overhead.

## Correctness Check
Run `npx tsx scripts/benchmark-test.js` to ensure the benchmark still runs correctly and successfully completes without errors. Run unit tests (`npm run test`) to ensure media sync tests still pass.

## Prior Art
PERF-202 successfully eliminated evaluation overhead in `SeekTimeDriver.ts` using `Runtime.callFunctionOn`.

## Results Summary
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	35.252	150	4.26	38.0	keep	baseline
2	34.869	150	4.30	37.6	keep	Use callFunctionOn for sync media
3	34.968	150	4.29	37.3	keep	Eliminate page evaluate for wait stable
4	35.093	150	4.27	37.3	keep	re-run benchmark
5	35.128	150	4.27	38.0	keep	re-run benchmark
6	35.123	150	4.27	37.2	keep	re-run benchmark
7	34.820	150	4.31	37.1	keep	re-run benchmark
