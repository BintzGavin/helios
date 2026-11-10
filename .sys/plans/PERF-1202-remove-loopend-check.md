---
id: PERF-1202
slug: remove-loopend-check-single-worker
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-1202: Remove Unnecessary `i !== loopEnd` Check in Single-Worker Fast Path

## Focus Area
The single-worker fast paths inside `CaptureLoop.ts` in the `renderer` package. Specifically, targeting the unnecessary conditional branch `if (i !== loopEnd)` in the main chunk loop.

## Background Research
In the single-worker path, the main chunk loop condition is `while (i < loopEnd && !aborted)`. Inside this `while` loop, we chunk the processing via an inner `for` loop `for (; i !== chunkEnd; i++)`.

After the `for` loop completes, `i` is guaranteed to be equal to `chunkEnd`. Since `chunkEnd` is defined as `Math.min(i + progressInterval, loopEnd)`, `i` will only be equal to `loopEnd` when the `for` loop completes the very last chunk.

Right now, after the inner `for` loop, the code does:
```typescript
if (i !== loopEnd) {
  console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
  if (onProgress) {
    onProgress((i - 1) / totalFrames);
  }
}
```

This `if (i !== loopEnd)` check is unnecessary and effectively dead logic that slows down AST evaluation and branching. By removing the `if (i !== loopEnd)` block and just unconditionally logging/calling `onProgress`, we eliminate a branch in the AST per chunk. If we remove it, when `i === loopEnd`, it will print `Progress: Rendered <loopEnd-1> / <totalFrames> frames`, which is accurate at that exact moment.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 1080p, 60fps, 2 seconds, H264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.241s
- **Bottleneck analysis**: Unnecessary branching.

## Implementation Spec

### Step 1: Remove `i !== loopEnd` check in `isDomStrategy` fast path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove `if (i !== loopEnd) { ... }` wrapping around the progress log in both single-worker blocks (DOM and non-DOM). Un-indent the contents.

### Step 2: Test variations
No variations.

## Canvas Smoke Test
Run benchmark with `--mode=canvas`.

## Correctness Check
Run `npm run test -w packages/renderer`.
