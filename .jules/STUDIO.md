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
## v0.121.21 - STUDIO-Timeline-Drag-Drop
**Learning:** IMPOSSIBLE: DUPLICATION. The requested feature in `2026-11-13-STUDIO-Timeline-Drag-Drop.md` to implement drag and drop support for the Timeline to accept assets (audio/video) is already implemented in `Timeline.tsx` via the `handleDrop` function. The test coverage for the `Timeline.test.tsx` component passes successfully.
**Action:** Always verify if a feature is already implemented before attempting to build it.
## 0.121.23 - STUDIO-Improve-AudioMeter-Coverage
**Learning:** Found a component (`AudioMeter.tsx`) that had missing lines covered in its unit tests. Writing a test file to cover this gap is a legitimate planning action when no vision gap exists, following the "Nothing to Do Protocol".
**Action:** When a domain is aligned with the vision, running test coverage (e.g., `npm run test -w packages/studio -- --coverage`) can reveal useful tasks to create.
## 0.121.32 - TimelineAudioTrack Coverage Update
**Learning:** Found an untested area in `TimelineAudioTrack.tsx` (waveform canvas drawing logic in `useEffect`) and updated `TimelineAudioTrack.test.tsx` to reach 100% coverage, including checking for null context and specific inner-loop bounds logic.
**Action:** Use `--coverage` to spot untested lines, and provide targeted mocks (e.g. `HTMLCanvasElement.prototype.getContext`) to trigger edge case return branches.
## 0.121.32 - AudioMixerPanel Coverage Update
**Learning:** Found an untested area in `AudioMixerPanel.tsx` (optimistic UI updates and fetch track errors) and updated `AudioMixerPanel.test.tsx` to reach 100% coverage, verifying both the UI state and controller interactions for volume changes and fetch failures.
**Action:** Mock error responses directly in test cases (`mockRejectedValueOnce`) and trigger UI events (`fireEvent.change`) to hit edge case logic.
## 0.121.33 - StudioContext Coverage Update
**Learning:** Uncovered lines in `StudioContext.tsx` (openInEditor utility calling a special endpoint and the unprovided hook throw case). A new coverage plan handles these paths.
**Action:** Use `renderHook` from `@testing-library/react` without wrappers to trigger the throw edge case, and mock `fetch` appropriately for utility endpoints.
## 0.121.34 - DiagnosticsModal Coverage Update
**Learning:** React Testing Library's `act` wrapper is necessary when a component has async fetches and side effects (like updating loading states, or reading from `global.fetch` inside `useEffect`) during testing, to avoid the annoying `not wrapped in act(...)` warning, and also allows full traversal of error branches when API fetches reject.
**Action:** Always wrap state-updating logic or the rendering of components containing `useEffect` data fetching in `act()` or wait for updates explicitly.
