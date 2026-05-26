---
id: PERF-592
slug: simplify-sync-media-expression
status: unclaimed
claimed_by: ""
created: 2026-05-26
completed: ""
result: ""
---

# PERF-592: Simplify sync media CDP expression

## Focus Area
Frame Capture Loop (`CdpTimeDriver.ts`).

## Background Research
Currently, `CdpTimeDriver.ts` uses string-based expressions (`"if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"`) in `Runtime.evaluate` to synchronize media elements on every frame within `defaultSyncMedia`. Because the string changes dynamically (due to `timeInSeconds`), Chromium's V8 engine cannot cache the parsed AST, forcing it to re-parse the script on every frame tick.

Since the Helios preload script deterministically injects `window.__helios_sync_media` and the system has already explicitly verified its existence during `prepare()`, the `typeof` check is entirely redundant. Removing it shortens the dynamic string considerably, simplifying the AST that Chromium's V8 engine must lex and compile on every single frame tick, thus reducing parsing overhead and string concatenation garbage collection pressure.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.229s
- **Bottleneck analysis**: V8 parsing and Garbage Collection pressure of dynamically generated JS strings during the `CdpTimeDriver.defaultSyncMedia` hot loop.

## Implementation Spec

### Step 1: Update CdpTimeDriver DefaultSyncMedia Expression
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `defaultSyncMedia` method, change the expression string assignments to remove the `if(typeof window.__helios_sync_media==='function')` prefix.

Change this:
`this.singleFrameSyncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";`
to:
`this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media(" + timeInSeconds + ");";`

Also change this:
`const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";`
to:
`const expression = "window.__helios_sync_media(" + timeInSeconds + ");";`

**Why**: By shortening the dynamically generated string and removing an `if` statement and `typeof` operator, Chromium avoids lexing and compiling a more complex JS string on every frame.
**Risk**: If for any reason `window.__helios_sync_media` is suddenly undefined, it will throw an error instead of failing silently. However, `prepare()` guarantees its injection, so this risk is minimal.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to verify correctness.
