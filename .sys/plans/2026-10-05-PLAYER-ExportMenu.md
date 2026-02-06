# 2026-10-05-PLAYER-ExportMenu.md

#### 1. Context & Goal
- **Objective**: Implement an "Export Menu" in `<helios-player>` to allow users to configure export settings (Format, Resolution, Filename) and take snapshots directly from the UI.
- **Trigger**: "Client-Side Export" is a key feature but lacks UI configuration; users are stuck with default attributes or must use DevTools. Snapshots (PNG) are supported by API but not accessible via UI.
- **Impact**: Drastically improves usability of the export feature, unlocking "Snapshot" use case and allowing resolution/format adjustments without code changes.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add `export-menu` HTML/CSS, update `export-btn` logic, add `renderExportMenu` method).
- **Read-Only**: `packages/player/src/features/exporter.ts` (Reference for API options).

#### 3. Implementation Spec
- **Architecture**: Extend the existing Shadow DOM with a new `.export-menu` (sibling to `.settings-menu`). Reuse existing menu styling patterns (CSS).
- **Pseudo-Code**:
  ```typescript
  // In index.ts class HeliosPlayer

  // 1. Add exportMenu property
  private exportMenu: HTMLDivElement;

  // 2. In renderExportMenu()
  // Create UI with:
  // - Input: Filename (text)
  // - Select: Format (mp4, webm, png, jpeg)
  // - Select: Scale (1x, 0.5x) - calculating width/height from videoWidth/height
  // - Checkbox: Include Captions
  // - Button: "Export Video" (or "Save Snapshot" if image format) -> calls startExport()

  // 3. Update exportBtn click handler
  // If isExporting: calls abortController.abort()
  // Else: toggleExportMenu()

  // 4. startExport(options)
  // Closes menu
  // Calls this.export(options)
  // Updates UI state (managed by export() logic already)
  ```
- **Public API Changes**: None (Internal UI change).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player` followed by `npm run test`.
- **Manual Verification**:
  - Load a composition.
  - Click "Export". Verify menu opens (instead of starting immediately).
  - Change Filename to "test-video".
  - Change Format to "webm".
  - Click "Export Video". Verify it exports as "test-video.webm".
  - Click "Export" again.
  - Change Format to "png".
  - Button text should change to "Save Snapshot".
  - Click "Save Snapshot". Verify PNG download.
- **Edge Cases**:
  - Exporting while playing (should pause).
  - Cancel export (should work as before).
