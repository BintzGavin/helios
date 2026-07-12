---
id: PERF-977
slug: remove-redundant-initial-writer-loop
status: unclaimed
claimed_by: ""
created: 2024-07-12
completed: ""
result: ""
---

# PERF-977: Remove redundant initial writer loop and slow constructor check

## Focus Area
The multi-worker writer loops in `packages/renderer/src/core/CaptureLoop.ts` (around line 870 to 940).

## Background Research
Currently, the multi-worker writer path evaluates a dynamic property check `this.pool[0].strategy.constructor.name === 'DomStrategy'` (around line 870) and then enters a 70-line `while (!aborted) { ... break; }` block to process a single frame before immediately breaking. After breaking, it immediately enters a virtually identical chunk loop (`if (!aborted) { while (nextFrameToWrite < totalFrames && !aborted) { ... } }`).
PERF-975 already unified the chunk loops below this block, making this initial loop entirely redundant. Furthermore, retrieving `constructor.name` evaluates dynamically on every single composition launch, and we don't need it because we can use `buffer as any` inside `stream.write` as we successfully did in PERF-975.
We can completely eliminate the `isDomStrategyWriter` variable and the entire first `while (!aborted) { ... break; }` loop block, letting the main chunk loop naturally process the first frame along with the rest.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The redundant 70-line loop block duplicates AST and bytecode, bloating the hot path closure context and compilation unit for the multi-worker writer. The `constructor.name` lookup is a dynamic property access that is unneeded.

## Implementation Spec

### Step 1: Remove `isDomStrategyWriter` and redundant initial loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Locate the multi-worker writer path (around line 870).
2. Delete the declaration of `isDomStrategyWriter`:
```typescript
      const isDomStrategyWriter = this.pool[0].strategy.constructor.name === 'DomStrategy';
```
3. Locate the `try {` block immediately below. Inside `if (nextFrameToWrite < totalFrames && !aborted) {`, delete the entire first `while (!aborted) { ... break; }` block (which spans about 70 lines and ends with `break; }`).
4. Ensure the subsequent `if (!aborted) { while (nextFrameToWrite < totalFrames && !aborted) { ... } }` loop (the main chunk loop) remains intact. Since `nextFrameToWrite` starts at 0, this loop will naturally pick up the first frame.

**Why**: By deleting the redundant code path, V8 doesn't need to parse, compile, or execute an extra loop for frame 0, nor evaluate `isDomStrategyWriter`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` and `npm test -w packages/renderer` to ensure frame rendering remains correct and all multi-worker streams drain as expected.
