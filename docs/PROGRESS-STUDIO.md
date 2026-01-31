## STUDIO v0.66.0
- ✅ Completed: TypedArray Support - Implemented support for TypedArray props (e.g., `float32array`, `int8array`) in the Props Editor using JSON serialization and added missing tests. Fixed a critical React Hook violation in PropsEditor.

## STUDIO v0.65.0
- ✅ Completed: Persistent Render Jobs - Implemented persistence of render jobs to `jobs.json` in the `renders` directory, ensuring history survives server restarts.

## STUDIO v0.64.0
- ✅ Completed: Props Grouping - Implemented collapsible groups in Props Editor based on schema `group` property.

## STUDIO v0.63.1
- ✅ Verified: Maintenance - Synced package.json version and verified Studio UI with Playwright.

## STUDIO v0.63.0
- ✅ Completed: Refine Assets Panel - Updated asset discovery to prioritize `public` directory and use relative paths/URLs, aligning with vision.

## STUDIO v0.62.0
- ✅ Completed: MCP Server Integration - Implemented Model Context Protocol server allowing AI agents to inspect, create, and render compositions.

## STUDIO v0.61.0
- ✅ Completed: Recursive Composition Discovery - Implemented recursive directory scanning for composition discovery, allowing nested composition structures.

## STUDIO v0.60.0
- ✅ Completed: Render Preview - Implemented a modal to preview rendered videos directly within the Studio UI.

## STUDIO v0.59.0
- ✅ Completed: Show Render Errors - Implemented error display in Renders Panel, enabling users to debug failed render jobs.

## STUDIO v0.58.0
- ✅ Completed: Three.js Template - Implemented a "Three.js" template for the Composition Creator, enabling users to quickly bootstrap 3D compositions.

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
- ✅ Completed: Timeline Polish - Implemented Ruler with dynamic ticks, Hover Guide with timecode tooltip, and Magnetic Snapping (to markers/in/out) for the Timeline.

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
