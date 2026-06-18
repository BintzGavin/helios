---
id: PERF-797
slug: hoist-stream-reference-and-bypass-getter
status: unclaimed
claimed_by: ""
created: 2024-06-18
completed: ""
result: ""
---

# PERF-797: Hoist Stream Reference and Bypass Getter in CaptureLoop

## Focus Area
The multi-worker writer wait loop inside `CaptureLoop.ts`. Specifically, eliminating the per-frame `stdin?.writable` stream state getter evaluation before piping frames to FFmpeg.

## Background Research
In previous optimization cycles, we attempted to completely eliminate the `.writable` check from the single-worker path (PERF-777). Now we can apply similar logic to the multi-worker loop. In Node.js, `Stream.writable` evaluates multiple internal state flags (`!this.destroyed && !this.errored && !this._writableState.ended && !this._writableState.ending`). Evaluating this getter inside the innermost hot loop of the renderer incurs unnecessary property access and CPU instruction overhead. Since `stdin.write()` natively handles its own internal state checks and safely returns `false` (or emits an error if destroyed), proactively checking `.writable` is redundant.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard resolution, FPS, duration, codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `if (stdin?.writable)` condition in `CaptureLoop.ts` forces V8 to leave the optimized JIT context to evaluate the Node.js Stream object getter on every single frame, adding micro-stall overhead before writing the buffer.

## Implementation Spec

### Step 1: Hoist and assert stream presence for multi-worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path (inside the `try` block around line 371 before the `while (nextFrameToWrite < totalFrames && !aborted)` loop), declare a non-null stream reference if we know `stdin` is defined:
```typescript
const stream = stdin!;
```
**Why**: Avoids the optional chaining `?.` nullish check inside the loop.

### Step 2: Remove the `.writable` check in multi-worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the multi-worker `while` loop around line 398, replace this block:
```typescript
            if (stdin?.writable) {
                    stdin.write(buffer as any);
            } else {
                console.warn('FFmpeg stdin is not writable. Skipping write.');
            }
```
With this direct, branchless write:
```typescript
            stream.write(buffer as any);
```
**Why**: Completely eliminates the per-frame getter evaluation, simplifying the loop AST and making the write operation faster.

## Variations
N/A

## Canvas Smoke Test
Run a canvas render (e.g., `npx tsx scripts/benchmark-perf.ts`) to ensure the stream logic behaves correctly under standard conditions.

## Correctness Check
Run the standard DOM benchmark and ensure the output video is generated without truncation or FFmpeg piping errors.

## Prior Art
- PERF-777 (Bypass Stream Writable Getter in single worker CaptureLoop)
