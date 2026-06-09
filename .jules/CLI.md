## [v0.46.39] - CLI Command Coverage Spec V3
**Learning:** Initial attempts to run coverage across the entire `packages/cli` workspace via Vitest timed out consistently after 400s. Further examination of line-by-line coverage outputs required targeting specific files.
**Action:** When gathering metrics for execution plans on testing gaps, always explicitly navigate to the package and test specific folders (e.g. `cd packages/cli && npx vitest run --coverage src/commands/__tests__`) instead of wide wildcard runs. Never hallucinate specific line numbers.
## [v0.46.41] - CLI Command Coverage Spec V5
**Learning:** Checking overall command coverage (`src/commands/`) highlighted additional edge cases for command prompt cancellations (`undefined` responses).
**Action:** When gathering metrics for execution plans on testing gaps, always explicitly target line-level coverage missing points.
## [v0.46.43] - CLI Command Coverage Spec V6
**Learning:** Found remaining uncovered branches in `job.ts` relating to missing CLI options for new cloud adapters (Deno, Vercel, Modal, Hetzner), as well as missing error catching coverage for the `JobExecutor`. For `render.ts`, we missed the `browserArgs` array logger and `--video-codec / --audio-codec / --quality` formatting logic for the emitted job's merge command.
**Action:** Consistently verify execution of all CLI flags by targeting the specific missing lines (e.g. 75, 172, 175, 178 in `render.ts` and 179, 187, 196, 204, 230-231 in `job.ts`).
