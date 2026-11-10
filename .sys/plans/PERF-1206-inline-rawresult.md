---
id: PERF-1206
slug: inline-rawresult
status: unclaimed
claimed_by: ""
created: 2024-11-20
completed: ""
result: ""
---
# PERF-1206: Inline `rawResult` directly in single worker canvas loop

## Focus Area
Single worker fast path in `CaptureLoop.ts` - Canvas mode `!isDomStrategy` inner chunk loop.

## Background Research
In the Canvas mode (`!isDomStrategy`) inner block of the single-worker fast path, there is a redundant intermediate assignment: `const buf = rawResult;`. This variable is then immediately used to calculate length and pass into `stream.write`. By eliminating the intermediate variable, we can slightly reduce AST complexity and local variable assignments in the JS engine.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 1080p, 60 FPS, 10s
- **Mode**: `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A
- **Bottleneck analysis**: Negligible CPU cycle savings but cleans up AST footprint and closure memory operations inside the tight single-worker loops.

## Implementation Spec

### Step 1: Inline `rawResult` directly in single worker Canvas loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the block under `!isDomStrategy` where `buf` is assigned (around line 308):
```typescript
              const buf = rawResult;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
```
Change it to:
```typescript
              pendingBytes += rawResult.length;
              if (!stream.write(rawResult) && pendingBytes >= MAX_PENDING_BYTES) {
```
**Why**: Removes intermediate local variable allocation in the tight evaluation loop.
**Risk**: None. Functionally identical.

## Variations
None.

## Canvas Smoke Test
Run a canvas benchmark to ensure functionality is preserved.

## Correctness Check
Run tests to ensure correct frames are generated.

## Prior Art
Prior optimizations have focused on simplifying and removing intermediate local variables to reduce the AST overhead and improve parser efficiency in V8.
