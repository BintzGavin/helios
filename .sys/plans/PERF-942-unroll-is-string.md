---
id: PERF-942
slug: unroll-is-string-single-worker
status: complete
claimed_by: "jules"
created: 2025-02-23
completed: ""
result: improved
---

# PERF-942: Unroll isString in Single-Worker Capture Loops

## Focus Area
The single-worker write loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the per-iteration `isString = isDomStrategy || typeof buffer === "string"` check since the type of buffer is known a priori based on the strategy type (`isDomStrategy`).

## Background Research
In `CaptureLoop.ts`, the multi-worker path has already unrolled `isString` evaluations (e.g. by using `isDomStrategyWriter` and splitting paths based on strategy type).

However, the single-worker path still contains dynamically evaluated expressions in several places:
```typescript
isString = isDomStrategy || typeof buffer === "string";

let writeSuccess = false;
if (isString) {
  // ...
}
```

Since we already know whether the strategy is DOM based on `isDomStrategy` before entering the hot single-worker loops, we can avoid evaluating this dynamic check on every frame (where `typeof` is expensive). We can simply evaluate this check once, or use `isDomStrategy` directly if the framework guarantees that non-DOM canvas strategies only yield typed arrays or node buffers. However, to preserve identical behavior, we can hoist `const isString = isDomStrategy;` or unswitch the single worker loops entirely to separate DOM and Canvas paths. In fact, checking `typeof buffer === 'string'` in the Canvas loop might be mathematically unreachable since Canvas rendering always produces node Buffers. Thus we can replace `isString` with `isDomStrategy` and unswitch the loops to avoid evaluating the branch at all.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom` (with 1 worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: V8 dynamic type checking and branching (`typeof buffer === "string"`) inside the single-worker hot write loop.

## Implementation Spec

### Step 1: Hoist and unswitch `isString` in single-worker `hasProcessFn` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the single-worker `if (hasProcessFn)` block loop initialization (around lines 252-277), replace `isString = isDomStrategy || typeof buffer === "string"` and the subsequent `if (isString)` branches. Because this initialization phase captures frame `0` dynamically, we will unroll the writing code into two branches based entirely on `isDomStrategy` (i.e. if `isDomStrategy` write as Base64, else write as buffer).
**Why**: Eliminates dynamic `typeof` branch overhead and simplifies V8 type specialization.

### Step 2: Hoist and unswitch `isString` in single-worker `!hasProcessFn` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Similarly, inside the single-worker `else` (no process func) block loop (around lines 566-591), unswitch the initial write operations based solely on `isDomStrategy` rather than dynamically checking `typeof buffer === 'string'`.

## Correctness Check
Run `npm run build && npm run test -w packages/renderer` to ensure canvas streams still write correctly and DOM base64 output still decodes correctly.
