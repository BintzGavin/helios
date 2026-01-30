## STUDIO v0.57.0
- ✅ Completed: Asset Filtering - Implemented search bar and type filter in Assets Panel to improve asset management.

## STUDIO v0.56.0
- ✅ Completed: Missing Asset Types - Implemented support for `model`, `json`, and `shader` types in Studio schema inputs, enabling asset discovery and usage.

## STUDIO v0.55.0
- ✅ Completed: Props Step Format - Implemented support for `step` (number) and `format` (string) properties in the Props Editor, enabling specialized inputs like date, color, and stepped sliders.

## STUDIO v0.54.0
- ✅ Completed: Props Editor Polish - Implemented Props Toolbar with "Copy JSON" and "Reset" buttons, and ensured `inputProps` persist across Hot Module Reloading (HMR).

## STUDIO v0.53.0
- ✅ Completed: Recursive Schema Support - Implemented ObjectInput and ArrayInput for recursive UI generation in Props Editor.

## STUDIO v0.52.0
- ✅ Completed: Composition Settings Modal - Implemented a modal to edit composition metadata (Width, Height, FPS, Duration) of existing compositions, persisting changes to `composition.json`.

## STUDIO v0.51.0
- ✅ Completed: Composition Metadata - Implemented support for defining and persisting composition metadata (Width, Height, FPS, Duration) during creation, and respecting these settings in the Studio UI.

## STUDIO v0.50.0
- ✅ Completed: Vue & Svelte Templates - Implemented Vue and Svelte templates for the composition creator, including support for Vue 3 Composition API and Svelte 5 Runes.

## STUDIO v0.49.0
- ✅ Completed: Composition Templates - Implemented template system (Vanilla JS, React) for creating new compositions, adding a template selector to the creation modal.

## STUDIO v0.48.1
- ✅ Completed: Refactor Loop Logic - Moved loop enforcement logic from `App.tsx` to `StudioContext.tsx` to centralize playback state management.

## STUDIO v0.48.0
- ✅ Completed: Timecode & Range - Implemented SMPTE timecode display in Timeline and enforced In/Out points for looping and navigation (Rewind/Home).
- ✅ Verified: Maintenance - Synced package.json version and fixed test environment by mocking ResizeObserver.

## STUDIO v0.47.0
- ✅ Completed: Safe Area Guides - Implemented toggleable Safe Area Guides (Action Safe, Title Safe, Crosshair) in the Studio Stage with toolbar button and keyboard shortcut.

## STUDIO v0.46.0
- ✅ Completed: Verify Audio Controls - Added unit tests for PlaybackControls to verify volume and mute functionality.

## STUDIO v0.45.0
- ✅ Completed: Delete Composition - Implemented ability to delete compositions from the UI with backend support and confirmation.

## STUDIO v0.44.0
- ✅ Completed: Enable Production Preview - Configured `vite-plugin-studio-api` to serve project files in preview mode and updated verification scripts.

## STUDIO v0.43.0
- ✅ Completed: Create Composition - Implemented "Create Composition" feature with UI modal, API endpoint, and file generation logic.

## STUDIO v0.42.0
- ✅ Completed: Drag & Drop Assets - Implemented drag and drop support from Assets Panel to Props Editor inputs (typed and generic).

## STUDIO v0.41.0
- ✅ Completed: Asset Input - Implemented `AssetInput` in Props Editor with asset discovery integration.

## STUDIO v0.40.1
- ✅ Completed: Documentation & Verification - Added package README, updated version, and implemented Playwright-based verification script.

## STUDIO v0.40.0
- ✅ Completed: Global Shortcuts Refactor - Centralized all keyboard shortcuts into `GlobalShortcuts.tsx` and added Loop Toggle ('L').
