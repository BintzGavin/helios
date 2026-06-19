---
id: PERF-802
slug: optimize-hot-paths
status: unclaimed
claimed_by: ""
created: 2026-06-19
completed: ""
result: ""
---

# PERF-802: Optimize DomStrategy Capture and CdpTimeDriver SetTime Hot Paths

## Focus Area
`DomStrategy.ts` and `CdpTimeDriver.ts`. Both files are evaluated heavily on the fast path during DOM mode frame captures.

## Background Research
In `CdpTimeDriver.ts`, the `setTime` function computes a `delta` between `timeInSeconds` and `this.currentTime`, which is eventually multiplied by 1000 to determine the CDP virtual time `budget`. However, in `dom` mode, this budget is never actually used or sent. Computing the delta and keeping the unused budget logic active adds unnecessary subtraction and local variable allocation to the hot path.
In `DomStrategy.ts`, `processCaptureResult` performs repeated class property lookups (`this.decodeBuffer`, `result.screenshotData`) and evaluates `Math.floor(length * 1.5)` per buffer reallocation. Caching these to local variables and replacing the arithmetic with a bitwise shift (`length + (length >> 1)`) lowers JIT execution overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: JIT property access, math operations, and unneeded variables in hot execution paths.

## Implementation Spec

### Step 1: Eliminate redundant arithmetic and variables in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Rewrite `setTime` to bypass delta and budget calculation in DOM mode:
```typescript
  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
    if (timeInSeconds <= this.currentTime) {
        return;
    }

    if (this.hasMedia) {
      this.defaultSyncMedia();
    }

    if (this.mode === 'dom') {
      this.currentTime = timeInSeconds;
      return;
    }

    const budget = (timeInSeconds - this.currentTime) * 1000;
    this.currentTime = timeInSeconds;
    this.setVirtualTimePolicyParams.budget = budget;
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
    return this.timePromise as any as Promise<void>;
  }
```

### Step 2: Localize properties and optimize arithmetic in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify `processCaptureResult` to cache `this.decodeBuffer` and replace `Math.floor(val * 1.5)` with `val + (val >> 1)`:
```typescript
  processCaptureResult(result: any): Buffer {
    const b64 = result.screenshotData;
    if (b64) {
      const chars = b64.length;
      let buf = this.decodeBuffer;
      if (!buf || chars > buf.length) {
        const newCapacity = buf
          ? Math.max(chars, buf.length + (buf.length >> 1))
          : chars;
        buf = Buffer.allocUnsafe(newCapacity);
        this.decodeBuffer = buf;
      }
      const bytesWritten = buf.write(b64, 'base64');
      this.lastFrameData = buf.subarray(0, bytesWritten);
    }
    return this.lastFrameData as Buffer;
  }
```

## Variations
N/A

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to verify Canvas mode is unaffected by the `CdpTimeDriver` changes.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode dom` to verify that `dom` mode produces valid video output.

## Prior Art
- PERF-791 bypassed `setVirtualTimePolicy` execution in DOM mode but left the budget calculation.
- PERF-800 introduced the 1.5x capacity growth which we are optimizing here.
