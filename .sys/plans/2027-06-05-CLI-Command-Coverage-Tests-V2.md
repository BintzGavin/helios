# 2027-06-05-CLI-Command-Coverage-Tests-V2

## 1. Context & Goal
- **Objective**: Improve code coverage for CLI commands (`render.ts`, `build.ts`, `init.ts`, and `studio.ts`) to achieve 100% statement and branch coverage in the CLI domain.
- **Trigger**: The fallback action under the NOTHING TO DO PROTOCOL requires idling when coverage reaches 100%, but current coverage is lower due to edge cases and untested callbacks in CLI commands.
- **Impact**: Full code coverage ensures stable execution for the primary interface to distributed workflows, component registry, and product surfaces, fulfilling the requirements for a stable domain.

## 2. File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/cli/src/commands/__tests__/build.test.ts`
  - `packages/cli/src/commands/__tests__/init.test.ts`
  - `packages/cli/src/commands/__tests__/render.test.ts`
  - `packages/cli/src/commands/__tests__/studio.test.ts`
- **Read-Only**:
  - `packages/cli/src/commands/build.ts`
  - `packages/cli/src/commands/init.ts`
  - `packages/cli/src/commands/render.ts`
  - `packages/cli/src/commands/studio.ts`

## 3. Implementation Spec
- **Architecture**: We will expand the existing vitest suites for `build`, `init`, `render`, and `studio` commands to trigger uncovered branches and correctly evaluate nested callbacks.
- **Pseudo-Code**:
  - In `build.test.ts`: Mock `fs.existsSync` to test the `.helios-build-entry.html` cleanup block. Test output file renaming (line 65-75).
  - In `init.test.ts`: Add test cases for missing properties (e.g. `if (!response.framework) process.exit(0);`), handle edge cases where `isScaffolded` is correctly populated, and ensure the interactive config flow is exhaustively traversed. Mock `prompts` responses corresponding to early exits.
  - In `render.test.ts`: Test edge cases of `concurrency`, `jobBaseUrl`, `startFrame`, `frameCount` parsing, missing input, invalid number validations, and `mixOptions.videoCodec !== 'copy'`. Add error paths.
  - In `studio.test.ts`: Add test cases for `onCheckInstalled` returning `false` (when component doesn't exist), test falling back to `config?.directories.components || 'src/components/helios'`, and test checking if files actually exist. Make sure `pluginConfig.onInstallComponent` etc are actually executed and properly mock dependencies to ensure coverage registers.
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli -- --coverage`.
- **Success Criteria**: 100% statement and branch coverage reported for `build.ts`, `init.ts`, `render.ts`, and `studio.ts`.
- **Edge Cases**: Make sure mocks properly simulate missing directories, invalid numbers, and incomplete prompts to ensure error paths are covered without leaking exceptions to Vitest runner.