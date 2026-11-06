---
id: PERF-1179
slug: inline-bytelength
status: unclaimed
claimed_by: ""
created: 2024-11-06
completed: ""
result: ""
---

# PERF-1179: Inlining `byteLength` in CaptureLoop.ts base64 write paths

## Focus Area
The `CaptureLoop.ts` fast-paths for writing base64 strings (DOM rendering mode) currently compute `byteLength` explicitly on each iteration via `const byteLength = (base64Str.length * 3) >>> 2; pendingBytes += byteLength;` before writing. This takes extra AST evaluation and creates an unnecessary intermediate variable. It's a small dead store/inline optimization that applies to single-worker fast paths and multi-worker chunk loops.

## Background Research
The `byteLength` calculation is used solely to maintain `pendingBytes`, which triggers the stream drain mechanism when it exceeds `MAX_PENDING_BYTES`. V8's JIT will typically optimize this, but directly substituting the calculation without an intermediate variable reduces AST size and simplifies the loop bodies. We have successfully performed similar minor optimizations like dead store eliminations, and `Math.min` unrollings.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~19s for 150 frames.
- **Bottleneck analysis**: Micro-optimizing string allocations/calculations in hot single worker loops and chunk writer loops.

## Implementation Spec

### Step 1: Inline `byteLength` calculation in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` paths (specifically single-worker loop unrolling and multi-worker chunk loops), replace:
```typescript
const byteLength = (base64Str.length * 3) >>> 2;
pendingBytes += byteLength;
```
with:
```typescript
pendingBytes += (base64Str.length * 3) >>> 2;
```
(and correspondingly for `buffer` in multi-worker).

**Why**: Eliminates a single-use variable assignment in hot loops, mildly reducing V8 load/store operations.
**Risk**: Negligible risk. Logic remains identical.

## Correctness Check
Run the DOM mode microbenchmark `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom` to verify rendering completes correctly, as well as `npm run test --workspace=packages/renderer`.
