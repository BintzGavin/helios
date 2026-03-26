---
id: PERF-070
slug: cache-capture-options
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---
# PERF-070: Cache Capture Options and Element Resolvers in DomStrategy

## Focus Area
The hot frame capture loop in `DomStrategy.ts`.

## Background Research
Currently, inside the `capture()` method of `DomStrategy.ts`, which runs for every single frame (e.g., 1800 times for a 60-second 30fps video):
1. It parses `options.pixelFormat` using `String.includes` 5 times to determine if `hasAlpha` is true.
2. It conditionally assigns `format` and `quality` defaults based on `hasAlpha`.
3. It allocates a new `screenshotOptions` object and a new `screenshot` payload for CDP.
4. If a `targetSelector` is provided, it evaluates `FIND_DEEP_ELEMENT_SCRIPT` on the page to resolve the DOM element handle *on every frame*, performing an expensive recursive DOM tree walk, before calling `element.boundingBox()`.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: String parsing, object allocation, and redundant Playwright handle evaluation in the innermost `capture` loop.

## Implementation Spec

### Step 1: Cache format, hasAlpha, and screenshot parameters
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- Move the parsing of `pixelFormat`, `hasAlpha`, `format`, and `quality` from the `capture()` method into the `prepare()` method.
- Store the resulting `screenshot` CDP payload object as a private class property (e.g., `this.cdpScreenshotParams`).
- In `capture()`, directly pass `this.cdpScreenshotParams` to `HeadlessExperimental.beginFrame` instead of allocating a new object and doing the string/boolean evaluations.

### Step 2: Cache target element handle
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- If `this.options.targetSelector` is provided, resolve the element handle in `prepare()` and store it as a private property (`this.targetElementHandle`).
- In `capture()`, reuse `this.targetElementHandle` to directly call `.boundingBox()` instead of evaluating `FIND_DEEP_ELEMENT_SCRIPT` on every frame.
**Risk**: If the DOM element is destroyed and recreated during the composition, the handle will be detached. However, `targetSelector` implies a static container being captured.

## Correctness Check
Verify that `verify-dom-selector.ts` and `verify-dom-media-attributes.ts` still pass.

## Canvas Smoke Test
Run `verify-canvas-strategy.ts`.
