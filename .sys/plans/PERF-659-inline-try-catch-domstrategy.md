---
id: PERF-659
slug: inline-try-catch-domstrategy
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-659: Inline try-catch inside DomStrategy capture to reduce per-frame scope allocation

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture()`

## Background Research
The `capture()` method is the hot loop function that evaluates each frame. Currently, it wraps the CDP IPC call (`this.cdpSession!.send`) in an explicit `try...catch` block. This explicit block forces the JavaScript engine (V8) to allocate a new block scope on every single frame. We've seen previously that replacing `try...catch` with promise chaining like `.catch(...)` may regress performance if not handled properly (as seen in PERF-623 and PERF-544), but an alternative optimization is to move the `.catch()` completely out and make it inline: `await this.cdpSession!.send(...).catch(() => ({ screenshotData: null }))` to avoid block scope allocation.

In a prior attempt (PERF-544), `catch` was used but without a complete rewrite, and it failed. If we pre-allocate the catch handler, then `this.cdpSession!.send(...).catch(catchHandler)` won't allocate a new closure each frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark
- **Render Settings**: 150 frames, mode dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.697s (from latest local runs)
- **Bottleneck analysis**: Closure allocation overhead in the hot loop.

## Implementation Spec

### Step 1: Pre-bind the error handler and replace `try/catch` with `.catch()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a static or pre-bound catch handler to `DomStrategy`.
```typescript
  private beginFrameErrorHandler = () => {
    return { screenshotData: null };
  };
```

Rewrite `capture()`:
```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).catch(this.beginFrameErrorHandler);
    if (result && result.screenshotData) {
      this.lastFrameData = result.screenshotData;
    }
    return this.lastFrameData!;
  }
```

**Why**: By using a pre-bound error handler and removing the explicit `try...catch` block, we avoid both the block scope setup overhead of `try...catch` and the closure allocation overhead of an inline `.catch(() => ...)` on every single frame.
**Risk**: Error handling logic is identical; the only difference is the V8 execution mechanics. Minimal functional risk.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
- PERF-544 tried to remove try-catch but used inline closures (`.catch(() => ...)`), causing performance regression due to closure allocations.
- PERF-656 and others showed the importance of pre-binding callbacks in hot loops.
