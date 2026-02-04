## RENDERER v1.67.1
- ✅ Completed: Robust Distributed Audio Pipeline - Updated `Orchestrator` to use `.mov` containers with `pcm_s16le` audio for intermediate chunks, preventing concatenation artifacts (clicks) at chunk boundaries.

## RENDERER v1.67.0
- ✅ Completed: Smart Codec Selection Update - Updated `CanvasStrategy` to prioritize H.264 -> VP9 -> AV1 -> VP8, enabling hardware-accelerated transparency and better quality. Verified with `verify-smart-codec-priority.ts`.

## RENDERER v1.66.0
- ✅ Completed: CdpTimeDriver Iframe Sync - Updated `CdpTimeDriver` to synchronize media elements across all frames (including iframes) by iterating `page.frames()` and executing sync logic in each context. Verified with `verify-cdp-iframe-media-sync.ts`.

## RENDERER v1.65.0
- ✅ Completed: Smart Audio Fades - Updated `AudioTrackConfig` and `FFmpegBuilder` to calculate fade-out times relative to the clip's duration (if known and not looping) rather than the composition duration. Verified with `verify-smart-audio-fades.ts`.

## RENDERER v1.64.1
- ✅ Completed: Verify and Sync - Verified v1.64.0 distributed rendering and synced documentation. Verified with `verify-distributed.ts` and `npm run test`.

## RENDERER v1.64.0
- ✅ Completed: Distributed Audio Mixing - Updated `RenderOrchestrator` to decouple audio mixing from distributed video rendering chunks. Chunks are now rendered silently and concatenated, with audio mixed in a final pass to prevent glitches. Verified with `verify-distributed.ts`.

## RENDERER v1.63.1
- ✅ Completed: Update Verification Suite - Added orphaned verification scripts (`verify-canvas-shadow-dom.ts` and `verify-pseudo-element-preload.ts`) to the main test runner `run-all.ts` and fixed type errors in `verify-advanced-audio.ts` and `verify-audio-args.ts` caused by `getFFmpegArgs` return type change.

## RENDERER v1.63.0
- ✅ Completed: Canvas Implicit Audio - Verified and finalized the implementation of implicit audio discovery in `CanvasStrategy`. Updated `dom-scanner` and `blob-extractor` to robustly handle `blob:` URLs (gracefully ignoring failed extractions to prevent FFmpeg crashes) and fixed the `verify-canvas-implicit-audio` test suite.

## RENDERER v1.62.1
- ✅ Completed: Fix Pseudo-Element Preloading - Updated `DomStrategy` to correctly iterate over `::before` and `::after` pseudo-elements when discovering background images, fixing a regression where these assets were missed. Verified with `verify-pseudo-element-preload.ts`.

## RENDERER v1.62.0
- ✅ Completed: Pseudo-Element Preload - Updated `DomStrategy` to recursively discover and preload background images and masks in `::before` and `::after` pseudo-elements, ensuring zero-artifact rendering for CSS-heavy compositions. Verified with `verify-pseudo-element-preload.ts`.

## RENDERER v1.61.2
- ✅ Completed: Update Verification Suite - Updated `run-all.ts` to include 3 orphaned verification scripts (`verify-audio-playback-rate.ts`, `verify-audio-playback-seek.ts`, `verify-visual-playback-rate.ts`), ensuring continuous regression testing for playback rate features.

## RENDERER v1.61.1
- ✅ Completed: Fix Audio Playback Seek - Updated `FFmpegBuilder` to correctly calculate the audio input seek time (`-ss`) when using `playbackRate` and a `startFrame` > 0. Verified with `verify-audio-playback-seek.ts`.

## RENDERER v1.61.0
- ✅ Completed: Enable Visual Playback Rate - Updated `SeekTimeDriver` and `CdpTimeDriver` to respect the `playbackRate` property (and attribute) on media elements, ensuring visual synchronization with audio speed changes.

## RENDERER v1.60.2
- ✅ Completed: Fix Verification Suite - Updated `verify-audio-fades.ts` and `verify-audio-loop.ts` to handle the new `FFmpegConfig` return type from `getArgs`, resolving test failures and ensuring the verification suite passes.

## RENDERER v1.60.1
- ✅ Completed: Refactor Concat to Pipe - Refactored `concatenateVideos` to pipe the file list to FFmpeg's stdin (`-i -`), removing temporary file creation and eliminating disk I/O for the concatenation process. Verified with `verify-concat.ts`.

