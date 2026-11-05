---
id: PERF-1176
slug: remove-redundant-progress-math
status: unclaimed
claimed_by: ""
created: 2026-11-05
completed: ""
result: ""
---

# PERF-1176: Remove redundant dynamic progress counter math in single-worker fast paths

## Focus Area
The single-worker capture loops (`isDomStrategy` and `!isDomStrategy` branches) in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, the fast-path single-worker loop calculates progress by dynamically decrementing a `progressCounter`:
```typescript
let progressCounter = progressInterval;

// ...
while (i < loopEnd && !aborted) {
  const boundEnd = i + progressCounter;
  const chunkEnd = boundEnd < loopEnd ? boundEnd : loopEnd;
  const startWrite = i;

  for (; i !== chunkEnd; i++) {
    // Process exactly 'chunkEnd - startWrite' frames synchronously
  }

  if (aborted) break;

  progressCounter -= (i - startWrite);
  if (progressCounter === 0) {
    progressCounter = progressInterval;
    console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
    // ...
  }
}
```

Unlike the multi-worker path, the single-worker `for` loop *always* completes its iterations up to `chunkEnd`. It doesn't yield and wait for another worker's frames.
This means `i - startWrite` is mathematically guaranteed to equal `chunkEnd - startWrite`.
If `boundEnd < loopEnd`, then `chunkEnd = startWrite + progressCounter`. Therefore, `i - startWrite` exactly equals `progressCounter`. The subtraction `progressCounter -= (i - startWrite)` will *always* result in `0`.
If `boundEnd >= loopEnd`, we hit the end of the video. `chunkEnd = loopEnd`. `i` becomes `loopEnd`, and we immediately break out of the `while (i < loopEnd)` loop anyway! The value of `progressCounter` is completely irrelevant because we never iterate the `while` loop again (the final frame is processed outside this loop).

Therefore, tracking `progressCounter` dynamically with subtraction is a redundant waste of CPU cycles in V8. We can statically unroll this:
```typescript
while (i < loopEnd && !aborted) {
  const boundEnd = i + progressInterval;
  const chunkEnd = boundEnd < loopEnd ? boundEnd : loopEnd;

  for (; i !== chunkEnd; i++) {
    // ...
  }

  if (aborted) break;

  if (i !== loopEnd) {
    console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
    if (onProgress) {
      onProgress((i - 1) / totalFrames);
    }
  }
}
```

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary loop-carried variable mutations (`progressCounter -= ...`) add noise to the AST inside V8's hot path, and require additional assignments (`progressCounter = progressInterval`).

## Implementation Spec

### Step 1: Remove progress counter logic in `isDomStrategy` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` block of the single-worker path (around line 200), remove the declaration `let progressCounter = progressInterval;`.
Update the `while` loop's progress logic to remove `progressCounter` and `startWrite`, instead relying directly on `progressInterval`:
```typescript
          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) {
            const boundEnd = i + progressInterval;
            const chunkEnd = boundEnd < loopEnd ? boundEnd : loopEnd;

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }

              const base64Str = rawResult as string;
              const byteLength = (base64Str.length * 3) >>> 2;
              pendingBytes += byteLength;
              if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            if (i !== loopEnd) {
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }
```
**Why**: Shrinks the AST, removes loop-carried arithmetic and conditional branch evaluation overhead.
**Risk**: Standard refactor. The final frame logger is handled correctly by the block below the `while` loop.

### Step 2: Remove progress counter logic in `!isDomStrategy` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the exact same transformation to the `else` block (the Canvas strategy single-worker path, around line 300).
Replace `const boundEnd = i + progressCounter;` with `const boundEnd = i + progressInterval;`.
Remove `const startWrite = i;`.
Replace `progressCounter -= (i - startWrite); if (progressCounter === 0) { ... }` with `if (i !== loopEnd) { ... }`.
**Why**: Same optimization applies to Canvas strategy fast path.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the single worker Canvas path still renders and logs progress properly.

## Correctness Check
Run `npm run test --workspace=packages/renderer` to confirm renderer logic continues to pass.
