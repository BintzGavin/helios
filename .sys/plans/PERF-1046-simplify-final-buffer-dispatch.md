---
id: PERF-1046
slug: simplify-final-buffer-dispatch
status: complete
claimed_by: ""
created: 2024-07-18
completed: ""
result: ""
---

# PERF-1046: Simplify final buffer type dispatch in CaptureLoop.ts

## Focus Area
The final frame writing block at the very end of `packages/renderer/src/core/CaptureLoop.ts` (`const isString = typeof finalBuffer === "string"; ...`).

## Background Research
Currently, at the end of `CaptureLoop.ts`, there is this logic:
```javascript
    if (
      finalBuffer &&
      ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) ||
        (typeof finalBuffer === "string" && finalBuffer.length > 0))
    ) {
      console.log(`Writing final buffer...`);
      const isString = typeof finalBuffer === "string";
      if (
        !(isString
          ? stdin!.write(finalBuffer as any, "base64")
          : stdin!.write(finalBuffer as any))
      ) {
        await this.drainPromise;
      }
    }
```
This is a micro-optimization to avoid writing the final buffer to standard input if it's empty. However, we can unroll the buffer type check `isString` in this one-off final frame dispatch. Currently, there is an inline ternary operator: `!(isString ? stdin!.write(finalBuffer as any, "base64") : stdin!.write(finalBuffer as any))` which adds branching overhead within the condition check itself. It is faster to branch using an `if-else` statement and run standard `stdin.write` directly, eliminating the ternary dispatch.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The inline ternary logic for `isString` creates branching complexity inside the `if` condition when the engine executes this code exactly once at the end of the render. This increases AST complexity for the file for an infrequently executed path.

## Implementation Spec

### Step 1: Unroll final buffer dispatch ternary
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the final buffer condition inside the `if (finalBuffer && ...)` block from this:
```typescript
      console.log(`Writing final buffer...`);
      const isString = typeof finalBuffer === "string";
      if (
        !(isString
          ? stdin!.write(finalBuffer as any, "base64")
          : stdin!.write(finalBuffer as any))
      ) {
        await this.drainPromise;
      }
```
To this:
```typescript
      console.log(`Writing final buffer...`);
      const isString = typeof finalBuffer === "string";
      let writeSuccess;
      if (isString) {
        writeSuccess = stdin!.write(finalBuffer as any, "base64");
      } else {
        writeSuccess = stdin!.write(finalBuffer as any);
      }

      if (!writeSuccess) {
        await this.drainPromise;
      }
```
**Why**: By replacing the ternary operator inside the logical `not (!)` check with a clean `if/else` that populates `writeSuccess`, we reduce AST depth and simplify the instruction path for V8.
**Risk**: Negligible risk, identical behavior.

## Canvas Smoke Test
Run a `canvas` render to confirm the final buffer logic correctly closes.

## Correctness Check
Run the tests (`npm run test -w packages/renderer` or similar targeted test) to ensure no regressions.
