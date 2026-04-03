---
id: PERF-166
slug: chromium-no-sandbox
status: complete
claimed_by: ""
created: 2023-10-25
completed: "2026-04-03"
result: "failed"
---
# PERF-166: Disable Chromium Sandbox

## Focus Area
The Chromium launch arguments in `packages/renderer/src/Renderer.ts`. Specifically, disabling the Chromium sandbox which introduces significant IPC and system call overhead in CPU-bound microVM environments.

## Background Research
Currently, the `DEFAULT_BROWSER_ARGS` array disables site isolation (`--disable-site-isolation-trials`, `--disable-features=IsolateOrigins,site-per-process`), which improved performance by reducing multi-process overhead (PERF-158). However, Chromium still runs with its default sandbox enabled.
The sandbox employs a zygote process, seccomp-bpf filters, and complex IPCs to isolate rendering processes. Since Helios renders local, trusted compositions inside an already isolated microVM (Docker/Jules), the sandbox provides no security benefit but adds kernel-level overhead to every frame capture and font load.
Disabling the sandbox via `--no-sandbox` and `--disable-setuid-sandbox` is a standard optimization for trusted headless execution and should reduce CPU contention and IPC latency.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: Standard resolution, fps, duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: IPC latency and CPU context switching during frame rendering.

## Implementation Spec

### Step 1: Add sandbox disable flags
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Add `--no-sandbox` and `--disable-setuid-sandbox` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: This completely disables the Chromium sandbox, avoiding the overhead of zygote processes, namespaces, and seccomp-bpf syscall filtering when rendering frames, maximizing CPU availability for V8 and Playwright IPC.
**Risk**: If any external or untrusted resources are loaded, they run without sandbox isolation (mitigated by the microVM environment and the trusted nature of compositions).

## Canvas Smoke Test
Run a standard canvas render to verify that `--no-sandbox` doesn't crash the browser initialization.

## Correctness Check
Run the verification suite to ensure frames are still accurately captured.

## Prior Art
Standard Playwright and Puppeteer practices for Docker environments often recommend `--no-sandbox` to improve performance and stability.

## Results Summary
- **Best render time**: 34.953s (vs baseline 33.5s)
- **Improvement**: 0% (discarded)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-166]
