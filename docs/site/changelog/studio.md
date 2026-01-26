---
title: "Studio Changelog"
description: "Changelog for the Studio package"
---

# Studio Changelog

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
