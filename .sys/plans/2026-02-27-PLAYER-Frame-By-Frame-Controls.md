# Context & Goal
- **Objective**: Implement frame-by-frame stepping controls in `<helios-player>` using standard keyboard shortcuts (`.` / `,`) and refined Arrow key behavior.
- **Trigger**: Vision gap: README lists "frame-by-frame" controls as a planned feature, but they are currently missing.
- **Impact**: Enhances the "In-Browser Preview" experience for precise animation inspection, aligning with standard NLE/Studio behavior.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `handleKeydown` logic)
- **Modify**: `packages/player/src/index.test.ts` (Add unit tests for new shortcuts)
- **Read-Only**: `packages/player/src/controllers.ts`

# Implementation Spec
- **Architecture**: Update the `handleKeydown` event listener in `HeliosPlayer` web component.
- **Pseudo-Code**:
  ```typescript
  handleKeydown(e):
    if exporting or input focused: return
    switch e.key:
      case ArrowRight:
      case L:
        amount = e.shiftKey ? 10 : 1
        seekRelative(amount)
      case ArrowLeft:
      case J:
        amount = e.shiftKey ? -10 : -1
        seekRelative(amount)
      case ".":
        seekRelative(1)
      case ",":
        seekRelative(-1)
      ...
  ```
- **Public API Changes**: None (internal UI behavior only).
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
  - Unit tests pass for `.` (+1 frame), `,` (-1 frame).
  - Unit tests pass for `ArrowRight` (+1 frame) and `Shift+ArrowRight` (+10 frames).
  - Unit tests pass for `ArrowLeft` (-1 frame) and `Shift+ArrowLeft` (-10 frames).
- **Edge Cases**: Shift modifier handling on different inputs (standard event handling covers this).
