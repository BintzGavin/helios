---
id: PERF-132
slug: optimize-capture-promise
status: unclaimed
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---
# PERF-132: Optimize `DomStrategy.capture()` by removing unnecessary `async/await` overhead

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts`, specifically the `capture` function, which is on the hot path for every single frame capture.

## Background Research
The `capture` method in `DomStrategy` coordinates CDP screenshot capturing for each frame. Currently, it is an `async` function that uses `await this.cdpSession.send(...)` or `await page.screenshot(...)`. By removing the `async` keyword and returning the constructed Promise chain directly, we avoid the generator and context switching overhead for every frame in the hot loop. This continues the success of PERF-131 which applied this optimization to `SeekTimeDriver.setTime()`.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: IPC latency and promise resolution overhead in the hot loop. Removing unnecessary `await` steps on the hot path reduces V8 GC pressure and event loop delays.

## Implementation Spec

### Step 1: Refactor `capture` to return Promises directly
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Remove the `async` keyword from `async capture(page: Page, frameTime: number): Promise<Buffer>`.
Inside the function, refactor the logic to return the Promise chain directly instead of using `await`.
For example, change:
```typescript
const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
// logic...
return buffer;
```
To:
```typescript
return this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then(({ screenshotData }) => {
  // logic...
  return buffer;
});
```
Ensure all branches (including the `targetElementHandle` branch and the `page.screenshot` fallback) return Promises directly.
Remove the redundant `try/catch` block around the main logic if it only re-throws the error, as returning the Promise will naturally propagate rejections.

**Why**: By returning the promise directly, we avoid the overhead of pausing and resuming the async function context in V8, saving microtasks per frame evaluation.
**Risk**: Low. The execution timing and error propagation remain identical.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify DOM rendering succeeds.
