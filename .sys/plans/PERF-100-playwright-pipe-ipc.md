---
id: PERF-100
slug: playwright-pipe-ipc
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-100: Playwright Pipe IPC Transport

## Focus Area
Playwright Chromium IPC Transport Overhead

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition.
- **Render Settings**: Standard benchmark settings (must be identical across all runs).
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.376s
- **Bottleneck analysis**: IPC latency between Node.js and Chromium for CDP frame capture commands.

## Implementation Spec

### Step 1: Enable Pipe IPC Transport
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `getLaunchOptions()` method, add `pipe: true` to the returned configuration object. It should look like this:
```typescript
return {
  headless: config.headless ?? true,
  executablePath: executablePath,
  args: [...DEFAULT_BROWSER_ARGS, ...gpuArgs, ...userArgs],
  pipe: true,
};
```
**Why**: Setting `pipe: true` configures Playwright to launch Chromium using standard I/O pipes rather than connecting over a WebSocket. This can reduce TCP loopback overhead and improve latency for high-frequency CDP commands (`beginFrame`, `evaluate`).
**Risk**: Might alter the timing of Playwright process initialization, but generally recommended for high-throughput headless use cases.

## Canvas Smoke Test
Run the standalone canvas verification script `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure standard rendering works.

## Correctness Check
Run the full verification suite `npx tsx packages/renderer/tests/run-all.ts` to confirm the renderer connects to Playwright correctly in both DOM and Canvas modes.
