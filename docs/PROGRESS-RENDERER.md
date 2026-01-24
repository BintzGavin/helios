# RENDERER Progress Log

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
