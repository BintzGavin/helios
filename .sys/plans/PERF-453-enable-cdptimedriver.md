---
id: PERF-453
slug: enable-cdptimedriver
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-453: Enable CdpTimeDriver for DOM Mode

## Focus Area
Browser Worker Concurrency and `TimeDriver` Selection in `BrowserPool.ts`.

## Background Research
Currently, `BrowserPool.ts` uses `SeekTimeDriver` for DOM rendering. `SeekTimeDriver` manually traverses and updates all WAAPI animations, CSS animations, and GSAP timelines via JavaScript evaluation (`window.__helios_seek`) on every single frame. This incurs massive serialization and JavaScript execution overhead inside the hot loop.

Chromium's native `Emulation.setVirtualTimePolicy` (which is already implemented and utilized by `CdpTimeDriver` for Canvas mode) natively pauses and advances the document timeline deterministically. This executes all CSS and WAAPI animations natively in C++ without the massive JS traversal overhead. Preliminary scratchpad benchmarks show that bypassing `SeekTimeDriver` in favor of `CdpTimeDriver` for DOM mode drops the render time for a 90-frame composition from ~32.6 seconds down to **~2.4 seconds** (a ~1300% speedup).

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 3 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.776s
- **Bottleneck analysis**: Massive V8 JS evaluation overhead (`window.__helios_seek`) traversing and updating animations on every frame.

## Implementation Spec

### Step 1: Swap TimeDriver in BrowserPool
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Modify `createPage` to unconditionally use `CdpTimeDriver`.
Change:
`const timeDriver = this.options.mode === 'dom' ? new SeekTimeDriver(this.options.stabilityTimeout) : new CdpTimeDriver(this.options.stabilityTimeout);`
To:
`const timeDriver = new CdpTimeDriver(this.options.stabilityTimeout);`
**Why**: Forces DOM mode to use Chromium's native `Emulation.setVirtualTimePolicy` to advance animations deterministically instead of manual JS traversal.

### Step 2: Update \`verify-waapi-sync.ts\` Test
**File**: `packages/renderer/tests/verify-waapi-sync.ts`
**What to change**:
Change `SeekTimeDriver` references and imports to `CdpTimeDriver`.
**Why**: Ensure the testing framework accurately tests the driver used for dom rendering.

## Variations
None.

## Canvas Smoke Test
Run \`cd packages/renderer && npx tsx tests/verify-cdp-determinism.ts\` and \`npx tsx tests/verify-cdp-driver.ts\` to verify Canvas mode is unaffected, since it already uses `CdpTimeDriver`.

## Correctness Check
Render `output/example-build/examples/dom-benchmark/composition.html` and visually inspect the output MP4 or run \`verify-waapi-sync.ts\`. Ensure the CSS/WAAPI animations progress smoothly without stuttering or skipping.

## Prior Art
- `PERF-450`
- `PERF-452`
