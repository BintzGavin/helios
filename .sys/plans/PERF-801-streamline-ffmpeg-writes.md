---
id: PERF-801
slug: streamline-ffmpeg-writes
status: unclaimed
claimed_by: ""
created: 2024-06-19
completed: ""
result: ""
---

# PERF-801: Streamline FFmpeg writes

## Focus Area
`CaptureLoop.ts` fast path. The innermost worker hot loop where frame buffers are pushed to the Node.js `stdin` Writable stream.

## Background Research
Currently in the single-worker and multi-worker hot paths, every frame write undergoes multiple evaluations on `stdin`:
```typescript
if (stdin?.writable) {
    const canWriteMore = stdin.write(buffer as any);
    if (!canWriteMore && stdin.writableLength >= 16777216) {
        await this.drainPromise;
    }
}
```
The `Stream.writable` getter evaluates multiple internal state flags, incurring unnecessary property access and CPU overhead on every frame. The `?.` optional chaining further complicates the AST. `stdin.write` natively handles internal state checks and safely returns false/emits an error if destroyed. We can hoist the `stdin` reference into a non-null `stream` variable outside the loops and collapse the backpressure condition into a single evaluation:
```typescript
if (!stream.write(buffer as any) && stream.writableLength >= 16777216) {
    await this.drainPromise;
}
```

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: JIT evaluates properties like `stdin?.writable` and `!canWriteMore` inside the tight loop. Reducing branching AST makes the function more monomorphic and faster.

## Implementation Spec

### Step 1: Hoist stream reference
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Before the single-worker loop (around line 155), add:
`const stream = stdin!;`
Also add this before the multi-worker loop (around line 390).

### Step 2: Streamline FFmpeg writes
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker loops, replace:
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
if (!stream.write(buffer as any) && stream.writableLength >= 16777216) {
    await this.drainPromise;
}
```
In the multi-worker loop, replace:
```typescript
if (stdin?.writable) {
    stdin.write(buffer as any);
} else {
    console.warn('FFmpeg stdin is not writable. Skipping write.');
}
```
With:
```typescript
stream.write(buffer as any);
```

## Variations
N/A

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode dom`. Confirm that the render still finishes successfully and produces a valid output video.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to verify Canvas mode is unaffected.
