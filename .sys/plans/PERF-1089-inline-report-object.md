---
id: PERF-1089
slug: inline-report-object
status: complete
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

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	8.715	150	17.21	64.7	discard	baseline
2	8.719	150	17.20	64.7	discard	baseline
3	8.499	150	17.65	64.7	discard	baseline
4	8.681	150	17.28	64.7	discard	baseline
5	8.716	150	17.21	64.7	discard	baseline
6	8.523	150	17.60	64.7	discard	inline-report-object
7	8.703	150	17.24	65.3	discard	inline-report-object
8	8.726	150	17.19	64.7	discard	inline-report-object
9	8.685	150	17.27	64.8	discard	inline-report-object
10	8.694	150	17.25	65.0	discard	inline-report-object
```
