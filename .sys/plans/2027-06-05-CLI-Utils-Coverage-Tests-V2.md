#### 1. Context & Goal
- **Objective**: Improve test coverage for the \`install.ts\` and \`examples.ts\` CLI utility functions.
- **Trigger**: Missing coverage identified in \`docs/status/CLI.md\` logs and vitest coverage outputs for `install.ts` (lines 108-110, 131-133, 143, 162) and `examples.ts` (lines 10-11, 29-30).
- **Impact**: Provides 100% test coverage robustness for edge-case file system reading, package dependency fallback conditions, and API fetch payloads in utility files.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - \`packages/cli/src/utils/__tests__/install.test.ts\` - Add missing coverage tests for \`installComponent\` error catching and config fallbacks.
  - \`packages/cli/src/utils/__tests__/examples.test.ts\` - Add missing coverage tests for \`fetchExamples\` error handling branches.
- **Read-Only**:
  - \`packages/cli/src/utils/install.ts\`
  - \`packages/cli/src/utils/examples.ts\`

#### 3. Implementation Spec
- **Architecture**:
  - In \`install.test.ts\`:
    - Add a test mimicking \`package.json\` failing to read natively (\`fs.readFileSync\` throws an error), catching the silent swallow at lines 108-110.
    - Add a test throwing a non-Error string during \`installPackage\` execution to catch the stringified output fallback at lines 132-133.
    - Add a test where \`config.dependencies\` does not exist, triggering the fallback instantiation at line 143.
    - Add a test where \`configChanged\` remains false (e.g., all components already exist in the array), triggering the skip block at line 162.
  - In \`examples.test.ts\`:
    - Add a test for \`fetchExamples\` passing a repoPath missing a slash to trigger the invalid format warning on line 10.
    - Add a test for \`fetchExamples\` where the API returns a JSON object (not an Array), hitting the data format validation check at line 29.
- **Pseudo-Code**:
  - Using Vitest \`vi.mocked\`, provide the exact return values or throw scenarios during the execution cycle of the tested utility functions.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run \`cd packages/cli && npx vitest run --coverage src/utils/__tests__/\`
- **Success Criteria**: 100% branch and line coverage reported for \`install.ts\` and \`examples.ts\`.
- **Edge Cases**: \`fs.readFileSync\` mocked properly only for the \`package.json\` specific read calls while allowing other read calls (like \`helios.config.json\`) to pass through.
