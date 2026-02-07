### STUDIO v0.105.0
- ✅ Completed: Agent Skills - Implemented `helios skills` CLI command and Studio UI integration to discover and install AI Agent Skills via the Component Registry.

### STUDIO v0.104.3
- ✅ Completed: Preview Command - Implemented `helios preview` command to serve production builds locally for verification.

### STUDIO v0.104.2
- ✅ Completed: CompositionsPanel Tests - Implemented unit tests for CompositionsPanel covering CRUD and filtering.

### STUDIO v0.104.1
- ✅ Verified: Agent Skills Tests - Added unit tests for agent skills documentation logic and synced package version.

### STUDIO v0.104.0
- ✅ Completed: CLI Build Command - Implemented `helios build` command to generate a deployable player harness.

### STUDIO v0.103.2
- ✅ Fixed: Dependency Mismatch - Updated `packages/studio/package.json` to align `core` dependency with workspace version (`^5.11.0`) and fixed verification pipeline.

### STUDIO v0.103.1
- ✅ Completed: Refine Agent Skills - Prepend "Agent Skill: " to skill titles in documentation to distinguish them from standard package docs.

### STUDIO v0.103.0
- ✅ Completed: CLI Update Command - Implemented `helios update` command in CLI to update/reinstall components with overwrite support, ensuring users can refresh component code.

### STUDIO v0.102.0
- ✅ Completed: Agent Skills Documentation - Updated Studio Assistant backend to index `SKILL.md` files from `.agents/skills/helios`, making agent-specific knowledge available in the documentation search.

### STUDIO v0.101.0
- ✅ Completed: Open in Editor - Implemented "Open in Editor" buttons for assets and compositions, allowing users to open source files directly in their default editor.

### STUDIO v0.100.0
- ✅ Completed: Resizable Layout - Implemented resizable Sidebar, Inspector, and Timeline panels with persistence using `localStorage` and CSS variables.

### STUDIO v0.99.0
- ✅ Completed: CLI List Command - Verified implementation of `helios list` command to display installed components from `helios.config.json`.

### STUDIO v0.98.0
- ✅ Completed: CLI Solid Init - Added SolidJS template support to `helios init` command.

### STUDIO v0.97.1
- ✅ Verified: Build & Tests - Verified studio build process and unit tests after ensuring dependencies (core, renderer, player) are built, confirming system integrity.

### STUDIO v0.97.0
- ✅ Completed: Draggable Time Markers - Implemented dragging for time-based input prop markers on the Timeline, allowing direct manipulation of prop values.

### STUDIO v0.96.0
- ✅ Completed: Sync Playback Range - Delegated loop and playback range enforcement to HeliosController, ensuring consistent behavior across Preview and Export.

### STUDIO v0.95.2
- ✅ Completed: Audio Metering - Implemented Master Audio Meter in the Mixer Panel header using `AudioMeter` component and real-time controller events.

### STUDIO v0.95.1
- ✅ Verified: Stage Tests - Implemented unit tests for `Stage` component, covering rendering, interactions (Zoom/Pan), and HMR state preservation.

### STUDIO v0.95.0
- ✅ Completed: Persist Input Props - Implemented auto-saving of user-configured input props to `composition.json`, ensuring persistence across reloads.

### STUDIO v0.94.3
- ✅ Fixed: Concurrency Input - Fixed concurrency input validation in Render Config, ensuring values are clamped between 1 and 32.

### STUDIO v0.94.2
- ✅ Verified: Stacked Timeline - Verified implementation of multi-lane stacked timeline with existing unit tests `Timeline.test.tsx`.

### STUDIO v0.94.1
- ✅ Verified: Render Presets - Added unit tests for RenderConfig and StudioContext persistence, ensuring robustness.

### STUDIO v0.94.0
- ✅ Completed: Render Presets - Implemented render configuration presets (Draft, HD, 4K) and persistence for render settings.

### STUDIO v0.93.1
- ✅ Completed: Smart Empty State - Implemented "Smart Empty State" for the Stage, providing "Create Composition" (fresh project) and "Select Composition" (unselected) empty states.

