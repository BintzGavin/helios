---
id: PERF-829
slug: hoist-dom-session-begin-frame-params
status: unclaimed
claimed_by: ""
created: 2024-06-23
completed: ""
result: ""
---

# PERF-829: Pre-bind DOM Session and Begin Frame Params in CaptureLoop Fast Paths

## Focus Area
The single-worker and multi-worker fast paths in `CaptureLoop.ts` (`packages/renderer/src/core/CaptureLoop.ts`). Specifically targeting the `isDomStrategy` blocks where `domCdpSession!.send('HeadlessExperimental.beginFrame', domBeginFrameParams)` is called in the hot loops.

## Background Research
Currently, inside the `isDomStrategy` blocks of `CaptureLoop.ts`, the code invokes `domCdpSession!.send('HeadlessExperimental.beginFrame', domBeginFrameParams)`.
The `send` method call involves method dispatch (looking up `send` on the `domCdpSession` object) and requires passing the `domBeginFrameParams` object as an argument on every single frame.

We can eliminate this overhead by pre-binding the `send` method with the `'HeadlessExperimental.beginFrame'` and `domBeginFrameParams` arguments before entering the hot loops. V8 can optimize a direct invocation of a bound function significantly better than dynamic method dispatch with arguments in a hot loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, 30s
- **Mode**: `dom`
- **Metric**: Wall-clock iteration time via targeted microbenchmarks.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Bottleneck analysis**: The `domCdpSession!.send(...)` method call is evaluated repeatedly inside monomorphic inner loops for every frame.

## Implementation Spec

### Step 1: Pre-bind the `send` method
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Right after we initialize `domCdpSession` and `domBeginFrameParams`, declare a new variable:
```typescript
const domBeginFrame = isDomStrategy ? domCdpSession!.send.bind(domCdpSession, 'HeadlessExperimental.beginFrame', domBeginFrameParams) : null;
```

### Step 2: Replace all dynamic `send` calls with the bound function
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In all places where we currently do:
```typescript
if (isDomStrategy) {
    nextCapturePromise = domCdpSession!.send('HeadlessExperimental.beginFrame', domBeginFrameParams);
// OR
    buffer = await domCdpSession!.send('HeadlessExperimental.beginFrame', domBeginFrameParams);
// OR
    const rawResult = await domCdpSession!.send('HeadlessExperimental.beginFrame', domBeginFrameParams);
}
```
Replace it with:
```typescript
if (isDomStrategy) {
    nextCapturePromise = domBeginFrame!();
// OR
    buffer = await domBeginFrame!();
// OR
    const rawResult = await domBeginFrame!();
}
```

**Why**: By pre-binding the function, we eliminate property lookups (`send`) and argument passing overhead inside the hot loop. The Javascript engine can inline the bound function.
**Risk**: If `domBeginFrameParams` is modified dynamically after the bind, the bound function would still use the initial object reference (which is fine, since it's an object reference). But it's read-only in this loop.

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` and the `benchmark-perf.ts` in Canvas mode.

## Correctness Check
Run `npm run build -w packages/renderer` and a microbenchmark verifying DOM render behavior remains unchanged.
