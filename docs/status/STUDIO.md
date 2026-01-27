**Version**: 0.30.1

# Studio Domain Status

**Status**: 🚧 Alpha / Scaffolding

**Focus**: UI Implementation & CLI

## Recent Updates
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
