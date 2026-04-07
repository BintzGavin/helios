---
id: PERF-201
slug: polymorphic-capture
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-201: Polymorphic Capture Method

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path (Phase 4)

## Background Research
Currently, the `capture` method in `DomStrategy.ts` includes a truthiness branch for `this.targetElementHandle` which is evaluated on *every single frame*. Since the vast majority of our targets do not use `targetSelector`, checking this conditionally inside the hot loop adds unnecessary branch prediction and instruction overhead for V8. By evaluating the presence of `targetElementHandle` once during `prepare()` and assigning a specialized method directly to `this.capture`, we eliminate this branch from the hot loop entirely.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.3s
- **Bottleneck analysis**: Micro-stalls from branch prediction on `targetElementHandle` in the frame capture hot loop.

## Implementation Spec

### Step 1: Extract specialized capture functions
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Extract the logic inside the `capture()` method into two new private methods:
`private async captureTargetElement(page: Page, frameTime: number): Promise<Buffer | string>`
`private async captureFullPage(page: Page, frameTime: number): Promise<Buffer | string>`
The `captureTargetElement` method should handle the logic inside the `if (this.targetElementHandle)` block, while the `captureFullPage` method handles the full-page CDP `beginFrame` logic.
**Why**: Separates concerns and prepares for polymorphic assignment.
**Risk**: Potential type errors if `this.capture` signature diverges.

### Step 2: Assign capture method dynamically
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Change `capture(page: Page, frameTime: number): Promise<Buffer | string>` from a method to a property:
`capture!: (page: Page, frameTime: number) => Promise<Buffer | string>;`
At the end of the `prepare()` method, assign the appropriate function:
```typescript
if (this.targetElementHandle) {
  this.capture = this.captureTargetElement.bind(this);
} else {
  this.capture = this.captureFullPage.bind(this);
}
```
**Why**: Eliminates conditional branching on every frame tick in the hot loop.
**Risk**: `bind(this)` might have a small overhead, but generally faster than checking conditions when invoked thousands of times. An arrow function could also be used.

## Variations

### Variation A: Use Arrow Functions
Instead of `bind(this)`, declare the specialized methods as arrow functions to preserve lexical scope natively:
`private captureTargetElement = async (page: Page, frameTime: number): Promise<Buffer | string> => { ... }`
This avoids any potential `bind` overhead.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to verify DOM fallback capture succeeds.
Run `npx tsx packages/renderer/tests/verify-canvas-selector.ts` to verify targeted element capture succeeds.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.
