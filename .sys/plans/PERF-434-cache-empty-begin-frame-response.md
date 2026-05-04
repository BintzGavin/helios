---
id: PERF-434
slug: PERF-434-cache-empty-begin-frame-response
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-434: Inline Promise Chain Handling in DomStrategy Capture

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture()` method hot loop.

## Background Research
Currently, the `DomStrategy.capture` method uses native `await` and `try/catch` to handle the `HeadlessExperimental.beginFrame` CDP command:

```typescript
    try {
      result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    } catch (e) {
      result = {};
    }

    const frameData = result.screenshotData || this.lastFrameData!;
    this.lastFrameData = frameData;
    return frameData;
```

A previous experiment (PERF-432) tried eliminating the `await` keyword entirely and returning the promise chain, but it showed no improvement over baseline native `await`. However, the current code still allocates a new `{}` object dynamically in the hot loop during a rejected promise, and performs truthiness object property evaluation for `result.screenshotData`.

We can completely skip the `result` object assignment and property lookup entirely on the rejection path by falling back directly to `this.lastFrameData`. Furthermore, we can use nullish coalescing `??` for the successful payload check, bypassing the full V8 boolean type coercion of `||` on the heavy base64 string or binary buffer.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.48s
- **Bottleneck analysis**: Allocating `{}` on CDP command failure and truthiness coercion.

## Implementation Spec

### Step 1: Optimize async flow and eliminate object allocation
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify the `capture` method to early-return the cache on error and use `??` for success.

```typescript
    let frameData: Buffer | string;
    try {
      const result: any = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      frameData = result.screenshotData ?? this.lastFrameData!;
    } catch (e) {
      frameData = this.lastFrameData!;
    }

    this.lastFrameData = frameData;
    return frameData;
```

**Why**: By returning `this.lastFrameData!` directly inside the `catch` block, we avoid instantiating `{}` on the heap. By using `??`, we skip the JS engine's truthiness check (`Boolean(result.screenshotData)`) which can add overhead when dealing with large strings or buffers, replacing it with a strict `null/undefined` check.

## Variations
None.

## Canvas Smoke Test
Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js --mode canvas` to ensure Canvas strategy still works.

## Correctness Check
Run the DOM render benchmark script (`npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js`) multiple times.
