---
id: PERF-985
slug: optimize-dom-strategy-closures-and-cache
status: complete
claimed_by: ""
created: 2024-07-13
completed: ""
result: ""
---

# PERF-985: Optimize DOM strategy closures and simplify cache evaluations in hot loops

## Focus Area
The single-worker fast loops and multi-worker initialization in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the exotic `.bind()` closures and the redundant `!domLastFrameBuffer` checks in the chunked rendering loops.

## Background Research
1. **Exotic Bound Functions**: `CaptureLoop.ts` creates the `domBeginFrame` function using `Function.prototype.bind` on the `cdpSession.send` method. In V8, bound functions create exotic objects that carry a significant invocation penalty compared to native lexical arrow functions. In a loop running 60 times per second, switching to a lexical arrow closure (`() => domCdpSession!.send(...)`) allows TurboFan to inline the call more aggressively.
2. **Redundant Boolean Checks**: Inside the single-worker DOM chunk loops, the code checks `if (data || !domLastFrameBuffer)` to decide whether to decode a new Base64 frame or reuse the cached buffer. Because `domLastFrameBuffer` is guaranteed to be instantiated prior to entering the loop (during frame 0 processing), `!domLastFrameBuffer` is mathematically always `false`. Thus, the condition reduces to simply `if (data)`. Furthermore, the inner `if (data) domLastFrameData = data;` check is completely redundant if we just assign it directly.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-optimizations in branch predictability and closure instantiation speed inside the Node.js V8 execution context.

## Implementation Spec

### Step 1: Replace `.bind` with arrow function closures
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the `domBeginFrame` declaration in both single-worker and multi-worker initialization blocks. Replace the `.bind()` usage with a lexical arrow function closure that directly invokes `domCdpSession!.send(...)`.

### Step 2: Simplify cache condition in single-worker DOM loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the single-worker DOM chunk loops (and the peeled frame iteration), refactor the condition `if (data || !domLastFrameBuffer)`. Simplify the logic so it only evaluates `if (data)`. Directly assign `domLastFrameData = data` and recompute `Buffer.from(...)`, whereas the `else` branch should simply assign `buf = domLastFrameBuffer!`.

## Correctness Check
Run `npm test -w packages/renderer` to ensure nothing is broken.
