---
id: PERF-061
slug: force-cpu-rasterization-dom
status: complete
claimed_by: "executor-session"
created: 2024-03-24
completed: "2026-03-25"
result: "discarded"
---

# PERF-061: Force CPU Rasterization for DOM Mode

## Focus Area
Browser Launch and Frame Rendering Pipeline in `packages/renderer/src/Renderer.ts`. Targeting the underlying rendering engine (Skia vs SwiftShader) to reduce CPU overhead during DOM composition and rasterization.

## Background Research
The `packages/renderer` domain operates within a CPU-only Jules microVM without GPU acceleration.
Currently, `Renderer.ts` hardcodes \`DEFAULT_BROWSER_ARGS\`, but only conditionally applies \`GPU_DISABLED_ARGS\` if \`options.browserConfig.gpu === false\`.
In a CPU-only environment, if we don't explicitly disable the GPU process (\`--disable-gpu\`, \`--disable-software-rasterizer\`), Chromium defaults to SwiftShader (a CPU-bound OpenGL implementation) for compositing and rasterization.
For 2D DOM (HTML/CSS), Chromium's native Skia engine translates 2D draw calls into OpenGL commands, which SwiftShader then rasterizes back into CPU pixels. This pipeline (\`Skia -> OpenGL -> SwiftShader -> CPU Pixels\`) introduces massive translation overhead.
If we explicitly apply \`GPU_DISABLED_ARGS\` (which includes \`--disable-gpu\`, \`--disable-software-rasterizer\`, \`--disable-gpu-compositing\`), Chromium will use Skia's native software rasterizer directly. Skia's native CPU rasterizer is heavily optimized and directly writes to the CPU framebuffer, bypassing the OpenGL state machine entirely. This should drastically reduce the CPU cost of rasterizing each frame before capture.

## Benchmark Configuration
- **Composition URL**: A standard DOM benchmark composition (e.g. \`packages/renderer/tests/verify-dom-selector.ts\` or `packages/renderer/tests/fixtures/dom-selector.html`).
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds duration, \`libx264\` codec
- **Mode**: \`dom\`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.221s
- **Bottleneck analysis**: The microVM CPU is heavily saturated during DOM composition and CDP screenshot frame capture loop.

## Implementation Spec

### Step 1: Force GPU_DISABLED_ARGS for DOM Mode
**File**: \`packages/renderer/src/Renderer.ts\`
**What to change**:
In \`Renderer.ts\`, modify the \`getLaunchOptions()\` method to dynamically force \`GPU_DISABLED_ARGS\` if \`this.options.mode === 'dom'\`.
Currently it looks like:
\`\`\`typescript
const gpuArgs = config.gpu === false ? GPU_DISABLED_ARGS : [];
\`\`\`
Change it to:
\`\`\`typescript
const gpuArgs = (config.gpu === false || this.options.mode === 'dom') ? GPU_DISABLED_ARGS : [];
\`\`\`
**Why**: By explicitly telling Chromium it has no GPU and should not try to emulate one for compositing or rasterization in DOM mode, it falls back to the highly optimized native Skia CPU pathways.
**Risk**: WebGL contexts embedded inside the DOM mode will fail to render because we are disabling the SwiftShader 3D fallback. This is an acceptable tradeoff since users needing WebGL should use \`mode: 'canvas'\`.

### Step 2: Verify the change locally
Run the following targeted verification scripts to establish the new baseline and ensure no regressions occur:
- \`npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts\`
- \`npx tsx packages/renderer/tests/verify-dom-selector.ts\`

## Variations
### Variation A: Add --disable-dev-shm-usage
If pure CPU Skia still hits IPC limits, adding \`--disable-dev-shm-usage\` to \`GPU_DISABLED_ARGS\` can prevent Chromium from hanging on shared memory limits within Docker/microVMs by forcing it to write to \`/tmp\`.

## Canvas Smoke Test
Run \`npx tsx packages/renderer/tests/verify-canvas-strategy.ts\` to ensure canvas mode is unharmed (since \`this.options.mode !== 'dom'\`, it should not inherit the disabled args unless explicitly set).

## Correctness Check
Run the DOM selector verification script:
\`npx tsx packages/renderer/tests/verify-dom-selector.ts\`
All tests should pass without hanging and CSS rendering should remain intact.

## Prior Art
- PERF-006 previously identified this approach but the exact \`GPU_DISABLED_ARGS\` logic was never strictly enforced for all DOM renders by default.

## Results Summary
- **Best render time**: 41.765s (vs baseline 41.770s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Force GPU_DISABLED_ARGS for DOM mode, Add --disable-dev-shm-usage]
