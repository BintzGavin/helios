#### 1. Context & Goal
- **Objective**: Improve test coverage for `CaptionsPanel.tsx`.
- **Trigger**: The current test coverage for `CaptionsPanel.tsx` is at 60%, leaving edge cases like file parsing, error handling, time formatting variations, and deletion logic uncovered. Following the "Nothing to Do Protocol", when no vision gap exists, we improve test coverage.
- **Impact**: Increased test reliability and prevents regressions in the Captions Panel functionality.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.test.tsx` (Add test cases for full coverage)
- **Read-Only**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx`

#### 3. Implementation Spec
- **Architecture**: Extend existing vitest test file to cover branches in time parsing (e.g. standard times vs invalid inputs) and file uploads (successful read, error on parse).
- **Pseudo-Code**:
  - Add test for `formatTime` with hours correctly formatting (`hours !== '00'`).
  - Add test for `parseTime` handling mm:ss, hh:mm:ss, and fallback parsing.
  - Add tests for `handleFileUpload` success and failure using mocked `FileReader` or simulated DOM events.
  - Add test for clearing captions.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage src/components/CaptionsPanel/CaptionsPanel.test.tsx`.
- **Success Criteria**: Line coverage for `CaptionsPanel.tsx` reaches 100%.
- **Edge Cases**: Malformed file inputs and unexpected time string formats.
