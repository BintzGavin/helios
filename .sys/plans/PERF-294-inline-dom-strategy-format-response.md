---
id: PERF-294
slug: inline-dom-strategy-format-response
status: complete
claimed_by: "executor-session"
created: 2026-04-17
completed: 2026-04-17
result: "no-improvement"
---

# PERF-294: Inline `formatResponse` in `CaptureLoop.ts` to Eliminate Function Dispatch Overhead

## Focus Area
The hot frame generation pipeline in `CaptureLoop.ts`. Specifically, eliminating the dynamic function call to `strategy.formatResponse` entirely within the worker loop.

## Background Research
Currently in `CaptureLoop.ts`'s `runWorker` method, `formatResponse` is called for every frame:
```typescript
const buffer = formatResponse ? formatResponse.call(strategy, rawResponse) : rawResponse;
```
Even after reordering checks in `DomStrategy.ts` to prioritize the CDP hot path (PERF-293), the V8 engine still pays the cost of:
1. Dynamic dispatch to the `formatResponse` property.
2. The `Function.prototype.call` indirection.
3. The execution context setup/teardown for the arrow function.

Since `CaptureLoop` is tightly coupled with Playwright and the `RenderStrategy` interface, and we know exactly what `DomStrategy` does for the `HeadlessExperimental.beginFrame` response (returning `res.screenshotData`), we can inline this logic directly into `CaptureLoop.ts`. By checking for `rawResponse.screenshotData` directly inside `runWorker` and falling back to `strategy.formatResponse` only if necessary (for other strategies), we can bypass the function call entirely for the dominant DOM rendering path. This eliminates all dispatch overhead and allows V8 to optimize the tight loop more aggressively.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.1s
- **Bottleneck analysis**: The overhead from repeatedly applying `formatResponse.call` in the V8 hot loop for every frame.

## Implementation Spec

### Step 1: Inline `screenshotData` extraction
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `CaptureLoop.ts`, locate the `runWorker` function.
Change this logic:
```typescript
const rawResponse = await strategy.capture(page, time);
const buffer = formatResponse ? formatResponse.call(strategy, rawResponse) : rawResponse;
```
To this logic:
```typescript
const rawResponse = await strategy.capture(page, time);
// Inline fast path for CDP responses (DomStrategy)
let buffer: Buffer | string;
if (rawResponse && typeof rawResponse.screenshotData === 'string') {
    buffer = rawResponse.screenshotData;
} else {
    buffer = formatResponse ? formatResponse.call(strategy, rawResponse) : rawResponse;
}
```
**Why**: This directly extracts the base64 string from the CDP response in the tight loop, avoiding the `DomStrategy.formatResponse` function call completely for the DOM hot path.

**Risk**: Negligible. If the response doesn't have `screenshotData` (e.g., CanvasStrategy), it falls back to the existing behavior.

## Variations
No variations necessary.

## Canvas Smoke Test
Run `npm run build:examples` and then run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas rendering still works correctly using the fallback path.

## Correctness Check
Run the DOM benchmark (`npx tsx tests/fixtures/benchmark.ts`) to verify performance gains and ensure the output video is generated correctly.

## Results Summary
- **Best render time**: 51.097s (vs baseline 48.225s)
- **Improvement**: -5.9%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-294: Inline `formatResponse` in `CaptureLoop.ts`]
