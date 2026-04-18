#### 1. Context & Goal
- **Objective**: Add missing undocumented keyboard shortcuts (J, L, comma, period) to the visual "Shortcuts Help" overlay UI.
- **Trigger**: Vision gap identified in `.jules/PLAYER.md` and `packages/player/README.md`. The README lists `J` (seek backward 10s), `L` (seek forward 10s), `,` (seek backward 1 frame), and `.` (seek forward 1 frame), and they are actively handled in `handleKeydown`, but they are missing from the `renderShortcuts` UI list.
- **Impact**: Ensures that all available and documented keyboard shortcuts are discoverable through the player UI's Shortcuts menu.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts` (Update `renderShortcuts` method array)
- **Read-Only**: `packages/player/README.md`

#### 3. Implementation Spec
- **Architecture**: The shortcuts overlay uses a hardcoded array of objects in `renderShortcuts()`.
- **Pseudo-Code**:
  - Locate `private renderShortcuts()` in `packages/player/src/index.ts`.
  - Add `{ key: "J", desc: "Seek backward 10s" }` to the `shortcuts` array.
  - Add `{ key: "L", desc: "Seek forward 10s" }` to the `shortcuts` array.
  - Add `{ key: ",", desc: "Seek backward 1 frame" }` to the `shortcuts` array.
  - Add `{ key: ".", desc: "Seek forward 1 frame" }` to the `shortcuts` array.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/player` to ensure no tests are broken.
- **Success Criteria**: The `renderShortcuts` method successfully renders the new shortcuts.
- **Edge Cases**: Ensure the formatting strings match the existing `shortcuts` object structure and styling.