### STUDIO v0.93.0
- ✅ Completed: Visualize Time-based Props - Implemented `TimecodeInput` in Props Editor and visual markers on the Timeline for number props with `format: 'time'`, enabling WYSIWYG timing adjustments.

### STUDIO v0.92.0
- ✅ Completed: Components Registry UI - Implemented "Components" panel in Studio UI, enabling users to browse and install components from the registry via the CLI backend.

### STUDIO v0.91.0
- ✅ Completed: CLI Production Server - Replaced development-only spawn process with robust Vite server integration using `studioApiPlugin`, enabling correct HMR and path resolution for end-users.

### STUDIO v0.90.0
- ✅ Completed: Core Components - Expanded CLI Component Registry with `ProgressBar` and `Watermark` components.

### STUDIO v0.89.0
- ✅ Completed: Component Registry - Implemented `helios add` command in CLI to install components (Timer) from a local registry.

### STUDIO v0.88.0
- ✅ Completed: CLI Scaffold - Implemented `helios init` and `helios add` commands to scaffold project configuration and component structure.

### STUDIO v0.87.1
- ✅ Verified: Distributed Rendering Config - Verified implementation of concurrency control in Renders Panel and RenderManager, ensuring correct usage of RenderOrchestrator.

### STUDIO v0.87.0
- ✅ Completed: Distributed Rendering Config - Implemented concurrency control in the Studio Renders Panel and updated backend to use `RenderOrchestrator` for parallel rendering.

### STUDIO v0.86.0
- ✅ Completed: Audio Mixer Solo - Implemented "Solo" functionality in Audio Mixer Panel, allowing isolation of individual audio tracks with mute state restoration.

### STUDIO v0.85.0
- ✅ Completed: Timeline Audio Waveforms - Implemented visual audio waveforms on the Timeline using `AudioWaveform` component and `OfflineAudioContext` for decoding.

### STUDIO v0.84.0
- ✅ Completed: Timeline Persistence - Implemented persistence for Current Frame, In Point, Out Point, and Loop state across reloads and composition switches.

### STUDIO v0.83.0
- ✅ Completed: Loop Range - Implemented logic to loop playback within defined In/Out points (including handling of Out Point = 0 for full duration), ensuring smooth playback for specific sections.

### STUDIO v0.82.0
- ✅ Completed: Stacked Timeline - Implemented multi-lane stacked timeline for audio tracks with dynamic vertical scrolling and sticky ruler, improving visibility of overlapping tracks.

### STUDIO v0.81.1
- ✅ Verified: Omnibar - Added comprehensive unit tests for the Omnibar component to ensure robustness and prevent regressions.

### STUDIO v0.81.0
- ✅ Completed: Timeline Audio Visualization - Implemented visualization of audio tracks on the timeline using `availableAudioTracks` metadata, separating it from runtime state.

### STUDIO v0.80.2
- ✅ Completed: Test Coverage - Added unit tests for Toast notification system (ToastItem, ToastContext, ToastContainer) and verified with mocked environment.

### STUDIO v0.80.1
- ✅ Completed: Maintenance - Updated dependencies to align with Core v5 and Player v0.57.1, resolving workspace conflicts.

### STUDIO v0.80.0
- ✅ Completed: Toast Notifications - Implemented centralized toast notification system for success/error feedback.

### STUDIO v0.79.0
- ✅ Completed: Array Reordering - Implemented ability to reorder array items (up/down) in the Props Editor, improving list management.

### STUDIO v0.78.0
- ✅ Completed: Persistent Preferences - Implemented persistence for Sidebar tab, Stage settings (Zoom/Pan/Transparency/Guides), Timeline Zoom, and Active Composition using `localStorage`.

### STUDIO v0.77.0
- ✅ Completed: Omnibar Command Palette - Replaced Composition Switcher with a unified Omnibar (Cmd+K) for searching commands, compositions, and assets.

### STUDIO v0.76.0
- ✅ Completed: Audio Mixer Panel - Implemented "Audio" panel in Sidebar with volume and mute controls for individual audio tracks, backed by `HeliosController`.

