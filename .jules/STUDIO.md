## 0.120.4 - Timeline Drag Drop
**Learning:** React drag events need `e.preventDefault()` on both `onDragOver` and `onDrop` to successfully trigger the drop event and calculate correct timeline placement metrics using cursor coordinates. And `playerState.schema` values might not have `inputProps` locally defined but it's available via context logic.
**Action:** Always ensure dragover receives `e.preventDefault()` to bypass default browser behaviors preventing the drop action.

## 0.121.10 - Update Keyboard Shortcuts Documentation
**Learning:** IMPOSSIBLE: DUPLICATION. The requested feature in `2026-11-14-STUDIO-Update-Keyboard-Shortcuts-Documentation.md` to add JKL shortcuts to `KeyboardShortcutsModal.tsx` is already implemented. The `Playback` section already includes `J`, `K`, and `L` shortcuts.
**Action:** Always check the codebase before implementing documentation updates to avoid duplicating effort.
## v0.121.11 - ExportJobSpec is already implemented
**Learning:** The "Export Job Spec" feature in the Renders Panel was found to be fully implemented, representing an "IMPOSSIBLE: DUPLICATION" scenario. This shows the importance of always checking the current codebase state before assuming missing functionality.
**Action:** Before executing a feature addition, comprehensively search the UI code (e.g. RendersPanel.tsx, StudioContext.tsx) and API endpoints to verify the gap actually exists.
## 0.121.16 - CLI Refine Component Removal
**Learning:** IMPOSSIBLE: DUPLICATION. The requested feature in `2026-10-23-STUDIO-Refine-CLI-Component-Removal.md` to refine the `helios remove` CLI command to delete component files by default is already implemented in `packages/cli/src/commands/remove.ts`.
**Action:** Always check the codebase before implementing features to avoid duplicating effort.

## 0.121.18 - Prioritize Test Coverage
**Learning:** When looking for a vision gap and falling back to test coverage, verify the component coverage accurately via vitest coverage reports to avoid trying to create missing components that already exist.
**Action:** Run npm run test -w packages/studio -- --coverage and examine the output for files with 0 or low coverage before committing to a coverage task.
