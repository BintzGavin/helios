---
title: "Studio Changelog"
description: "Changelog for the Studio package"
---

# Studio Changelog

## v0.71.0
- **Implement Asset Renaming**: Added ability to rename assets from the Assets Panel, updating both UI and filesystem.

## v0.70.0
- **Persistent Render Jobs**: Finalized verification and closed out the plan for persistent render jobs, ensuring job history survives restarts.

## v0.69.0
- **Rename Composition**: Implemented ability to rename compositions from the Settings modal, including backend directory moving and ID updates.

## v0.68.0
- **Duplicate Composition**: Implemented "Duplicate Composition" feature with UI modal, API endpoint, and file copy logic.

## v0.67.0
- **Schema Constraints UI**: Implemented UI support for schema constraints (`minLength`, `maxLength`, `pattern`, `minItems`, `maxItems`, `accept`) in the Props Editor, enabling validation feedback and asset filtering.

## v0.66.0
- **TypedArray Support**: Implemented support for TypedArray props (e.g., `float32array`, `int8array`) in the Props Editor using JSON serialization and added missing tests.

## v0.65.0
- **Persistent Render Jobs**: Implemented persistence of render jobs to `jobs.json` in the `renders` directory, ensuring history survives server restarts.

## v0.64.0
- **Props Grouping**: Implemented collapsible groups in Props Editor based on schema `group` property.

## v0.63.1
- **Maintenance**: Synced package.json version and verified Studio UI with Playwright.

## v0.63.0
- **Refine Assets Panel**: Updated asset discovery to prioritize `public` directory and use relative paths/URLs, aligning with vision.

## v0.62.0
- **MCP Server Integration**: Implemented Model Context Protocol server allowing AI agents to inspect, create, and render compositions.

## v0.61.0
- **Recursive Composition Discovery**: Implemented recursive directory scanning for composition discovery, allowing nested composition structures.

## v0.60.0
- **Render Preview**: Implemented a modal to preview rendered videos directly within the Studio UI.

## v0.59.0
- **Show Render Errors**: Implemented error display in Renders Panel, enabling users to debug failed render jobs.

## v0.58.0
- **Three.js Template**: Implemented a "Three.js" template for the Composition Creator, enabling users to quickly bootstrap 3D compositions.

## v0.57.0
- **Asset Filtering**: Implemented search bar and type filter in Assets Panel to improve asset management.

## v0.56.0
- **Missing Asset Types**: Implemented support for `model`, `json`, and `shader` types in Studio schema inputs, enabling asset discovery and usage.

## v0.55.0
- **Props Step Format**: Implemented support for `step` (number) and `format` (string) properties in the Props Editor, enabling specialized inputs like date, color, and stepped sliders.

## v0.54.0
- **Props Editor Polish**: Implemented Props Toolbar with "Copy JSON" and "Reset" buttons, and ensured `inputProps` persist across Hot Module Reloading (HMR).

## v0.53.0
- **Recursive Schema Support**: Implemented ObjectInput and ArrayInput for recursive UI generation in Props Editor.

## v0.52.0
- **Composition Settings Modal**: Implemented a modal to edit composition metadata (Width, Height, FPS, Duration) of existing compositions, persisting changes to `composition.json`.

## v0.51.0
- **Composition Metadata**: Implemented support for defining and persisting composition metadata (Width, Height, FPS, Duration) during creation, and respecting these settings in the Studio UI.

## v0.50.0
- **Vue & Svelte Templates**: Implemented Vue and Svelte templates for the composition creator, including support for Vue 3 Composition API and Svelte 5 Runes.

## v0.49.0
- **Composition Templates**: Implemented template system (Vanilla JS, React) for creating new compositions, adding a template selector to the creation modal.

## v0.48.1
- **Refactor Loop Logic**: Moved loop enforcement logic from `App.tsx` to `StudioContext.tsx` to centralize playback state management.
- **Timeline Polish**: Implemented Ruler with dynamic ticks, Hover Guide with timecode tooltip, and Magnetic Snapping (to markers/in/out) for the Timeline.

## v0.48.0
- **Timecode & Range**: Implemented SMPTE timecode display in Timeline and enforced In/Out points for looping and navigation (Rewind/Home).

## v0.47.0
- **Safe Area Guides**: Implemented toggleable Safe Area Guides (Action Safe, Title Safe, Crosshair) in the Studio Stage with toolbar button and keyboard shortcut.

## v0.46.0
- **Verify Audio Controls**: Added unit tests for PlaybackControls to verify volume and mute functionality.

## v0.45.0
- **Delete Composition**: Implemented ability to delete compositions from the UI with backend support and confirmation.

## v0.44.0
- **Enable Production Preview**: Configured `vite-plugin-studio-api` to serve project files in preview mode and updated verification scripts.

## v0.43.0
- **Create Composition**: Implemented "Create Composition" feature with UI modal, API endpoint, and file generation logic.

## v0.42.0
- **Drag & Drop Assets**: Implemented drag and drop support from Assets Panel to Props Editor inputs (typed and generic).

## v0.41.0
- **Asset Input**: Implemented `AssetInput` in Props Editor with asset discovery integration.

## v0.40.1
- **Documentation & Verification**: Added package README, updated version, and implemented Playwright-based verification script.

