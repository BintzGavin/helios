---
id: PERF-1116
slug: inline-buf-assignments
status: unclaimed
claimed_by: ""
created: 2024-10-20
completed: ""
result: ""
---

# PERF-1116: Inline Buf Variables in Single-Worker Loop

## Focus Area
The single-worker capture loops (`isDomStrategy` and Canvas paths) in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the redundant `buf` intermediate assignments when writing to the stream.

## Background Research
In the single-worker capture loops of `CaptureLoop.ts`, the rendered frame result (`rawResult` or `domLastFrameBuffer`) is assigned to a block-scoped `buf` variable before being written to the FFmpeg pipe:
```typescript
            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }
            let buf = domLastFrameBuffer!;

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
```
And in the `else` (canvas) path:
```typescript
            let buf = rawResult;

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
```
This pattern repeats identically in the final frame rendering block (`totalFrames > 1`):
```typescript
              let buf;
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              buf = domLastFrameBuffer!;
```

These intermediate `buf` assignments force the V8 engine to allocate temporary register bindings and add extraneous nodes to the Abstract Syntax Tree (AST), slightly impeding parsing and TurboFan optimization passes. By inlining `domLastFrameBuffer!` and `rawResult` directly into the `stream.write()` and `length` properties, we can shave off unnecessary AST nodes in the tightest loops without changing semantics.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.68s
- **Bottleneck analysis**: Negligible but measurable AST bloat inside hot loop boundaries.

## Implementation Spec

### Step 1: Initial DOM Frame processing (lines 195-205)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change:
```typescript
            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }
            let buf = domLastFrameBuffer!;

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
```
To:
```typescript
            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }

            pendingBytes += domLastFrameBuffer!.length;
            if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {
```
**Why**: Removes `let buf;` and `buf = domLastFrameBuffer!;` intermediate assignments, simplifying the AST.

### Step 2: Initial Canvas Frame processing (lines 235-245)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change:
```typescript
            let buf = rawResult;

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
```
To:
```typescript
            pendingBytes += rawResult.length;
            if (!stream.write(rawResult) && pendingBytes >= 16777216) {
```
**Why**: Removes `let buf;` and intermediate assignment.

### Step 3: Final DOM Frame processing (`if (!aborted && totalFrames > 1)` lines 330-340)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change:
```typescript
              let buf;
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              buf = domLastFrameBuffer!;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
```
To:
```typescript
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }

              pendingBytes += domLastFrameBuffer!.length;
              if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {
```
**Why**: Removes `let buf;` and intermediate assignment.

### Step 4: Final Canvas Frame processing (`else` block lines 355-365)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change:
```typescript
            try {
              const rawResult = await nextCapturePromise;

              let buf = rawResult;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
```
To:
```typescript
            try {
              const rawResult = await nextCapturePromise;

              pendingBytes += rawResult.length;
              if (!stream.write(rawResult) && pendingBytes >= 16777216) {
```
**Why**: Removes `let buf;` and intermediate assignment.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions (though it does not use `DomStrategy`).

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and multi-worker pipelines still succeed.

## Prior Art
- PERF-1111 simplified the method into returning the promise chain directly.
- PERF-1088 optimized DOM strategy allocations.
- PERF-1115 Inlined Object Allocations in capture method of DomStrategy.ts.
