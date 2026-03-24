1.  **Preparation and Environment Setup**
    -   Run `npm install` and ensure all workspaces are built correctly.
    -   Build the example composition using the CLI: `npx tsx packages/cli/src/index.ts build examples/simple-animation -o examples/simple-animation/output/build`.
2.  **Claim Plan**
    -   Create and claim the plan document `.sys/plans/PERF-046-simplify-seektime-script.md` using the content from the prompt specification.
3.  **Baseline Measurement**
    -   Modify `packages/renderer/scripts/render.ts` to output benchmark timing logic and accept command-line arguments.
    -   Run the baseline render test on the built composition. Record the baseline performance metrics in `packages/renderer/.sys/perf-results-PERF-046.tsv`.
4.  **Experiment Execution: Optimize `SeekTimeDriver`**
    -   Modify `packages/renderer/src/drivers/SeekTimeDriver.ts`.
    -   Ensure `Promise.race` cleans up `setTimeout` timeouts when waiting for stability.
    -   Refactor media scanning to only loop over media elements if `cachedMediaElements.length > 0`.
5.  **Benchmark and Evaluate Experiment**
    -   Re-run the build for `packages/renderer`.
    -   Execute the rendering benchmark script again to observe performance differences.
    -   Compare the new performance metrics against the baseline.
6.  **Validate Changes**
    -   Run `npx vitest run packages/cli/src/commands/components.test.ts` to perform a Canvas Smoke Test.
    -   Run `npx tsx tests/e2e/verify-player.ts` to verify the player functionality.
7.  **Documentation Update**
    -   Update `packages/renderer/.sys/perf-results-PERF-046.tsv` with the experiment run results.
    -   Update the journal `docs/status/RENDERER-EXPERIMENTS.md` with the findings under "What Works" or "What Doesn't Work" (in this case, it was kept for stability but had negligible performance impact).
    -   Update `.sys/plans/PERF-046-simplify-seektime-script.md` frontmatter to `status: complete` and append the results summary.
8.  **Pre-commit and Cleanup**
    -   Run `pre_commit_instructions` tool to perform required verifications.
    -   Ensure no modified test benchmark code remains in `packages/renderer/scripts/render.ts` (revert it to origin).
    -   Clean up temporary run logs and generated test video outputs.
9.  **Submit Changes**
    -   Commit and submit the changes using the `submit` tool.
