#### 1. Context & Goal
- **Objective**: Improve code coverage in `packages/cli` command files to reach closer to 100%.
- **Trigger**: `src/commands/__tests__/init.test.ts` has missing test cases for lines 103-119 (example fetching/download logic), 192 (detecting solid/svelte/react/vue), and 241-242 (error writing config file). `src/commands/__tests__/render.test.ts` is missing coverage for lines 133-153 (base URL logic). `src/commands/__tests__/job.test.ts` is missing coverage for `azure`, `fly`, and `cloudflare-sandbox` adapters. `src/commands/__tests__/build.test.ts` is missing coverage for the rename output file logic. `src/commands/__tests__/studio.test.ts` has uncovered lines in `onCheckInstalled` (when comp is undefined). `src/commands/__tests__/components.test.ts` is missing an edge case where query results in 0 components.
- **Impact**: Better test reliability and stability for the CLI tool.

#### 2. File Inventory
- **Create**:
- **Modify**:
  - `packages/cli/src/commands/__tests__/init.test.ts` (Add tests for example list fetching edge cases, config framework auto-detection, and config write errors)
  - `packages/cli/src/commands/__tests__/render.test.ts` (Add test for `--base-url` logic in job chunk generation with relative directory paths)
  - `packages/cli/src/commands/__tests__/job.test.ts` (Add tests for omitting required args for adapters)
  - `packages/cli/src/commands/__tests__/build.test.ts` (Add tests for `builtEntryPath` renaming)
  - `packages/cli/src/commands/__tests__/studio.test.ts` (Add test for `onCheckInstalled` when component is not found)
  - `packages/cli/src/commands/__tests__/components.test.ts` (Add test for missing search components)
- **Read-Only**:
  - `packages/cli/src/commands/init.ts`
  - `packages/cli/src/commands/render.ts`
  - `packages/cli/src/commands/job.ts`
  - `packages/cli/src/commands/build.ts`
  - `packages/cli/src/commands/studio.ts`
  - `packages/cli/src/commands/components.ts`

#### 3. Implementation Spec
- **Architecture**: Append unit tests using `vitest` mocking conventions existing in each test file.
- **Pseudo-Code**:
  - In `init.test.ts`, write a test that mocks `fs.readFileSync` for `package.json` to include `"react": "*"` inside `dependencies` to auto-detect framework.
  - In `init.test.ts`, write a test that mocks `prompts` to pick an example, and `downloadExample` succeeds.
  - In `init.test.ts`, write a test for `fs.promises.writeFile` throwing an error when saving the config file.
  - In `render.test.ts`, run `render --emit-job job.json --base-url http://my-remote-site.com` and assert the chunk command input includes the remote URL.
  - In `job.test.ts`, write missing error tests for adapter params (`azure`, `fly`, `cloudflare-sandbox`).
  - In `build.test.ts`, mock `fs.existsSync` to return true for `builtEntryPath` and assert `fs.renameSync` is called.
  - In `studio.test.ts`, in `onCheckInstalled`, check for a component that does not exist in `components` list, expect it to return `false`.
  - In `components.test.ts`, mock `getComponents` to return a list, but query filters to 0, expect console out to have `No components found matching "xyz"`.
- **Public API Changes**: None
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/commands`
- **Success Criteria**: Line coverage should substantially increase for `init.ts`, `render.ts`, `job.ts`, `build.ts`, `components.ts`, and `studio.ts`, avoiding regression in previously covered lines.
- **Edge Cases**: None.
