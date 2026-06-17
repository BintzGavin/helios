---
id: PERF-792
slug: inline-ffmpeg-writes
status: unclaimed
claimed_by: ""
created: 2024-06-17
completed: ""
result: ""
---

# PERF-792: Optimize FFmpeg stdin write evaluation

## Focus Area
`CaptureLoop.ts` fast path. The innermost worker hot loop where frame buffers are pushed to the Node.js `stdin` Writable stream.

## Background Research
Currently in the single-worker hot path, every frame write undergoes multiple evaluations:
```typescript
if (stdin?.writable) {
    const canWriteMore = stdin.write(buffer as any);
    if (!canWriteMore && stdin.writableLength >= 16777216) {
        await this.drainPromise;
    }
}
```
The goal is to reduce branch complexity and internal property lookup overhead on `stdin` inside the fast path. Previous experiments like PERF-765 proved that assigning variables vs inline evaluations had no effect, and PERF-789 showed that we need to maintain the 16MB backpressure threshold to avoid pipeline stalls.

However, we can simplify this further by utilizing strict Boolean coercion on the `stdin.write` result inline with the backpressure limit check, bypassing the assignment of `canWriteMore` entirely, and potentially bypassing the `stdin?.writable` outer check if we can guarantee stream liveness implicitly via error handlers.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 JIT evaluates properties like `stdin?.writable` and branching conditions like `!canWriteMore` ~150-180 times per second per worker. Reducing branching in the AST makes the function more monomorphic.

## Implementation Spec

### Step 1: Inline the stdin.write backpressure evaluation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker loop (both the `if (hasProcessFn)` and `else` branches):

Replace:
```typescript
if (stdin?.writable) {
    const canWriteMore = stdin.write(buffer as any);

    if (!canWriteMore && stdin.writableLength >= 16777216) {
        await this.drainPromise;
    }
} else {
    console.warn('FFmpeg stdin is not writable. Skipping write.');
}
```

With:
```typescript
if (stdin?.writable) {
    if (!stdin.write(buffer as any) && stdin.writableLength >= 16777216) {
        await this.drainPromise;
    }
}
```
**Why**: Removes the `canWriteMore` variable allocation and collapses the logic into a single line. Eliminates the `else` warning branch, as `stdin.writable` false states are already handled globally by `ffmpegManager` error events, preventing the JIT from compiling a slow/cold path that is virtually never hit during normal execution.

## Variations
N/A

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode dom`. Confirm that the render still finishes successfully and produces a valid output video.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to verify Canvas mode is unaffected.
