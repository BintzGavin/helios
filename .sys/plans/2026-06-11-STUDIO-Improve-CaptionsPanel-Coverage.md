#### 1. Context & Goal
- **Objective**: Improve test coverage for the `CaptionsPanel` component in the Studio package.
- **Trigger**: The component `CaptionsPanel` has uncovered lines in `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx`. Following the "Nothing to Do Protocol", writing missing tests is a legitimate action when no vision gap exists.
- **Impact**: Increased confidence in `CaptionsPanel` functionality by ensuring edge cases, such as clearing captions, updating start and end times, and handling file uploads with invalid/valid SRT format, are verified.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.test.tsx` (Add tests for missing coverage areas)
- **Read-Only**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx`

#### 3. Implementation Spec
- **Architecture**: Use Vitest and React Testing Library to render the `CaptionsPanel` component and trigger the events that execute the uncovered code paths.
- **Pseudo-Code**:
  - Add a test for `handleClear`:
    - Click the "Clear" button and verify that `setCaptions` is called with an empty array.
  - Add a test for `handleUpdate` on time inputs:
    - Change the start time input and fire blur event. Verify `setCaptions` is called with parsed time.
    - Change the end time input and fire blur event. Verify `setCaptions` is called with parsed time.
  - Add a test for `handleFileUpload` success and failure:
    - Mock a FileReader with valid SRT text. Upload the file and check if `setCaptions` is called.
    - Mock a FileReader with invalid SRT text to trigger the `catch` block and the alert.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage src/components/CaptionsPanel/CaptionsPanel.tsx` using `run_in_bash_session`.
- **Success Criteria**: The test suite must pass and the coverage report should show 100% or near 100% statement and branch coverage for `CaptionsPanel.tsx`.
- **Edge Cases**: Empty files, files with invalid contents, invalid time formats.
