---
id: PERF-284
slug: cdp-evaluate-closure
status: unclaimed
claimed_by: ""
created: 2026-04-15
completed: ""
result: ""
---

# PERF-284: Optimize CdpTimeDriver hot loop evaluation

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` hot loop (`setTime`) string evaluation.

## Background Research
Currently, in `CdpTimeDriver.ts`, inside the `setTime` method, `__helios_sync_media(t)` is evaluated on every frame. When `frames.length === 1` and `syncMediaParams.objectId` is available, it effectively uses `Runtime.callFunctionOn` with the cached parameters (from PERF-228 optimization). However, when evaluating on multiple frames (e.g. `frames.length > 1`) or without the object ID, it performs full string evaluations (`frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");")`). String evaluation forces V8 to compile the string on each call over the IPC boundary.

In `SeekTimeDriver.ts`, when multiple frames are handled in `setTime`, the script calls the pre-defined closure:
```typescript
  private evaluateArgs: [number, number] = [0, 0];
  private evaluateClosure = ([t, timeoutMs]: any) => { (window as any).__helios_seek(t, timeoutMs); };
```
Using a pre-compiled closure with arguments passed in an array array avoids the string compilation penalty and reduces IPC payload parsing on every frame because the string logic is not recompiled continuously.

Since we saw a potential performance penalty in string compilation during the `SeekTimeDriver` experiments (PERF-272 showed a regression when closures were eliminated, retaining the closure approach), adopting the same pre-bound closure approach for the multi-frame branch of `CdpTimeDriver.ts` instead of dynamic inline strings (`"if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"`) should reduce the IPC parsing overhead and V8 compilation pressure when handling multi-frame DOM scenarios in `CdpTimeDriver.ts`.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, dom mode, duration 3s
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.2s
- **Bottleneck analysis**: IPC payload generation and AST parsing on every frame iteration caused by dynamically assembling string closures like `"if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"`.

## Implementation Spec

### Step 1: Add a pre-bound closure property to `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add the following properties to the `CdpTimeDriver` class:
```typescript
  private evaluateArgs: [number] = [0];
  private syncMediaClosure = ([t]: any) => { if(typeof (window as any).__helios_sync_media === 'function') (window as any).__helios_sync_media(t); };
```

**Why**: To prevent V8 from needing to parse and compile the `if(typeof window.__helios_sync_media==='function') ...` string on every single frame over IPC for each frame, aligning with the `evaluateClosure` optimization kept in `SeekTimeDriver.ts`.

### Step 2: Replace string evaluation in `setTime` multi-frame logic
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `setTime()` method, replace the `frame.evaluate(...)` string concatenation lines with `frame.evaluate(this.syncMediaClosure, this.evaluateArgs)` and properly update `this.evaluateArgs[0] = timeInSeconds` right before the calls.

For instance, replace:
```typescript
await frames[0].evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);
```
With:
```typescript
this.evaluateArgs[0] = timeInSeconds;
await frames[0].evaluate(this.syncMediaClosure, this.evaluateArgs).catch(this.handleSyncMediaError);
```

And in the loop, replace:
```typescript
framePromises[i] = frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);
```
With:
```typescript
this.evaluateArgs[0] = timeInSeconds; // (outside loop)
// inside loop
framePromises[i] = frame.evaluate(this.syncMediaClosure, this.evaluateArgs).catch(this.handleSyncMediaError);
```

**Why**: It sends the already parsed closure function reference (serialized as a function declaration once by Playwright and then cached on the receiving end/reused) along with the `evaluateArgs` instead of compiling the concatenated string continuously per frame.

## Variations
None.

## Canvas Smoke Test
Verify canvas functionality remains intact (e.g., standard examples).

## Correctness Check
Run the DOM benchmark (`npx tsx scripts/benchmark-test.js`) and ensure frame count remains accurate and visual correctness is retained.

## Prior Art
PERF-272 showed that keeping pre-bound closures and passing arguments is faster than sending raw dynamic strings over Playwright's `evaluate`.