### STUDIO v0.75.0
- ✅ Completed: Compositions Panel - Implemented persistent "Compositions" panel in Sidebar with creation, duplication, and deletion workflows.

### STUDIO v0.74.0
- ✅ Completed: Markdown URLs - Implemented `/docs/:pkg.md` endpoint to serve raw documentation for Core, Renderer, Player, and Studio packages.

### STUDIO v0.73.0
- ✅ Completed: Composition Thumbnails - Implemented ability to set and view thumbnails for compositions in the Switcher and Settings.

### STUDIO v0.72.1
- ✅ Verified: Robustness - Added output file verification to Render Manager and synced package versions.

### STUDIO v0.72.0
- ✅ Completed: Helios Assistant - Implemented context-aware AI assistant with documentation search, replacing System Prompt Modal.

### STUDIO v0.71.0
- ✅ Completed: Implement Asset Renaming - Added ability to rename assets from the Assets Panel, updating both UI and filesystem.

### STUDIO v0.70.2
- ✅ Verified: Refactor Render Manager Imports - Updated tsconfig.json to alias @helios-project packages to source, and refactored render-manager.ts to use clean imports, ensuring robust type checking and verified persistence logic.

### STUDIO v0.70.1
- ✅ Verified: Maintenance - Synced package.json version and added lint script.

### STUDIO v0.70.0
- ✅ Completed: Persistent Render Jobs - Finalized verification and closed out the plan for persistent render jobs, ensuring job history survives restarts.

### STUDIO v0.69.0
- ✅ Verified: Maintenance - Synced package.json version and re-verified persistent render jobs functionality via tests.

### STUDIO v0.69.0
- ✅ Completed: Rename Composition - Implemented ability to rename compositions from the Settings modal, including backend directory moving and ID updates.

### STUDIO v0.68.1
- ✅ Verified: Persistent Render Jobs - Verified implementation and updated documentation to reflect persistence behavior.

### STUDIO v0.68.0
- ✅ Completed: Duplicate Composition - Implemented "Duplicate Composition" feature with UI modal, API endpoint, and file copy logic.

### STUDIO v0.67.0
- ✅ Completed: Schema Constraints UI - Implemented UI support for schema constraints (`minLength`, `maxLength`, `pattern`, `minItems`, `maxItems`, `accept`) in the Props Editor, enabling validation feedback and asset filtering.

### STUDIO v0.66.0
- ✅ Completed: TypedArray Support - Implemented support for TypedArray props (e.g., `float32array`, `int8array`) in the Props Editor using JSON serialization and added missing tests. Fixed a critical React Hook violation in PropsEditor.

### STUDIO v0.65.0
- ✅ Completed: Persistent Render Jobs - Implemented persistence of render jobs to `jobs.json` in the `renders` directory, ensuring history survives server restarts.

### STUDIO v0.64.0
- ✅ Completed: Props Grouping - Implemented collapsible groups in Props Editor based on schema `group` property.

### STUDIO v0.63.1
- ✅ Verified: Maintenance - Synced package.json version and verified Studio UI with Playwright.

### STUDIO v0.63.0
- ✅ Completed: Refine Assets Panel - Updated asset discovery to prioritize `public` directory and use relative paths/URLs, aligning with vision.

### STUDIO v0.62.0
- ✅ Completed: MCP Server Integration - Implemented Model Context Protocol server allowing AI agents to inspect, create, and render compositions.

### STUDIO v0.61.0
- ✅ Completed: Recursive Composition Discovery - Implemented recursive directory scanning for composition discovery, allowing nested composition structures.

### STUDIO v0.60.0
- ✅ Completed: Render Preview - Implemented a modal to preview rendered videos directly within the Studio UI.

### STUDIO v0.59.0
- ✅ Completed: Show Render Errors - Implemented error display in Renders Panel, enabling users to debug failed render jobs.

### STUDIO v0.58.0
- ✅ Completed: Three.js Template - Implemented a "Three.js" template for the Composition Creator, enabling users to quickly bootstrap 3D compositions.

