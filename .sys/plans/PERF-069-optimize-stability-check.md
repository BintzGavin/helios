---
id: PERF-069
slug: optimize-stability-check
status: complete
claimed_by: "executor"
created: 2024-05-24
completed: "2024-05-24"
result: "no-improvement"
---

# PERF-069: Optimize SeekTimeDriver stability wait loop

## Focus Area
The `window.__helios_seek` initialization script executed within `packages/renderer/src/drivers/SeekTimeDriver.ts`.

## Background Research
Currently, inside the CDP script `window.__helios_seek`, the execution context `window.__helios_seek = async (t, timeoutMs) => { ... }` is strictly declared as an `async` function.

Every time `window.__helios_seek()` is called via `Runtime.evaluate` on every frame, V8 *always* has to allocate a native Promise, push it to the microtask queue, and resolve it, even if `promises` is null and no `await` actually occurs.

If the function is completely synchronous on fast frames (no font loading, no media waiting, no Helios stability checks), we don't need `async` at all. The `Runtime.evaluate` command with `awaitPromise: true` handles both Promise returning functions and non-Promise returning functions. If the result is not a Promise, CDP returns immediately without hitting the microtask queue.

## Benchmark Configuration
- **Composition URL**: Standard benchmark HTML
- **Render Settings**: Standard resolution and framerate
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.100s
- **Bottleneck analysis**: The `window.__helios_seek` function is unconditionally `async`. This forces V8 to wrap the return value in a Promise and schedule its resolution on the microtask queue on every single frame, adding overhead for the CDP IPC round-trip.

## Implementation Spec

### Step 1: Remove `async` keyword and conditionally return IIFE
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Change the definition from `window.__helios_seek = async (t, timeoutMs) => {` to `window.__helios_seek = (t, timeoutMs) => {`.
2. Move the entire stability logic block starting from `if (promises && promises.length > 0) {` into a conditionally returned async IIFE `return (async () => { ... })();`.

**Why**: By returning the result of an async IIFE only when `promises` exists, V8 only creates and resolves a Promise when asynchronous waiting is strictly required. For the >99% of frames where no fonts load, no media seeks, and no `waitUntilStable` checks are active, the function executes purely synchronously, completely bypassing the V8 microtask queue and reducing IPC latency for `awaitPromise: true`.

### Step 2: Validate Verification Tests
**What to run**: Instruct the Executor to run the verification tests (`npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts` and `npx tsx packages/renderer/tests/verify-seek-driver-stability.ts`) to ensure time synchronization and timeout behavior are not broken by the synchronous execution path.

## Canvas Smoke Test
Run a basic canvas build to ensure it doesn't break, though `SeekTimeDriver` is only used for `dom` mode.

## Correctness Check
If `verify-seek-driver-stability.ts` passes, the async IIFE correctly blocks the CDP evaluation until stability resolves.
