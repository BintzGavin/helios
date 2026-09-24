---
id: PERF-984
slug: optimize-dom-strategy-closures-and-cache
status: unclaimed
claimed_by: ""
created: 2024-07-13
completed: ""
result: ""
---

# PERF-984: Optimize DOM strategy closures and simplify cache evaluations in hot loops

## Focus Area
The single-worker fast loops and multi-worker initialization in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the exotic `.bind()` closures and the redundant `!domLastFrameBuffer` checks in the chunked rendering loops.

## Background Research
1. **Exotic Bound Functions**: `CaptureLoop.ts` creates the `domBeginFrame` function using `Function.prototype.bind` on the `cdpSession.send` method. In V8, bound functions create exotic objects that carry a significant invocation penalty compared to native lexical arrow functions. In a loop running 60 times per second, switching to a lexical arrow closure (`() => domCdpSession!.send(...)`) allows TurboFan to inline the call more aggressively.
2. **Redundant Boolean Checks**: Inside the single-worker DOM chunk loops, the code checks `if (data || !domLastFrameBuffer)` to decide whether to decode a new Base64 frame or reuse the cached buffer. Because `domLastFrameBuffer` is guaranteed to be instantiated prior to entering the loop (during frame 0 processing), `!domLastFrameBuffer` is mathematically always `false`. Thus, the condition reduces to simply `if (data)`. Furthermore, the inner `if (data) domLastFrameData = data;` check is completely redundant. Unrolling this logic avoids two branches per frame iteration.

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
Locate the `domBeginFrame` instantiation (both in the single-worker initialization and multi-worker `runWorker` around lines 183 and 726):
```typescript
const domBeginFrame = isDomStrategy
  ? domCdpSession!.send.bind(
      domCdpSession,
      "HeadlessExperimental.beginFrame",
      domBeginFrameParams,
    )
  : null;
```
Change it to:
```typescript
const domBeginFrame = isDomStrategy
  ? () => domCdpSession!.send("HeadlessExperimental.beginFrame", domBeginFrameParams)
  : null;
```
**Why**: Avoids V8 exotic object invocation penalties and aids inline caching.

### Step 2: Simplify cache condition in single-worker DOM loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker DOM chunk loop (the inner `for` loop) and its subsequent peeled frame block, locate the caching logic:
```typescript
const data = rawResult.screenshotData;
let buf: Buffer;
if (data || !domLastFrameBuffer) {
  if (data) domLastFrameData = data;
  buf = Buffer.from(domLastFrameData as string, "base64");
  domLastFrameBuffer = buf;
} else {
  buf = domLastFrameBuffer;
}
```
Simplify it to:
```typescript
const data = rawResult.screenshotData;
let buf: Buffer;
if (data) {
  domLastFrameData = data;
  buf = Buffer.from(data as string, "base64");
  domLastFrameBuffer = buf;
} else {
  buf = domLastFrameBuffer!;
}
```
**Why**: `domLastFrameBuffer` is guaranteed to be non-null in the loop, so the `!domLastFrameBuffer` check and the nested `if (data)` check are unnecessary. This eliminates dead branches in the hot loop.

## Correctness Check
Run `npm test -w packages/renderer` to ensure nothing is broken.