### STUDIO v0.57.0
- ✅ Completed: Asset Filtering - Implemented search bar and type filter in Assets Panel to improve asset management.

### STUDIO v0.56.0
- ✅ Completed: Missing Asset Types - Implemented support for `model`, `json`, and `shader` types in Studio schema inputs, enabling asset discovery and usage.

### STUDIO v0.55.0
- ✅ Completed: Props Step Format - Implemented support for `step` (number) and `format` (string) properties in the Props Editor, enabling specialized inputs like date, color, and stepped sliders.

### STUDIO v0.54.0
- ✅ Completed: Props Editor Polish - Implemented Props Toolbar with "Copy JSON" and "Reset" buttons, and ensured `inputProps` persist across HMR.

### STUDIO v0.53.0
- ✅ Completed: Recursive Schema Support - Implemented `ObjectInput` and `ArrayInput` in Props Editor to support nested object and array schemas with recursive UI generation.

### STUDIO v0.52.0
- ✅ Completed: Composition Settings Modal - Implemented a modal to edit composition metadata (Width, Height, FPS, Duration) of existing compositions, persisting changes to `composition.json`.

### STUDIO v0.51.0
- ✅ Completed: Composition Metadata - Implemented support for defining and persisting composition metadata (Width, Height, FPS, Duration) during creation, and respecting these settings in the Studio UI.

### STUDIO v0.50.0
- ✅ Completed: Vue & Svelte Templates - Implemented Vue and Svelte templates for the composition creator, including support for Vue 3 Composition API and Svelte 5 Runes.

### STUDIO v0.49.0
- ✅ Completed: Composition Templates - Implemented template system (Vanilla JS, React) for creating new compositions, adding a template selector to the creation modal.

### STUDIO v0.48.1
- ✅ Completed: Timeline Polish - Implemented Ruler with dynamic ticks, Hover Guide with timecode tooltip, and Magnetic Snapping (to markers/in/out) for the Timeline.

### STUDIO v0.48.1
- ✅ Completed: Refactor Loop Logic - Moved loop enforcement logic from `App.tsx` to `StudioContext.tsx` to centralize playback state management.

### STUDIO v0.48.0
- ✅ Verified: Maintenance - Synced package.json version and fixed test environment by mocking ResizeObserver.

### STUDIO v0.48.0
- ✅ Completed: Timecode & Range - Implemented SMPTE timecode display in Timeline and enforced In/Out points for looping and navigation (Rewind/Home).

### STUDIO v0.47.0
- ✅ Completed: Safe Area Guides - Implemented toggleable Safe Area Guides (Action Safe, Title Safe, Crosshair) in the Studio Stage with toolbar button and keyboard shortcut.

### STUDIO v0.46.0
- ✅ Completed: Verify Audio Controls - Added unit tests for PlaybackControls to verify volume and mute functionality.

### STUDIO v0.45.0
- ✅ Completed: Delete Composition - Implemented ability to delete compositions from the UI with backend support and confirmation.

### STUDIO v0.44.0
- ✅ Completed: Enable Production Preview - Configured `vite-plugin-studio-api` to serve project files in preview mode and updated verification scripts.

### STUDIO v0.43.0
- ✅ Completed: Create Composition - Implemented "Create Composition" feature with UI modal, API endpoint, and file generation logic.

### STUDIO v0.42.0
- ✅ Completed: Drag & Drop Assets - Implemented drag and drop support from Assets Panel to Props Editor inputs (typed and generic).

### STUDIO v0.41.0
- ✅ Completed: Asset Input - Implemented `AssetInput` in Props Editor with asset discovery integration (autocomplete via datalist) for image, video, audio, and font types.

### STUDIO v0.40.1
- ✅ Completed: Documentation & Verification - Added package README, updated version, and implemented Playwright-based verification script.

### STUDIO v0.40.0
- ✅ Completed: Global Shortcuts Refactor - Centralized all keyboard shortcuts into `GlobalShortcuts.tsx` and added Loop Toggle ('L').

### STUDIO v0.39.0
- ✅ Completed: Marker Visualization - Implemented visual markers in Timeline with click-to-seek functionality.

