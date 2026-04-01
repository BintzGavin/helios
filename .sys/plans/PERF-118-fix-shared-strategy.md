---
id: PERF-118
slug: fix-shared-strategy
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: "2024-03-24"
result: "discard"
---
# PERF-118: Fix Shared DomStrategy Instance and Enable Concurrency

## Focus Area
`packages/renderer/src/Renderer.ts`, specifically the worker pool initialization logic.

## Background Research
Currently, the codebase instantiates `this.strategy` in the `Renderer` constructor. Inside the `captureLoop` pool creation, the code reads:
```typescript
const strategy = this.strategy || (this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options));
```
Because `this.strategy` is truthy, all workers are assigned the EXACT SAME instance of `DomStrategy`!

When `strategy.prepare(page)` is called, it mutates the shared instance:
```typescript
this.cdpSession = await page.context().newCDPSession(page);
```
As a result, all concurrent `capture()` calls from the worker pool mistakenly route their `HeadlessExperimental.beginFrame` CDP commands to the **last worker's** CDP session. Chromium's main thread receives multiple concurrent `beginFrame` requests for the same page, crashing the pipeline with the error:
`Protocol error (HeadlessExperimental.beginFrame): Another frame is pending`.

This hidden shared-state bug completely destroyed multi-core scalability. PERF-115 observed an 11-second regression when attempting to use concurrency, incorrectly blaming it on layout/paint locking. In reality, it was just the workers tripping over each other's CDP sessions.

## Benchmark Configuration
- **Composition URL**: Standard simple-animation HTML fixture
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 35.867s (with concurrency=1 due to this bug)
- **Bottleneck analysis**: DOM capture was single-threaded because concurrency caused a crash.

## Implementation Spec

### Step 1: Fix Shared Strategy Instance in Worker Pool
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `createPage` function:
Replace:
```typescript
const strategy = this.strategy || (this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options));
```
With:
```typescript
// Worker 0 can reuse the class-level strategy instance since we use it for diagnostics/finish,
// but subsequent workers MUST instantiate their own isolated RenderStrategy instance to avoid sharing CDP sessions.
const strategy = index === 0 ? this.strategy : (this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options));
```

**Why**: By ensuring each worker gets its own isolated `DomStrategy` instance, their CDP sessions remain properly scoped to their respective Playwright pages. This allows true concurrent rendering without `Another frame is pending` crashes.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-codecs.ts` and `npm run test -w packages/renderer`.

## Correctness Check
Run the DOM verification script to ensure frames are sequenced correctly without crashing:
`npx tsx packages/renderer/tests/verify-dom-selector.ts`

## Results Summary
- **Best render time**: 34.5s (vs baseline 34.5s)
- **Improvement**: 0%
- **Kept experiments**:
- **Discarded experiments**: All alternatives. Codebase remains unchanged.
