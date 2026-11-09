---
id: PERF-1194
slug: inline-worker-thenable-resolve
status: unclaimed
claimed_by: ""
created: 2024-05-15
completed: ""
result: ""
---

# PERF-1194: Optimize wait workers resolve loops by decrementing head and array indexing at once

## Focus Area
The hot multi-worker loop in `CaptureLoop.ts` contains loops assigning jobs or stopping workers that look like this:
```typescript
while (h !== 0) {
  h--;
  workerThenables[freeWorkers[h]].resolve(-1);
}
```
This is executed frequently. We can inline the `h--` operation directly into the array lookup index:
```typescript
while (h !== 0) {
  workerThenables[freeWorkers[--h]].resolve(-1);
}
```

## Background Research
By using the prefix decrement operator `--h` inside the array index accessor, we merge a variable mutation and an array index lookup into a single AST expression for V8. This reduces AST depth, decreases the number of statements, and can slightly improve the TurboFan JIT compilation path.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The multi-worker `checkState` and writer loop dispatch blocks contain this unoptimized sequence, causing minor overhead in job scheduling.

## Implementation Spec

### Step 1: Optimize worker termination in `checkState` aborted path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `checkState` aborted branch:
```typescript
<<<<<<< SEARCH
          let head = freeWorkersHead;
          while (head !== 0) {
            head--;
            const w = freeWorkers[head];
            workerThenables[w].resolve(-1);
          }
=======
          let head = freeWorkersHead;
          while (head !== 0) {
            workerThenables[freeWorkers[--head]].resolve(-1);
          }
>>>>>>> REPLACE
```
**Why**: Reduces AST nodes and inline variable lookup.
**Risk**: None, standard JS syntax.

### Step 2: Optimize worker job dispatch in `checkState` and multi-worker writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `checkState`'s worker job dispatch loop:
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
                const targetH = dispatches < h ? h - dispatches : 0;
                do {
                  workerThenables[freeWorkers[--h]].resolve(n++);
                } while (h !== targetH);
              }
>>>>>>> REPLACE
```
And also the worker stop loop:
```typescript
<<<<<<< SEARCH
          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (n === totalFrames) {
            while (h !== 0) {
              h--;
              workerThenables[freeWorkers[h]].resolve(-1);
            }
          }
=======
          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (n === totalFrames) {
            while (h !== 0) {
              workerThenables[freeWorkers[--h]].resolve(-1);
            }
          }
>>>>>>> REPLACE
```

Apply the exact same two optimizations inside the multi-worker writer loop where `freeWorkersHead !== 0` is checked.
There is one inside `checkState` and one inside the main `try` block (`while (nextFrameToWrite !== totalFrames ...)`).

**Why**: Consolidates increments and decrements directly into the expressions that use them, reducing V8 JIT statement parsing.
**Risk**: Very low.

## Correctness Check
Run the canvas smoke test and ensure the renderer tests still pass.