### STUDIO v0.38.0
- ✅ Completed: AI System Prompt - Implemented a modal generator for LLM system prompts, combining static Helios context with dynamic composition schema.

### STUDIO v0.37.0
- ✅ Completed: Timeline Zoom - Implemented zoom slider and scrollable timeline track for precise editing.

### STUDIO v0.36.0
- ✅ Completed: Client-Side Export - Implemented in-browser MP4/WebM export functionality in Renders Panel using WebCodecs.

### STUDIO v0.35.0
- ✅ Completed: Assets Extension - Added support for discovering and displaying 3D models (.glb, .gltf), JSON data (.json), and Shaders (.glsl, .vert, .frag) in the Assets Panel.

### STUDIO v0.34.0
- ✅ Completed: Diagnostics Panel - Implemented system diagnostics panel showing both Client (Preview) and Server (Renderer) capabilities, accessible via Sidebar.

### STUDIO v0.33.1
- ✅ Verified: Test Environment - Fixed test environment configuration by adding module aliases for Core and Player in Vite/Vitest, ensuring all tests pass.

### STUDIO v0.33.0
- ✅ Completed: SRT Export - Implemented functionality to export current captions as an SRT file from the Captions Panel, adding a client-side utility and "Export SRT" button.

### STUDIO v0.32.0
- ✅ Completed: Editable Captions Panel - Implemented editable inputs for captions (time/text), add/delete functionality, and syncing with Core via `controller.setCaptions` or `inputProps`.

### STUDIO v0.31.0
- ✅ Completed: Integrate Core Captions - Updated Studio to use `HeliosState.captions` for Timeline and Captions Panel, ensuring full sync with Core's caption logic.

### STUDIO v0.30.1
- ✅ Verified: Keyboard Shortcuts & Snapshot - Added unit tests for KeyboardShortcutsModal and StudioContext snapshot logic.

### STUDIO v0.30.0
- ✅ Completed: Keyboard Shortcuts Dialog - Implemented a modal dialog listing all keyboard shortcuts, accessible via `?` key or sidebar button, improving usability.

### STUDIO v0.29.0
- ✅ Completed: Schema-Aware Props Editor - Implemented specialized UI inputs (Enum, Range, Color, Boolean) driven by `HeliosSchema`, with fallback to standard inputs.

### STUDIO v0.28.0
- ✅ Completed: Captions Panel - Implemented SRT import panel and timeline markers for captions using Core's `parseSrt` and `inputProps` injection.

### STUDIO v0.27.1
- ✅ Fixed: Snapshot - Fixed type error in "Take Snapshot" implementation where `captureFrame` return value was mishandled.

### STUDIO v0.27.0
- ✅ Completed: Snapshot - Implemented "Take Snapshot" feature in Stage Toolbar to capture and download current frame as PNG.

### STUDIO v0.26.0
- ✅ Completed: Audio Controls - Added Volume slider and Mute button to Playback Controls, updating `StudioContext` to track audio state.

### STUDIO v0.25.0
- ✅ Completed: Enhance Asset Previews - Implemented rich previews for video (hover-play), audio (click-play), and fonts (custom sample) in Assets Panel.

### STUDIO v0.24.0
- ✅ Completed: Scaffold Unit Tests - Added Vitest, JSDOM, and Testing Library infrastructure; implemented initial tests for Timeline component.

### STUDIO v0.23.2
- ✅ Completed: Enable External Project Support - Configured Vite and Render Manager to respect HELIOS_PROJECT_ROOT for file serving and output.

### STUDIO v0.23.1
- ✅ Fixed: Asset Deletion - Switched DELETE API to use query parameters to resolve body parsing timeouts.

### STUDIO v0.23.0
- ✅ Completed: Asset Management - Implemented asset upload (Drag & Drop) and delete functionality in Assets Panel, backed by new API endpoints.

### STUDIO v0.22.0
- ✅ Completed: Global Shortcuts & Frame Stepping - Added Shift+Arrow shortcuts (10-frame jump) and Prev/Next Frame buttons to the UI.

