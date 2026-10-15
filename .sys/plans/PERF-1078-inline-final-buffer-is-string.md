---
id: PERF-1078
slug: inline-final-buffer-is-string
status: unclaimed
claimed_by: ""
created: 2026-10-15
completed: ""
result: ""
---

# PERF-1078: Inline typeof check for final buffer write

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` final cleanup loop.

## Background Research
In `CaptureLoop.ts` around line 740, the code performs `const isString = typeof finalBuffer === "string";` and then uses the `isString` variable in an `if` condition to determine whether to write to the stream as base64 or normally. This variable is single-use and can be inlined to slightly reduce AST complexity and local variable assignments in the JS engine.

## Benchmark Configuration
- **Composition URL**: Any standard composition
- **Render Settings**: Standard configuration
- **Mode**: `dom` and `canvas`
- **Metric**: Microbenchmarks on the variable assignment vs inline check. Wall-clock time impact is negligible because this runs exactly once at the end of capture, but it continues our pattern of reducing parser overhead and engine memory footprints.
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A for this block (runs once)
- **Bottleneck analysis**: The intermediate variable assignment adds tiny, unnecessary overhead.

## Implementation Spec

### Step 1: Inline the check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate this block near line 740:
```typescript
      const isString = typeof finalBuffer === "string";
      let writeSuccess;
      if (isString) {
        writeSuccess = stdin!.write(finalBuffer as any, "base64");
      } else {
        writeSuccess = stdin!.write(finalBuffer as any);
      }
```

Replace it with:
```typescript
      let writeSuccess;
      if (typeof finalBuffer === "string") {
        writeSuccess = stdin!.write(finalBuffer as any, "base64");
      } else {
        writeSuccess = stdin!.write(finalBuffer as any);
      }
```

**Why**: Removes the intermediate assignment, slightly improving AST parsing and V8 optimization footprint for identical mathematical correctness.
**Risk**: Minimal. This is executed exactly once at the end.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` or a canvas smoke test to ensure no breakage.

## Correctness Check
Review DOM test results to verify final frame finishes properly.

## Prior Art
PERF-986: simplify-buffer-drain-check-in-captureloop
PERF-1053: Inlined `dispatches` evaluation directly into its expression in the multi-worker assignment paths of `CaptureLoop.ts`.
