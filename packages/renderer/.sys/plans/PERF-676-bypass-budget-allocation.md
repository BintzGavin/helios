---
status: complete
---
# Plan: PERF-676

1. Read `packages/renderer/src/drivers/CdpTimeDriver.ts`.
2. Inspect `runSetTime` method.
3. Modify `this.setVirtualTimePolicyParams.budget = budget;` to only assign if the budget has changed.
4. Run tests and benchmarks to evaluate.
