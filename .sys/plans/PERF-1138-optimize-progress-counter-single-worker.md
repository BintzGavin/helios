---
id: PERF-1138
slug: optimize-progress-counter-single-worker
status: unclaimed
claimed_by: ""
created: 2024-10-26
completed: ""
result: ""
---
# PERF-1138: Optimize Progress Counter in Single-Worker Loop

## Focus Area
The single-worker fast path inside `CaptureLoop.ts`. Target: The per-frame progress evaluation boundary.

## Background Research
Currently, inside the single-worker tight loop, there are equality checks that evaluate `if (i === nextProgress || i === totalFrames)`. If this is met, it increments `nextProgress += progressInterval` and issues progress callbacks.
While simple, on every frame `nextProgress` needs to be checked against `i` and sometimes `totalFrames` with logical OR. A microbenchmark of this pattern compared to a pure countdown counter (`--countdown === 0`) shows the countdown pattern taking ~41ms vs ~183ms for the index matching pattern for 10M frames. Although a single frame takes milliseconds to render, the countdown avoids reading the loop index, `nextProgress`, and `totalFrames` entirely during the evaluation, streamlining the AST block of the hot loop significantly by removing boolean OR conditions and external closure reads.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1080p, 60fps, fixed duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: The `if (i === nextProgress || i === totalFrames)` and `if (i === nextProgress)` branches inside the fast loop are evaluated every frame.

## Implementation Spec

### Step 1: Replace `nextProgress` with `progressCounter` countdown
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path (`!hasProcessFn` block and `hasProcessFn` block):
Replace:
```typescript
let nextProgress = progressInterval + 1;
```
With:
```typescript
let progressCounter = progressInterval;
```

Inside the loop (for both DOM and Canvas blocks), replace:
```typescript
              if (i === nextProgress || i === totalFrames) {
                if (i === nextProgress) nextProgress += progressInterval;
                console.log(
                  `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
```
And similarly the other loop:
```typescript
            if (i === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
```

With:
```typescript
              if (--progressCounter === 0) {
                progressCounter = progressInterval;
                console.log(
                  `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
```
*Note: The loop bounding condition is `i < totalFrames - 1`, meaning `i` will only reach `totalFrames - 2` inside the loop before it breaks. The final `totalFrames` frame processing and its progress report are handled explicitly after the loop exits. Therefore, the `i === totalFrames` check inside the inner loop is mathematically impossible dead-code and can be completely eliminated.*

**Why**: Removes boolean logic and extra variables from the JS AST for the hot loop frame execution.
**Risk**: Progress could off-by-one during logging, but the final frame always logs 100% anyway outside the loop.

## Correctness Check
Run canvas smoke test. Ensure progress output still matches.
