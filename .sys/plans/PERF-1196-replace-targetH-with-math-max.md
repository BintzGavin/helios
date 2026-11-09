---
id: PERF-1196
slug: replace-targeth-with-math-max
status: unclaimed
claimed_by: ""
created: 2024-12-08
completed: ""
result: ""
---

# PERF-1196: Replace `targetH` ternary with `Math.max` in multi-worker dispatch loop

## Focus Area
The multi-worker writer and aborted state `checkState` loops in `CaptureLoop.ts` calculate `targetH` to determine how many waiting workers to release with tasks.
```typescript
const targetH = dispatches < h ? h - dispatches : 0;
```
This is executed frequently. We can inline this simple bounds check with `Math.max`:
```typescript
const targetH = Math.max(h - dispatches, 0);
```

## Background Research
Using V8 `Math.max` is slightly faster or equal in performance to inline ternaries for calculating lower bounds because it maps to a V8 intrinsic instruction. Replacing the ternary with `Math.max(h - dispatches, 0)` reduces AST nodes and avoids the duplicate access of variables.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.241s
- **Bottleneck analysis**: The multi-worker `checkState` and writer loop dispatch blocks contain this unoptimized sequence.

## Implementation Spec

### Step 1: Replace ternary with `Math.max` in `checkState`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `checkState` worker job dispatch loop:
```typescript
<<<<<<< SEARCH
              if (dispatches > 0) {
                const targetH = dispatches < h ? h - dispatches : 0;
                do {
                  h--;
                  workerThenables[freeWorkers[h]].resolve(n);
                  n++;
                } while (h !== targetH);
              }
=======
              if (dispatches > 0) {
                const targetH = Math.max(h - dispatches, 0);
                do {
                  h--;
                  workerThenables[freeWorkers[h]].resolve(n);
                  n++;
                } while (h !== targetH);
              }
>>>>>>> REPLACE
```
**Why**: Simplifies parser syntax tree for the V8 JIT compiler without compromising performance.
**Risk**: Very low.

### Step 2: Replace ternary with `Math.max` in multi-worker writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer block (`while (nextFrameToWrite !== totalFrames && !aborted)`):
```typescript
<<<<<<< SEARCH
              if (dispatches > 0) {
                const targetH = dispatches < h ? h - dispatches : 0;
                do {
                  h--;
                  workerThenables[freeWorkers[h]].resolve(n);
                  n++;
                } while (h !== targetH);
              }
=======
              if (dispatches > 0) {
                const targetH = Math.max(h - dispatches, 0);
                do {
                  h--;
                  workerThenables[freeWorkers[h]].resolve(n);
                  n++;
                } while (h !== targetH);
              }
>>>>>>> REPLACE
```

**Why**: Consolidates logic, reduces statements to parse.
**Risk**: Very low.

## Correctness Check
Run the canvas smoke test and ensure the renderer tests still pass.
