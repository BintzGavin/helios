---
id: PERF-499
slug: raw-websocket-cdp-connection
status: unclaimed
claimed_by: ""
created: 2026-05-13
completed: ""
result: ""
---
# PERF-499: Raw WebSocket CDP Connection for Hot Loop

## Focus Area
The DOM capture hot loop, specifically `DomStrategy.ts` (for `beginFrame`) and `CdpTimeDriver.ts` (for `setVirtualTimePolicy`).

## Background Research
Currently, the renderer uses Playwright's `CDPSession` to send commands to Chromium. In the hot loop, we call `cdpSession.send()` at least twice per frame (`setVirtualTimePolicy` and `beginFrame`).
Playwright's `CDPSession` adds significant overhead:
1. It dynamically serializes the request objects using `JSON.stringify`.
2. It routes the message through Playwright's internal IPC pipe to the Playwright driver process, which then sends it to the Chromium browser process.
3. It allocates dynamic Promises and registers callbacks in Maps.

By bypassing Playwright's IPC and connecting directly to Chromium's native WebSocket debugging port using Node.js's native `net` and `http` modules (to avoid new dependencies), we can:
1. Send pre-serialized, static JSON strings for `beginFrame` and `setVirtualTimePolicy` (mutating only the ID and timestamp integers), eliminating `JSON.stringify` overhead.
2. Communicate directly with Chromium's process, bypassing the Playwright driver process entirely.
3. Manage a highly optimized, allocation-free message tracking ring buffer for the native promises.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~4.169s
- **Bottleneck analysis**: Playwright IPC overhead and JSON serialization in the hot loop.

## Implementation Spec

### Step 1: Expose Chromium Debugging Port
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Add `--remote-debugging-port=0` to the Chromium launch args in `getLaunchOptions`. After `chromium.launch()`, extract the assigned port from the browser or by inspecting the local debug URL, or simply launch with a fixed port for the benchmark.

### Step 2: Implement Raw WebSocket Driver using native Node.js
**File**: `packages/renderer/src/core/RawCdpSocket.ts` (New File)
**What to change**:
Create a simple native WebSocket client using the standard Node.js `net.Socket` and HTTP upgrade mechanism (since we cannot add external dependencies like `ws`).
Implement a `sendRaw(message: string): Promise<any>` method using a pre-allocated array for callback resolution (indexed by the CDP request ID) to avoid Map allocations.

### Step 3: Integrate Raw Socket into Hot Paths
**File**: `packages/renderer/src/strategies/DomStrategy.ts` and `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Update to use `RawCdpSocket`. Find the remote debugging port and fetch the websocket URL via the HTTP `/json` endpoint.
Replace `this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)` in `DomStrategy.ts` and `this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams)` in `CdpTimeDriver.ts` with `rawSocket.sendRaw()`. Construct the JSON strings manually in the hot loop, mutating only the necessary integers (e.g., `frameTimeTicks`, `budget`) to avoid object allocation and `JSON.stringify`.

## Variations
- **Variation A**: Only optimize `beginFrame` in `DomStrategy`, keeping `CdpTimeDriver` on Playwright's session, to isolate the impact of raw string payloads for the screenshot data.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions (Canvas mode won't use the raw socket).

## Correctness Check
Run the standard DOM benchmark to ensure FFmpeg successfully encodes all frames and virtual time still ticks deterministically.