**Version**: 0.12.0

# Studio Domain Status

**Status**: 🚧 Alpha / Scaffolding

**Focus**: UI Implementation & CLI

## Recent Updates
- [v0.12.0] ✅ Completed: Implement Real Rendering - Integrated `@helios-project/renderer` with Studio via Vite plugin API (`/api/render`), enabling real render job execution and progress tracking.
- [v0.11.0] ✅ Completed: Implement Asset Discovery - Added `findAssets` backend logic, exposed `/api/assets` endpoint, and connected `StudioContext` to fetch real assets from `examples/`.
- [v0.10.0] ✅ Completed: Implement Backend API & Project Discovery - Added Vite plugin for dynamic composition discovery from `examples/` directory and connected StudioContext.
- [v0.9.0] ✅ Completed: Implement Playback Speed Controls - Added speed selector (0.25x to 4x, reverse) and updated StudioContext state management.
- [v0.8.0] ✅ Completed: Implement Timeline Range Markers - Added draggable in/out markers, keyboard shortcuts ('I'/'O'), and range state management.
- [v0.7.0] ✅ Completed: Implement Renders Panel - Added RendersPanel, Sidebar (tabs), and mock render job management in StudioContext.
- [v0.6.0] ✅ Completed: Implement Assets Panel - Added AssetsPanel, AssetItem, and mock assets in StudioContext.
- [v0.5.0] ✅ Completed: Implement Stage & Canvas Controls - Created Stage component with Pan/Zoom/Transparency controls and refactored App.tsx to use it.
- [v0.4.0] ✅ Completed: Implement Playback Controls - Centralized player state in StudioContext, added Play/Pause/Rewind/Loop controls, and refactored Timeline/PropsEditor.
- [v0.3.1] ✅ Completed: Composition Switcher - Implemented Cmd+K switcher and Project State context.
- [v0.3.0] ✅ Completed: Implement Studio UI and Player Control - Added Timeline, Props Editor, and programmatic control for helios-player.
- [v0.2.1] ✅ Completed: Verify & Refine - Fixed TypeScript configuration and verified build/CLI.
- [v0.2.0] ✅ Completed: Scaffold CLI Package - Created @helios-project/cli and studio command.
- [v0.1.0] ✅ Completed: Scaffold Studio Package - Created package structure, config, and basic UI.
- [2026-02-18] Initialized domain status and created scaffold plan.
