#### 1. Context & Goal
- **Objective**: Improve the test coverage for `TimecodeInput` to 100%.
- **Trigger**: Backlog item to increase unit test coverage. Currently coverage misses the catch block.
- **Impact**: It helps ensure reliability of the timecode input edge cases.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/studio/src/components/Controls/TimecodeInput.test.tsx`
- **Read-Only**: `packages/studio/src/components/Controls/TimecodeInput.tsx`

#### 3. Implementation Spec
- **Architecture**: In order to test the `catch` block on line 24 of `TimecodeInput.tsx`, we need to cause `framesToTimecode` to throw an error.
- **Pseudo-Code**:
  - Mock `@helios-project/core` at the top of the test file using `vi.mock`. Provide an implementation for `framesToTimecode` that usually delegates to the original function, but can be overridden.
  - Implement a mock that can throw an error using `mockImplementationOnce` in the "falls back to 00:00:00:00" test.
- **Public API Changes**: none
- **Dependencies**: none

#### 4. Test Plan
- **Verification**: `npx vitest run src/components/Controls/TimecodeInput.test.tsx --coverage`
- **Success Criteria**: 100% test coverage for `TimecodeInput`.
- **Edge Cases**: Throwing in the catch block.
