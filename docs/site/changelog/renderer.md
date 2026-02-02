---
title: "Renderer Changelog"
description: "Changelog for the Renderer package"
---

# Renderer Changelog

## v1.57.3
- **Enable Looping Media Verification**: Updated `packages/renderer/package.json` to depend on `@helios-project/core` version `5.1.1` (matching local workspace), allowing `verify-video-loop.ts` to run and confirm correct looping media implementation in `SeekTimeDriver` and `CdpTimeDriver`.

## v1.57.2
- **Sync Core Dependency**: Updated `packages/renderer` dependency on `@helios-project/core` to `5.1.0` to match the local workspace, resolving build failures and enabling verification of GSAP timeline synchronization.

## v1.57.1
- **Verify Looping Media**: Enabled regression test `verify-video-loop.ts` in `run-all.ts` and updated dependencies to resolve environment issues, confirming correct looping behavior in both SeekTimeDriver and CdpTimeDriver.

## v1.57.0
- **Enable Looping Media**: Updated SeekTimeDriver and CdpTimeDriver to implement modulo arithmetic for `currentTime` when the `loop` attribute is present, ensuring correct looping behavior during rendering.

## v1.56.5
- **Update Verification Suite**: Updated `verify-ffmpeg-path.ts` to be self-contained and robust, and verified that `verify-cancellation.ts`, `verify-trace.ts`, and `verify-ffmpeg-path.ts` pass and are included in the main test runner.

## v1.56.4
- **Restore Environment**: Restored missing node_modules and verified full test suite passes.

## v1.56.3
- **Update Verification Suite**: Refactored `verify-cancellation.ts` and `verify-trace.ts` to be self-contained and added them (along with `verify-ffmpeg-path.ts`) to `run-all.ts`, ensuring continuous regression testing for these features.

## v1.56.2
- **Revive Verification Suite**: Updated `run-all.ts` to include 5 orphaned verification scripts (`verify-blob-audio`, `verify-dom-audio-fades`, `verify-enhanced-dom-preload`, `verify-frame-count`, `verify-shadow-dom-images`), enabling full verification coverage. Also fixed `tests/verify-bitrate.ts` and updated workspace dependency versions.

## v1.56.1
- **Sync Core Dependency**: Updated `packages/renderer/package.json` to depend on `@helios-project/core` version `3.9.2` (matching the workspace), ensuring compatibility. Also fixed `tests/verify-canvas-strategy.ts` to correctly inject a canvas element.

## v1.56.0
- **Fix CDP Hang**: Swapped initialization order in `Renderer` to call `strategy.prepare` before `timeDriver.prepare`, ensuring `DomScanner` can discover and load media assets before the CDP `TimeDriver` freezes the virtual clock.

## v1.55.0
- **Enhance Dom Preloading**: Updated `DomStrategy` to detect and preload `<video>` posters, SVG `<image>` elements, and CSS masks (`mask-image`), ensuring zero-artifact rendering for these asset types.

## v1.54.0
- **Implement Canvas Selector**: Added `canvasSelector` to `RendererOptions` and updated `CanvasStrategy` to target specific canvas elements (e.g., `#my-canvas`), enabling support for multi-canvas compositions and layered architectures.

## v1.53.0
- **Enhance Diagnostics**: Updated `CanvasStrategy.diagnose()` to perform comprehensive checks of supported WebCodecs (H.264, VP8, VP9, AV1) in the browser environment, returning a detailed `codecs` report for better debuggability.

## v1.52.1
- **Fix GSAP Timeline Synchronization**: Updated `SeekTimeDriver` to wait for `window.__helios_gsap_timeline__` initialization and explicitly seek the GSAP timeline in `setTime`, resolving the black screen issue in the promo video example.

## v1.52.0
- **Enable Audio Looping**: Updated `DomScanner` and `FFmpegBuilder` to support the `loop` attribute on `<audio>` and `<video>` elements by injecting `-stream_loop -1` into FFmpeg input args.

## v1.51.0
- **Enable Recursive Shadow DOM Image Preloading**: Updated `DomStrategy` to recursively discover and preload `<img>` tags within Shadow DOMs using `TreeWalker`, ensuring images in Web Components are fully loaded before rendering.

