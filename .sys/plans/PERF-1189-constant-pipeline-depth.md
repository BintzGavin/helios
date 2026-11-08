---
id: PERF-1189
slug: constant-pipeline-depth
status: unclaimed
claimed_by: ""
created: 2024-11-08
completed: ""
result: ""
---

# PERF-1189: Replace dynamic maxPipelineDepth calculation with a constant in CaptureLoop.ts

## Focus Area
The single-worker and multi-worker fallback pipelines in `CaptureLoop.ts`. The variable `maxPipelineDepth` is heavily used to compute constraints, buffer size, and loop bounds.

## Background Research
In `CaptureLoop.ts`, `maxPipelineDepth` is dynamically evaluated at the start of the multi-worker path:
```typescript
      let maxPipelineDepth = 64;
      maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
```
Since the initial assignment is `64` and `Math.pow(2, Math.ceil(Math.log2(64)))` identically resolves to `64`, this is a dynamic calculation of a static value. By defining `const maxPipelineDepth = 64;`, V8 can inline it directly into JIT compiled loops and closures (such as `nextFrameToWrite + maxPipelineDepth`). Removing the `let` binding eliminates potential deoptimizations related to mutable variables in fast-path loop bounds.

## Implementation Spec

### Step 1: Replace dynamic maxPipelineDepth with constant
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the dynamic recalculation of `maxPipelineDepth` and declare it as a `const`:
```typescript
<<<<<<< SEARCH
      let maxPipelineDepth = 64;
      maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
=======
      const maxPipelineDepth = 64;
>>>>>>> REPLACE
```
**Why**: Eliminating the dynamic calculation shrinks the AST and converts a mutable `let` binding to a `const`. This enables V8 to inline `maxPipelineDepth` as a literal in downstream fast paths, optimizing loop bound checks.
**Risk**: Zero risk. Mathematically `Math.pow(2, Math.ceil(Math.log2(64))) === 64`.

## Variations
None.

## Canvas Smoke Test
Run the canvas benchmark with `npx tsx packages/renderer/scripts/benchmark-perf.ts` to verify canvas smoke tests pass.

## Correctness Check
Run the DOM rendering benchmark and check that progress logging occurs identically. The video should still render the full frames with correct timing.

## Prior Art
- PERF-1141: Hoisted limits in worker dispatch, indicating V8 loop bound constant optimizations are highly effective in this hot loop.
