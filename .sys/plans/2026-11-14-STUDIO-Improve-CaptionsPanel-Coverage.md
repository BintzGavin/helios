# Improve CaptionsPanel Coverage

## 1. Context & Goal
- **Objective**: Improve the test coverage of `CaptionsPanel.tsx` in `@helios-project/studio` to near 100%.
- **Trigger**: Following the "Nothing to Do Protocol", there are no apparent vision gaps, and checking test coverage revealed that `CaptionsPanel.tsx` has only ~60% branch/statement coverage.
- **Impact**: Improving test coverage ensures robustness of the component, specifically testing file upload functionality and time formatting edge cases.

## 2. File Inventory
- **Modify**:
  - `packages/studio/src/components/CaptionsPanel/CaptionsPanel.test.tsx`: Add more test cases to cover file uploads, error handling during file parsing, and timecode updates.

## 3. Implementation Spec
- **Testing Logic**:
  - Add a test for `handleFileUpload` with valid SRT data, mocking `FileReader`.
  - Add a test for `handleFileUpload` with invalid SRT data, ensuring the `alert` is called.
  - Add a test for updating a timecode (e.g., changing 'startTime' to a specific string format like '00:01:00') via `handleUpdate`.
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage src/components/CaptionsPanel/CaptionsPanel.test.tsx` and verify that the coverage reaches 100% (or very close).
- **Success Criteria**:
  - The coverage report for `CaptionsPanel.tsx` shows near 100% statement, branch, and function coverage.
- **Edge Cases**:
  - File upload errors (e.g., malformed SRT strings).
  - Time format permutations in `parseTime`.
