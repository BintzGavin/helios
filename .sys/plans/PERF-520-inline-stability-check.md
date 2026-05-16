---
slug: inline-stability-check
status: complete
---

# Plan: Inline Stability Check Await

## Problem
In `packages/renderer/src/drivers/CdpTimeDriver.ts`, the `defaultStabilityCheck()` function introduces unnecessary closure and Promise chain overhead by returning `this.client!.send(...).then(...)`. As noted in PERF-509, this overhead is part of the microtask bottleneck during the hot loop in `CdpTimeDriver.setTime()`. The objective is to inline the stability check and replace the `.then` with an `await` to eliminate this overhead.

## Solution Steps

1. Modify `packages/renderer/src/drivers/CdpTimeDriver.ts` to inline the stability check using `await` directly in `runSetTime()`.

<<<<<<< SEARCH
  private defaultStabilityCheck(): Promise<void> | void {
    return this.client!.send('Runtime.evaluate', this.evaluateStabilityParams).then((res) => {
      if (res) {
        this.handleStabilityCheckResponse(res);
      }
    }) as unknown as Promise<void>;
  }
=======
>>>>>>> REPLACE

<<<<<<< SEARCH
    if (this.stabilityCheckState === 1) {
      const stabilityResult = this.defaultStabilityCheck();
      if (stabilityResult) {
        await stabilityResult;
      }
    }
=======
    if (this.stabilityCheckState === 1) {
      const res = await this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);
      if (res) {
        this.handleStabilityCheckResponse(res);
      }
    }
>>>>>>> REPLACE

2. Run compilation check (`npm run build` in `packages/renderer`).
3. Run the benchmark (`npx tsx tests/fixtures/benchmark.ts` inside `packages/renderer`) to measure performance. Repeat to find the median.
4. Run tests (`npm test` in `packages/renderer` if kept, or skip if discarded).
5. Output validation.
6. Append results to `packages/renderer/.sys/perf-results.tsv`.
7. Update `docs/status/RENDERER-EXPERIMENTS.md`.
8. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
9. Commit changes.
