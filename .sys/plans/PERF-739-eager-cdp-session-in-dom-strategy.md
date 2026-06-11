---
id: PERF-739
slug: eager-cdp-session-in-dom-strategy
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-739: Eager CDP Session Initialization in DomStrategy

## Focus Area
The `prepare()` method in `DomStrategy.ts` which sets up the rendering pipeline for the DOM strategy.

## Background Research
Currently, in `DomStrategy.prepare()`, `this.cdpSession` is set up *after* several asynchronous operations (such as `page.frames().forEach(evaluate)`, `scanForAudioTracks`, and `extractBlobTracks`). This causes the underlying Playwright `page` to handle complex evaluations and track extractions *before* enabling `HeadlessExperimental.enable` and optimizing the page background via CDP.
We can eagerly initialize `this.cdpSession` at the very beginning of `prepare()`. This ensures that shared session state and experimental domains are enabled earlier in the lifecycle, potentially streamlining the subsequent DOM operations by removing late-stage CDP binding overhead.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.48s
- **Bottleneck analysis**: The setup phase (startup overhead) could be marginally improved or structured to allow better CDP locality for page interactions.

## Implementation Spec

### Step 1: Move CDP Session Initialization
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Move the block that assigns `this.cdpSession` (and enables `HeadlessExperimental`) to the very top of the `prepare()` method, before evaluating `PRELOAD_SCRIPT` and scanning for audio tracks.
2. The block to move:
   ```typescript
   if ((page as any)._sharedCdpSession) {
     this.cdpSession = (page as any)._sharedCdpSession;
   } else {
     this.cdpSession = await page.context().newCDPSession(page);
     (page as any)._sharedCdpSession = this.cdpSession;
   }
   await this.cdpSession!.send('HeadlessExperimental.enable');
   ```
**Why**: Eagerly setting up CDP avoids context-switching mid-setup and ensures CDP is ready globally as early as possible.
**Risk**: Very low, just reordering setup steps.

## Correctness Check
Run the canvas and dom smoke tests to ensure startup still works correctly.
