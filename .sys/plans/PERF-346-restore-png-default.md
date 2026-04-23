---
id: PERF-346
slug: restore-png-default
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-346: Restore `png` as Default Intermediate Image Format

## Focus Area
`DomStrategy.ts` intermediate image format fallback logic. Specifically, the fallback format chosen for frames lacking an alpha channel.

## Background Research
Currently, `DomStrategy` uses Playwright's `HeadlessExperimental.beginFrame` to capture frames via CDP. If the user does not specify an `intermediateImageFormat`, the code currently checks for an alpha channel. If an alpha channel exists, it defaults to `webp`; if no alpha channel exists, it defaults to `jpeg` (at quality 75).

However, historical benchmarking (PERF-010) explicitly discovered that defaulting the intermediate image format to `jpeg` slightly degrades rendering performance compared to the `png` fallback, especially in non-hardware accelerated environments. The underlying cause is that Chromium's software encoding path for JPEG is less optimized for UI/DOM screen captures than its PNG or WebP paths, meaning the marginal reduction in IPC payload size does not outweigh the increased CPU encoding time on the Chromium side.

Despite PERF-010 being marked to be discarded/reverted, the source code in `packages/renderer/src/strategies/DomStrategy.ts` still assigns `format = 'jpeg'` as the default fallback for non-alpha frames.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames, mode: `dom`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~51.6s
- **Bottleneck analysis**: CPU overhead in the Chromium instance encoding DOM snapshots to JPEG via the software rasterizer, rather than using the more efficient PNG path.

## Implementation Spec

### Step 1: Revert fallback format to `png`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` method, locate the default format assignment logic:
```typescript
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'jpeg';
        quality = quality ?? 75;
      }
    }
```
Change the `else` branch to default to `png`:
```typescript
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'png';
      }
    }
```

**Why**: PNG provides a faster software encoding path for DOM frame captures inside Chromium compared to JPEG, reducing CPU bottlenecking during `HeadlessExperimental.beginFrame`.
**Risk**: Slightly larger IPC payload over the CDP socket, but this has already been shown (in PERF-010) to be a worthwhile trade-off.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure canvas mode still correctly assigns formats.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure `DomStrategy` captures output correctly.

## Prior Art
- PERF-010: Experimented with `jpeg` defaults, discovered it degraded performance, and was intended to be discarded.
