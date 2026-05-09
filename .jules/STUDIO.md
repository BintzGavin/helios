## 0.120.4 - Timeline Drag Drop
**Learning:** React drag events need `e.preventDefault()` on both `onDragOver` and `onDrop` to successfully trigger the drop event and calculate correct timeline placement metrics using cursor coordinates. And `playerState.schema` values might not have `inputProps` locally defined but it's available via context logic.
**Action:** Always ensure dragover receives `e.preventDefault()` to bypass default browser behaviors preventing the drop action.

## 0.121.10 - Update Keyboard Shortcuts Documentation
**Learning:** IMPOSSIBLE: DUPLICATION. The requested feature in `2026-11-14-STUDIO-Update-Keyboard-Shortcuts-Documentation.md` to add JKL shortcuts to `KeyboardShortcutsModal.tsx` is already implemented. The `Playback` section already includes `J`, `K`, and `L` shortcuts.
**Action:** Always check the codebase before implementing documentation updates to avoid duplicating effort.
## v0.121.11 - ExportJobSpec is already implemented
**Learning:** The "Export Job Spec" feature in the Renders Panel was found to be fully implemented, representing an "IMPOSSIBLE: DUPLICATION" scenario. This shows the importance of always checking the current codebase state before assuming missing functionality.
**Action:** Before executing a feature addition, comprehensively search the UI code (e.g. RendersPanel.tsx, StudioContext.tsx) and API endpoints to verify the gap actually exists.
