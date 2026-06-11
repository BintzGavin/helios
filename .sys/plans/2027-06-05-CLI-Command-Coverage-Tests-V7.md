#### 1. Context & Goal
- **Objective**: Implement 100% test coverage for the remaining branch logic in the CLI commands `job.ts` and `render.ts`.
- **Trigger**: The vitest coverage reports for `packages/cli` shows uncovered branches in `render.ts` (lines 62, 135, 149, 203) and `job.ts` (lines 175, 210) mainly handling edge cases and option defaults.
- **Impact**: Attaining 100% test coverage across the command components fulfills the regression testing goals outlined in the backlog.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/__tests__/render.test.ts`, `packages/cli/src/commands/__tests__/job.test.ts`
- **Read-Only**: `packages/cli/src/commands/render.ts`, `packages/cli/src/commands/job.ts`

#### 3. Implementation Spec
- **Architecture**: Update existing Vitest mock setups to hit missing branches.
- **Pseudo-Code**:
  - `render.test.ts`:
    - Add a test setting `HELIOS_BROWSER_ARGS` environment variable and asserting that it runs the branch in `render.ts` line 62.
    - Add a test that verifies the chunking logic `if (url.startsWith('file://'))` by checking a URL without 'file://' resolving as is (line 135).
    - Add a test that verifies the logic where `jobBaseUrl` does not end with a slash (`/`) resolving the string properly (line 149).
    - Add a test that overrides the command flag options like `--audio-codec`, `--video-codec`, `--quality` to properly push them into the job mix command strings (to hit line 10-17 missing `mixOptions` values or default branches in `render.ts`).
    - Note line 203 refers to `job.render(options)` error catch in `render.ts`, mock it to throw and ensure we capture it.
  - `job.test.ts`:
    - Add a test running `docker` adapter without `dockerArgs` to test the default array mapping fallback (line 175).
    - Add a test running `hetzner` adapter without `hetznerSshKeyId` to ensure it falls back to `undefined` (line 210).
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/commands/__tests__/render.test.ts` and `cd packages/cli && npx vitest run --coverage src/commands/__tests__/job.test.ts` using the `run_in_bash_session` tool.
- **Success Criteria**: Coverage for `src/commands/render.ts` and `src/commands/job.ts` must reach 100% for Stmts and Branch.
