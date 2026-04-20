---
id: PERF-317
slug: inline-dom-strategy-empty-image
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-317: Pre-bind the Empty Image Buffer in DomStrategy

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `DomStrategy.ts`

## Background Research
In `DomStrategy.ts`, the `processCaptureResult` method checks if `lastFrameData` exists. If not, it falls back to `this.emptyImageBase64` or `this.emptyImageBuffer`. The method does multiple type checks on every frame. We previously removed the `formatResponse` wrapper in `CaptureLoop.ts` to push this logic down into the strategy (`PERF-303`), which simplified things.

Currently:
```typescript
  private processCaptureResult(res: any): Buffer | string {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  }
```

If we change `lastFrameData` from `null` to initialized with `this.emptyImageBase64`, we can remove the final `else` block entirely, simplifying the branch logic in the hot path. V8's branch predictor prefers fewer branches. This is a very small optimization, but compound gains matter.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.5s
- **Bottleneck analysis**: Micro-optimizing branch logic in `processCaptureResult`.

## Implementation Spec

### Step 1: Pre-initialize `lastFrameData` and simplify `processCaptureResult`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `DomStrategy.ts`, update the `prepare` method to initialize `lastFrameData` to `this.emptyImageBase64` instead of leaving it `null`. Then, simplify `processCaptureResult`.

```typescript
<<<<<<< SEARCH
  private processCaptureResult(res: any): Buffer | string {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  }
=======
  private processCaptureResult(res: any): Buffer | string {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    }
    return this.lastFrameData!;
  }
>>>>>>> REPLACE
```

And in `prepare()`, right after setting `this.emptyImageBase64`:
```typescript
<<<<<<< SEARCH
    if (format === 'jpeg') {
        // 1x1 JPEG pixel
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else if (format === 'webp') {
        // 1x1 WEBP pixel
        this.emptyImageBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else {
        // Default to PNG
        this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        this.emptyImageBuffer = EMPTY_IMAGE_BUFFER;
    }
=======
    if (format === 'jpeg') {
        // 1x1 JPEG pixel
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else if (format === 'webp') {
        // 1x1 WEBP pixel
        this.emptyImageBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else {
        // Default to PNG
        this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        this.emptyImageBuffer = EMPTY_IMAGE_BUFFER;
    }

    this.lastFrameData = this.emptyImageBase64;
>>>>>>> REPLACE
```

**Why**: Removes two branches (`else if (this.lastFrameData)` and `else`) from the critical path hot loop.
**Risk**: Very low. `lastFrameData` will never be null during `capture`.

## Variations
None.

## Canvas Smoke Test
None needed. DomStrategy is for DOM mode.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to ensure it still runs correctly.