## v1.50.0
- **Enable Blob Audio**: Implemented `blob-extractor` to bridge browser `blob:` URLs to FFmpeg by extracting content to temporary files, enabling support for dynamic client-side audio (e.g., text-to-speech).

## v1.49.0
- **Precision Frame Control**: Added `frameCount` to `RendererOptions`, enabling exact frame-count rendering for distributed rendering workflows, overriding floating-point duration calculations.

## v1.48.2
- **CdpTimeDriver Timeout**: Implemented configurable stability timeout in `CdpTimeDriver` using Node.js-based race condition and CDP `Runtime.terminateExecution` to handle hanging user checks when virtual time is paused.

## v1.48.1
- **Enable Comprehensive Verification Suite**: Updated `run-all.ts` to include 8 previously ignored verification scripts (CDP determinism, Shadow DOM sync, WAAPI sync), ensuring full test coverage. Also fixed `verify-canvas-strategy.ts` to align with the H.264 default.

## v1.48.0
- **Prioritize H.264**: Updated `CanvasStrategy` to prioritize H.264 (AVC) intermediate codec over VP8 by default, enabling hardware acceleration and better performance on supported systems.

## v1.47.4
- **Validate Codec Compatibility**: Updated `DomStrategy` and `CanvasStrategy` to throw clear errors when `videoCodec: 'copy'` is used with image sequence fallback, preventing FFmpeg crashes. Also fixed regression tests to provide valid options to `DomStrategy`.

## v1.47.3
- **Shadow DOM Background Preload**: Verified and enhanced `DomStrategy` to recursively find and preload CSS background images inside nested Shadow DOMs, ensuring zero-artifact rendering for Web Components.

## v1.47.2
- **CdpTimeDriver Budget**: Updated `CdpTimeDriver` to wait for `virtualTimeBudgetExpired` event, ensuring the browser fully processes the time budget before capturing the frame.

## v1.47.1
- **CdpTimeDriver Media Sync Timing**: Updated `CdpTimeDriver` to synchronize media elements before advancing virtual time, ensuring correct frame capture.

## v1.47.0
- **SeekTimeDriver Determinism**: Updated `SeekTimeDriver` to enforce deterministic `Date.now()` by setting a fixed epoch (Jan 1, 2024), aligning DOM-based rendering determinism with Canvas-based rendering.

## v1.46.0
- **CdpTimeDriver Determinism**: Updated `CdpTimeDriver` to enforce deterministic `Date.now()` by setting `initialVirtualTime` to Jan 1, 2024 (UTC), ensuring frame consistency across runs.

## v1.45.0
- **CdpTimeDriver Shadow DOM Sync**: Updated `CdpTimeDriver` to recursively traverse Shadow DOMs using `TreeWalker` to find and synchronize `<video>` and `<audio>` elements, ensuring media sync in Canvas mode.

## v1.44.0
- **Recursive Animation Discovery**: Updated `SeekTimeDriver` to recursively traverse Shadow DOMs using `TreeWalker` to find and synchronize CSS animations and WAAPI animations.

## v1.43.1
- **Full Test Coverage**: Executed full verification suite including FFmpeg diagnostics and CdpTimeDriver media sync, confirming all systems operational.

## v1.43.0
- **Enable Shadow DOM Media Sync**: Updated `SeekTimeDriver` to recursively traverse Shadow DOMs using `TreeWalker` to find and synchronize `<video>` and `<audio>` elements.

## v1.42.0
- **Enable Browser Launch Configuration**: Added `browserConfig` to `RendererOptions` to allow customizing Playwright launch arguments.

## v1.41.0
- **Support Shadow DOM Audio Discovery**: Updated `scanForAudioTracks` utility to recursively traverse Shadow DOM for media elements using `TreeWalker`.

## v1.40.1
- **Enable Full Verification Coverage**: Updated `run-all.ts` to include 6 additional verification scripts, and fixed `verify-dom-media-preload.ts` and `verify-dom-preload.ts` to be robust and self-contained.

## v1.40.0
- **Implement WAAPI Sync**: Updated `SeekTimeDriver` to manually iterate over `document.getAnimations()` and set `currentTime`, ensuring correct synchronization of CSS animations and transitions for DOM-based rendering.

## v1.39.0
- **CdpTimeDriver Media Sync**: Implemented manual synchronization for `<video>` and `<audio>` elements in `CdpTimeDriver` to respect `data-helios-offset` and `data-helios-seek`, enabling correct playback in Canvas renders.

