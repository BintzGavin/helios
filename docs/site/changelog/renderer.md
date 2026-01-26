---
title: "Renderer Changelog"
description: "Changelog for the Renderer package"
---

# Renderer Changelog

## v1.13.0
- **Blocked: Enable CdpTimeDriver for DOM**: Investigated switching `DomStrategy` to `CdpTimeDriver`. Determined that `page.screenshot` hangs when `Emulation.setVirtualTimePolicy` is active (paused), and CDP `Page.captureScreenshot` also hangs/timeouts. Reverted to `SeekTimeDriver` for DOM mode.

## v1.12.0
- **Configurable WebCodecs**: Added `intermediateVideoCodec` to `RendererOptions` and updated `CanvasStrategy` to support VP9 and AV1 for intermediate capture, enabling higher quality or better compression.

## v1.11.0
- **Implement Media Preloading**: Updated `DomStrategy` to detect and preload `<video>` and `<audio>` elements, ensuring they are buffered (`HAVE_ENOUGH_DATA`) before rendering starts.

## v1.10.0
- **Implement Background Image Preloading**: Updated `DomStrategy` to detect and preload CSS background images, ensuring they are loaded before rendering starts.

## v1.9.0
- **Integrate Diagnostics**: Added `diagnose(page)` to `RenderStrategy` interface and implemented environment checks (VideoEncoder, WAAPI) in strategies to improve observability.

## v1.8.0
- **Configurable WebCodecs Bitrate**: Updated `CanvasStrategy` to respect `videoBitrate` in `RendererOptions`, enabling high-quality intermediate capture (defaulting to 25 Mbps floor).

## v1.7.0
- **Implement Video Concatenation**: Added `concatenateVideos` utility using FFmpeg concat demuxer to support distributed rendering workflows.

## v1.6.0
- **Configurable Codecs**: Added `videoCodec`, `pixelFormat`, `crf`, `preset`, and `videoBitrate` options to `RendererOptions` and updated strategies to use them.

## v1.5.2
- **Fix Audio Duration Logic**: Replaced `-shortest` with `-t duration` to prevent video truncation when audio is short.

## v1.5.1
- **Strict Error Propagation**: Implemented "Fail Fast" mechanism to catch page errors, crashes, and WebCodecs failures immediately, and ensure proper FFmpeg process cleanup.

## v1.5.0
- **Implement Range Rendering**: Added `startFrame` to `RendererOptions`, enabling rendering of partial animation ranges (distributed rendering support).

## v1.4.1
- **Fix DOM Time Driver**: Implemented conditional usage of `SeekTimeDriver` for `dom` mode rendering, resolving compatibility issues with `CdpTimeDriver` and `page.screenshot`.

## v1.4.0
- **Basic Audio Support**: Added `audioFilePath` to `RendererOptions` and updated strategies to include audio in the FFmpeg output mix.

## v1.3.0
- **Implement CdpTimeDriver**: Implemented `CdpTimeDriver` using Chrome DevTools Protocol to virtually advance time, ensuring deterministic rendering for complex animations.

## v1.2.0
- **Enable Playwright Trace Viewer**: Added `tracePath` option to `RenderJobOptions`, enabling generation of Playwright trace files for debugging rendering sessions.

## v1.1.1
- **Refactor TimeDriver**: Decoupled time advancement logic from RenderStrategy into a dedicated TimeDriver interface, preparing for CDP integration.

## v1.1.0
- **Implement Progress and Cancellation**: Added `RenderJobOptions` with `onProgress` callback and `AbortSignal` support to `Renderer.render`.

## v1.0.2
- **Fix DomStrategy Preloading Implementation**: Added missing build config and render script, enabling proper verification of the preloading strategy.

## v1.0.1
- **Implement DomStrategy Preloading**: Implemented `DomStrategy.prepare()` to wait for fonts and images to load before rendering, preventing visual artifacts.
