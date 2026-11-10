---
id: PERF-1198
slug: remove-shadow-isdomstrategy
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-1198: Remove Shadow `isDomStrategy` Variable in CaptureLoop Fast Path

## Focus Area
Fast path variable declarations and scope complexity in the `CaptureLoop.ts` file, specifically within the hot single-worker path.

## Background Research
Currently in `CaptureLoop.ts`, in the general setup logic, `isDomStrategy` is declared:
```typescript
    const isDomStrategy = this.pool[0].strategy.constructor.name === 'DomStrategy';
```
Then, inside the single-worker fast path block, it is shadowed with a slightly different implementation:
```typescript
      const isDomStrategy = !!(strategy as any).cdpSession;
```
This local shadowing of `isDomStrategy` allocates an unnecessary block-scoped variable and creates minor AST bloat. The outer variable correctly determines whether the job is running in DOM mode. Removing the shadowed `isDomStrategy` assignment and simply relying on the already-calculated outer `isDomStrategy` constant will slightly shrink the single-worker fast path V8 AST size.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html` (for testing no-regression) and a DOM animation
- **Render Settings**: 1080p, 60 FPS, 5 seconds
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.241s
- **Bottleneck analysis**: Small overhead from duplicate variable declaration and checking, though mostly code cleanliness.

## Implementation Spec

### Step 1: Remove duplicate `isDomStrategy` declaration
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the inner redeclaration of `isDomStrategy` inside the `if (poolLen === 1)` block (around line 164):
```typescript
      const isDomStrategy = !!(strategy as any).cdpSession;
```
Since `isDomStrategy` is already defined at line 136 as `const isDomStrategy = this.pool[0].strategy.constructor.name === 'DomStrategy';`, the inner block will correctly use that existing outer constant.

**Why**: Reduces AST parser overhead and intermediate variable allocations in the single-worker fast path block.
**Risk**: Negligible risk, as both checks evaluate to true for the DOM strategy and false for Canvas.

## Canvas Smoke Test
Verify canvas path still works correctly using `npm run benchmark -- --mode=canvas --url=file:///app/examples/simple-canvas-animation/composition.html`

## Correctness Check
Run `npm run verify-cdp-determinism` to ensure DOM output is still correct.
