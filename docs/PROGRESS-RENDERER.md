# RENDERER Progress Log

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
