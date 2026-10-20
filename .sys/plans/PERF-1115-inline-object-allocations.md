---
id: PERF-1115
slug: inline-object-allocations
status: complete
claimed_by: "PERF-1115-inline-object-allocations"
created: 2024-10-20
completed: "2024-10-20"
result: "improved"
---

# PERF-1115: Inline Object Allocations in `capture` Return

## Focus Area
The `capture` method in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
Currently, the `capture` method constructs a new object `{ hasDamage: true, screenshotData: r.data }` on every single frame captured during DOM strategy rendering:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => ({
      hasDamage: true,
      screenshotData: r.data,
    }));
  }
```

Since `hasDamage: true` is constant and the structure is identical, we can mutate the returned object `r` itself by just assigning `hasDamage` to it and returning `r` (with a property alias or mapping `screenshotData` where needed, or adjusting the object).
Actually, `r` is the result from CDP `Page.captureScreenshot` which looks like `{ data: "base64..." }`.
Mutating it:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => {
      (r as any).hasDamage = true;
      (r as any).screenshotData = r.data;
      return r;
    });
  }
```
This reuses the object allocated by Playwright/CDP instead of allocating a new object per frame, reducing Garbage Collection pressure slightly. This builds on PERF-1111 which simplified the capture method AST.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.69s

## Implementation Spec

### Step 1: Reuse CDP Response Object
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Locate the `capture` method:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => ({
      hasDamage: true,
      screenshotData: r.data,
    }));
  }
```
Change it to:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => {
      (r as any).hasDamage = true;
      (r as any).screenshotData = r.data;
      return r;
    });
  }
```

**Why**: By mutating the existing response object from CDP, we avoid instantiating a new object closure per frame, marginally reducing GC pressure on the hot path.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions (though it does not use `DomStrategy`).

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and multi-worker pipelines still succeed.

## Prior Art
- PERF-1111 simplified the method into returning the promise chain directly.
- PERF-1088 optimized DOM strategy allocations.
