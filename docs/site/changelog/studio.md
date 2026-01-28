---
title: "Studio Changelog"
description: "Changelog for the Studio package"
---

# Studio Changelog

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
