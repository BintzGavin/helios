---
id: PERF-693
slug: omit-stream-write-callback
status: claimed
claimed_by: Jules
created: 2024-06-08
completed: "2024-06-08"
result: "keep"
---

# PERF-693: Omit Stream Write Callback in CaptureLoop

## Focus Area
`CaptureLoop.ts` fast path execution loop, specifically the `stdin.write` calls to FFmpeg.

## Background Research
Currently in the fast paths we pass a callback to Node.js `stream.Writable.write`:
```typescript
                    let canWriteMore: boolean;
                    if (typeof buffer === 'string') {
                        canWriteMore = stdin.write(buffer, 'base64', this.handleWriteError);
                    } else {
                        canWriteMore = stdin.write(buffer, this.handleWriteError);
                    }
```
Passing a callback to `Writable.write` in Node.js forces the stream internal state machine to store and track the callback asynchronously until the chunk is flushed. By omitting it, we bypass closure tracking inside `node:stream` for every frame, reducing garbage collection pressure and event loop overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, 10s (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: TBD
- **Bottleneck analysis**: Node.js stream `.write()` callback allocation overhead on every frame.

## Implementation Spec

### Step 1: Remove write callbacks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `poolLen === 1` branch, the `else` (multi-worker) branch, and the final flush code, remove `this.handleWriteError` from all `stdin.write` calls.

```typescript
<<<<<<< SEARCH
                    if (typeof buffer === 'string') {
                        canWriteMore = stdin.write(buffer, 'base64', this.handleWriteError);
                    } else {
                        canWriteMore = stdin.write(buffer, this.handleWriteError);
                    }
=======
                    if (typeof buffer === 'string') {
                        canWriteMore = stdin.write(buffer, 'base64');
                    } else {
                        canWriteMore = stdin.write(buffer);
                    }
>>>>>>> REPLACE
```
*(Apply the above change to all 3 instances in the file.)*

Then, remove the unused `handleWriteError` method from the class entirely:
```typescript
<<<<<<< SEARCH
  private handleWriteError = (err?: Error | null) => {
    if (err) {
       if ((err as any).code === 'EPIPE') {
           console.warn('FFmpeg stdin closed prematurely during write (EPIPE). Ignoring error to allow graceful exit.');
       } else {
           this.ffmpegManager.emitError(err);
       }
    }
  };
=======
>>>>>>> REPLACE
```

**Why**: Bypasses internal Node.js callback allocation. Stream errors are natively emitted as `'error'` events on the stream and handled globally anyway.
**Risk**: Errors during `write` might not log specifically from `handleWriteError`. However, stream errors naturally emit an `'error'` event on the stream, so `Orchestrator.ts` or the stream listeners should catch it. If `EPIPE` starts crashing the process due to missing the specialized check in `handleWriteError`, we may need to handle `EPIPE` on the main stream `on('error')` listener instead. The executor can revert if tests fail.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run the DOM benchmark (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) and ensure output videos render correctly.

## Prior Art
- PERF-686: Tried prebinding `this.handleWriteError` but failed due to V8 inline caching already optimizing `this`. This experiment removes the callback entirely from the Node API call.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	2.456	150	61.09	63.7	keep	Omit stdin.write callback
2	2.462	150	60.92	63.7	keep	Omit stdin.write callback
3	2.399	150	62.52	64.1	keep	Omit stdin.write callback
```
