# Studio Progress Log

## STUDIO v0.17.0
- ✅ Completed: Inject HELIOS_PROJECT_ROOT in CLI - Modified CLI to pass user's CWD to Studio process, enabling "Studio as a Tool".

## STUDIO v0.16.0
- ✅ Completed: Canvas Resolution Controls - Added UI controls for setting composition resolution (presets & custom) and updated `StudioContext` to manage `canvasSize`.

## STUDIO v0.15.0
- ✅ Completed: Dynamic Project Discovery - Enabled `HELIOS_PROJECT_ROOT` env var to configure project root for composition/asset discovery, unlocking "Studio as a Tool".

## STUDIO v0.14.0
- ✅ Completed: Rich Props Editor - Implemented JSON editor for complex props (objects/arrays) and improved UI styling for primitives.

## STUDIO v0.13.0
- ✅ Completed: Implement Playback Shortcuts - Added global keyboard shortcuts for Play/Pause (Space), Frame Step (Arrows), and Seek Start (Home), with input protection.

## STUDIO v0.12.0
- ✅ Completed: Implement Real Rendering - Integrated `@helios-project/renderer` with Studio via Vite plugin API (`/api/render`), enabling real render job execution and progress tracking.

## STUDIO v0.11.0
- ✅ Completed: Implement Asset Discovery - Added `findAssets` backend logic, exposed `/api/assets` endpoint, and connected `StudioContext` to fetch real assets from `examples/`.

## STUDIO v0.10.0
- ✅ Completed: Implement Backend API & Project Discovery - Added Vite plugin for dynamic composition discovery from `examples/` directory and connected StudioContext.

## STUDIO v0.9.0
- ✅ Completed: Implement Playback Speed Controls - Added speed selector (0.25x to 4x, reverse) and updated StudioContext state management.

## STUDIO v0.8.0
- ✅ Completed: Implement Timeline Range Markers - Added draggable in/out markers, keyboard shortcuts ('I'/'O'), and range state management.

## STUDIO v0.7.0
- ✅ Completed: Implement Renders Panel - Added RendersPanel, Sidebar (tabs), and mock render job management in StudioContext.

## STUDIO v0.6.0
- ✅ Completed: Implement Assets Panel - Added AssetsPanel, AssetItem, and mock assets in StudioContext.

## STUDIO v0.5.0
- ✅ Completed: Implement Stage & Canvas Controls - Created Stage component with Pan/Zoom/Transparency controls and refactored App.tsx to use it.

## STUDIO v0.4.0
- ✅ Completed: Implement Playback Controls - Centralized player state in StudioContext, added Play/Pause/Rewind/Loop controls, and refactored Timeline/PropsEditor.

## STUDIO v0.3.1
- **Composition Switcher**: Implemented Cmd+K command palette to switch between compositions. Introduced `StudioContext` for project state management.

## 2026-02-18
- **UI Implementation & Player Control**: Implemented Timeline, Props Editor, and programmatic control for helios-player.
- **Scaffold CLI**: Created `@helios-project/cli` and `studio` command.
- **Scaffold Studio**: Initialized `packages/studio` with Vite + React.
