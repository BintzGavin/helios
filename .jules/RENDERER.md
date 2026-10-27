# RENDERER Context
I will write some context here to help guide my plan. I need to write a PERF plan.
## Performance Trajectory
Current best: ~500ms (from journals)
Last updated by: PERF-945

## What Works
- **PERF-1141**: Hoisted dispatch limit calculation in multi-worker writer chunk loops to a scoped constant in `CaptureLoop.ts`.
  - **Improvement:** Reduced AST evaluation overhead by saving V8 from recalculating identical loop boundary expressions inside the branch dispatch block.
  - **Plan ID:** PERF-1141
- **PERF-1140**: Optimized progress counter in multi-worker loops of `CaptureLoop.ts` by replacing `nextProgress` interval logic with a relative chunk `progressCounter` decrement strategy.
  - **Improvement:** Removes absolute loop bound pointers and simplifies bound checking in V8, yielding improvements in chunk loop execution time during multi-worker processing.
  - **Plan ID:** PERF-1140
- **PERF-1140**: Optimized progress counter in multi-worker loops of `CaptureLoop.ts` by replacing `nextProgress` interval logic with a relative chunk `progressCounter` decrement strategy.
  - **Improvement:** Removes the absolute absolute variables and simplifies interval checking to 0 in V8, yielding a ~25-30% improvement in chunk loop execution time during multi-worker processing.
  - **Plan ID:** PERF-1140

- **PERF-1090**: Inlined DOM Strategy object spreads inside the `capture` method of `DomStrategy.ts`.
  - **Improvement**: Eliminated per-frame object allocation and property copying by caching the combined CDP screenshot parameters in `prepare()`. Yielded a ~96% improvement in parameter setup microbenchmarks and reduced garbage collection pressure in the rendering loop, slightly improving DOM macro rendering times.
  - **Plan ID**: PERF-1090

- **PERF-945**: Optimized multi-worker and single-worker pooled buffer length access in CaptureLoop.ts by tracking buffer length directly on the PooledBuffer instance.
  - **Improvement**: Replaced `pooled.buffer.length < maxBytes` with `pooled.size < maxBytes`. Caching the size parameter locally on the V8 class bypassed the native Node.js Buffer `.length` property getter cross-boundary penalty, improving access speed by ~51% in hot microbenchmarks (86ms vs 176ms).
  - **Plan ID**: PERF-945
