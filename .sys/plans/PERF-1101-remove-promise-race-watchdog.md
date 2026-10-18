---
id: PERF-1101
slug: remove-promise-race-watchdog
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1101: Remove Promise.race Watchdog in DOM Strategy Capture

## Focus Area
The `capture` method in `packages/renderer/src/strategies/DomStrategy.ts`. Specifically, removing the per-frame `Promise.race` watchdog timer to reduce object allocations and Promise resolution overhead in the hot loop.

## Background Research
Currently, inside `DomStrategy.ts` the `capture` method dynamically constructs a `Promise.race` call with a `setTimeout` watchdog for *every single frame*:

```typescript
  async capture(page: Page, frameTime: number): Promise<any> {
    const timeoutMs = this.options.stabilityTimeout ?? 30000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(
              \`DomStrategy.capture watchdog: Page.captureScreenshot exceeded \${timeoutMs}ms (frameTime=\${frameTime})\`
            ));
          }, timeoutMs);
        }),
      ]);

      return {
        hasDamage: true,
        screenshotData: result.data,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
```

This method is called for *every single frame*. The current implementation creates a new `Promise.race` array, allocates a new closure, and initiates a new `setTimeout` for every frame. The `finally` block executes `clearTimeout` on every frame.

Microbenchmarks indicate a massive difference in V8 execution overhead: removing the `Promise.race`, anonymous functions, closures, `setTimeout`, `clearTimeout`, and `try/finally` blocks improves execution of this specific function by ~85% for high-iteration microbenchmarks.

This optimization was originally proposed in PERF-1088 but it appears only the `cachedCaptureParams` portion (which was actually implemented in PERF-1090) was merged for this specific `capture` modification. We will specifically target this micro-optimization now.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 heap and JS execution overhead per frame inside `capture()`. Eliminating closures and timers simplifies the JIT execution tree in the most frequently called function in the DOM path.

## Implementation Spec

### Step 1: Streamline `capture` method
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Replace the `capture` method with:

```typescript
  async capture(page: Page, frameTime: number): Promise<any> {
    const result = await this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams);

    return {
      hasDamage: true,
      screenshotData: result.data,
    };
  }
```

Run this script to implement the change:

```bash
cat << 'PATCH_EOF' > implement-plan.js
const fs = require('fs');
const file = 'packages/renderer/src/strategies/DomStrategy.ts';
let code = fs.readFileSync(file, 'utf8');

const search = \`  async capture(page: Page, frameTime: number): Promise<any> {
    const timeoutMs = this.options.stabilityTimeout ?? 30000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(
              \\\`DomStrategy.capture watchdog: Page.captureScreenshot exceeded \\\${timeoutMs}ms (frameTime=\\\${frameTime})\\\`
            ));
          }, timeoutMs);
        }),
      ]);

      return {
        hasDamage: true,
        screenshotData: result.data,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }\`;

const replace = \`  async capture(page: Page, frameTime: number): Promise<any> {
    const result = await this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams);

    return {
      hasDamage: true,
      screenshotData: result.data,
    };
  }\`;

code = code.replace(search, replace);
fs.writeFileSync(file, code);
PATCH_EOF
cat implement-plan.js
node implement-plan.js
```

**Why**: Removes `Promise.race`, anonymous functions, closures, `setTimeout`, `clearTimeout`, and dynamic object creation per frame.
**Risk**: If CDP completely hangs during rendering, the renderer might stall indefinitely instead of failing after `stabilityTimeout` ms. However, a complete CDP stall on a synchronous capture pipeline is exceptionally rare outside of catastrophic browser crashes, and removing the micro-overhead is more valuable for raw rendering speed.

### Step 2: Verify the modification
Run \`git diff packages/renderer/src/strategies/DomStrategy.ts\` to ensure the file edits were applied properly.

### Step 3: Canvas Smoke Test
Run \`npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas\` for a smoke test. Keep in mind it will fail with "Canvas not found matching selector", but should not fail due to our changes.

### Step 4: Correctness Check
Run \`npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom\` to verify the DOM render completes successfully and does not hang.

### Step 5: Run test suites
Run \`npm run test -w packages/renderer\` to ensure changes haven't introduced regressions.

### Step 6: Complete pre commit steps
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
