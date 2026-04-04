---
id: PERF-180
slug: inline-seektimedriver-params
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-180: Inline Parameters in SeekTimeDriver

## Focus Area
The `SeekTimeDriver.ts` class where `this.cdpSession!.send('Runtime.evaluate', params)` is called during the `setTime()` hot loop. This loop runs for every frame capture in the DOM rendering path.

## Background Research
In PERF-178, we successfully improved performance by inlining parameter object literals for `HeadlessExperimental.beginFrame` calls in `DomStrategy.ts`. This eliminated local variable allocation overhead and assisted V8 escape analysis. In PERF-179, a similar optimization was applied to `CdpTimeDriver.ts`.

`SeekTimeDriver.ts` is the default `TimeDriver` used in `dom` mode. The `setTime` method currently allocates a local `params` object containing `expression`, `awaitPromise`, and `returnByValue` before passing it to `this.cdpSession!.send('Runtime.evaluate', params)`. Doing this object allocation per-frame dynamically creates shallow objects in V8.

```typescript
      const params = {
        expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
        awaitPromise: true,
        returnByValue: false
      };
      return this.cdpSession!.send('Runtime.evaluate', params) as Promise<any>;
```

By inlining this object directly into the `send` method call, we can avoid the local variable allocation, improving the loop's execution speed consistent with our previous micro-optimizations.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames), mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.759s
- **Bottleneck analysis**: Micro-optimizing V8 object allocations within the hot loop. The current render time is relatively fast, so this change focuses on reducing unnecessary overhead in the most frequently called loop.

## Implementation Spec

### Step 1: Inline `params` in `SeekTimeDriver.setTime` (Single Frame)
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, inside the `if (frames.length === 1)` block, replace:
```typescript
      const params = {
        expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
        awaitPromise: true,
        returnByValue: false
      };
      return this.cdpSession!.send('Runtime.evaluate', params) as Promise<any>;
```
with:
```typescript
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
        awaitPromise: true,
        returnByValue: false
      }) as Promise<any>;
```
**Why**: Direct object literal passing to `send()` avoids local variable instantiation overhead, minimizing byte code and assisting V8 escape analysis.
**Risk**: Very low, functionally identical.

### Step 2: Inline `params` in `SeekTimeDriver.setTime` (Multiple Frames)
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, inside the `for` loop for `frames.length > 1` (the `if (frame === page.mainFrame())` block), replace:
```typescript
        const params = {
          expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
          awaitPromise: true,
          returnByValue: false
        };
        promises[i] = this.cdpSession!.send('Runtime.evaluate', params);
```
with:
```typescript
        promises[i] = this.cdpSession!.send('Runtime.evaluate', {
          expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
          awaitPromise: true,
          returnByValue: false
        });
```
**Why**: The same optimization applied to multi-frame scenarios.
**Risk**: Very low, functionally identical.

## Variations
None. This is a targeted micro-optimization following the same pattern as PERF-178 and PERF-179.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure syntax is correct. Note that `SeekTimeDriver` is primarily used by the `dom` mode.

## Correctness Check
Run the DOM benchmark:
`npx tsx packages/renderer/tests/fixtures/benchmark.ts`
Verify that rendering completes correctly and the output MP4 is generated.

## Prior Art
- PERF-178: Inline parameters in `DomStrategy.ts`
- PERF-179: Inline parameters in `CdpTimeDriver.ts`