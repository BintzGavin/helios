---
slug: inline-stability-check
status: complete
---

# Plan: Inline Stability Check Await

## Problem
In `packages/renderer/src/drivers/CdpTimeDriver.ts`, the `defaultStabilityCheck()` function introduces unnecessary closure and Promise chain overhead by returning `this.client!.send(...).then(...)`. As noted in PERF-509, this overhead is part of the microtask bottleneck during the hot loop in `CdpTimeDriver.setTime()`. The objective is to inline the stability check and replace the `.then` with an `await` to eliminate this overhead.

## Solution Steps

1. Modify `packages/renderer/src/drivers/CdpTimeDriver.ts` to inline the stability check using `await` directly in `runSetTime()` and remove `defaultStabilityCheck`. Use `replace_with_git_merge_diff`.
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

2. Use `read_file` to verify the replacement in `packages/renderer/src/drivers/CdpTimeDriver.ts` was correctly applied.
3. Run `npm run build` in `packages/renderer` directory using `run_in_bash_session`.
4. Run `npx tsx tests/fixtures/benchmark.ts` multiple times from the repo root to collect render time metrics.
5. Edit `docs/status/RENDERER-EXPERIMENTS.md` using `run_in_bash_session` to append the experiment results.
6. Append metrics to `packages/renderer/.sys/perf-results.tsv` using `run_in_bash_session` with echo.
7. Run tests using `npm test -w packages/renderer` using `run_in_bash_session`.
8. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
9. Submit.
## Results
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	15.941	600	37.64	43.6	keep	PERF-520: inline stability check
2	16.967	600	35.36	42.4	keep	PERF-520: inline stability check
3	16.140	600	37.18	42.5	keep	PERF-520: inline stability check
```
