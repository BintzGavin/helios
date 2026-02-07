# 2026-02-07-PLAYER-fix-shortcuts.md

## 1. Context & Goal
- **Objective**: Align keyboard shortcuts with the documented vision to support frame-accurate seeking.
- **Trigger**: Vision Gap - The `README.md` states that Arrow keys seek 1 frame (10 with Shift), but the implementation currently seeks 5 seconds (or 10 seconds). Additionally, the `.` and `,` keys do not support the documented Shift modifier for 10-frame jumps.
- **Impact**: This change improves the user experience for animators and developers who need precise frame-by-frame review capabilities, ensuring the player behaves as a "programmatic video engine" tool rather than a generic media player.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update keydown logic in `HeliosPlayer` class)
- **Modify**: `packages/player/src/interaction.test.ts` (Add verification tests)
- **Read-Only**: `packages/player/README.md` (Reference for expected behavior)

## 3. Implementation Spec
- **Architecture**: Update `handleKeydown` method in `HeliosPlayer` class (in `index.ts`).
- **Logic Changes**:
  - `ArrowRight`: Change from `seekRelativeSeconds(5/10)` to `this.seekRelative(e.shiftKey ? 10 : 1)`.
  - `ArrowLeft`: Change from `seekRelativeSeconds(-5/-10)` to `this.seekRelative(e.shiftKey ? -10 : -1)`.
  - `.`: Add support for `e.shiftKey`: `this.seekRelative(e.shiftKey ? 10 : 1)`.
  - `,`: Add support for `e.shiftKey`: `this.seekRelative(e.shiftKey ? -10 : -1)`.
  - Note: `seekRelative` is an existing private method in `HeliosPlayer`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/player`.
- **New Tests**:
  - Add test case: Pressing `ArrowRight` seeks 1 frame.
  - Add test case: Pressing `Shift` + `ArrowRight` seeks 10 frames.
  - Add test case: Pressing `ArrowLeft` seeks -1 frame.
  - Add test case: Pressing `Shift` + `ArrowLeft` seeks -10 frames.
  - Add test case: Pressing `.` with `Shift` seeks 10 frames.
  - Add test case: Pressing `,` with `Shift` seeks -10 frames.
- **Success Criteria**: All new and existing tests pass.
- **Edge Cases**: Seeking at start/end of timeline (handled by existing `seek` clamping logic).

## 5. Pre-Commit
- **Instructions**: Run `pre_commit_instructions` to ensure all checks pass.
