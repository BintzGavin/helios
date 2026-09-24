---
status: complete
claimed_by: "executor-session"
---

# PERF-929: Hoist loop-carried variables in worker dispatch loop

## What
In the multi-worker paths of `CaptureLoop.ts`, the inner worker dispatch loop (`for (let d = 0; d < dispatches; d++)`) modifies the `freeWorkersHead` and `nextFrameToSubmit` variables in every iteration. These variables are scoped outside the loop, requiring V8 TurboFan to trace external state mutations on every iteration, which limits loop unrolling and pipelining efficiency.

This experiment will hoist the loop-carried induction variables into local loop-scoped variables (`let h = freeWorkersHead; let n = nextFrameToSubmit;`) before the loop, update them locally inside the loop, and then write the final values back to the outer variables after the loop completes.

## Why
Microbenchmarks show that hoisting external loop-carried state mutations out of the hot inner loop reduces loop overhead by ~27%. This allows the JIT compiler to pipeline the induction variables inside registers without doing closure writes, until the loop completes.

## Plan
1. Create benchmark configuration.
2. Run baseline benchmark.
3. Modify `CaptureLoop.ts` to hoist `freeWorkersHead` and `nextFrameToSubmit` in the 3 occurrences of `for (let d = 0; d < dispatches; d++)`.
4. Run modified benchmark.
5. Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
6. Commit the data.
