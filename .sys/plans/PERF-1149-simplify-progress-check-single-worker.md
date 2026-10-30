---
id: PERF-1149
slug: simplify-progress-check-single-worker
status: unclaimed
claimed_by: ""
created: 2024-10-30
completed: ""
result: ""
---

# PERF-1149: Unroll Progress Validation in Single-Worker Final Frame Logic

## Focus Area
The single-worker fast paths (`CaptureLoop.ts`) process the very last frame in an isolated block when `totalFrames > 1`. In this block, a logical condition is used to log the final progress, but the condition evaluates variables with logically guaranteed states, creating redundant evaluation overhead in V8.

## Background Research
When rendering the final single frame, the block is protected by `if (!aborted && totalFrames > 1)`. Inside this block, `i` (which is tracked across the render chunks and just completed `i < loopEnd` loops where `loopEnd = totalFrames - 1`) is incremented to `totalFrames`.

Then, progress is logged inside this check:
```typescript
i++;
if (--progressCounter === 0 || i === totalFrames) {
  progressCounter = progressInterval;
  console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
  if (onProgress) {
    onProgress((i - 1) / totalFrames);
  }
}
```
Because `i` has just been incremented from `totalFrames - 1` to `totalFrames`, the condition `i === totalFrames` is mathematically guaranteed to be true. Thus, `|| i === totalFrames` ensures the body *always* executes.

However, since `||` is evaluated left-to-right, V8 must first execute `--progressCounter === 0` (which mutates `progressCounter`), evaluate the result, fail (usually), then evaluate `i === totalFrames`, succeed, and then enter the block where it overwrites `progressCounter = progressInterval`.

Since the body *always* executes and `progressCounter` is overwritten regardless of its decremented state, we can eliminate the entire `if` condition and execute the body unconditionally. This unrolls the condition entirely, reducing JS engine branching, mutation operations, and saving AST nodes on the final cleanup execution.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Fixed resolution, FPS, duration
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Evaluated V8 TurboFan branch evaluation logic for guaranteed-true limits at the final step, adding unnecessary boolean operations.

## Implementation Spec

### Step 1: Unroll progress check in `isDomStrategy` final frame block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the final frame block inside `if (!aborted && totalFrames > 1)` -> `if (isDomStrategy)`:
```typescript
              i++;
              if (--progressCounter === 0 || i === totalFrames) {
                progressCounter = progressInterval;
                console.log(
                  `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
```
Replace it with unconditional execution:
```typescript
              i++;
              progressCounter = progressInterval;
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
```
**Why**: Removes logically redundant branch and variable decrement for guaranteed execution.
**Risk**: None. Mathematically equivalent.

### Step 2: Unroll progress check in `!isDomStrategy` final frame block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the `else` block that does the exact same:
```typescript
              i++;
              if (--progressCounter === 0 || i === totalFrames) {
                 // ...
              }
```
Replace it with the same unconditional execution:
```typescript
              i++;
              progressCounter = progressInterval;
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
```

## Variations
None.

## Canvas Smoke Test
Ensure Canvas renders successfully to the final frame.

## Correctness Check
- DOM outputs must render correctly.
- Final progress log (e.g. `Rendered 59 / 60 frames`) must still appear exactly once at the end.
