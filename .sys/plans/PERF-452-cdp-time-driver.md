---
id: PERF-452
slug: cdp-time-driver
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-452: Enable CdpTimeDriver for DOM Mode

## Focus Area
Browser Worker Concurrency and `TimeDriver` Selection in `BrowserPool.ts`.

## Background Research
Currently, `BrowserPool.ts` uses `SeekTimeDriver` for DOM rendering. `SeekTimeDriver` manually traverses and updates all WAAPI animations, CSS animations, and GSAP timelines via JavaScript evaluation (`window.__helios_seek`) on every single frame. This incurs massive serialization and JavaScript execution overhead inside the hot loop.

Chromium's native `Emulation.setVirtualTimePolicy` (which is already implemented and utilized by `CdpTimeDriver` for Canvas mode) natively pauses and advances the document timeline deterministically. This executes all CSS and WAAPI animations natively in C++ without the massive JS traversal overhead. Preliminary scratchpad benchmarks show that bypassing `SeekTimeDriver` in favor of `CdpTimeDriver` for DOM mode drops the render time for a 90-frame composition from ~31.1 seconds down to **~1.296 seconds** (a ~2400% speedup) on the testing microVM.

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
**Why**: This forces DOM mode to use Chromium's native `Emulation.setVirtualTimePolicy` to advance animations deterministically instead of manual JS traversal.
**Risk**: Complex JS-driven animation libraries like GSAP may not sync perfectly with native virtual time.

### Step 2: Update Tests
**File**: `packages/renderer/tests/verify-waapi-sync.ts`
**What to change**:
Change `SeekTimeDriver` references and imports to `CdpTimeDriver`.
**Why**: Ensures testing framework accurately checks the correct driver in use for `dom` mode rendering.

## Variations

### Variation A: Deprecate GSAP Support for 24x Speedup
If GSAP or `requestAnimationFrame` hooks fail to synchronize correctly with `CdpTimeDriver`, document the failure but propose a vision update in `README.md` and `AGENTS.md` explicitly stating that Helios prioritizes native CSS/WAAPI animations over JS-driven animations due to the overwhelming performance disparity.

## Canvas Smoke Test
Run `npm run build:examples && cd packages/renderer && npx tsx scripts/benchmark-concurrent.ts` (or equivalent canvas tests) to verify Canvas mode is unaffected, since it already uses `CdpTimeDriver`.

## Correctness Check
Render `output/example-build/examples/dom-benchmark/composition.html` and visually inspect the output MP4. Ensure the CSS/WAAPI animations progress smoothly without stuttering or skipping.

## Prior Art
- `PERF-450` (Original attempt)
