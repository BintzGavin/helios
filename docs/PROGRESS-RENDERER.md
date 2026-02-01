## RENDERER v1.53.0
- ✅ Completed: Enhance Diagnostics - Updated `CanvasStrategy.diagnose()` to perform comprehensive checks of supported WebCodecs (H.264, VP8, VP9, AV1) in the browser environment, returning a detailed `codecs` report for better debuggability.

## RENDERER v1.52.1
- ✅ Completed: Fix GSAP Timeline Synchronization - Updated `SeekTimeDriver` to wait for `window.__helios_gsap_timeline__` initialization (handling ES module async loading) and explicitly seek the GSAP timeline in `setTime`, resolving the black screen issue in the promo video example.

## RENDERER v1.52.0
- ✅ Completed: Enable Audio Looping - Updated `DomScanner` and `FFmpegBuilder` to support the `loop` attribute on `<audio>` and `<video>` elements by injecting `-stream_loop -1` into FFmpeg input args.

## RENDERER v1.51.0
- ✅ Completed: Enable Recursive Shadow DOM Image Preloading - Updated `DomStrategy` to recursively discover and preload `<img>` tags within Shadow DOMs using `TreeWalker`, ensuring images in Web Components are fully loaded before rendering.

## RENDERER v1.50.0
- ✅ Completed: Enable Blob Audio - Implemented `blob-extractor` to bridge browser `blob:` URLs to FFmpeg by extracting content to temporary files, enabling support for dynamic client-side audio (e.g., text-to-speech).

## RENDERER v1.49.0
- ✅ Completed: Precision Frame Control - Added `frameCount` to `RendererOptions`, enabling exact frame-count rendering for distributed rendering workflows, overriding floating-point duration calculations.

## RENDERER v1.48.2
- ✅ Completed: CdpTimeDriver Timeout - Implemented configurable stability timeout in `CdpTimeDriver` using Node.js-based race condition and CDP `Runtime.terminateExecution` to handle hanging user checks when virtual time is paused.

## RENDERER v1.48.1
- ✅ Completed: Enable Comprehensive Verification Suite - Updated `run-all.ts` to include 8 previously ignored verification scripts (CDP determinism, Shadow DOM sync, WAAPI sync), ensuring full test coverage. Also fixed `verify-canvas-strategy.ts` to align with the H.264 default.

## RENDERER v1.48.0
- ✅ Completed: Prioritize H.264 - Updated `CanvasStrategy` to prioritize H.264 (AVC) intermediate codec over VP8 by default, enabling hardware acceleration and better performance on supported systems.

## RENDERER v1.47.4
- ✅ Completed: Validate Codec Compatibility - Updated `DomStrategy` and `CanvasStrategy` to throw clear errors when `videoCodec: 'copy'` is used with image sequence fallback, preventing FFmpeg crashes. Also fixed regression tests to provide valid options to `DomStrategy`.

## RENDERER v1.47.3
- ✅ Completed: Shadow DOM Background Preload - Verified and enhanced `DomStrategy` to recursively find and preload CSS background images inside nested Shadow DOMs, ensuring zero-artifact rendering for Web Components.

## RENDERER v1.47.2
- ✅ Completed: CdpTimeDriver Budget - Updated `CdpTimeDriver` to wait for `virtualTimeBudgetExpired` event, ensuring the browser fully processes the time budget before capturing the frame.

## RENDERER v1.47.1
- ✅ Completed: CdpTimeDriver Media Sync Timing - Updated `CdpTimeDriver` to synchronize media elements before advancing virtual time, ensuring correct frame capture.

## RENDERER v1.47.0
- ✅ Completed: SeekTimeDriver Determinism - Updated `SeekTimeDriver` to enforce deterministic `Date.now()` by setting a fixed epoch (Jan 1, 2024), aligning DOM-based rendering determinism with Canvas-based rendering.

## RENDERER v1.46.0
- ✅ Completed: CdpTimeDriver Determinism - Updated `CdpTimeDriver` to enforce deterministic `Date.now()` by setting `initialVirtualTime` to Jan 1, 2024 (UTC), ensuring frame consistency across runs.

## RENDERER v1.45.0
- ✅ Completed: CdpTimeDriver Shadow DOM Sync - Updated `CdpTimeDriver` to recursively traverse Shadow DOMs using `TreeWalker` to find and synchronize `<video>` and `<audio>` elements, ensuring media sync in Canvas mode.

## RENDERER v1.44.0
- ✅ Completed: Recursive Animation Discovery - Updated `SeekTimeDriver` to recursively traverse Shadow DOMs using `TreeWalker` to find and synchronize CSS animations and WAAPI animations.

## RENDERER v1.43.1
- ✅ Verified: Full Test Coverage - Executed full verification suite including FFmpeg diagnostics and CdpTimeDriver media sync, confirming all systems operational.

## RENDERER v1.43.0
- ✅ Completed: Enable Shadow DOM Media Sync - Updated `SeekTimeDriver` to recursively traverse Shadow DOMs using `TreeWalker` to find and synchronize `<video>` and `<audio>` elements.

## RENDERER v1.42.0
- ✅ Completed: Enable Browser Launch Configuration - Added `browserConfig` to `RendererOptions` to allow customizing Playwright launch arguments.

## RENDERER v1.41.0
- ✅ Completed: Support Shadow DOM Audio Discovery - Updated `scanForAudioTracks` utility to recursively traverse Shadow DOM for media elements using `TreeWalker`.

## RENDERER v1.40.1
- ✅ Completed: Enable Full Verification Coverage - Updated `run-all.ts` to include 6 additional verification scripts, and fixed `verify-dom-media-preload.ts` and `verify-dom-preload.ts` to be robust and self-contained.

## RENDERER v1.40.0
- ✅ Completed: Implement WAAPI Sync - Updated `SeekTimeDriver` to manually iterate over `document.getAnimations()` and set `currentTime`, ensuring correct synchronization of CSS animations and transitions for DOM-based rendering.

## RENDERER v1.39.0
- ✅ Completed: CdpTimeDriver Media Sync - Implemented manual synchronization for `<video>` and `<audio>` elements in `CdpTimeDriver` to respect `data-helios-offset` and `data-helios-seek`, enabling correct playback in Canvas renders.
