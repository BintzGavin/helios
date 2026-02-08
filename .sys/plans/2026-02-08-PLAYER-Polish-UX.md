#### 1. Context & Goal
- **Objective**: Align keyboard shortcuts with frame-accurate vision and expose export bitrate in UI.
- **Trigger**: Vision gap (Shortcuts are currently time-based 5s, Vision requires 1 frame). Client-side export robustness.
- **Impact**: Improved ergonomics for frame-by-frame review and user control over export quality.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `handleKeydown` logic, `renderShortcuts` text, `renderExportMenu` UI, and `startExportFromMenu` logic)
- **Modify**: `tests/e2e/verify-player.ts` (Add verification for frame-accurate seeking shortcuts)
- **Modify**: `packages/studio/package.json` (Update `@helios-project/player` dependency to `^0.76.1` to fix workspace linking)

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosPlayer` handles UI events and delegates to `HeliosController`.
  - Shortcuts logic moves from `seekRelativeSeconds` (time-based) to `seekRelative` (frame-based).
  - Export Menu adds a pure UI element (Select) that feeds into the existing `export()` API.
- **Pseudo-Code**:
  ```typescript
  // handleKeydown
  case "ArrowRight":
    this.seekRelative(shift ? 10 : 1); // Was 5s
  case "ArrowLeft":
    this.seekRelative(shift ? -10 : -1);
  case ".":
    this.seekRelative(shift ? 10 : 1); // Was 1, ignore shift

  // renderExportMenu
  // Add <select> for bitrate with values 1000000, 2500000, 5000000, 10000000

  // startExportFromMenu
  // Pass bitrate from select to this.export({ bitrate: ... })
  ```
- **Dependencies**:
  - Fix `packages/studio` package.json to ensure `npm install` works in the workspace.

#### 4. Test Plan
- **Verification**:
  1. `npm install` (to verify dependency fix)
  2. `npm run build -w packages/core && npm run build -w packages/player`
  3. `npx playwright install chromium` (if needed)
  4. `npx tsx tests/e2e/verify-player.ts`
- **Success Criteria**:
  - `verify-player.ts` passes with new checks for 1-frame and 10-frame seeking.
  - Manual check of Export Menu shows Bitrate dropdown (implicit via code review).
- **Edge Cases**:
  - Playback rate != 1 (Shortcuts should still be 1 frame).
