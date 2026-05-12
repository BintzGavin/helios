---
id: PERF-489
slug: unix-domain-socket-ffmpeg-pipe
status: unclaimed
claimed_by: ""
created: 2026-05-12
completed: ""
result: ""
---
# PERF-489: Unix Domain Socket for FFmpeg Frame Pipeline

## Focus Area
The Frame Capture Loop to FFmpeg Encoding pipeline (`CaptureLoop.ts` -> `FFmpegManager.ts`, and strategies like `DomStrategy.ts`). Specifically, bypassing standard anonymous standard input (`stdin`) pipes in favor of a Unix Domain Socket for faster inter-process communication.

## Background Research
Currently, rendered frames are piped from Node.js to FFmpeg using standard anonymous pipes via `this.writeToStdin` which calls `this.ffmpegManager.stdin.write()`. While convenient, anonymous pipes often have small, fixed-size OS buffers (e.g., 64KB on Linux) and can introduce higher context-switching and backpressure overhead when streaming large volumes of base64/binary image data in a tight loop. Unix Domain Sockets (`AF_UNIX`) operate directly within the kernel memory space, typically offering higher throughput, larger tunable buffer sizes, and less overhead than standard standard I/O pipes. Transitioning the frame data stream to a Unix Domain Socket (`unix:///tmp/helios-frames-[hash].sock`) could unblock the Node.js event loop faster and reduce pipeline stalls.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.515s (PERF-482)
- **Bottleneck analysis**: IPC latency and buffer exhaustion between Node.js and the FFmpeg subprocess.

## Implementation Spec

### Step 1: Create Unix Domain Socket Server
**File**: `packages/renderer/src/core/FFmpegManager.ts`
**What to change**:
Instead of relying strictly on `this.process.stdin`, create an IPC socket server using `net.createServer()`. Have the server listen on a unique temporary socket path derived from the output path or timestamp. Maintain a connection handler to capture the connected socket.
**Why**: Establishes the host for FFmpeg to connect to and read frames from.
**Risk**: Leftover socket files on disk if the process crashes. Ensure cleanup on exit or error.

### Step 2: Configure FFmpeg Input
**Files**: `packages/renderer/src/strategies/DomStrategy.ts` and `CanvasStrategy.ts`
**What to change**:
Modify the FFmpeg argument generation (`getFFmpegArgs(options: RendererOptions, outputPath: string)`) to accept the unix socket instead of standard input. Instead of using `'-i', '-'`, configure it to `'-i', 'unix:///tmp/helios-render-<hash>.sock'` (derive a safe path from `outputPath` or pass a new option).
**Why**: Directs FFmpeg to read from the socket instead of standard input.
**Risk**: Connection timeouts or FFmpeg static build lacking `unix` protocol support.

### Step 3: Stream Frames via Socket
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update the `writeToStdin` method (and its references to `this.ffmpegManager.stdin`) to write to the connected `net.Socket` instance provided by the `net.Server`. Handle the `drain` event on the socket for backpressure exactly as it was handled for `stdin`.
**Why**: Completes the pipeline switch from standard pipe to Unix Domain Socket.
**Risk**: Socket encoding constraints (ensure base64 strings or buffers are written correctly just as with stdin).

## Variations
- **Variation A: Shared Memory (Native)**: If Unix Sockets fail to show improvement, a much heavier alternative would be mapping shared memory using a native addon, but that is out of scope for this specific ID.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure FFmpeg successfully encodes all frames from the Unix socket without data corruption or deadlocks.
