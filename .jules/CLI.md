## [v0.46.39] - CLI Command Coverage Spec V3
**Learning:** Initial attempts to run coverage across the entire `packages/cli` workspace via Vitest timed out consistently after 400s. Further examination of line-by-line coverage outputs required targeting specific files.
**Action:** When gathering metrics for execution plans on testing gaps, always explicitly navigate to the package and test specific folders (e.g. `cd packages/cli && npx vitest run --coverage src/commands/__tests__`) instead of wide wildcard runs. Never hallucinate specific line numbers.
## [v0.46.41] - CLI Command Coverage Spec V5
**Learning:** Checking overall command coverage (`src/commands/`) highlighted additional edge cases for command prompt cancellations (`undefined` responses).
**Action:** When gathering metrics for execution plans on testing gaps, always explicitly target line-level coverage missing points.
## [v0.46.43] - CLI Command Coverage Spec V6
**Learning:** Found remaining uncovered branches in `job.ts` relating to missing CLI options for new cloud adapters (Deno, Vercel, Modal, Hetzner), as well as missing error catching coverage for the `JobExecutor`. For `render.ts`, we missed the `browserArgs` array logger and `--video-codec / --audio-codec / --quality` formatting logic for the emitted job's merge command.
**Action:** Consistently verify execution of all CLI flags by targeting the specific missing lines (e.g. 75, 172, 175, 178 in `render.ts` and 179, 187, 196, 204, 230-231 in `job.ts`).
## [v0.46.45] - CLI Command Coverage Spec V7
**Learning:** Checking overall command coverage highlighted additional missing lines in `build.ts` (cleanup phase) and `studio.ts` (handling config and skills roots).
**Action:** When gathering metrics for execution plans on testing gaps, always explicitly navigate to the package and test specific folders and identify the explicit missing branches for building accurate planner specs.
## [v0.46.49] - CLI Utils Coverage Tests Spec
**Learning:** Found remaining uncovered branches in `packages/cli/src/utils` specifically related to failure catch blocks on file mutations in `examples.ts` and empty parent directory recursive pruning in `uninstall.ts` (lines 83, 119, 140, 147 in `examples.ts`, 50-54 in `uninstall.ts`, 35-50 in `package-manager.ts`, 132, 141 in `install.ts`).
**Action:** Always mock `fs.writeFileSync` or `fs.readdirSync` with an error throwing impl to accurately hit file system handling fallback coverage lines.
## [v0.46.51] - CLI Command Coverage Spec V9
**Learning:** Checking coverage highlighted that missing branches existed for user aborts on prompts across the `deploy` subcommands (e.g. `typeof response.value === 'undefined'` check).
**Action:** When tracking uncovered branches to improve test suites, ensure user prompt cancellations are addressed.
## [v0.46.58] - CLI Registry Client Coverage Tests
**Learning:** Found missing coverage for early cache returns and fetch error catching in `client.ts`.
**Action:** Add tests specifically mocking cache state and file fetch errors to hit lines 32, 85, 90-91, 96-97, 137.
## [v0.46.60] - Avoid Duplicate Plans
**Learning:** If a plan in `/.sys/plans/` has already been fully completed by an earlier version but the file was left behind (or recreated), do not execute it again. Mark it as IMPOSSIBLE/DUPLICATION and remove the redundant plan file.
**Action:** Always check the codebase (e.g. coverage reports or file contents) to verify if the work is already done before starting. If it is, delete the plan and document the duplication.
