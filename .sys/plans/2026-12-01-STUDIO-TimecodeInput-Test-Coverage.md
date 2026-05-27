#### 1. Context & Goal
- **Objective**: Improve test coverage for the `TimecodeInput` component in Helios Studio.
- **Trigger**: The current test coverage report shows `TimecodeInput.tsx` has only 2.5% statement coverage.
- **Impact**: Ensures robust handling of manual timecode inputs, preventing UI bugs when users interact with the timeline controls.

#### 2. File Inventory
- **Create**: `packages/studio/src/components/Controls/TimecodeInput.test.tsx` (Unit tests for TimecodeInput)
- **Modify**: None
- **Read-Only**: `packages/studio/src/components/Controls/TimecodeInput.tsx`

#### 3. Implementation Spec
- **Architecture**: Use Vitest and React Testing Library to write unit tests for the React component.
- **Pseudo-Code**:
  - Render `TimecodeInput` with mocked `value`, `fps`, and `onChange` props.
  - Test rendering: verify it correctly formats the initial `value` using `framesToTimecode`.
  - Test interaction: simulate focus to enter edit mode, type a new timecode, and simulate blur to trigger `commitChange`.
  - Test `commitChange` valid case: verify `onChange` is called with the correct value derived from `timecodeToFrames`.
  - Test `commitChange` error case: verify error state is handled when an invalid timecode is parsed.
  - Test keyboard navigation: verify `Enter` blurs the input and `Escape` cancels editing and reverts the value.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- src/components/Controls/TimecodeInput.test.tsx --coverage`
- **Success Criteria**: All tests pass, and coverage for `TimecodeInput.tsx` increases significantly (e.g., >80%).
- **Edge Cases**:
  - Submitting an empty string or invalid string.
  - Pressing Escape while editing.
