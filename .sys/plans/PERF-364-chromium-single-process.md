---
id: PERF-364
slug: chromium-single-process
status: unclaimed
claimed_by: ""
created: 2026-10-24
completed: ""
result: ""
---

# PERF-364: Eliminate IPC Overhead with Chromium Single Process Mode

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser launch arguments.

## Background Research
The `BrowserPool` currently manages a pool of Playwright workers (tabs) executing against the same underlying composition to parallelize frame generation. These workers all communicate with the headless Chromium browser via the CDP over pipes.
Because we rely on a CPU-bound microVM environment for rendering without a dedicated GPU, Chromium heavily relies on its internal multi-process architecture to composite and serialize pages. While a multi-process architecture protects against crashes and isolates sites, it inherently requires expensive inter-process communication (IPC) for rendering commands, DOM updates, and most importantly, transferring raw captured pixels to the CDP pipe.
By explicitly forcing Chromium to execute entirely within a single OS process using the `--single-process` flag, we theoretically bypass process context switches and IPC overhead entirely for rendering. Playwright has historically warned against this flag for stability reasons in scraping contexts, but since our use case is headless, ephemeral, and single-domain isolated rendering, stability might not be an issue while performance could see a significant boost.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s (PERF-348)
- **Bottleneck analysis**: IPC latency between the Chromium browser process and Chromium renderer process during DOM composition and PNG encoding serialization.

## Implementation Spec

### Step 1: Add `--single-process` to Browser Arguments
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Add `'--single-process'` to the `DEFAULT_BROWSER_ARGS` array.

```typescript
<<<<<<< SEARCH
  '--disable-smooth-scrolling'
];
=======
  '--disable-smooth-scrolling',
  '--single-process'
];
>>>>>>> REPLACE
```

**Why**: By collapsing the Chromium browser process and all tab renderer processes into one single OS process, we eliminate multi-process IPC serialization and context switching for internal compositor and rasterizer operations, which should theoretically speed up CPU-bound software rendering.
**Risk**: Significant risk of Playwright failing to launch or the Chromium process crashing mid-render due to threading issues or unhandled exceptions in the unified process. This is purely experimental. If stability is compromised, the experiment will be discarded.

## Variations
- If `--single-process` causes immediate crashes, check if appending `--in-process-gpu` alongside it mitigates the crash. If it still crashes, discard.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` from the `packages/renderer` directory to ensure Canvas mode still launches and renders frames correctly.

## Correctness Check
Run the targeted DOM capture test: `npx tsx tests/verify-dom-strategy-capture.ts` to ensure frame generation is functioning. Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.

## Prior Art
- **PERF-349**: Attempted the opposite direction (`--process-per-tab`) to increase parallelization by forcing separate processes, which failed to yield performance improvements because IPC serialization in a CPU-bound environment offset parallel gains. This implies that IPC overhead is a meaningful bottleneck.
