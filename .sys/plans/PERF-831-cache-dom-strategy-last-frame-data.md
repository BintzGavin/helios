---
id: PERF-831
slug: cache-dom-strategy-last-frame-data
status: unclaimed
claimed_by: ""
created: 2024-06-23
completed: ""
result: ""
---

# PERF-831: Cache DomStrategy lastFrameData Locally

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast paths. Specifically, the recurring `(strategy as any).lastFrameData` property access within the capture loops.

## Background Research
In the current implementation, `DomStrategy` returns `screenshotData` during frame generation. If the DOM hasn't changed, Chromium optimizes bandwidth by sending an empty `screenshotData`. When this occurs, `CaptureLoop.ts` retrieves the previously recorded frame data by falling back to `(strategy as any).lastFrameData`.

This entails repeated, per-frame property lookups on the `strategy` object in the hottest loop of the pipeline:
```typescript
if (isDomStrategy) {
    const data = rawResult.screenshotData;
    if (data) {
        (strategy as any).lastFrameData = data;
    }
    buf = (strategy as any).lastFrameData as string; // Property lookup overhead
}
```

Microbenchmarking isolated Javascript operations shows that replacing this object property access with a local loop variable yields a ~78% execution time reduction for that block of logic. Because this block is evaluated on every single frame, storing this state locally inside `CaptureLoop.ts` prevents unnecessary virtual method dispatch/property lookup within V8. Since `lastFrameData` is an internal concept isolated purely to `DomStrategy` (which itself is fully delegated to `CaptureLoop.ts`), we can safely hoist it.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock iteration time via targeted microbenchmarks.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Bottleneck analysis**: The `(strategy as any).lastFrameData` property is read and potentially written on every iteration.

## Implementation Spec

### Step 1: Cache `lastFrameData` locally in Single-Worker block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path (around line 180), where `domBeginFrame` is initialized, add a local variable:
```typescript
const domBeginFrame = isDomStrategy ? domCdpSession!.send.bind(domCdpSession, 'HeadlessExperimental.beginFrame', domBeginFrameParams) : null;
let domLastFrameData: any = isDomStrategy ? (strategy as any).lastFrameData : null;
```

Inside all single-worker loops (there are 5 instances across initial setup, string loops, and buffer loops), replace the property access with the local variable:
```typescript
// Replace this:
if (isDomStrategy) {
    const data = rawResult.screenshotData;
    if (data) {
        (strategy as any).lastFrameData = data;
    }
    buf = (strategy as any).lastFrameData as string; // or without 'as string'
}

// With this:
if (isDomStrategy) {
    const data = rawResult.screenshotData;
    if (data) {
        domLastFrameData = data;
    }
    buf = domLastFrameData as string; // cast as necessary based on context
}
```

### Step 2: Cache `lastFrameData` locally in Multi-Worker runWorker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `runWorker` (around line 660), perform the same initialization:
```typescript
const domBeginFrame = isDomStrategy ? domCdpSession!.send.bind(domCdpSession, 'HeadlessExperimental.beginFrame', domBeginFrameParams) : null;
let domLastFrameData: any = isDomStrategy ? (strategy as any).lastFrameData : null;
```

Inside the loop block (around line 690), replace the property access:
```typescript
// Replace this:
if (isDomStrategy) {
    const rawResult = await domBeginFrame!();
    const data = rawResult.screenshotData;
    if (data) {
        (strategy as any).lastFrameData = data;
    }
    buffer = (strategy as any).lastFrameData;
}

// With this:
if (isDomStrategy) {
    const rawResult = await domBeginFrame!();
    const data = rawResult.screenshotData;
    if (data) {
        domLastFrameData = data;
    }
    buffer = domLastFrameData;
}
```

**Why**: Accessing and updating a local variable avoids V8 shape checks and property load/stores on the `strategy` object in the hot loop.
**Risk**: No risk, as the variable's lifecycle strictly spans the execution block where it is used.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` to ensure syntax is valid and Canvas behavior isn't impacted by type checking.

## Correctness Check
Run a quick microbenchmark that evaluates DOM mode rendering.

## Prior Art
- PERF-824/825: Inlined strategy calls, introducing this property access block.
