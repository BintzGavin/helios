---
slug: inline-sync-media
status: complete
completed: 2024-06-02
result: discarded
claimed_by: "executor-session"
---

# Plan: Inline `defaultSyncMedia` into `runSetTime`

## Problem
In `packages/renderer/src/drivers/CdpTimeDriver.ts`, `runSetTime` is the hot loop function called for every frame to advance virtual time. It conditionally calls `this.defaultSyncMedia()`. We can inline the content of `defaultSyncMedia` directly into `runSetTime` to avoid the function call overhead. Previously, PERF-646 tried to bypass `defaultSyncMedia` when `cachedFrames.length === 1` and returning early, but this attempt will literally inline the code and remove `defaultSyncMedia` entirely.

## Solution Steps

1. Use `replace_with_git_merge_diff` to remove `defaultSyncMedia` method from `CdpTimeDriver.ts`.
   <<<<<<< SEARCH
     private defaultSyncMedia() {
       const frames = this.cachedFrames;
       if (frames.length === 1) {
         this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
       } else {
           if (this.executionContextIds.length > 0) {
             if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
               this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
               for (let i = 0; i < this.executionContextIds.length; i++) {
                 this.multiFrameSyncMediaParams[i] = {
                   expression: "window.__helios_sync_media();",
                   contextId: this.executionContextIds[i],
                   awaitPromise: false,
                   returnByValue: false
                 };
               }
             }
             for (let i = 0; i < this.executionContextIds.length; i++) {
               this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]).catch(noopCatch);
             }
           } else {
             this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
           }
       }
     }

     private handleSyncMediaError = (e: any) => {
   =======
     private handleSyncMediaError = (e: any) => {
   >>>>>>> REPLACE

2. Use `replace_with_git_merge_diff` to inline the removed code inside `runSetTime`.
   <<<<<<< SEARCH
   // 1. Synchronize media elements
       if (this.hasMedia) {
         this.defaultSyncMedia();
       }

       // 2. Advance virtual time
   =======
   // 1. Synchronize media elements
       if (this.hasMedia) {
         const frames = this.cachedFrames;
         if (frames.length === 1) {
           this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
         } else {
             if (this.executionContextIds.length > 0) {
               if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
                 this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
                 for (let i = 0; i < this.executionContextIds.length; i++) {
                   this.multiFrameSyncMediaParams[i] = {
                     expression: "window.__helios_sync_media();",
                     contextId: this.executionContextIds[i],
                     awaitPromise: false,
                     returnByValue: false
                   };
                 }
               }
               for (let i = 0; i < this.executionContextIds.length; i++) {
                 this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]).catch(noopCatch);
               }
             } else {
               this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
             }
         }
       }

       // 2. Advance virtual time
   >>>>>>> REPLACE

3. Use `run_in_bash_session` to run `npm run build -w packages/renderer`.
4. Use `run_in_bash_session` to run the benchmark:
   ```bash
   npx tsx packages/renderer/tests/fixtures/benchmark.ts > bench1.log 2>&1
   npx tsx packages/renderer/tests/fixtures/benchmark.ts > bench2.log 2>&1
   npx tsx packages/renderer/tests/fixtures/benchmark.ts > bench3.log 2>&1
   grep -H "^render_time_s:" bench*.log
   ```
5. Evaluate results against baseline. The latest baseline is from PERF-650: ~2.261s.
6. If results are strictly worse or equivalent, discard the changes using `git checkout`. Otherwise, keep the changes.
7. Update `docs/status/RENDERER-EXPERIMENTS.md` with the outcome. Include the plan ID PERF-654.
8. Append the benchmark results to `packages/renderer/.sys/perf-results-PERF-654.tsv`.
9. If kept, use `run_in_bash_session` to run `npm test -w packages/renderer`.
10. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
11. Submit the PR using the `submit` tool.


## Results Summary
- **Best render time**: 27.245s (vs baseline 27.116s)
- **Improvement**: None
- **Kept experiments**: None
- **Discarded experiments**: PERF-654
