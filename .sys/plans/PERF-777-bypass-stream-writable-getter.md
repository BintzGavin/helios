---
id: PERF-777
slug: bypass-stream-writable-getter
status: complete
claimed_by: ""
created: 2024-06-15
completed: ""
result: ""
---
# PERF-777: Bypass Stream Writable Getter in CaptureLoop

## Focus Area
The single-worker fast path inside `CaptureLoop.ts`. Specifically, eliminating the per-frame `stdin?.writable` stream state getter evaluation before piping frames to FFmpeg.

## Background Research
In Node.js, `Stream.writable` is not a simple boolean property; it is a getter that evaluates multiple internal state flags on the stream's `_writableState` object (`!this.destroyed && !this.errored && !this._writableState.ended && !this._writableState.ending`). Evaluating this getter 60 times per second inside the innermost hot loop of the renderer incurs unnecessary property access and CPU instruction overhead. Since `stdin.write()` natively handles its own internal state checks and safely returns `false` (or emits an error if destroyed, which our `try/catch` already handles), proactively checking `.writable` is redundant on the fast path.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard resolution, FPS, duration, codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (from recent PERF-762/PERF-776 fast-path baselines)
- **Bottleneck analysis**: The `if (stdin?.writable)` condition in `CaptureLoop.ts` forces V8 to leave the optimized JIT context to evaluate the Node.js Stream object getter on every single frame, adding micro-stall overhead before writing the buffer.

## Implementation Spec

### Step 1: Hoist and assert stream presence
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Before the single-worker `if (hasProcessFn)` branch, declare a non-null stream reference:
`const stream = stdin!;`
**Why**: Avoids the optional chaining `?.` nullish check inside the loop.

### Step 2: Remove the \`.writable\` check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside both the `if (hasProcessFn)` and `else` `for` loops in the single-worker fast path, replace this block:
`if (stdin?.writable) { const canWriteMore = stdin.write(buffer as any); if (!canWriteMore && stdin.writableLength >= 16777216) { await this.drainPromise; } } else { console.warn('FFmpeg stdin is not writable. Skipping write.'); }`

With this direct, branchless write:
`const canWriteMore = stream.write(buffer as any); if (!canWriteMore && stream.writableLength >= 16777216) { await this.drainPromise; }`
**Why**: Completely eliminates the per-frame getter evaluation, simplifying the loop AST and making the write operation faster.
**Risk**: If the stream unexpectedly closes without throwing immediately, we might attempt a write to a closed stream. However, Node streams safely emit an error in this case, which the existing `fatalError` block in `CaptureLoop.ts` will catch, maintaining reliability while boosting speed.

## Variations
N/A

## Canvas Smoke Test
Run a canvas render (e.g., `npx tsx scripts/benchmark-perf.ts --mode canvas`) to ensure the stream logic behaves correctly under standard conditions.

## Correctness Check
Run the standard DOM benchmark and ensure the output video is generated without truncation or FFmpeg piping errors.

## Prior Art
- PERF-765 (attempted to optimize `canWriteMore` branch)
- PERF-693 (omitted `this.handleWriteError` callbacks to `stdin.write` to avoid stream overhead)
