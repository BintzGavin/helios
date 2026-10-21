---
id: PERF-1118
slug: simplify-dom-strategy-capture-return
status: unclaimed
claimed_by: ""
created: 2024-10-21
completed: ""
result: ""
---

# PERF-1118: Simplify DomStrategy capture() Return Type

## Focus Area
`DomStrategy.capture()` and its consumers in `CaptureLoop.ts` (`packages/renderer/src/strategies/DomStrategy.ts`, `packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Currently, the `capture` method in `DomStrategy` awaits the `Page.captureScreenshot` CDP call and then mutates the response object to conform to a legacy screencast/damage-based signature:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => {
      (r as any).hasDamage = true;
      (r as any).screenshotData = r.data;
      return r;
    });
  }
```
Mutating the CDP response object (`r`) causes hidden class transitions in V8 (deoptimizing JIT access), and requires consumers in `CaptureLoop.ts` to perform nested property lookups `(rawResult as any).screenshotData` inside the ultra-hot frame processing loops. Since we no longer use `startScreencast` (which relies on `hasDamage` checks - see `PERF-1114`), we can simplify this to just return the base64 string `r.data` directly. This entirely removes the object mutation and significantly simplifies unpacking inside the `CaptureLoop` hot loops. Additionally, the unused `processCaptureResult` method in `DomStrategy.ts` can be safely removed.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Object mutation causing hidden class transitions and nested property lookups in `CaptureLoop.ts` hot loops adds slight but continuous CPU overhead.

## Implementation Spec

### Step 1: Simplify `capture()` in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Update `capture()` to return `r.data` directly without mutation:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => r.data);
  }
```
2. Remove the `processCaptureResult` method entirely from `DomStrategy.ts`, as it is dead code that is not defined in `RenderStrategy` interface correctly anyway (and unused by `CaptureLoop.ts`).

### Step 2: Remove `.screenshotData` accesses in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker and multi-worker loops, update all accesses to `rawResult.screenshotData`. Since `rawResult` is now guaranteed to be the string data in `isDomStrategy` paths, use it directly.

1. **Single-worker initialization block**:
Change:
```typescript
            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }
```
To:
```typescript
            domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
```
*(Since `rawResult` is the base64 string now, and captureScreenshot always returns data).*

2. **Single-worker `while` loop block**:
Change:
```typescript
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              const buf = domLastFrameBuffer!;
```
To:
```typescript
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              const buf = domLastFrameBuffer!;
```

3. **Single-worker cleanup final block (`totalFrames > 1`)**:
Change:
```typescript
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
```
To:
```typescript
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
```

4. **Multi-worker `runWorker` loop**:
Change:
```typescript
            if (isDomStrategy) {
              const rawResult = await strategy.capture(page, i * timeStep);
              const data = (rawResult as any).screenshotData;
              let buf: Buffer;
              if (data) {
                buf = Buffer.from(data as string, "base64");
                domLastFrameBuffer = buf;
              } else {
                buf = domLastFrameBuffer!;
              }
              frameBufferRing[i & ringMask] = buf;
```
To:
```typescript
            if (isDomStrategy) {
              const rawResult = await strategy.capture(page, i * timeStep);
              let buf: Buffer = Buffer.from(rawResult as string, "base64");
              domLastFrameBuffer = buf;
              frameBufferRing[i & ringMask] = buf;
```

**Why**: By returning the string data directly, we avoid mutating V8 objects (preventing hidden class deoptimization) and bypass unnecessary branch logic (`if (data)`) inside the hot loops.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure canvas path rendering remains completely unaffected by these changes.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode=dom` inside `packages/renderer` to verify DOM frame rendering does not hang and correctly completes.