## v1.38.1
- **Fix Build and Dependencies**: Updated `@helios-project/core` dependency to `2.7.1` in `packages/renderer`, modernized render script to use `tsx`, and fixed `verify-smart-codec-selection` test mock to support frame scanning.

## v1.38.0
- **Canvas Implicit Audio**: Implemented `scanForAudioTracks` utility and updated `CanvasStrategy` to automatically discover and include DOM-based audio/video elements in the render, unifying behavior with `DomStrategy`.

## v1.37.1
- **Fix Workspace Dependency**: Updated `@helios-project/core` dependency to `2.7.0` in `packages/renderer/package.json` to match local workspace version, restoring verification environment.

## v1.37.0
- **CdpTimeDriver Stability**: Updated `CdpTimeDriver` to detect and await `window.helios.waitUntilStable()`, enabling robust synchronization with custom stability checks for Canvas-based rendering.

## v1.36.0
- **Enable Full Test Coverage**: Updated `run-all.ts` to include all verification scripts, refactored `verify-concat.ts` to be self-contained using Data URIs, and improved `CanvasStrategy` robustness against `esbuild` artifacts by using string-based evaluation.

## v1.35.0
- **Support Helios Stability Registry**: Updated `SeekTimeDriver` to detect and await `window.helios.waitUntilStable()`, enabling robust synchronization with custom stability checks registered in the core engine.

## v1.34.0
- **Seek Driver Offsets**: Updated `SeekTimeDriver` to respect `data-helios-offset` and `data-helios-seek` attributes, calculating correct `currentTime` for visual media synchronization.

## v1.33.0
- **Enable DOM Transparency**: Updated `DomStrategy` to support transparent video export by using `omitBackground: true` in Playwright when `pixelFormat` suggests alpha (e.g. `yuva420p`, `rgba`), allowing creation of transparent overlays and lower-thirds.

## v1.32.0
- **FFmpeg Diagnostics**: Implemented `FFmpegInspector` and updated `Renderer.diagnose()` to return comprehensive diagnostics including FFmpeg version, supported encoders (like `libx264`), and filters, resolving the Vision Gap.

## v1.31.0
- **DomStrategy Media Attributes**: Updated `DomStrategy` to discover and respect `data-helios-offset`, `data-helios-seek`, and the `muted` attribute on `<audio>` and `<video>` elements, enabling precise timing and volume control from the DOM.

## v1.30.0
- **Deep Dom Strategy**: Updated `DomStrategy` to perform asset preloading (fonts, images, media) and audio track discovery across all frames (including iframes), ensuring robust rendering for nested compositions.

## v1.29.0
- **Caption Burning**: Added `subtitles` option to `RendererOptions` and updated `FFmpegBuilder` to burn SRT subtitles into the video, including proper path escaping and filter complex management.

## v1.28.0
- **Multi-Frame Seek**: Updated SeekTimeDriver to synchronize virtual time across all frames (including iframes), enabling deterministic rendering for complex compositions.

## v1.24.0
- **Smart Codec Selection**: Updated `CanvasStrategy` to intelligently select H.264 (Annex B) when `videoCodec: 'copy'` is requested, prioritizing direct stream copy while falling back to VP8 (IVF) if unsupported.

## v1.22.0
- **Implicit Audio Discovery**: Updated `DomStrategy` to automatically detect `<audio>` and `<video>` elements in the DOM and include their audio tracks in the FFmpeg render.

## v1.21.0
- **Configurable Audio Codecs**: Added `audioCodec` and `audioBitrate` to `RendererOptions` and updated `FFmpegBuilder` to support smart defaults and custom configurations.

## v1.20.1
- **Optimize Canvas Quality**: Updated `CanvasStrategy` to auto-calculate intermediate bitrate based on resolution/FPS (e.g. ~100Mbps for 4K) and wait for fonts to load, ensuring high-quality output and no font glitches.

## v1.20.0
- **Enable Stream Copy**: Updated `FFmpegBuilder` to conditionally omit encoding flags when `videoCodec` is `'copy'`, enabling efficient stream passthrough for H.264 WebCodecs.

## v1.19.0
- **H.264 WebCodecs Support**: Updated `CanvasStrategy` to support `avc1` (H.264) intermediate codec by skipping IVF container and using raw Annex B format.

