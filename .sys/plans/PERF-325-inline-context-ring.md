---
id: PERF-325
slug: inline-context-ring
status: complete
claimed_by: "jules"
created: 2024-04-21
completed: "2024-04-21"
result: " ## Results Summary | run | render_time_s | frames | fps_effective | peak_mem_mb | status | description | |-----|---------------|--------|---------------|-------------|--------|-------------| | 1 | 39.669 | 300 | 7.56 | 38.6 | keep | inline-context-ring | | 2 | 39.521 | 300 | 7.59 | 39.1 | keep | inline-context-ring | | 3 | 39.812 | 300 | 7.54 | 38.3 | keep | inline-context-ring |"
---

# PERF-325: Inline Context Ring Arrays in CaptureLoop

## Focus Area
Frame capture loop object properties in `CaptureLoop.ts`. Specifically, eliminating the nested `contextRing` object properties (`resolve`, `reject`) by flattening them into parallel arrays (`resolveRing`, `rejectRing`).

## Background Research
Currently in `CaptureLoop.ts`, the actor pipeline uses an array of objects `contextRing` to store state for each frame in the pipeline (`resolve`, `reject`). In highly optimized V8 paths, accessing properties on objects inside arrays is slightly slower than accessing flat, packed primitive or function arrays directly. V8 optimizes dense flat arrays better than arrays of objects where shape checks must occur on property access. By splitting `contextRing[i] = { resolve, reject }` into `resolveRing[i]` and `rejectRing[i]`, we eliminate object allocation in the constructor and shape checks in the hot loop.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html` (or standard DOM benchmark)
- **Render Settings**: 1080p, 30fps, 10 seconds (300 frames), `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~39.6s (based on PERF-324)
- **Bottleneck analysis**: Property access overhead (`ctx.resolve`, `ctx.reject`) inside the tight async `runWorker` hot loop.

## Implementation Spec

### Step 1: Replace contextRing with Flat Arrays
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `const contextRing = new Array(maxPipelineDepth);`.
2. Add parallel arrays:
```typescript
const resolveRing = new Array<((b: Buffer | string) => void) | null>(maxPipelineDepth).fill(null);
const rejectRing = new Array<((e: any) => void) | null>(maxPipelineDepth).fill(null);
```
3. Update `framePromiseExecutors` allocation inside the initialization loop:
```typescript
for (let i = 0; i < maxPipelineDepth; i++) {
    framePromiseExecutors[i] = (res: (b: Buffer | string) => void, rej: (e: any) => void) => {
        resolveRing[i] = res;
        rejectRing[i] = rej;
    };
}
```
4. In `runWorker()`, update the resolution path to remove `ctx` and use the parallel arrays:
```typescript
            try {
                const timePromise = timeDriver.setTime(page, compositionTimeInSeconds);
                if (timePromise) {
                    timePromise.catch(noopCatch);
                }
                const buffer = await strategy.capture(page, time);
                if (resolveRing[ringIndex]) resolveRing[ringIndex]!(buffer);
            } catch (e) {
                if (rejectRing[ringIndex]) rejectRing[ringIndex]!(e);
            }
```

**Why**: Accessing flat arrays eliminates object property lookups and allows V8 to pack the arrays denser. It simplifies the data structure for the pipeline and avoids object creation in the `maxPipelineDepth` setup.
**Risk**: Very low. It's a structural flattening that functionally behaves identically.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to verify Canvas rendering and codec support is unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM capture correctly handles pipeline resolution.

## Prior Art
- **PERF-324**: Flattened closure allocations for frame promises which improved performance. Flattening the context structure is the logical next step.