### STUDIO v0.21.0
- ✅ Completed: Implement Render Job Management - Added ability to Cancel and Delete render jobs via UI and API, including aborting FFmpeg processes.

### STUDIO v0.20.0
- ✅ Completed: Pass inputProps to Render Job - Updated `StudioContext` and `render-manager` to forward `inputProps` from the player state to the backend and Renderer.

### STUDIO v0.19.0
- ✅ Completed: Hot Reload State Preservation - Implemented state restoration (frame, playback status) for `Stage` when HMR triggers a controller reload.

### STUDIO v0.18.0
- ✅ Completed: Render Configuration UI - Added UI for selecting render mode (DOM/Canvas), bitrate, and codec, and updated backend to respect these settings.

### STUDIO v0.17.0
- ✅ Completed: Inject HELIOS_PROJECT_ROOT in CLI - Modified CLI to pass user's CWD to Studio process, enabling "Studio as a Tool".

### STUDIO v0.16.0
- ✅ Completed: Canvas Resolution Controls - Added UI controls for setting composition resolution (presets & custom) and updated `StudioContext` to manage `canvasSize`.

### STUDIO v0.15.0
- ✅ Completed: Dynamic Project Discovery - Enabled `HELIOS_PROJECT_ROOT` env var to configure project root for composition/asset discovery, unlocking "Studio as a Tool".

### STUDIO v0.14.0
- ✅ Completed: Rich Props Editor - Implemented JSON editor for complex props (objects/arrays) and improved UI styling for primitives.

### STUDIO v0.13.0
- ✅ Completed: Implement Playback Shortcuts - Added global keyboard shortcuts for Play/Pause (Space), Frame Step (Arrows), and Seek Start (Home), with input protection.

### STUDIO v0.12.0
- ✅ Completed: Implement Real Rendering - Integrated `@helios-project/renderer` with Studio via Vite plugin API (`/api/render`), enabling real render job execution and progress tracking.

### STUDIO v0.11.0
- ✅ Completed: Implement Asset Discovery - Added `findAssets` backend logic, exposed `/api/assets` endpoint, and connected `StudioContext` to fetch real assets from `examples/`.

### STUDIO v0.10.0
- ✅ Completed: Implement Backend API & Project Discovery - Added Vite plugin for dynamic composition discovery from `examples/` directory and connected `StudioContext`.

### STUDIO v0.9.0
- ✅ Completed: Implement Playback Speed Controls - Added speed selector (0.25x to 4x, reverse) and updated `StudioContext` state management.

### STUDIO v0.8.0
- ✅ Completed: Implement Timeline Range Markers - Added draggable in/out markers, keyboard shortcuts ('I'/'O'), and range state management.

### STUDIO v0.7.0
- ✅ Completed: Implement Renders Panel - Added RendersPanel, Sidebar (tabs), and mock render job management in `StudioContext`.

### STUDIO v0.6.0
- ✅ Completed: Implement Assets Panel - Added AssetsPanel, AssetItem, and mock assets in `StudioContext`.

### STUDIO v0.5.0
- ✅ Completed: Implement Stage & Canvas Controls - Created Stage component with Pan/Zoom/Transparency controls and refactored App.tsx to use it.

### STUDIO v0.4.0
- ✅ Completed: Implement Playback Controls - Centralized player state in `StudioContext`, added Play/Pause/Rewind/Loop controls, and refactored Timeline/PropsEditor.

### STUDIO v0.3.1
- ✅ Completed: Composition Switcher - Implemented Cmd+K switcher and Project State context.

### STUDIO v0.3.0
- ✅ Completed: Implement Studio UI and Player Control - Added Timeline, Props Editor, and programmatic control for helios-player.

### STUDIO v0.2.1
- ✅ Completed: Verify & Refine - Fixed TypeScript configuration and verified build/CLI.

### STUDIO v0.2.0
- ✅ Completed: Scaffold CLI Package - Created @helios-project/cli and studio command.

### STUDIO v0.1.0
- ✅ Completed: Scaffold Studio Package - Created package structure, config, and basic UI.

### 2026-02-18
- Initialized domain status and created scaffold plan.
