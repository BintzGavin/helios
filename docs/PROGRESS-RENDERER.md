# RENDERER Progress Log

## RENDERER v1.15.0
- ✅ Completed: Expose Diagnostics - Updated `RenderStrategy.diagnose` to return a diagnostic report instead of logging it, and exposed `renderer.diagnose()` to programmatically verify environment capabilities (WebCodecs, WAAPI).

## RENDERER v1.14.0
- ✅ Completed: Input Props Injection - Added `inputProps` to `RendererOptions` and implemented injection via `page.addInitScript`, enabling parameterized rendering (e.g. dynamic text/colors) by setting `window.__HELIOS_PROPS__`.

## RENDERER v1.13.0
- ⚠️ Blocked: Enable CdpTimeDriver for DOM - Investigated switching `DomStrategy` to `CdpTimeDriver`. Determined that `page.screenshot` hangs when `Emulation.setVirtualTimePolicy` is active (paused), and CDP `Page.captureScreenshot` also hangs/timeouts. Reverted to `SeekTimeDriver` for DOM mode.

## RENDERER v1.12.0
- ✅ Completed: Configurable WebCodecs - Added `intermediateVideoCodec` to `RendererOptions` and updated `CanvasStrategy` to support VP9 and AV1 for intermediate capture, enabling higher quality or better compression.

## RENDERER v1.11.0
- ✅ Completed: Implement Media Preloading - Updated `DomStrategy` to detect and preload `<video>` and `<audio>` elements, ensuring they are buffered (`HAVE_ENOUGH_DATA`) before rendering starts.

## RENDERER v1.10.0
- ✅ Completed: Implement Background Image Preloading - Updated `DomStrategy` to detect and preload CSS background images, ensuring they are loaded before rendering starts.

## RENDERER v1.9.0
- ✅ Completed: Integrate Diagnostics - Added `diagnose(page)` to `RenderStrategy` interface and implemented environment checks (VideoEncoder, WAAPI) in strategies to improve observability.

## RENDERER v1.8.0
- ✅ Completed: Configurable WebCodecs Bitrate - Updated `CanvasStrategy` to respect `videoBitrate` in `RendererOptions`, enabling high-quality intermediate capture (defaulting to 25 Mbps floor).

## RENDERER v1.7.0
- ✅ Completed: Implement Video Concatenation - Added `concatenateVideos` utility using FFmpeg concat demuxer to support distributed rendering workflows.

## RENDERER v1.6.0
- ✅ Completed: Configurable Codecs - Added `videoCodec`, `pixelFormat`, `crf`, `preset`, and `videoBitrate` options to `RendererOptions` and updated strategies to use them.

## RENDERER v1.5.2
- ✅ Completed: Fix Audio Duration Logic - Replaced `-shortest` with `-t duration` to prevent video truncation when audio is short.

## RENDERER v1.5.1
- ✅ Completed: Strict Error Propagation - Implemented "Fail Fast" mechanism to catch page errors, crashes, and WebCodecs failures immediately, and ensure proper FFmpeg process cleanup.

## RENDERER v1.5.0
- ✅ Completed: Implement Range Rendering - Added `startFrame` to `RendererOptions`, enabling rendering of partial animation ranges (distributed rendering support).

## RENDERER v1.4.1
- ✅ Completed: Fix DOM Time Driver - Implemented conditional usage of `SeekTimeDriver` for `dom` mode rendering, resolving compatibility issues with `CdpTimeDriver` and `page.screenshot`.

## RENDERER v1.4.0
- ✅ Completed: Basic Audio Support - Added `audioFilePath` to `RendererOptions` and updated strategies to include audio in the FFmpeg output mix.

## RENDERER v1.3.0
- ✅ Completed: Implement CdpTimeDriver - Implemented `CdpTimeDriver` using Chrome DevTools Protocol to virtually advance time, ensuring deterministic rendering for complex animations.

## RENDERER v1.2.0
- ✅ Completed: Enable Playwright Trace Viewer - Added `tracePath` option to `RenderJobOptions`, enabling generation of Playwright trace files for debugging rendering sessions.

## RENDERER v1.1.1
- ✅ Completed: Refactor TimeDriver - Decoupled time advancement logic from RenderStrategy into a dedicated TimeDriver interface, preparing for CDP integration.

## RENDERER v1.1.0
- ✅ Completed: Implement Progress and Cancellation - Added `RenderJobOptions` with `onProgress` callback and `AbortSignal` support to `Renderer.render`.

## RENDERER v1.0.2
- ✅ Completed: Fix DomStrategy Preloading Implementation - Added missing build config and render script, enabling proper verification of the preloading strategy.

## RENDERER v1.0.1
- ✅ Completed: Implement DomStrategy Preloading - Implemented `DomStrategy.prepare()` to wait for fonts and images to load before rendering, preventing visual artifacts.

## [2026-02-18] RENDERER
- ✅ Completed: Refactor FFmpeg Config - Fully decoupled FFmpeg argument generation by moving it to `RenderStrategy.getFFmpegArgs` and extracted `RendererOptions` to `types.ts`.

## [2026-01-15] RENDERER
- Updated `Renderer` to support local file access (`--disable-web-security`) and use built examples.
