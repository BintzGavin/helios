---
id: PERF-006
slug: optimize-chromium-args
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-006: Optimize Chromium Launch Arguments for CPU-only MicroVM

## Context & Goal
Browser Launch and Frame Rendering Pipeline (Phase 1 & 4). Targeting the underlying rendering engine (Skia vs SwiftShader) to reduce CPU overhead during DOM composition and rasterization.

## File Inventory
- `packages/renderer/src/Renderer.ts`

## Background Research
The `packages/renderer` domain operates within a CPU-only Jules microVM without GPU acceleration.
Currently, `Renderer.ts` hardcodes the following default launch arguments:
```typescript
const DEFAULT_BROWSER_ARGS = [
  '--use-gl=egl',
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
  // ...
];
```
In a CPU-only environment, forcing GPU rasterization (`--enable-gpu-rasterization`) and EGL (`--use-gl=egl`) forces Chromium to use SwiftShader (a CPU-bound OpenGL implementation).
For 2D DOM (HTML/CSS), Chromium's native Skia engine translates 2D draw calls into OpenGL commands, which SwiftShader then rasterizes back into CPU pixels. This pipeline (`Skia -> OpenGL -> SwiftShader -> CPU Pixels`) introduces massive translation overhead.
If we remove these flags and explicitly disable the GPU process (`--disable-gpu`, `--disable-software-rasterizer`), Chromium will use Skia's native software rasterizer directly. Skia's native CPU rasterizer is heavily optimized with SIMD instructions and multithreading, and it directly writes to the CPU framebuffer, bypassing the OpenGL state machine entirely. This drastically reduces the CPU cost of rasterizing each frame before capture.

## Benchmark Configuration
- **Composition URL**: A standard DOM benchmark composition heavily utilizing CSS transforms, flexbox, and text rendering.
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds duration, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The microVM CPU is heavily saturated during `page.screenshot()`. Profiling Chromium in a microVM typically reveals that a large percentage of CPU time is spent inside SwiftShader (`libGLESv2.so` / `libswiftshader_libGLESv2.so`) rather than actual layout or PNG encoding.

## Implementation Spec

### Step 1: Refactor DEFAULT_BROWSER_ARGS
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Remove the following flags from `DEFAULT_BROWSER_ARGS`:
- `--use-gl=egl`
- `--ignore-gpu-blocklist`
- `--enable-gpu-rasterization`
- `--enable-zero-copy`

Add the following flags to optimize for the CPU-only environment:
- `--disable-gpu` (Disables the GPU hardware acceleration)
- `--disable-software-rasterizer` (Disables the 3D software rasterizer / SwiftShader fallback for WebGL, ensuring pure 2D Skia is used for DOM)
- `--disable-gpu-compositing` (Forces CPU compositing, preventing the browser from trying to composite layers using GL)

**Why**: By explicitly telling Chromium it has no GPU and should not try to emulate one for compositing or rasterization, it falls back to the highly optimized native Skia CPU pathways.
**Risk**: If a user's DOM composition explicitly relies on WebGL (e.g., a Three.js canvas embedded in the DOM), it will fail to render because we are disabling the SwiftShader 3D fallback. We must evaluate if this is an acceptable tradeoff for `mode: 'dom'`, given `mode: 'canvas'` exists for WebGL use cases.

## Variations
### Variation A: Keep SwiftShader for WebGL Compatibility
If breaking WebGL in `mode: 'dom'` is unacceptable, keep `--use-gl=swiftshader` (instead of `egl`) but still include `--disable-gpu-compositing` and `--disable-gpu-rasterization`. This tells Chromium to use the CPU for 2D DOM rasterization and compositing, but keeps SwiftShader alive purely for WebGL contexts.

## Test Plan
Run a standard Canvas smoke test using `mode: 'canvas'`. Because `mode: 'canvas'` might rely on WebGL depending on the user's animation code, disabling SwiftShader completely might break the Canvas path. If `diagnose()` reports `webgl: false` and breaks canvas tests, implement Variation A or conditionally apply these flags based on `this.options.mode`.
1. Ensure CSS transforms, opacity changes, and complex stacking contexts still render correctly (sometimes CPU compositing has different bug profiles than GPU compositing).
2. Ensure PNG/JPEG screenshots still capture the viewport correctly without black screens or corrupted buffers.

## Correctness Check
1. Ensure CSS transforms, opacity changes, and complex stacking contexts still render correctly (sometimes CPU compositing has different bug profiles than GPU compositing).
2. Ensure PNG/JPEG screenshots still capture the viewport correctly without black screens or corrupted buffers.

## Prior Art
- Puppeteer / Playwright performance guides for Docker/CI environments (which are typically CPU-only) strongly recommend `--disable-gpu` and `--disable-dev-shm-usage` to avoid SwiftShader overhead for standard web scraping and PDF/Screenshot generation.
