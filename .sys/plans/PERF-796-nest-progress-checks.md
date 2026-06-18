---
id: PERF-796
slug: nest-progress-checks
status: unclaimed
claimed_by: ""
created: 2024-06-18
completed: ""
result: ""
---

# PERF-796: Nest Progress Checks in CaptureLoop

## Focus Area
`CaptureLoop.ts` frame capture fast paths (both single-worker and multi-worker).

## Background Research
In previous optimization cycles, we attempted to completely eliminate progress checking branches from the hot loop by restructuring the loop into chunked segments (PERF-794). While this theoretically optimized V8 instruction packing, the chunked logic introduced critical state synchronization issues in the multi-worker ringbuffer, leading to deadlocks.

However, the core bottleneck identified in PERF-794 remains valid: evaluating `if (onProgress)` on every single frame inside the tightest loop adds branch prediction pressure and minor but cumulative CPU overhead, interrupting TurboFan's monomorphic optimization of the core time progression and stream writing sequence.

A structurally safer, simpler optimization is to simply nest the `if (onProgress)` evaluation *inside* the `if (i === nextProgressFrame)` conditional block. Since progress reporting is only meaningful at `progressInterval` bounds anyway, moving the optional function call check inside the interval check reduces branch evaluations by ~96% (assuming a standard interval of 30 frames) without altering the loop's outer structure or risking deadlock.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (baseline from earlier fast-path optimizations)
- **Bottleneck analysis**: The cost of evaluating conditional branching per frame adds micro-milliseconds. Eliminating these checks allows the core engine to focus purely on `setTime`, `capture`, and `stdin.write`.

## Implementation Spec

### Step 1: Nest Progress Check in Single-Worker Fast Path (`hasProcessFn`)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, within the `if (hasProcessFn)` block's `for` loop, locate the progress checking code:
```typescript
                    if (i === nextProgressFrame) {
                        console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                        nextProgressFrame += progressInterval;
                    }

                    if (onProgress) {
                        onProgress(i / totalFrames);
                    }
```
Replace it with a nested structure:
```typescript
                    if (i === nextProgressFrame) {
                        console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                        nextProgressFrame += progressInterval;

                        if (onProgress) {
                            onProgress(i / totalFrames);
                        }
                    }
```
**Why**: Avoids evaluating `if (onProgress)` on the 29 out of 30 frames where progress is not reported.

### Step 2: Nest Progress Check in Single-Worker Fast Path (`!hasProcessFn`)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, within the `else` (meaning `!hasProcessFn`) block's `for` loop, apply the exact same nesting logic as Step 1.

### Step 3: Nest Progress Check in Multi-Worker Writer Waiter Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path, the main writing thread loop contains:
```typescript
            if (currentFrame === nextProgressFrame) {
                console.log(`Progress: Rendered ${currentFrame} / ${totalFrames} frames`);
                nextProgressFrame += progressInterval;
            }

            if (onProgress) {
                onProgress(currentFrame / totalFrames);
            }
```
Replace it with:
```typescript
            if (currentFrame === nextProgressFrame) {
                console.log(`Progress: Rendered ${currentFrame} / ${totalFrames} frames`);
                nextProgressFrame += progressInterval;

                if (onProgress) {
                    onProgress(currentFrame / totalFrames);
                }
            }
```
**Why**: Extends the branch elimination strategy to the multi-worker path without breaking the `nextFrameToWrite` sequence.

## Variations
N/A

## Canvas Smoke Test
Run the `canvas` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode canvas`) to verify `canvas` mode still correctly captures the expected number of frames and finishes without hanging.

## Correctness Check
Run the `dom` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode dom`). Ensure progress reporting is still emitted sequentially and the render completes successfully.

## Prior Art
- PERF-794 (Hoisted progress checks) - attempted to remove branches via chunked loops but caused multi-worker deadlocks.
- PERF-786 (Simplify abort check) - proved that removing conditionals from the hot path improves median rendering time.
