#### 1. Context & Goal
- **Objective**: Improve code coverage for the CLI commands `job` and `render` by testing remaining uncovered branches.
- **Trigger**: Coverage report shows missing coverage for missing adapter options in `job.ts`, executor error handling in `job.ts`, and specific formatting/command line flags in `render.ts`.
- **Impact**: Reaching 100% coverage on these files to ensure all edge cases are properly tested and prevent regressions.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/cli/src/commands/__tests__/job.test.ts` (Add tests for adapter missing options and executor error handling)
  - `packages/cli/src/commands/__tests__/render.test.ts` (Add tests for `--browser-args` and `mixOptions` flag formatting)
- **Read-Only**:
  - `packages/cli/src/commands/job.ts`
  - `packages/cli/src/commands/render.ts`

#### 3. Implementation Spec
- **Architecture**: Append unit tests using Vitest mocking to trigger the remaining uncovered statements.
- **Pseudo-Code**:
  - `job.test.ts`:
    - Test deno adapter missing `--deno-service-url`
    - Test vercel adapter missing `--vercel-service-url`
    - Test modal adapter missing `--modal-endpoint-url`
    - Test hetzner adapter missing `--hetzner-api-token`
    - Test executor error (mock `executor.execute` to throw, assert `console.error` and `process.exit(1)`)
  - `render.test.ts`:
    - Test `render --browser-args "--no-sandbox,--disable-gpu"` and assert `console.log`
    - Test `render --emit-job --video-codec libx264 --audio-codec aac --quality 23` and assert job manifest mergeCommand includes these flags.
- **Public API Changes**: None
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/commands/__tests__/job.test.ts src/commands/__tests__/render.test.ts`
- **Success Criteria**: Line coverage reaches 100% for `job.ts` and `render.ts`.
- **Edge Cases**: Ensure error parsing works even if `err` is not a standard Error object with `message`.
