**Version**: 0.56.0

# Studio Domain Status

**Status**: 🚧 Alpha / Scaffolding

**Focus**: UI Implementation & CLI

## Recent Updates
- [v0.56.0] ✅ Completed: Missing Asset Types - Implemented support for `model`, `json`, and `shader` types in Studio schema inputs, enabling asset discovery and usage.
- [v0.55.0] ✅ Completed: Props Step Format - Implemented support for `step` (number) and `format` (string) properties in the Props Editor, enabling specialized inputs like date, color, and stepped sliders.
- [v0.54.0] ✅ Completed: Props Editor Polish - Implemented Props Toolbar with "Copy JSON" and "Reset" buttons, and ensured `inputProps` persist across Hot Module Reloading (HMR).
- [v0.53.0] ✅ Completed: Recursive Schema Support - Implemented `ObjectInput` and `ArrayInput` in Props Editor to support nested object and array schemas with recursive UI generation.
- [v0.52.0] ✅ Completed: Composition Settings Modal - Implemented a modal to edit composition metadata (Width, Height, FPS, Duration) of existing compositions, persisting changes to `composition.json`.
- [v0.51.0] ✅ Completed: Composition Metadata - Implemented support for defining and persisting composition metadata (Width, Height, FPS, Duration) during creation, and respecting these settings in the Studio UI.
- [v0.50.0] ✅ Completed: Vue & Svelte Templates - Implemented Vue and Svelte templates for the composition creator, including support for Vue 3 Composition API and Svelte 5 Runes.
- [v0.49.0] ✅ Completed: Composition Templates - Implemented template system (Vanilla JS, React) for creating new compositions, adding a template selector to the creation modal.
- [v0.48.1] ✅ Completed: Timeline Polish - Implemented Ruler with dynamic ticks, Hover Guide with timecode tooltip, and Magnetic Snapping (to markers/in/out) for the Timeline.
- [v0.48.1] ✅ Completed: Refactor Loop Logic - Moved loop enforcement logic from `App.tsx` to `StudioContext.tsx` to centralize playback state management.
- [v0.48.0] ✅ Verified: Maintenance - Synced package.json version and fixed test environment by mocking ResizeObserver.
- [v0.48.0] ✅ Completed: Timecode & Range - Implemented SMPTE timecode display in Timeline and enforced In/Out points for looping and navigation (Rewind/Home).
- [v0.47.0] ✅ Completed: Safe Area Guides - Implemented toggleable Safe Area Guides (Action Safe, Title Safe, Crosshair) in the Studio Stage with toolbar button and keyboard shortcut.
- [v0.46.0] ✅ Completed: Verify Audio Controls - Added unit tests for PlaybackControls to verify volume and mute functionality.
- [v0.45.0] ✅ Completed: Delete Composition - Implemented ability to delete compositions from the UI with backend support and confirmation.
- [v0.44.0] ✅ Completed: Enable Production Preview - Configured `vite-plugin-studio-api` to serve project files in preview mode and updated verification scripts.
- [v0.43.0] ✅ Completed: Create Composition - Implemented "Create Composition" feature with UI modal, API endpoint, and file generation logic.
- [v0.42.0] ✅ Completed: Drag & Drop Assets - Implemented drag and drop support from Assets Panel to Props Editor inputs (typed and generic).
- [v0.41.0] ✅ Completed: Asset Input - Implemented `AssetInput` in Props Editor with asset discovery integration (autocomplete via datalist) for image, video, audio, and font types.
- [v0.40.1] ✅ Completed: Documentation & Verification - Added package README, updated version, and implemented Playwright-based verification script.
- [v0.40.0] ✅ Completed: Global Shortcuts Refactor - Centralized all keyboard shortcuts into `GlobalShortcuts.tsx` and added Loop Toggle ('L').
- [v0.39.0] ✅ Completed: Marker Visualization - Implemented visual markers in Timeline with click-to-seek functionality.
- [v0.38.0] ✅ Completed: AI System Prompt - Implemented a modal generator for LLM system prompts, combining static Helios context with dynamic composition schema.
- [v0.37.0] ✅ Completed: Timeline Zoom - Implemented zoom slider and scrollable timeline track for precise editing.
- [v0.36.0] ✅ Completed: Client-Side Export - Implemented in-browser MP4/WebM export functionality in Renders Panel using WebCodecs.
- [v0.35.0] ✅ Completed: Assets Extension - Added support for discovering and displaying 3D models (.glb, .gltf), JSON data (.json), and Shaders (.glsl, .vert, .frag) in the Assets Panel.
- [v0.34.0] ✅ Completed: Diagnostics Panel - Implemented system diagnostics panel showing both Client (Preview) and Server (Renderer) capabilities, accessible via Sidebar.
- [v0.33.1] ✅ Verified: Test Environment - Fixed test environment configuration by adding module aliases for Core and Player in Vite/Vitest, ensuring all tests pass.
- [v0.33.0] ✅ Completed: SRT Export - Implemented functionality to export current captions as an SRT file from the Captions Panel, adding a client-side utility and "Export SRT" button.
- [v0.32.0] ✅ Completed: Editable Captions Panel - Implemented editable inputs for captions (time/text), add/delete functionality, and syncing with Core via `controller.setCaptions` or `inputProps`.
- [v0.31.0] ✅ Completed: Integrate Core Captions - Updated Studio to use `HeliosState.captions` for Timeline and Captions Panel, ensuring full sync with Core's caption logic.
- [v0.30.1] ✅ Verified: Keyboard Shortcuts & Snapshot - Added unit tests for KeyboardShortcutsModal and StudioContext snapshot logic.
- [v0.30.0] ✅ Completed: Keyboard Shortcuts Dialog - Implemented a modal dialog listing all keyboard shortcuts, accessible via `?` key or sidebar button, improving usability.
- [v0.29.0] ✅ Completed: Schema-Aware Props Editor - Implemented specialized UI inputs (Enum, Range, Color, Boolean) driven by `HeliosSchema`, with fallback to standard inputs.
- [v0.28.0] ✅ Completed: Captions Panel - Implemented SRT import panel and timeline markers for captions using Core's `parseSrt` and `inputProps` injection.
- [v0.27.1] ✅ Fixed: Snapshot - Fixed type error in "Take Snapshot" implementation where `captureFrame` return value was mishandled.
- [v0.27.0] ✅ Completed: Snapshot - Implemented "Take Snapshot" feature in Stage Toolbar to capture and download current frame as PNG.
- [v0.26.0] ✅ Completed: Audio Controls - Added Volume slider and Mute button to Playback Controls, updating `StudioContext` to track audio state.
- [v0.25.0] ✅ Completed: Enhance Asset Previews - Implemented rich previews for video (hover-play), audio (click-play), and fonts (custom sample) in Assets Panel.
- [v0.24.0] ✅ Completed: Scaffold Unit Tests - Added Vitest, JSDOM, and Testing Library infrastructure; implemented initial tests for Timeline component.
- [v0.23.2] ✅ Completed: Enable External Project Support - Configured Vite and Render Manager to respect HELIOS_PROJECT_ROOT for file serving and output.
- [v0.23.1] ✅ Fixed: Asset Deletion - Switched DELETE API to use query parameters to resolve body parsing timeouts.
- [v0.23.0] ✅ Completed: Asset Management - Implemented asset upload (Drag & Drop) and delete functionality in Assets Panel, backed by new API endpoints.
- [v0.22.0] ✅ Completed: Global Shortcuts & Frame Stepping - Added Shift+Arrow shortcuts (10-frame jump) and Prev/Next Frame buttons to the UI.
- [v0.21.0] ✅ Completed: Implement Render Job Management - Added ability to Cancel and Delete render jobs via UI and API, including aborting FFmpeg processes.
- [v0.20.0] ✅ Completed: Pass inputProps to Render Job - Updated `StudioContext` and `render-manager` to forward `inputProps` from the player state to the backend and Renderer.
- [v0.19.0] ✅ Completed: Hot Reload State Preservation - Implemented state restoration (frame, playback status) for `Stage` when HMR triggers a controller reload.
- [v0.18.0] ✅ Completed: Render Configuration UI - Added UI for selecting render mode (DOM/Canvas), bitrate, and codec, and updated backend to respect these settings.
- [v0.17.0] ✅ Completed: Inject HELIOS_PROJECT_ROOT in CLI - Modified CLI to pass user's CWD to Studio process, enabling "Studio as a Tool".
- [v0.16.0] ✅ Completed: Canvas Resolution Controls - Added UI controls for setting composition resolution (presets & custom) and updated `StudioContext` to manage `canvasSize`.
- [v0.15.0] ✅ Completed: Dynamic Project Discovery - Enabled `HELIOS_PROJECT_ROOT` env var to configure project root for composition/asset discovery, unlocking "Studio as a Tool".
- [v0.14.0] ✅ Completed: Rich Props Editor - Implemented JSON editor for complex props (objects/arrays) and improved UI styling for primitives.
- [v0.13.0] ✅ Completed: Implement Playback Shortcuts - Added global keyboard shortcuts for Play/Pause (Space), Frame Step (Arrows), and Seek Start (Home), with input protection.
- [v0.12.0] ✅ Completed: Implement Real Rendering - Integrated `@helios-project/renderer` with Studio via Vite plugin API (`/api/render`), enabling real render job execution and progress tracking.
- [v0.11.0] ✅ Completed: Implement Asset Discovery - Added `findAssets` backend logic, exposed `/api/assets` endpoint, and connected `StudioContext` to fetch real assets from `examples/`.
- [v0.10.0] ✅ Completed: Implement Backend API & Project Discovery - Added Vite plugin for dynamic composition discovery from `examples/` directory and connected `StudioContext`.
- [v0.9.0] ✅ Completed: Implement Playback Speed Controls - Added speed selector (0.25x to 4x, reverse) and updated `StudioContext` state management.
- [v0.8.0] ✅ Completed: Implement Timeline Range Markers - Added draggable in/out markers, keyboard shortcuts ('I'/'O'), and range state management.
- [v0.7.0] ✅ Completed: Implement Renders Panel - Added RendersPanel, Sidebar (tabs), and mock render job management in `StudioContext`.
- [v0.6.0] ✅ Completed: Implement Assets Panel - Added AssetsPanel, AssetItem, and mock assets in `StudioContext`.
- [v0.5.0] ✅ Completed: Implement Stage & Canvas Controls - Created Stage component with Pan/Zoom/Transparency controls and refactored App.tsx to use it.
- [v0.4.0] ✅ Completed: Implement Playback Controls - Centralized player state in `StudioContext`, added Play/Pause/Rewind/Loop controls, and refactored Timeline/PropsEditor.
- [v0.3.1] ✅ Completed: Composition Switcher - Implemented Cmd+K switcher and Project State context.
- [v0.3.0] ✅ Completed: Implement Studio UI and Player Control - Added Timeline, Props Editor, and programmatic control for helios-player.
- [v0.2.1] ✅ Completed: Verify & Refine - Fixed TypeScript configuration and verified build/CLI.
- [v0.2.0] ✅ Completed: Scaffold CLI Package - Created @helios-project/cli and studio command.
- [v0.1.0] ✅ Completed: Scaffold Studio Package - Created package structure, config, and basic UI.
- [2026-02-18] Initialized domain status and created scaffold plan.
