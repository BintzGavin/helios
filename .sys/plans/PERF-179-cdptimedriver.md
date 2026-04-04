---
id: PERF-179
slug: cdptimedriver
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-179: Reduce CdpTimeDriver Parameter Allocation Overhead

## Focus Area
The `CdpTimeDriver.ts` class where `this.client!.send('Emulation.setVirtualTimePolicy')` is called during the `setTime()` hot loop.

## Background Research
In PERF-178, we successfully improved performance by inlining parameter object literals for `HeadlessExperimental.beginFrame` calls in `DomStrategy.ts`. This eliminated local variable allocation overhead and assisted V8 escape analysis.

A similar optimization can be applied to `CdpTimeDriver.ts`, which is also executed inside the rendering hot loop (though it applies to the 'canvas' mode instead of 'dom' mode by default, or whenever `CdpTimeDriver` is explicitly used). The `setTime` method dynamically allocates an object and assigns it to a local variable `params` before calling `this.client!.send('Emulation.setVirtualTimePolicy', params)`.

```typescript
      const params = {
        policy: 'advance' as const,
        budget: budget
      };
      this.client!.send('Emulation.setVirtualTimePolicy', params).catch(reject);
```

By inlining this object directly into the `send` method call, we can avoid the local variable allocation, slightly improving the loop's execution speed.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames), mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A (Canvas rendering is significantly faster than DOM rendering, but eliminating the allocation should yield a small positive net impact or functionally neutral change).
- **Bottleneck analysis**: Micro-optimizing V8 object allocations within the hot loop.

## Implementation Spec

### Step 1: Inline `params` in `CdpTimeDriver.setTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `setTime()`, replace:
```typescript
      const params = {
        policy: 'advance' as const,
        budget: budget
      };
      this.client!.send('Emulation.setVirtualTimePolicy', params).catch(reject);
```
with:
```typescript
      this.client!.send('Emulation.setVirtualTimePolicy', {
        policy: 'advance' as const,
        budget: budget
      }).catch(reject);
```

**Why**: Direct object literal passing to `send()` avoids local variable instantiation overhead, minimizing byte code and assisting V8 escape analysis, consistent with the optimization from PERF-178.
**Risk**: Very low, functionally identical.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure syntax is correct.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to ensure rendering still works and check performance.
