1. **Explore Baseline Benchmark**
   - Run a baseline benchmark first using `npx tsx benchmark.ts` or whatever the benchmark script is. I'll need to figure out what the benchmark script is from previous plans. Let's look at `.sys/plans/PERF-225-cache-ffmpeg-drain-listeners.md` to see what benchmark command was run. Wait, I should just use `node benchmark.ts` according to the execution guide, but I need to make sure I create one if it doesn't exist. I'll use the one from `examples/` or `packages/renderer/tests/`. Let's create a scratch script to run it.

Wait, I don't need a plan review tool just yet. Let me formulate the actual plan based on the specs in PERF-226.
