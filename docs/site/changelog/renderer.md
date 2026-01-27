---
title: "Renderer Changelog"
description: "Changelog for the Renderer package"
---

# Renderer Changelog

## v1.22.0
- **Implicit Audio Discovery**: Updated `DomStrategy` to automatically detect `<audio>` and `<video>` elements in the DOM and include their audio tracks in the FFmpeg render.

## v1.21.0
- **Configurable Audio Codecs**: Added `audioCodec` and `audioBitrate` to `RendererOptions` and updated `FFmpegBuilder` to support smart defaults and custom configurations.

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
