---
id: PERF-1182
slug: remove-redundant-progress-math
status: unclaimed
claimed_by: ""
created: 2024-11-06
completed: ""
result: ""
---

# PERF-1182: Remove redundant dynamic progress counter math in single-worker fast paths

## Focus Area
The single-worker capture loops (`isDomStrategy` and `!isDomStrategy` branches) in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, the fast-path single-worker loop calculates progress by dynamically decrementing a `progressCounter`. However, because the single-worker `while` loop iterates over chunks using a `for` loop that strictly processes frames up to `chunkEnd`, the distance `i - startWrite` is fundamentally guaranteed to equal the pre-computed `progressCounter` when the chunk finishes.

Because `boundEnd = i + progressCounter`, and `chunkEnd = Math.min(boundEnd, loopEnd)`, if `chunkEnd == boundEnd`, then `progressCounter -= (i - startWrite)` will exactly equal `0`. If `chunkEnd == loopEnd`, it indicates we have reached the end of the required captures and the `while` loop will terminate anyway.

Tracking `progressCounter` dynamically with subtraction is a redundant waste of CPU cycles in V8. We can statically replace it by directly utilizing `progressInterval` to calculate bounds and output progress based on whether `i` has hit `loopEnd`. This avoids mutating `progressCounter` and eliminates the decrement evaluation from the AST.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary loop-carried variable mutations (`progressCounter -= ...`) add noise to the AST inside V8's hot path, and require additional assignments (`progressCounter = progressInterval`).

## Implementation Spec

### Step 1: Remove progress counter logic in `isDomStrategy` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` block of the single-worker path (around line 169), remove the declaration `let progressCounter = progressInterval;`.
Update the `while` loop's progress logic (around line 201) to remove `progressCounter` and `startWrite`, instead relying directly on `progressInterval`:
```typescript
          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) {
            const chunkEnd = Math.min(i + progressInterval, loopEnd);

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
              pendingBytes += (base64Str.length * 3) >>> 2;
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

### Step 2: Remove progress counter logic in `!isDomStrategy` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the exact same transformation to the `else` block (the Canvas strategy single-worker path, around line 266).
Remove `let progressCounter = progressInterval;`.
Replace `const chunkEnd = Math.min(i + progressCounter, loopEnd);` with `const chunkEnd = Math.min(i + progressInterval, loopEnd);`.
Remove `const startWrite = i;`.
Replace:
```typescript
            if (!(progressCounter -= i - startWrite)) {
              progressCounter = progressInterval;
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
```
with:
```typescript
            if (i !== loopEnd) {
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
```

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the single worker Canvas path still renders and logs progress properly.

## Correctness Check
Run `npm run test --workspace=packages/renderer` to confirm renderer logic continues to pass.
