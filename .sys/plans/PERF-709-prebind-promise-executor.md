---
id: PERF-709
slug: prebind-promise-executor
status: complete
claimed_by: "jules"
created: 2025-05-13
completed: "2025-05-13"
result: "failed"
---

# PERF-709: Optimize CdpTimeDriver virtualTimePromiseExecutor inline closure

## Focus Area
The `CdpTimeDriver.runSetTime` hot loop currently allocates a new inline closure `(resolve, reject) => { this.cdpResolve = resolve; ... }` to pass to `new Promise<void>` on every frame to pause the pipeline until Chromium's virtual time budget is consumed.

## Background Research
V8 handles inline closure optimization reasonably well, but in extremely tight synchronous single-frame loops (like DOM capture where 60+ promises are constructed per second), allocating the closure arguments and capturing the `this` context to assign the resolver variables into class properties can create unnecessary heap traffic and garbage collection pressure.
By extracting this anonymous executor closure into a pre-bound class property, we can avoid allocating the function object repeatedly. Unlike `Promise.withResolvers()` which creates an intermediate object, passing a pre-bound static property executor directly into the `new Promise` constructor provides the lowest level of overhead for V8, reusing the same function instance across thousands of frames.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/composition.html
- **Render Settings**: 600x600, 30 FPS, 150 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 4 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.38s - 2.53s
- **Bottleneck analysis**: The closure allocation `(resolve, reject) => { ... }` in `CdpTimeDriver.ts` at line 213 inside `runSetTime()` is executed per frame.

## Implementation Spec

### Step 1: Add prebound executor property to `CdpTimeDriver`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a private property to the class:
\`\`\`typescript
  private virtualTimePromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => {
    this.cdpResolve = resolve;
    this.cdpReject = reject;
  };
\`\`\`
Modify `runSetTime` to use it:
\`\`\`typescript
<<<<<<< SEARCH
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
=======
    const promise = new Promise<void>(this.virtualTimePromiseExecutor);
>>>>>>> REPLACE
\`\`\`
**Why**: Avoids creating a new closure context for the Promise executor function on every single frame loop iteration.

## Canvas Smoke Test
- Canvas rendering paths do not use `CdpTimeDriver` (they use `SeekTimeDriver` or raw WebCodecs), so they should not be affected, but `npm run test` will run the standard verification suite.

## Correctness Check
The resulting `dom-benchmark.mp4` must not be empty and must complete rendering without timing out.
