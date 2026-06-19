---
id: PERF-804
slug: bypass-writable-getter
status: unclaimed
claimed_by: ""
created: 2024-06-19
completed: ""
result: ""
---

# PERF-804: Bypass Writable State Getter and Property Lookups

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts` and `DomStrategy.ts`.

## Background Research
In the fast path of `CaptureLoop.ts`, we pipe frames to FFmpeg using `stream.write(buffer)`. Node.js streams have a default `highWaterMark` of 16KB. Since our image buffers are much larger, `stream.write()` returns `false` on almost every frame. When it returns `false`, our loop conditionally checks `stream.writableLength >= 16777216` to determine if we should pause and await `drainPromise`.
`stream.writableLength` is a getter on the Node.js Stream prototype. This means that on almost every frame, V8 must execute a getter function, which internally returns `this._writableState.length`.
By pre-caching the `_writableState` object and accessing its `.length` property directly, we bypass the getter invocation entirely, removing function dispatch overhead from the tightest part of the render loop.
Additionally, in `DomStrategy.ts`, we can eliminate a duplicate property lookup for `result.screenshotData`.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Getter function invocation overhead in the stream writing backpressure check, and duplicate object property lookups during frame extraction.

## Implementation Spec

### Step 1: Pre-cache writableState and bypass getter
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path (around line 160), just below `const stream = stdin!;`, declare:
```typescript
        const writableState = (stream as any)._writableState;
```
Then, inside the `hasProcessFn` loop block (around line 177) and the `else` loop block (around line 200), replace the `writableLength` check:
```typescript
<<<<<<< SEARCH
                    if (!stream.write(buffer as any) && stream.writableLength >= 16777216) {
                            await this.drainPromise;
                        }
=======
                    if (!stream.write(buffer as any) && writableState.length >= 16777216) {
                            await this.drainPromise;
                        }
>>>>>>> REPLACE
```
**Why**: Avoids executing the `get writableLength()` function on every frame, directly accessing the integer length.

### Step 2: Eliminate Duplicate Property Lookup
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `processCaptureResult`, extract `screenshotData` once instead of checking it then reading it again.
```typescript
<<<<<<< SEARCH
  processCaptureResult(result: any): Buffer {
    if (result.screenshotData) {
      const b64 = result.screenshotData;
=======
  processCaptureResult(result: any): Buffer {
    const b64 = result.screenshotData;
    if (b64) {
>>>>>>> REPLACE
```
**Why**: Reduces object property resolution overhead in the frame extraction phase.

## Variations
N/A

## Canvas Smoke Test
Run the canvas benchmark (`npx tsx scripts/benchmark-perf.ts --mode canvas`) to ensure the stream logic behaves correctly for non-DOM workloads.

## Correctness Check
Run the DOM benchmark (`npx tsx scripts/benchmark-perf.ts --mode dom`) to verify output is generated without deadlocks or errors.

## Prior Art
- PERF-797 (Hoisted `stdin` and bypassed `writable` getter in multi-worker loop).
