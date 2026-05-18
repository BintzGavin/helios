---
id: PERF-539
slug: disable-chromium-sandbox
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: 2025-02-13
result: "no-improvement"
---

# PERF-539: Disable Chromium Sandbox for IPC Efficiency

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser launch arguments.

## Background Research
Chromium uses a multi-process architecture with a strict sandbox to restrict renderer processes from making direct system calls or accessing the filesystem. Every restricted operation must be brokered through the main browser process via IPC. In a heavily CPU-bound, multi-worker setup (especially with `--process-per-tab` enabled), this broker IPC can introduce context switching and CPU overhead.

Since Helios runs inside isolated microVMs or Docker containers where host-level security is already guaranteed, the Chromium sandbox is redundant. By explicitly disabling the sandbox (`--no-sandbox` and `--disable-setuid-sandbox`), we allow renderer processes to bypass the IPC broker for system-level operations, reducing overhead and potentially speeding up the high-frequency `HeadlessExperimental.beginFrame` hot loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 1920x1080, 60 FPS, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.594s
- **Bottleneck analysis**: Chromium internal IPC and system call brokering overhead between renderer processes and the main browser process.

## Implementation Spec

### Step 1: Add Sandbox Disablement Flags
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Add `'--no-sandbox'` and `'--disable-setuid-sandbox'` to the `DEFAULT_BROWSER_ARGS` array.

```typescript
<<<<<<< SEARCH
  '--disable-dev-shm-usage',
  '--disable-extensions',
=======
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-extensions',
>>>>>>> REPLACE
```

**Why**: Eliminates the Chromium sandbox, allowing renderer processes to execute syscalls directly instead of brokering them through the main process, reducing CPU contention.
**Risk**: Negligible in an already isolated microVM environment.

## Variations
### Variation A: Add IPC Flooding Protection Bypass
If disabling the sandbox alone isn't enough, we can also append `'--disable-ipc-flooding-protection'` to prevent Chromium from throttling our high-frequency CDP commands.

## Canvas Smoke Test
Run a basic canvas render (`npm run test -w packages/renderer -- --run` if necessary) to ensure the browser argument changes don't crash or prevent rendering.

## Correctness Check
Run the DOM benchmark (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) and inspect the output video to verify that parallel frame captures are still functioning correctly.

## Prior Art
- PERF-529 implemented `--process-per-tab`, which successfully optimized multi-core utilization by dedicating a renderer process to each tab. Disabling the sandbox optimizes those newly separated processes.

## Results Summary
- **Best render time**: 17.362s (vs baseline 17.137s)
- **Improvement**: -1.3%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-539: Disable Chromium Sandbox]
