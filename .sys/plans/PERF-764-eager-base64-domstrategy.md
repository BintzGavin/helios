---
id: PERF-764
slug: eager-base64-domstrategy
status: unclaimed
claimed_by: ""
created: 2024-06-14
completed: ""
result: ""
---

# PERF-764: Eager Base64 Decode in DomStrategy processCaptureResult

## Focus Area
`DomStrategy.ts` and `CaptureLoop.ts` buffer processing path.

## Background Research
In PERF-753, we observed that eager base64 decoding to a Buffer inside `CaptureLoop.ts` reduced V8 JS heap memory pressure. In `DomStrategy.ts`, `processCaptureResult` currently returns a `string | Buffer`.
Specifically, `DomStrategy` returns `result.screenshotData || this.lastFrameData`, which is usually a base64 string for CDP screenshots. `CaptureLoop.ts` then checks `if (typeof buffer === 'string') { buffer = Buffer.from(buffer, 'base64'); }`.

If we move the base64 decoding directly into `DomStrategy.processCaptureResult`, `CaptureLoop.ts` can assume it always receives a `Buffer`. This eliminates the type checking (`typeof buffer === 'string'`) and conditional branching inside the hot `CaptureLoop.ts` for every frame in both the fast path and multi-worker loops.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The conditional type checking (`typeof buffer === 'string'`) inside `CaptureLoop.ts` adds overhead to the hot loop.

## Implementation Spec

### Step 1: Update DomStrategy processCaptureResult
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Change `processCaptureResult(result: any): string | Buffer { ... }` to return `Buffer`.
Update the method logic to always return a Buffer. If `result.screenshotData` is provided (as a base64 string), decode it immediately using `Buffer.from(result.screenshotData, 'base64')` and cache this Buffer in `this.lastFrameData`.

```typescript
  processCaptureResult(result: any): Buffer {
    if (result.screenshotData) {
      this.lastFrameData = Buffer.from(result.screenshotData, 'base64');
    }
    return this.lastFrameData as Buffer;
  }
```

In `prepare()`, change `this.lastFrameData = this.emptyImageBase64;` to `this.lastFrameData = this.emptyImageBuffer;`.
Change the type of `this.lastFrameData` to `Buffer | null`.

### Step 2: Remove Base64 Decode from CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `CaptureLoop.ts`, remove the base64 decoding block in both the fast path and multi-worker loops:
```typescript
                if (typeof buffer === 'string') {
                    buffer = Buffer.from(buffer, 'base64');
                }
```
`strategy.processCaptureResult` (or `strategy.capture`) will now be expected to return a Buffer directly (or be handled appropriately by the processFn).

## Variations
None.

## Canvas Smoke Test
Run `npm run build -w packages/renderer`.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
- PERF-753 (Eager Base64 Decode to Buffer in CaptureLoop)
- PERF-757 (Eliminate processCaptureResult Branching)
