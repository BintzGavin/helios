---
id: PERF-1161
slug: inline-final-buffer-write
status: unclaimed
claimed_by: ""
created: 2024-11-01
completed: ""
result: ""
---

# PERF-1161: Inline isDomStrategy check for final buffer write to reduce AST complexity

## Focus Area
The final frame writing block inside `CaptureLoop.ts` `run()` method (lines 612-629).

## Background Research
Currently in `CaptureLoop.ts`, at the very end of the `run()` function, there is a check to write the `finalBuffer` to `stdin!`. This block duplicates the write logic inside an `if (isDomStrategy)` check:

```typescript
    if (finalBuffer && finalBuffer.length > 0) {
      console.log(`Writing final buffer...`);
      if (isDomStrategy) {
        if (!stdin!.write(finalBuffer as any, "base64")) {
          await this.drainPromise;
        }
      } else {
        if (!stdin!.write(finalBuffer as any)) {
          await this.drainPromise;
        }
      }
    }
```

Since the only difference between the branches is the `"base64"` encoding parameter for DOM strategy, this logic can be safely simplified using an inline ternary operator. This removes redundant parsing of the `if (!stdin!.write(...)) { await this.drainPromise; }` block, reducing the AST footprint for V8 and improving instruction cache density for the function as a whole. While this block only executes once per render, shrinking the overall `run()` AST helps V8 TurboFan optimize the hot inner loops faster by reducing the total method byte size.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~9.0s (based on latest benchmark logs)
- **Bottleneck analysis**: Duplicated conditional blocks in large monolithic functions inflate the JS AST, slowing down initial parse and JIT compilation.

## Implementation Spec

### Step 1: Simplify final buffer write logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Near the end of the `run()` function, replace the duplicated `if (isDomStrategy) { ... } else { ... }` logic with:
```typescript
    if (finalBuffer && finalBuffer.length > 0) {
      console.log(`Writing final buffer...`);
      const success = isDomStrategy
        ? stdin!.write(finalBuffer as any, "base64")
        : stdin!.write(finalBuffer as any);
      if (!success) {
        await this.drainPromise;
      }
    }
```
**Why**: Consolidates duplicated control flow into a single unified check with an inline parameter selection. This reduces the number of AST nodes V8 needs to process.
**Risk**: No runtime risk; mathematically identical to the previous code.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test --workspace=packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Extracting identical branch blocks for AST reduction (PERF-1158, PERF-1159, PERF-1160).
