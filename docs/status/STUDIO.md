**Version**: 0.122.11
[Output truncated for brevity]

key or sidebar button, improving usability.
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

[v0.120.4] ✅ Completed: STUDIO-Timeline-Drag-Drop - Implemented drag and drop support for the Timeline to accept assets

- [v0.120.2] ✅ Completed: STUDIO-Asset-Move - Implemented drag-and-drop to move assets into folders

- [v0.121.4] ✅ Completed: STUDIO-Timeline-Drag-Drop - Added visual styling when dragging an asset over the Timeline component for visual feedback.
- [v0.121.7] ✅ Completed: STUDIO-Timeline-Drag-Drop - Verified timeline drag and drop for assets is already implemented (2026-11-13-STUDIO-Timeline-Drag-Drop.md).
- ❌ Blocked: 2026-11-14-STUDIO-Update-Keyboard-Shortcuts-Documentation is structurally obsolete as changes are already present.
  [v0.121.15] ✅ Completed: Document duplicated Timeline-Scrubber plan - Logged the duplicated plan as impossible since Timeline already supports scrubbing.
  [v0.121.14] ✅ Completed: Document duplicated Update-Keyboard-Shortcuts-Documentation plan - Logged the duplicated plan as impossible.
- ❌ Blocked: Waiting for a new, valid plan in /.sys/plans/ as existing plans are already implemented or obsolete.
- [v0.121.18] ❌ Blocked: Waiting for a new, valid plan in /.sys/plans/ as existing plans are already implemented or obsolete.
- [v0.121.21] ✅ Completed: STUDIO-Timeline-Drag-Drop - Verified timeline drag and drop is already implemented (IMPOSSIBLE: DUPLICATION).

- [v0.121.22] ✅ Completed: Server Templates Test Coverage - Added 100% unit test coverage for scaffolding templates
- [v0.121.23] ✅ Completed: Improve AudioMeter Coverage - Created plan to test AudioMeter component (2026-06-04-STUDIO-Improve-AudioMeter-Coverage.md).

[v0.121.29] ✅ Completed: Improve AssistantModal Coverage - Test coverage increased to 100%.

- [v0.121.30] ✅ Completed: Improve PropsEditor Coverage - Test coverage increased to ~99% line and branch coverage (2026-06-11-STUDIO-Improve-PropsEditor-Coverage.md).
  [v0.107.2] ✅ Completed: Improve SchemaInputs Coverage - Added unit test coverage for TypedArrayInput components in SchemaInputs.tsx
  [v0.107.2] ✅ Completed: Improve SchemaInputs Coverage - Added unit test coverage for TypedArrayInput components in SchemaInputs.tsx
  [v0.121.33] ✅ Completed: Improve StudioContext Coverage - Created plan to test uncalled lines in StudioContext file (2026-06-15-STUDIO-Improve-StudioContext-Coverage.md).
- [v0.121.33] ✅ Completed: Improve StudioContext Coverage - Achieved 100% test coverage by addressing `useStudio` outside-provider exceptions and `openInEditor` fetch errors.
  [v0.121.34] ✅ Completed: Improve AudioMixerPanel Coverage - Created plan to test AudioMixerPanel and DiagnosticsModal components (2026-06-16-STUDIO-Improve-AudioMixerPanel-Coverage.md).
- [v0.122.1] ✅ Completed: Improve CaptionsPanel Coverage - Added test cases for missing branches in CaptionsPanel.tsx.
- [v0.122.0] ✅ Completed: Improve Omnibar Test Coverage - Reached 100% test coverage for Omnibar by adding tests for commands, asset icons, and keyboard boundary edge cases.
- [v0.122.2] ✅ Completed: Improve CaptionsPanel Coverage - Increased coverage to 100% by testing file uploads and time formatting edge cases (2026-06-18-STUDIO-Improve-CaptionsPanel-Coverage.md).
- [v0.122.3] ✅ Completed: Improve TimecodeInput Coverage - Created plan to test catch blocks in TimecodeInput component (2026-06-18-STUDIO-Improve-TimecodeInput-Coverage.md).
- [v0.122.4] ✅ Completed: Improve TimecodeInput Coverage - Mocked framesToTimecode and added tests for fallback logic to reach 100% test coverage.
- [v0.122.5] ✅ Completed: Add 100% unit test coverage for usePersistentState and useKeyboardShortcut hooks
- [v0.122.6] ✅ Completed: STUDIO-Improve-PlaybackControls-Coverage - Achieved 100% test coverage for PlaybackControls by refactoring disabled state conditions.
  [v0.122.7] ✅ Completed: STUDIO-Improve-AssetsPanel-Coverage - Fixed act() warnings and created plan for missing coverage in AssetItem.tsx and AssetsPanel.tsx.
- [v0.122.7] ✅ Completed: STUDIO-Improve-AssetsPanel-AssetItem-Coverage-V2 - Added comprehensive unit tests for `AssetsPanel` and `AssetItem` covering missing branches and reaching 100% test coverage.
- [v0.122.8] ✅ Completed: STUDIO-Improve-AudioWaveform-Coverage - Verified useAudioWaveform already has 100% test coverage.
\n- [v0.122.9] ✅ Completed: STUDIO-Improve-AudioMixerPanel-Coverage - Fixed act() warnings and improved AudioMixerPanel and AudioMeter coverage by wrapping state updates properly in test blocks.

- [v0.122.10] ✅ Completed: STUDIO-Improve-AudioMixerPanel-Coverage-V3 - Fixed act() warnings and improved AudioMixerPanel and AudioMeter coverage by wrapping state updates properly in test blocks.
- [v0.122.11] ✅ Completed: STUDIO-Improve-AudioMixerPanel-Coverage-V3 - Fixed act warnings and improved coverage.
