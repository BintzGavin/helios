---
id: PERF-670
slug: cache-buffer-type
status: unclaimed
claimed_by: ""
created: 2024-06-04
completed: ""
result: ""
---

# PERF-670: Optimize Capture Buffer Type Check in Writer Loop

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the writer loop of `CaptureLoop.ts`, the code conditionally checks `typeof buffer === 'string'` on every single frame:
```typescript
            if (stdin?.writable) {
                let canWriteMore: boolean;
                if (typeof buffer === 'string') {
                    canWriteMore = stdin.write(buffer, 'base64', this.handleWriteError);
                } else {
                    canWriteMore = stdin.write(buffer, this.handleWriteError);
                }
```
This requires evaluating the `typeof` operator dynamically inside V8's hot path 30-60 times a second. Because the strategy type is homogeneous across a single render job (either `DomStrategy` which consistently produces base64 strings, or `CanvasStrategy` which consistently produces Node Buffers), we can check the buffer type precisely once on the first frame and cache it in a local boolean variable (`bufferIsString`). This reduces dynamic type evaluations on the hot path, leveraging a fast boolean branch instead.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s (Current best baseline)
- **Bottleneck analysis**: Redundant dynamic `typeof` operator evaluations inside the hottest writer loop in `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Cache `bufferIsString` flag
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, just before the writer `while` loop (e.g. near `let previousWritePromise;`), declare a variable:
```typescript
    let bufferIsString: boolean | null = null;
```
Inside the writer loop, replace the `if (typeof buffer === 'string')` block with:
```typescript
<<<<<<< SEARCH
            if (stdin?.writable) {
                let canWriteMore: boolean;
                if (typeof buffer === 'string') {
                    canWriteMore = stdin.write(buffer, 'base64', this.handleWriteError);
                } else {
                    canWriteMore = stdin.write(buffer, this.handleWriteError);
                }

                if (!canWriteMore) {
=======
            if (stdin?.writable) {
                let canWriteMore: boolean;
                if (bufferIsString === null) {
                    bufferIsString = typeof buffer === 'string';
                }

                if (bufferIsString) {
                    canWriteMore = stdin.write(buffer as string, 'base64', this.handleWriteError);
                } else {
                    canWriteMore = stdin.write(buffer as Buffer, this.handleWriteError);
                }

                if (!canWriteMore) {
>>>>>>> REPLACE
```
And also update the `finalBuffer` write check at the very end of `run()` to reuse the same cached type logic:
```typescript
<<<<<<< SEARCH
      console.log(`Writing final buffer...`);
      if (stdin?.writable) {
          let canWriteMore: boolean;
          if (typeof finalBuffer === 'string') {
              canWriteMore = stdin.write(finalBuffer, 'base64', this.handleWriteError);
          } else {
              canWriteMore = stdin.write(finalBuffer, this.handleWriteError);
          }
          if (!canWriteMore) {
=======
      console.log(`Writing final buffer...`);
      if (stdin?.writable) {
          let canWriteMore: boolean;
          if (bufferIsString === null) {
              bufferIsString = typeof finalBuffer === 'string';
          }

          if (bufferIsString) {
              canWriteMore = stdin.write(finalBuffer as string, 'base64', this.handleWriteError);
          } else {
              canWriteMore = stdin.write(finalBuffer as Buffer, this.handleWriteError);
          }
          if (!canWriteMore) {
>>>>>>> REPLACE
```

**Why**: Replaces a dynamic `typeof` operator evaluation on every frame with a simple boolean check, taking advantage of the fact that the strategy format is homogeneous across a single render job.
**Risk**: None. The buffer type never changes mid-render for a given strategy.

## Variations
None.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to verify correct output without regressions.
