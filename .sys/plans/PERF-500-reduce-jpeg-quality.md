---
id: PERF-500
slug: reduce-jpeg-quality
status: complete
claimed_by: "executor-session"
created: 2026-10-19
completed: "2026-05-14"
result: "failed"
---

# PERF-500: Reduce Intermediate JPEG Quality

## Focus Area
The DOM capture pipeline in `packages/renderer/src/strategies/DomStrategy.ts`, specifically the intermediate CDP screenshot parameters.

## Background Research
Currently, the intermediate screenshot format used by `DomStrategy.ts` defaults to `jpeg` with a quality of 90 (if no alpha channel is needed) based on PERF-010. While `jpeg` is faster to encode than PNG, a quality of 90 still results in relatively large payloads over the Chrome DevTools Protocol (CDP) IPC, and takes more CPU cycles to encode inside Skia and decode (from Base64) in Node.js.
By reducing the `jpeg` quality to 50 for intermediate frames, we can minimize the CDP IPC payload size and reduce Node.js Base64 decoding bottlenecks. Since these are intermediate frames for a video encoder (which applies its own compression and lossy encoding), a moderate reduction in intermediate quality may yield significant performance gains with minimal final visual impact.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.687s (from PERF-498)
- **Bottleneck analysis**: IPC payload size and Base64 decoding in the hot loop.

## Implementation Spec

### Step 1: Reduce default JPEG quality
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Change the default fallback quality for `jpeg` format from 90 to 50.

```typescript
<<<<<<< SEARCH
    if (!format) {
      if (hasAlpha) {
        format = 'png';
      } else {
        format = 'jpeg';
        quality = quality ?? 90;
      }
    }
=======
    if (!format) {
      if (hasAlpha) {
        format = 'png';
      } else {
        format = 'jpeg';
        quality = quality ?? 50;
      }
    }
>>>>>>> REPLACE
```
**Why**: Reduces the size of the Base64 payload transferred over CDP and processed by Node.js, and reduces Skia encoding time.
**Risk**: Potential visual degradation if 50 is too low.

## Variations

### Variation A: Quality 70
If quality 50 results in unacceptable visual degradation, try a quality of 70 as a middle ground between size and visual fidelity.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Inspect the final MP4 output visually to ensure the quality degradation is not noticeable or unacceptable compared to the baseline.

## Prior Art
- PERF-010: Changed default CDP screenshot format from webp/png to jpeg (quality 90).

## Results Summary
- **Best render time**: 16.634s (vs baseline 16.634s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Reduce JPEG quality to 50]
