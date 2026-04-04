---
id: PERF-175
slug: dynamic-shallow-objects
status: unclaimed
claimed_by: ""
created: 2024-05-23
completed: ""
result: ""
---

# PERF-175: Dynamically allocate CDP parameter objects to eliminate property mutation overhead

## Focus Area
The frame capture hot loop (`DomStrategy.ts`, `SeekTimeDriver.ts`, and `CdpTimeDriver.ts`), specifically the way CDP parameter objects are passed to `this.cdpSession.send()`.

## Background Research
Currently, CDP parameter objects are pre-allocated as class properties (e.g., `this.beginFrameParams`, `this.evaluateParams`, `this.virtualTimePolicyParams`) and mutated on every frame to avoid object allocation and GC churn. However, recent V8 architectural insights indicate that dynamically creating short-lived, shallow objects is heavily optimized by V8's escape analysis and inline caching. Mutating properties on a long-lived class instance can actually be slower because it disrupts the hidden class optimizations or causes unnecessary memory store checks. Using dynamic shallow objects directly in the function call leverages V8's generational GC efficiently and eliminates the micro-stalls associated with mutating shared state.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames), mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s - ~33.9s
- **Bottleneck analysis**: The V8 hot loop property mutation overhead limits throughput when issuing high-frequency IPC commands via Playwright's `send`.

## Implementation Spec

### Step 1: Replace mutated properties with inline shallow objects in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove the pre-allocated `this.beginFrameParams` and `this.beginFrameTargetParams` class properties and their initialization in `prepare()`.
2. Inside `capture()`, dynamically allocate the parameters for the standard capture:
   ```typescript
   const params = {
     screenshot: this.cdpScreenshotParams,
     interval: this.frameInterval,
     frameTimeTicks: 10000 + frameTime
   };
   return this.cdpSession.send('HeadlessExperimental.beginFrame', params).then(...)
   ```
3. Inside `capture()`, dynamically allocate the parameters for the targeted capture (when `targetElementHandle` is present):
   ```typescript
   const params = {
     screenshot: {
       ...this.cdpScreenshotParams,
       clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
     },
     interval: this.frameInterval,
     frameTimeTicks: 10000 + frameTime
   };
   return this.cdpSession!.send('HeadlessExperimental.beginFrame', params).then(...)
   ```
**Why**: V8's escape analysis efficiently allocates and discards these shallow objects without disturbing long-lived memory segments or hidden classes.
**Risk**: Minor increase in minor-GC frequency, though V8's nursery handles this very efficiently.

### Step 2: Replace mutated properties with inline shallow objects in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove the pre-allocated `this.evaluateParams` class property.
2. Inside `setTime()`, dynamically allocate the evaluation parameters:
   ```typescript
   const params = {
     expression: \`window.__helios_seek(\${timeInSeconds}, \${this.timeout})\`,
     awaitPromise: true,
     returnByValue: false
   };
   ```
3. Use `params` for both the `frames.length === 1` fast path and the `page.mainFrame()` branch in the fallback loop.
**Why**: Aligns with the same V8 object allocation optimization strategy.
**Risk**: None expected.

### Step 3: Replace mutated properties in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `this.virtualTimePolicyParams` class property.
2. Inside `setTime()`, allocate the parameter object inline:
   ```typescript
   const params = {
     policy: 'advance',
     budget: budget
   };
   this.client!.send('Emulation.setVirtualTimePolicy', params).catch(reject);
   ```
**Why**: Consistency across all time drivers.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` or a canvas example via the test suite to verify no syntax errors or regressions were introduced in shared code.

## Correctness Check
Run a quick DOM animation render and verify the output video matches expectations, ensuring frames are not skipped or corrupted.

## Prior Art
- V8 blog posts on escape analysis and generational GC tuning for short-lived objects.
