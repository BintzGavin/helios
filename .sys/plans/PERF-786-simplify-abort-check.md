---
id: PERF-786
slug: simplify-abort-check
status: unclaimed
claimed_by: ""
created: 2024-06-16
completed: ""
result: ""
---

# PERF-786: Simplify Abort Check in CaptureLoop Fast Path

## Focus Area
Frame Capture Loop (`CaptureLoop.ts`). This targets the innermost hot loop of the single-worker path by moving an infrequently true conditional check outside of the `for` loops or simplifying it to a primitive boolean.

## Background Research
In the single-worker hot loops of `CaptureLoop.ts` (lines 150 and 176):
```typescript
if (capturedErrors.length > 0 || (signal && signal.aborted)) break;
```

This condition is checked on *every single frame*.
1. `capturedErrors.length > 0`: Checking `capturedErrors.length > 0` in the single-worker loop is completely redundant! The single worker loop uses a standard `try-catch` wrapper around the `for` loops. If an error happens inside `strategy.capture`, it throws synchronously or as a rejected promise, skipping to the `catch (e)` block immediately. The `capturedErrors` array is actually an artifact of the multi-worker pipeline, where different workers can throw asynchronously and we need to collect those errors to abort the main loop. In the single-worker path, no one else is pushing to `capturedErrors`.
2. `(signal && signal.aborted)`: This evaluates a short-circuit and property access on an object on every iteration.

We can completely eliminate this complex check. We can hoist a local boolean `let aborted = false;` and an event listener on the `signal` to flip this boolean. Then the inner loop simply checks `if (aborted) break;`.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom` (with multi-worker disabled, `maxWorkers: 1`)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The single-worker `for` loop body includes a complex condition `if (capturedErrors.length > 0 || (signal && signal.aborted)) break;` which takes up CPU cycles evaluating redundant and slow checks on every iteration. Removing this from the monomorphic path will reduce AST complexity.

## Implementation Spec

### Step 1: Simplify loop condition in single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Before the single-worker `try { ... }` block (around line 147), define a simple boolean and setup a listener:

```typescript
        let aborted = false;
        let abortListener: (() => void) | null = null;
        if (signal) {
            if (signal.aborted) aborted = true;
            abortListener = () => { aborted = true; };
            signal.addEventListener('abort', abortListener);
        }
```

Inside the `try { if (hasProcessFn) { ... } else { ... } }` block for the single-worker path:

Replace `if (capturedErrors.length > 0 || (signal && signal.aborted)) break;`
With:
```typescript
if (aborted) break;
```
in both the `hasProcessFn` true and false `for` loops.

### Step 2: Cleanup listener
After the single-worker path finishes (after the `if (signal && signal.aborted) throw new Error('Aborted');` on line 207), remove the event listener to avoid memory leaks:
```typescript
        if (signal && abortListener) {
            signal.removeEventListener('abort', abortListener);
        }
```

**Why**: Checking a primitive local boolean `aborted` is orders of magnitude faster in V8 than checking an array length plus a logical AND property access. It removes branching complexity inside the hot loop.

## Variations
N/A

## Canvas Smoke Test
Run a basic canvas composition to ensure no pipeline breaks.

## Correctness Check
- The output MP4 should render correctly.
