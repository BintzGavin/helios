---
id: PERF-573
slug: optimize-capture-allocation
status: complete
claimed_by: ""
created: 2024-06-15
completed: ""
result: ""
---

# PERF-573: Optimize DomStrategy Capture Object Allocation

## Focus Area
`DomStrategy.ts` hot loop (`capture()`).

## Background Research
After comprehensively reviewing the baseline pipeline logic and prior experiments, the pipeline is highly optimized around Playwright CDP. The `CaptureLoop.ts` pushes Playwright payloads straight to FFmpeg stdin via Node.js C++ bindings.

Inside `DomStrategy.ts`, the `capture` hot loop is executed 600 times per worker:
```typescript
    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      const frameData = result.screenshotData || this.lastFrameData!;
      this.lastFrameData = frameData;
      return frameData;
    } catch (e) {
      return this.lastFrameData!;
    }
```
Currently, it creates a `frameData` block-scoped variable on every iteration, resolving it via a short-circuit OR operator (`||`), assigns it to `this.lastFrameData`, and returns it.
By eliminating the intermediate `frameData` assignment and replacing the short-circuit OR with a direct truthiness check on `result.screenshotData`, we allow V8 to avoid allocating the block-scoped reference entirely and mutate the class property directly. While this is a micro-optimization, in the extremely tight hot loop of the CDP event cycle, removing pointer allocations and logical operator branching can yield measurable reductions in GC pressure and microtask latency.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.511s (microVM)
- **Bottleneck analysis**: Playwright WebSocket IPC throughput and Node.js Base64/JSON parsing overhead.

## Implementation Spec

### Step 1: Optimize targetBeginFrameParams capture logic
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, under the `if (this.targetElementHandle)` branch, change:
```typescript
<<<<<<< SEARCH
      try {
        const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        const frameData = result.screenshotData || this.lastFrameData!;
        this.lastFrameData = frameData;
        return frameData;
      } catch (e) {
        return this.lastFrameData!;
      }
=======
      try {
        const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        if (result.screenshotData) {
          this.lastFrameData = result.screenshotData;
        }
        return this.lastFrameData!;
      } catch (e) {
        return this.lastFrameData!;
      }
>>>>>>> REPLACE
```
**Why**: Avoids allocating a block-scoped `frameData` pointer on every frame and skips short-circuit evaluation, allowing V8 to operate directly on the class property and the JSON parsed string.
**Risk**: Negligible. Equivalent behavior.

### Step 2: Optimize default capture logic
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, in the main fallback block, change:
```typescript
<<<<<<< SEARCH
    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      const frameData = result.screenshotData || this.lastFrameData!;
      this.lastFrameData = frameData;
      return frameData;
    } catch (e) {
      return this.lastFrameData!;
    }
=======
    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      if (result.screenshotData) {
        this.lastFrameData = result.screenshotData;
      }
      return this.lastFrameData!;
    } catch (e) {
      return this.lastFrameData!;
    }
>>>>>>> REPLACE
```
**Why**: Same as above, applied to the default rendering path.

## Variations
None.

## Canvas Smoke Test
N/A - this only affects `DomStrategy`.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to ensure baseline rendering is not broken, and `npx tsx scripts/benchmark-perf.ts` to benchmark.
