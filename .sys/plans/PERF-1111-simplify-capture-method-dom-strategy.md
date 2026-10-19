---
id: PERF-1111
slug: simplify-capture-method-dom-strategy
status: unclaimed
claimed_by: ""
created: 2024-10-19
completed: ""
result: ""
---

# PERF-1111: Simplify Capture Method in DomStrategy.ts

## Focus Area
`capture` method inside `DomStrategy` (`packages/renderer/src/strategies/DomStrategy.ts`).

## Background Research
Currently, the `capture` method awaits the `cdpSession.send` call and assigns it to a `result` variable before returning the expected object. By returning the promise chain directly, we can avoid the intermediate variable assignment and simplify the V8 AST, resulting in slightly faster execution in the microbenchmarks without modifying any functionality.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.69s

## Implementation Spec

### Step 1: Simplify capture return statement
**File**: `packages/renderer/src/strategies/DomStrategy.ts`

Replace the current implementation of `capture`:
```typescript
  async capture(page: Page, frameTime: number): Promise<any> {
    const result = await this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams);

    return {
      hasDamage: true,
      screenshotData: result.data,
    };
  }
```
with:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => ({
      hasDamage: true,
      screenshotData: r.data,
    }));
  }
```

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure canvas tests still pass.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure the multi-worker pipeline outputs correct video data without hanging.
