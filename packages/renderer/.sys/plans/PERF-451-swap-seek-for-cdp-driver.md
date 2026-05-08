---
id: PERF-451
slug: swap-seek-for-cdp-driver
status: unclaimed
claimed_by: ""
created: 2026-05-08
completed: ""
result: ""
---

# PERF-451: Swap SeekTimeDriver for CdpTimeDriver in DOM Mode

## Focus Area
The hot loop during DOM frame capture is currently heavily bottlenecked by Javascript-based DOM traversal and WAAPI pausing via `SeekTimeDriver` and `window.__helios_seek`.

## Background Research
Currently, DOM mode uses `SeekTimeDriver`, which manually traverses the DOM tree to pause/seek animations frame-by-frame. Replacing it with `CdpTimeDriver` allows DOM mode to utilize Chromium's native `Emulation.setVirtualTimePolicy`. This completely eliminates the JS overhead in the hot loop by controlling time at the browser compositor level.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.776s
- **Bottleneck analysis**: IPC overhead and JS execution time in `window.__helios_seek`.

## Implementation Spec

### Step 1: Swap TimeDriver in BrowserPool
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Update the `timeDriver` instantiation to always use `CdpTimeDriver`.
`const timeDriver = new CdpTimeDriver(this.options.stabilityTimeout);`
**Why**: Utilizing native Chromium virtual time eliminates JS execution in the hot loop.
**Risk**: Potential loss of determinism if the CDP virtual time policy does not perfectly sync with all DOM animations.

## Variations
None.

## Canvas Smoke Test
Run `node -e "/* quick canvas render to verify no breakage */"`

## Correctness Check
Run the test suite to ensure DOM animations are still deterministically captured and output matches expected duration/frame count.

## Prior Art
Previous evaluations indicated significant promise with native virtual time policies over manual JS traversal.