## v0.40.0
- **Global Shortcuts Refactor**: Centralized all keyboard shortcuts into `GlobalShortcuts.tsx` and added Loop Toggle ('L').

## v0.37.0
- **Timeline Zoom**: Implemented zoom slider and scrollable timeline track for precise editing.

## v0.36.0
- **Client-Side Export**: Implemented in-browser MP4/WebM export functionality in Renders Panel using WebCodecs.

## v0.35.0
- **Assets Extension**: Added support for discovering and displaying 3D models (.glb, .gltf), JSON data (.json), and Shaders (.glsl, .vert, .frag) in the Assets Panel.

## v0.34.0
- **Diagnostics Panel**: Implemented system diagnostics panel showing both Client (Preview) and Server (Renderer) capabilities, accessible via Sidebar.

## v0.33.1
- **Verified: Test Environment**: Fixed test environment configuration by adding module aliases for Core and Player in Vite/Vitest, ensuring all tests pass.

## v0.27.1
- **Fixed: Snapshot**: Fixed type error in "Take Snapshot" implementation where `captureFrame` return value was mishandled.

## v0.27.0
- **Snapshot**: Implemented "Take Snapshot" feature in Stage Toolbar to capture and download current frame as PNG.

## v0.26.0
- **Audio Controls**: Added Volume slider and Mute button to Playback Controls, updating `StudioContext` to track audio state.

## v0.25.0
- **Enhance Asset Previews**: Implemented rich previews for video (hover-play), audio (click-play), and fonts (custom sample) in Assets Panel.

## v0.24.0
- **Scaffold Unit Tests**: Added Vitest, JSDOM, and Testing Library infrastructure; implemented initial tests for Timeline component.

## v0.23.2
- **Enable External Project Support**: Configured Vite and Render Manager to respect HELIOS_PROJECT_ROOT for file serving and output.

## v0.23.1
- **Fixed: Asset Deletion**: Switched DELETE API to use query parameters to resolve body parsing timeouts.

## v0.23.0
- **Asset Management**: Implemented asset upload (Drag & Drop) and delete functionality in Assets Panel, backed by new API endpoints.

## v0.22.0
- **Global Shortcuts & Frame Stepping**: Added Shift+Arrow shortcuts (10-frame jump) and Prev/Next Frame buttons to the UI.

## v0.21.0
- **Implement Render Job Management**: Added ability to Cancel and Delete render jobs via UI and API, including aborting FFmpeg processes.

## v0.20.0
- **Pass inputProps to Render Job**: Updated `StudioContext` and `render-manager` to forward `inputProps` from the player state to the backend and Renderer.

## v0.19.0
- **Hot Reload State Preservation**: Implemented state restoration (frame, playback status) for `Stage` when HMR triggers a controller reload.

## v0.18.0
- **Render Configuration UI**: Added UI for selecting render mode (DOM/Canvas), bitrate, and codec, and updated backend to respect these settings.

## v0.17.0
- **Inject HELIOS_PROJECT_ROOT in CLI**: Modified CLI to pass user's CWD to Studio process, enabling "Studio as a Tool".

## v0.16.0
- **Canvas Resolution Controls**: Added UI controls for setting composition resolution (presets & custom) and updated `StudioContext` to manage `canvasSize`.

## v0.15.0
- **Dynamic Project Discovery**: Enabled `HELIOS_PROJECT_ROOT` env var to configure project root for composition/asset discovery, unlocking "Studio as a Tool".

## v0.14.0
- **Rich Props Editor**: Implemented JSON editor for complex props (objects/arrays) and improved UI styling for primitives.

## v0.13.0
- **Implement Playback Shortcuts**: Added global keyboard shortcuts for Play/Pause (Space), Frame Step (Arrows), and Seek Start (Home), with input protection.

## v0.12.0
- **Implement Real Rendering**: Integrated `@helios-project/renderer` with Studio via Vite plugin API (`/api/render`), enabling real render job execution and progress tracking.

## v0.11.0
- **Implement Asset Discovery**: Added `findAssets` backend logic, exposed `/api/assets` endpoint, and connected `StudioContext` to fetch real assets from `examples/`.

## v0.10.0
- **Implement Backend API & Project Discovery**: Added Vite plugin for dynamic composition discovery from `examples/` directory and connected StudioContext.

## v0.9.0
- **Implement Playback Speed Controls**: Added speed selector (0.25x to 4x, reverse) and updated StudioContext state management.

## v0.8.0
- **Implement Timeline Range Markers**: Added draggable in/out markers, keyboard shortcuts ('I'/'O'), and range state management.

## v0.7.0
- **Implement Renders Panel**: Added RendersPanel, Sidebar (tabs), and mock render job management in StudioContext.

## v0.6.0
- **Implement Assets Panel**: Added AssetsPanel, AssetItem, and mock assets in StudioContext.

## v0.5.0
- **Implement Stage & Canvas Controls**: Created Stage component with Pan/Zoom/Transparency controls and refactored App.tsx to use it.

## v0.4.0
- **Implement Playback Controls**: Centralized player state in StudioContext, added Play/Pause/Rewind/Loop controls, and refactored Timeline/PropsEditor.

## v0.3.1
- **Composition Switcher**: Implemented Cmd+K command palette to switch between compositions. Introduced `StudioContext` for project state management.
