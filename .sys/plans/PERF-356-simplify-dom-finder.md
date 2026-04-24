---
id: PERF-356
slug: simplify-dom-finder
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-356: Simplify DOM Finder Script

## Focus Area
`packages/renderer/src/utils/dom-finder.ts` - `FIND_DEEP_ELEMENT_SCRIPT`

## Background Research
The `FIND_DEEP_ELEMENT_SCRIPT` in `packages/renderer/src/utils/dom-finder.ts` uses a custom recursive `TreeWalker` to search through light DOM and shadow roots for a specific element (via Playwright's `evaluateHandle` during the `targetSelector` preparation phase in `DomStrategy.ts`).

However, Chromium's native `querySelector` when used with deep piercing combinators (or when executing Playwright's internal selector engine) is significantly faster. Playwright already handles piercing shadow DOMs automatically if we simply use `page.locator(selector).elementHandle()` instead of injecting a custom, complex JavaScript function into the page to manually walk the DOM tree.

By replacing the `page.evaluateHandle` manual recursive script with a direct Playwright `page.waitForSelector` or `page.$` (which relies on Playwright's highly optimized Rust/C++-backed selector engine that traverses shadow boundaries natively), we can reduce initialization overhead and simplify the codebase.

Wait, `targetSelector` is currently evaluated by passing `FIND_DEEP_ELEMENT_SCRIPT` string. Let's look at `DomStrategy.ts` `prepare`:
```typescript
    if (this.options.targetSelector) {
      const handle = await page.evaluateHandle((args) => {
        // @ts-ignore
        const finder = eval(args.script);
        const element = finder(document, args.selector);
        if (!element) throw new Error(`Target element not found: ${args.selector}`);
        return element;
      }, { script: FIND_DEEP_ELEMENT_SCRIPT, selector: this.options.targetSelector });
```

We can replace this entirely with Playwright's native locator:
```typescript
    if (this.options.targetSelector) {
      const handle = await page.waitForSelector(this.options.targetSelector, { state: 'attached' });
      if (!handle) throw new Error(`Target element not found: ${this.options.targetSelector}`);
      this.targetElementHandle = handle;
```
Playwright's default selector engine already pierces shadow roots natively.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.149s (from PERF-346)
- **Bottleneck analysis**: Custom DOM walking script injects unnecessary complexity and execution overhead during the setup phase.

## Implementation Spec

### Step 1: Replace custom evaluation with Playwright native selector
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, locate the `if (this.options.targetSelector)` block.
Replace:
```typescript
      const handle = await page.evaluateHandle((args) => {
        // @ts-ignore
        const finder = eval(args.script);
        const element = finder(document, args.selector);
        if (!element) throw new Error(`Target element not found: ${args.selector}`);
        return element;
      }, { script: FIND_DEEP_ELEMENT_SCRIPT, selector: this.options.targetSelector });

      const element = handle.asElement();
      if (!element) {
        throw new Error(`Target element found but is not an element: ${this.options.targetSelector}`);
      }
      this.targetElementHandle = element;
```
With:
```typescript
      const element = await page.waitForSelector(this.options.targetSelector, { state: 'attached', timeout: 5000 });
      if (!element) {
        throw new Error(`Target element not found: ${this.options.targetSelector}`);
      }
      this.targetElementHandle = element;
```
Remove `FIND_DEEP_ELEMENT_SCRIPT` import from `DomStrategy.ts`.

### Step 2: Delete `dom-finder.ts`
**File**: `packages/renderer/src/utils/dom-finder.ts`
**What to change**:
Delete the file as it's no longer used.

**Why**: Removes custom, slow JS code in favor of Playwright's native, optimized selector engine that already handles Shadow DOM piercing.
**Risk**: If Playwright's selector engine behaves slightly differently regarding shadow piercing in edge cases, it might fail to find obscure elements. However, Playwright's documentation states it pierces shadow roots by default.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas mode works (though this is DOM strategy).

## Correctness Check
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts`

## Prior Art
N/A
