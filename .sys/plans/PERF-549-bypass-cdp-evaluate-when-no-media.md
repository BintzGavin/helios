---
id: PERF-549
slug: bypass-cdp-evaluate-when-no-media
status: unclaimed
claimed_by: ""
created: 2024-05-20
completed: ""
result: ""
---

# PERF-549: Bypass CDP Evaluate on No Media

## Focus Area
CdpTimeDriver (`runSetTime` hot loop).

## Background Research
Currently, in `packages/renderer/src/drivers/CdpTimeDriver.ts`, there is an optimization introduced in `PERF-449` to skip media synchronization if no media elements exist on the page. During initialization (`prepare`), the driver checks for media using `document.querySelectorAll('video, audio').length > 0` via `Runtime.evaluate`, and falls back to `this.syncMediaState = 1` if it fails. It also runs a loop checking `await frame.evaluate(() => { if (typeof window.__helios_sync_media === 'function') return window.__helios_sync_media(0); return 0; })` to populate `this.hasMedia`, wrapping it in a try-catch that assumes `this.hasMedia = true` upon failure.
Because Playwright's initialization logic is prone to throwing timing exceptions (especially when evaluating injected scripts quickly across multiple iframes), this try-catch block frequently defaults to true. This breaks the bypass and causes the renderer to send `Runtime.evaluate` IPC calls for media syncing on every single frame, even when absolutely no media exists in the composition.
If we replace the brittle `frame.evaluate` and `Runtime.evaluate` checks with a single, robust mechanism (or ensure the fallback correctly identifies failure rather than defaulting to true), we can definitively bypass the media sync CDP call in the hot loop when no media is present, achieving the intended performance gains.

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition
- **Render Settings**: 1080p, 60fps, 10 seconds (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: Unnecessary CDP IPC payloads (`Runtime.evaluate`) inside `runSetTime()` for media sync even when no media elements are on the page.

## Implementation Spec

### Step 1: Trust the evaluated count for `hasMedia` in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Update the `prepare` function where `this.hasMedia` and `this.syncMediaState` are determined. Remove the try-catch blocks that pessimistically set `this.hasMedia = true` and `this.syncMediaState = 1` on exception. Instead, only set them to true if the evaluation explicitly succeeds and returns a positive count or `true`. If the evaluation fails, default to `false` (or `2` for `syncMediaState`).

**Why**: By correctly identifying that no media exists on the page and removing the pessimistic fallback, we can accurately bypass the `defaultSyncMedia` call in the hot loop, reducing CDP overhead.
**Risk**: Minimal. Helios compositions are static upon load. If the DOM does not have media during initialization, it is extremely unlikely to dynamically insert it during the timeline rendering phase in a way that requires CDP syncing.

## Canvas Smoke Test
Run the full test suite (`npm run test -w packages/renderer -- --run`) to ensure the canvas strategies still launch and evaluate correctly.

## Correctness Check
Run the full test suite (`npm run test -w packages/renderer -- --run`) to verify DOM output correctly resolves without regressions.
