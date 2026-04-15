#### 1. Context & Goal
- **Objective**: Update the ArrowLeft and ArrowRight keyboard shortcuts to seek by 1 frame (or 10 frames with Shift) instead of 5/10 seconds.
- **Trigger**: Vision gap identified between `README.md` documentation and actual implementation.
- **Impact**: Ensures keyboard navigation matches documented behavior and provides the promised fine-grained frame control.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` - Update keydown handler logic for Arrow keys.
- **Modify**: `packages/player/src/index.test.ts` - Update keydown tests to verify frame-based seeking.
- **Read-Only**: `packages/player/README.md` - Verify promised behavior.

#### 3. Implementation Spec
- **Architecture**: Standard DOM keyboard event handling within the Web Component class.
- **Pseudo-Code**:
  ```typescript
  // Inside keydown handler switch block
  case "ArrowRight":
    this.seekRelative(e.shiftKey ? 10 : 1);
    break;
  case "ArrowLeft":
    this.seekRelative(e.shiftKey ? -10 : -1);
    break;
  ```
- **Public API Changes**: None. Internal shortcut behavior change only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npx vitest run src/index.test.ts`
- **Success Criteria**: Keydown tests for ArrowLeft and ArrowRight should assert `controller.seek` is called with correctly calculated frame offsets (e.g. currentFrame + 1, currentFrame - 10) rather than second-based offsets. All tests pass.
- **Edge Cases**: Ensuring `shiftKey` modifier correctly multiplies the frame step to 10. Frame seeking beyond boundaries (0 or duration) should be handled safely by the existing `seekRelative` or `controller.seek` methods.