## RENDERER v1.60.0
- ✅ Completed: Enable Audio Playback Rate - Updated `AudioTrackConfig` to include `playbackRate`, and implemented `atempo` filter chaining in `FFmpegBuilder` to support speed adjustments (including values outside 0.5-2.0 range). Also updated `DomScanner` to extract `playbackRate` from media elements.

## RENDERER v1.59.0
- ✅ Completed: Local Distributed Rendering - Implemented `RenderOrchestrator` to split render jobs into concurrent chunks and concatenate them, enabling faster local rendering. Also refactored `Renderer` to its own file to support this architecture.

## RENDERER v1.58.0
- ✅ Completed: Zero Disk Audio - Refactored `blob-extractor.ts` and `FFmpegBuilder.ts` to pipe audio buffers directly to FFmpeg via stdio pipes (`pipe:N`), eliminating temporary file creation for Blob audio tracks and improving security and performance.

## RENDERER v1.57.3
- ✅ Completed: Enable Looping Media Verification - Updated `packages/renderer/package.json` to depend on `@helios-project/core` version `5.1.1` (matching local workspace), allowing `verify-video-loop.ts` to run and confirm correct looping media implementation in `SeekTimeDriver` and `CdpTimeDriver`.

## RENDERER v1.57.2
- ✅ Completed: Sync Core Dependency - Updated `packages/renderer` dependency on `@helios-project/core` to `5.1.0` to match the local workspace, resolving build failures and enabling verification of GSAP timeline synchronization.

## RENDERER v1.57.1
- ✅ Completed: Verify Looping Media - Enabled regression test `verify-video-loop.ts` in `run-all.ts` and updated dependencies to resolve environment issues, confirming correct looping behavior in both SeekTimeDriver and CdpTimeDriver.

## RENDERER v1.57.0
- ✅ Completed: Enable Looping Media - Updated SeekTimeDriver and CdpTimeDriver to implement modulo arithmetic for `currentTime` when the `loop` attribute is present, ensuring correct looping behavior during rendering.

## RENDERER v1.56.5
- ✅ Completed: Update Verification Suite - Updated `verify-ffmpeg-path.ts` to be self-contained and robust, and verified that `verify-cancellation.ts`, `verify-trace.ts`, and `verify-ffmpeg-path.ts` pass and are included in the main test runner.

## RENDERER v1.56.4
- ✅ Completed: Restore Environment - Restored missing node_modules and verified full test suite passes.

## RENDERER v1.56.3
- ✅ Completed: Update Verification Suite - Refactored `verify-cancellation.ts` and `verify-trace.ts` to be self-contained and added them (along with `verify-ffmpeg-path.ts`) to `run-all.ts`, ensuring continuous regression testing for these features.

## RENDERER v1.56.2
- ✅ Completed: Revive Verification Suite - Updated `run-all.ts` to include 5 orphaned verification scripts (`verify-blob-audio`, `verify-dom-audio-fades`, `verify-enhanced-dom-preload`, `verify-frame-count`, `verify-shadow-dom-images`), enabling full verification coverage. Also fixed `tests/verify-bitrate.ts` and updated workspace dependency versions.

## RENDERER v1.56.1
- ✅ Completed: Sync Core Dependency - Updated `packages/renderer/package.json` to depend on `@helios-project/core` version `3.9.2` (matching the workspace), ensuring compatibility. Also fixed `tests/verify-canvas-strategy.ts` to correctly inject a canvas element.

## RENDERER v1.56.0
- ✅ Completed: Fix CDP Hang - Swapped initialization order in `Renderer` to call `strategy.prepare` before `timeDriver.prepare`, ensuring `DomScanner` can discover and load media assets before the CDP `TimeDriver` freezes the virtual clock.

## RENDERER v1.55.0
- ✅ Completed: Enhance Dom Preloading - Updated `DomStrategy` to detect and preload `<video>` posters, SVG `<image>` elements, and CSS masks (`mask-image`), ensuring zero-artifact rendering for these asset types.

## RENDERER v1.54.0
- ✅ Completed: Implement Canvas Selector - Added `canvasSelector` to `RendererOptions` and updated `CanvasStrategy` to target specific canvas elements (e.g., `#my-canvas`), enabling support for multi-canvas compositions and layered architectures.

## RENDERER v1.53.2
- ✅ Completed: Sync Core Dependency - Updated `packages/renderer/package.json` to depend on `@helios-project/core` version `3.6.0` (matching the workspace), fixing dependency resolution issues and ensuring compatibility with the latest core features.

## RENDERER v1.53.1
- ✅ Completed: Fix Workspace Version Mismatch - Updated `packages/renderer/package.json` to depend on `@helios-project/core` version `3.4.0` (matching the workspace), enabling strict version synchronization and preventing lockfile drift.

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
