---
id: PERF-1089
slug: inline-report-object
status: unclaimed
claimed_by: ""
created: 2024-10-16
completed: ""
result: ""
---

# PERF-1089: Inline report object return in diagnose

## Focus Area
The `diagnose` method in `packages/renderer/src/strategies/DomStrategy.ts`. We can slightly optimize the code executed within the page context by inlining the returned object.

## Background Research
Currently, the `diagnose` method evaluates this script in the page context:
```typescript
  async diagnose(page: Page): Promise<any> {
    return await page.evaluate(() => {
      // ...
      const report = {
        waapi: typeof document !== 'undefined' && 'timeline' in document,
        animations: typeof document.getAnimations === 'function' ? 'supported' : 'unsupported',
        userAgent: navigator.userAgent,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1
        },
        webgl
      };
      return report;
    });
  }
```
While the performance impact will be virtually zero on the macro level, it removes a redundant local variable assignment in the AST.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s, h264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Just JS execution of small scripts during startup.

## Implementation Spec

### Step 1: Inline the return statement
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Replace `const report = {` with `return {`, and remove the trailing `return report;`.
**Why**: Removes an unnecessary variable allocation.
**Risk**: None.
