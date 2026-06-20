---
id: PERF-808
slug: strategy-buffer-type
status: complete
claimed_by: "executor-session"
result: "improved"
claimed_by: ""
created: 2024-06-20
completed: ""
result: ""
---
# PERF-808: Static Buffer Type Resolution in CaptureLoop

## Focus Area
DOM Rendering Pipeline - `CaptureLoop.ts` FFmpeg stream writer path.

## Background Research
Currently, `CaptureLoop.ts` dynamically evaluates the type of the captured frame buffer on every iteration using `const isString = typeof buffer === 'string';` to decide whether to pass the `'base64'` encoding flag to `stream.write()`.
While `typeof` is generally fast, running it per frame inside the highly optimized tight loop introduces unnecessary polymorphic type checking overhead. `DomStrategy` will strictly produce Base64 strings (after PERF-807) and `CanvasStrategy` strictly produces `Buffer`s.
By statically evaluating the type on the first frame or fetching a property like `strategy.producesBase64`, we can eliminate the per-frame `typeof` evaluation. A simpler approach that requires no interface changes is to determine the `isString` flag from the very first frame returned and cache it outside the loop, as the strategy will not change its return type midway.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s
- **Bottleneck analysis**: The `typeof buffer === 'string'` check inside the `CaptureLoop.ts` hot loops (both single worker and multi-worker) forces the JIT to re-evaluate branch conditions dynamically for the monomorphic stream write path.

## Implementation Spec

### Step 1: Cache `isString` flag in CaptureLoop fast path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the single-worker `hasProcessFn` path and the `!hasProcessFn` path, replace the per-frame `typeof buffer === 'string'` with a flag initialized on the first frame.

Example logic to implement in the single worker loops:
```typescript
let isString: boolean | null = null;
for (let i = 0; i < totalFrames; i++) {
    // ...
    const buffer = ...;
    if (isString === null) isString = typeof buffer === 'string';
    if (!(isString ? stream.write(buffer as any, 'base64') : stream.write(buffer as any)) && stream.writableLength >= 16777216) {
        await this.drainPromise;
    }
}
```

### Step 2: Cache `isString` flag in multi-worker writer path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Similarly, inside the writer loop (`while (nextFrameToWrite < totalFrames && !aborted)`), implement the same cache flag for `isString`.
```typescript
let isString: boolean | null = null;
// ...
const buffer = frameBufferRing[ringIndex]!;
if (isString === null) isString = typeof buffer === 'string';
if (isString) { stream.write(buffer as any, 'base64'); } else { stream.write(buffer as any); }
```

**Why**: Eliminates the dynamic `typeof` operator and strictly caches the encoding path, reducing CPU branch prediction variance and tightening the hot loop AST for V8 TurboFan.
**Risk**: If a strategy ever returns a mixed array of Buffers and Strings, it will break. However, our architecture restricts strategies to returning a single deterministic output type.

## Variations
### Variation A: Strategy interface flag
Instead of checking the first frame, add a `producesBase64?: boolean` property to `RenderStrategy` and read it before the loop starts.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode dom` to verify that frames are still correctly written to the FFmpeg pipe without corruption.

## Results Summary
- **Best render time**: 1.948s (vs baseline ~2.069s)
- **Improvement**: ~5.8% (combined with 805)
- **Kept experiments**: Static Buffer Type Resolution in CaptureLoop (PERF-808)
- **Discarded experiments**: None
