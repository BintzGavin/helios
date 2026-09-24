---
id: PERF-950
slug: inline-buffer-length
status: complete
claimed_by: ""
created: 2024-05-23
completed: ""
result: ""
---

# PERF-950: Inline Buffer Allocation and Write in CaptureLoop.ts

## Focus Area
The `pendingBytes` calculation and backpressure trigger logic when handling base64 string writes in the `CaptureLoop.ts` multi-worker and single-worker paths.

## Background Research
Currently in the hot loops, we convert Base64 strings to Buffers, read `.length`, accumulate `pendingBytes`, write to the stream, and check if we've exceeded `16777216` (16MB) to trigger a drain.

```typescript
const chunk = Buffer.from(str, "base64");
pendingBytes += chunk.length;
writeSuccess = stream.write(chunk);
```

According to microbenchmarks (PERF-945), property access `.length` on dynamically allocated Node.js native Buffers has higher overhead than primitive JS access or pure JS math. Additionally, maintaining `pendingBytes` exactly when we just need an approximation for backpressure drain introduces unnecessary arithmetic and branches per frame. Since backpressure handling via `pendingBytes >= 16777216` is just a heuristic to `await this.drainPromise`, we can use the original string length calculation `(str.length * 3) >>> 2` for `pendingBytes`, skipping the native `.length` lookup completely.

Even better, we can avoid assigning `chunk` to a variable, combining creation and writing:
```typescript
pendingBytes += (str.length * 3) >>> 2;
const writeSuccess = stream.write(Buffer.from(str, "base64"));
```
By inlining the Buffer creation, we reduce local bindings in the hot path, potentially improving JIT characteristics.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html`
- **Render Settings**: 1080p, 60fps, 10s, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Tracking optimizations in hot loop overhead.
- **Bottleneck analysis**: Unnecessary local variable assignments and native Buffer `.length` property lookups in hot capture loop paths.

## Implementation Spec

### Step 1: Replace `chunk.length` and inline Buffer allocation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
For every instance where we write a base64 string buffer in the form:
```typescript
const chunk = Buffer.from(str, "base64");
pendingBytes += chunk.length;
writeSuccess = stream.write(chunk); // or writeSuccessStr = stream.write(chunk)
```
Refactor to use string length approximation and inline `Buffer.from`:
```typescript
pendingBytes += (str.length * 3) >>> 2;
writeSuccess = stream.write(Buffer.from(str, "base64"));
```
(Adjust the variable name `str`, `buf`, or `buffer` depending on the surrounding scope).

**Why**: Bypasses the `.length` getter on native Node.js buffers and reduces block-scoped variable bindings.

**Risk**: The `pendingBytes` approximation could overestimate length by 1-2 bytes per frame. Across ~50-60 frames (until 16MB), this means draining maybe 50-120 bytes earlier. This is entirely negligible and will not negatively impact render speed, while gaining a smoother V8 execution path.

## Canvas Smoke Test
Run standard canvas benchmark tests.

## Correctness Check
Run `render-dom.ts` to ensure render process runs to completion properly.

## Prior Art
PERF-945 (Native buffer `.length` getter overhead)
PERF-947 (Inlining local assignments for V8 optimization)