## v1.18.0
- **Audio Mixing**: Added `audioTracks` to `RendererOptions` and implemented `FFmpegBuilder` to support mixing multiple audio tracks using the `amix` filter.

## v1.17.0
- **Enable Transparent Canvas**: Updated `CanvasStrategy` to infer transparency from `pixelFormat` and configure `VideoEncoder` with `alpha: 'keep'`.

## v1.16.0
- **Polyfill SeekTimeDriver**: Injected virtual time polyfill (overriding `performance.now`, `Date.now`, `requestAnimationFrame`) into `SeekTimeDriver` for deterministic rendering in DOM mode.

## v1.15.0
- **Expose Diagnostics**: Updated `RenderStrategy.diagnose` to return a diagnostic report instead of logging it, and exposed `renderer.diagnose()` to programmatically verify environment capabilities.

## v1.14.0
- **Input Props Injection**: Added `inputProps` to `RendererOptions` and implemented injection via `page.addInitScript`, enabling parameterized rendering.

## v1.13.0
- **Blocked: Enable CdpTimeDriver for DOM**: Reverted to `SeekTimeDriver` for DOM mode due to CDP `Page.captureScreenshot` hangs.

## v1.12.0
- **Configurable WebCodecs**: Added `intermediateVideoCodec` to `RendererOptions` and updated `CanvasStrategy` to support VP9 and AV1 for intermediate capture.

## v1.11.0
- **Implement Media Preloading**: Updated `DomStrategy` to detect and preload `<video>` and `<audio>` elements, ensuring they are buffered before rendering starts.

## v1.10.0
- **Implement Background Image Preloading**: Updated `DomStrategy` to detect and preload CSS background images, ensuring they are loaded before rendering starts.

## v1.9.0
- **Integrate Diagnostics**: Added `diagnose(page)` to `RenderStrategy` interface and implemented environment checks (VideoEncoder, WAAPI) in strategies.

## v1.8.0
- **Configurable WebCodecs Bitrate**: Updated `CanvasStrategy` to respect `videoBitrate` in `RendererOptions`, enabling high-quality intermediate capture.

## v1.7.0
- **Implement Video Concatenation**: Added `concatenateVideos` utility using FFmpeg concat demuxer to support distributed rendering workflows.

## v1.6.0
- **Configurable Codecs**: Added `videoCodec`, `pixelFormat`, `crf`, `preset`, and `videoBitrate` options to `RendererOptions` and updated strategies to use them.

## v1.5.2
- **Fix Audio Duration Logic**: Replaced `-shortest` with `-t duration` to prevent video truncation when audio is short.

## v1.5.1
- **Strict Error Propagation**: Implemented "Fail Fast" mechanism to catch page errors, crashes, and WebCodecs failures immediately.

## v1.5.0
- **Implement Range Rendering**: Added `startFrame` to `RendererOptions`, enabling rendering of partial animation ranges.

## v1.4.1
- **Fix DOM Time Driver**: Implemented conditional usage of `SeekTimeDriver` for `dom` mode rendering, resolving compatibility issues with `CdpTimeDriver`.

## v1.4.0
- **Basic Audio Support**: Added `audioFilePath` to `RendererOptions` and updated strategies to include audio in the FFmpeg output mix.

## v1.3.0
- **Implement CdpTimeDriver**: Implemented `CdpTimeDriver` using Chrome DevTools Protocol to virtually advance time, ensuring deterministic rendering.

## v1.2.0
- **Enable Playwright Trace Viewer**: Added `tracePath` option to `RenderJobOptions`, enabling generation of Playwright trace files for debugging rendering sessions.

## v1.1.1
- **Refactor TimeDriver**: Decoupled time advancement logic from RenderStrategy into a dedicated TimeDriver interface.

## v1.1.0
- **Implement Progress and Cancellation**: Added `RenderJobOptions` with `onProgress` callback and `AbortSignal` support to `Renderer.render`.

## v1.0.2
- **Fix DomStrategy Preloading Implementation**: Added missing build config and render script, enabling proper verification of the preloading strategy.

## v1.0.1
- **Implement DomStrategy Preloading**: Implemented `DomStrategy.prepare()` to wait for fonts and images to load before rendering.
