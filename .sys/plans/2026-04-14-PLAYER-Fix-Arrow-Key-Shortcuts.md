#### 1. Context & Goal
- **Objective**: Fix the arrow key keyboard shortcuts to match the documented vision.
- **Trigger**: The `README.md` documents `ArrowLeft` / `ArrowRight` as seeking 1 frame and `Shift` + `ArrowLeft` / `ArrowRight` as seeking 10 frames. The current implementation in `index.ts` seeks by 5 seconds and 10 seconds.
- **Impact**: Brings implementation into parity with the promised keyboard shortcut behaviors, preventing user confusion.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/player/src/index.ts`: Update `handleKeydown` to use `seekRelative` instead of `seekRelativeSeconds` for `ArrowLeft` and `ArrowRight`.
  - `packages/player/src/index.test.ts`: Update the keyboard shortcut unit tests to assert frame-based seeking instead of second-based seeking.
- **Read-Only**: [`packages/player/README.md`]

#### 3. Implementation Spec
- **Architecture**: Keyboard events in the `HeliosPlayer` component delegate seeking logic to internal `seekRelative` helpers.
- **Pseudo-Code**:
  - In `index.ts`, change `case "ArrowRight": this.seekRelativeSeconds(e.shiftKey ? 10 : 5);` to `this.seekRelative(e.shiftKey ? 10 : 1);`.
  - Change `case "ArrowLeft": this.seekRelativeSeconds(e.shiftKey ? -10 : -5);` to `this.seekRelative(e.shiftKey ? -10 : -1);`.
  - In `index.test.ts`, update the tests `dispatchKey('ArrowRight')` and `dispatchKey('ArrowLeft')` to assert `expect(mockController.seek).toHaveBeenCalledWith(currentFrame +/- (shiftKey ? 10 : 1))`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npx vitest run src/index.test.ts`
- **Success Criteria**: All unit tests for keyboard shortcuts pass and the tests reflect the frame-based increments.
- **Edge Cases**: Ensure the boundaries (seeking past end or before start) still behave correctly and clamp at 0 or total frames.
