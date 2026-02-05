## STUDIO v0.98.0
- ✅ Completed: CLI Solid Init - Added SolidJS template support to `helios init` command.

## STUDIO v0.97.1
- ✅ Verified: Build & Tests - Verified studio build process and unit tests after ensuring dependencies (core, renderer, player) are built, confirming system integrity.

## STUDIO v0.97.0
- ✅ Completed: Draggable Time Markers - Implemented dragging for time-based input prop markers on the Timeline, allowing direct manipulation of prop values.

## STUDIO v0.96.0
- ✅ Completed: Sync Playback Range - Delegated loop and playback range enforcement to HeliosController, ensuring consistent behavior across Preview and Export.

## STUDIO v0.95.2
- ✅ Completed: Audio Metering - Implemented Master Audio Meter in the Mixer Panel header using `AudioMeter` component and real-time controller events.

## STUDIO v0.95.1
- ✅ Verified: Stage Tests - Implemented unit tests for `Stage` component, covering rendering, interactions (Zoom/Pan), and HMR state preservation.

## STUDIO v0.95.0
- ✅ Completed: Persist Input Props - Implemented auto-saving of user-configured input props to `composition.json`, ensuring persistence across reloads.

## STUDIO v0.94.3
- ✅ Fixed: Concurrency Input - Fixed concurrency input validation in Render Config, ensuring values are clamped between 1 and 32.

## STUDIO v0.94.2
- ✅ Verified: Stacked Timeline - Verified implementation of multi-lane stacked timeline with existing unit tests `Timeline.test.tsx`.

## STUDIO v0.94.1
- ✅ Verified: Render Presets - Added unit tests for RenderConfig and StudioContext persistence, ensuring robustness.

## STUDIO v0.94.0
- ✅ Completed: Render Presets - Implemented render configuration presets (Draft, HD, 4K) and persistence for render settings.

## STUDIO v0.93.1
- ✅ Completed: Smart Empty State - Implemented "Smart Empty State" for the Stage, providing "Create Composition" (fresh project) and "Select Composition" (unselected) empty states.

## STUDIO v0.93.0
- ✅ Completed: Visualize Time-based Props - Implemented `TimecodeInput` in Props Editor and visual markers on the Timeline for number props with `format: 'time'`, enabling WYSIWYG timing adjustments.

## STUDIO v0.92.0
- ✅ Completed: Components Registry UI - Implemented "Components" panel in Studio UI, enabling users to browse and install components from the registry via the CLI backend.

## STUDIO v0.91.0
- ✅ Completed: CLI Production Server - Replaced development-only spawn process with robust Vite server integration using `studioApiPlugin`, enabling correct HMR and path resolution for end-users.

## STUDIO v0.90.0
- ✅ Completed: Core Components - Expanded CLI Component Registry with `ProgressBar` and `Watermark` components.

## STUDIO v0.89.0
- ✅ Completed: Component Registry - Implemented `helios add` command in CLI to install components (Timer) from a local registry.

## STUDIO v0.88.0
- ✅ Completed: CLI Scaffold - Implemented `helios init` and `helios add` commands to scaffold project configuration and component structure.

## STUDIO v0.87.1
- ✅ Verified: Distributed Rendering Config - Verified implementation of concurrency control in Renders Panel and RenderManager, ensuring correct usage of RenderOrchestrator.

## STUDIO v0.87.0
- ✅ Completed: Distributed Rendering Config - Implemented concurrency control in the Studio Renders Panel and updated backend to use `RenderOrchestrator` for parallel rendering.

## STUDIO v0.86.0
- ✅ Completed: Audio Mixer Solo - Implemented "Solo" functionality in Audio Mixer Panel, allowing isolation of individual audio tracks with mute state restoration.

## STUDIO v0.82.0
- ✅ Completed: Stacked Timeline - Implemented multi-lane stacked timeline for audio tracks with dynamic vertical scrolling and sticky ruler, improving visibility of overlapping tracks.

## STUDIO v0.81.1
- ✅ Verified: Omnibar - Added comprehensive unit tests for the Omnibar component to ensure robustness and prevent regressions.

## STUDIO v0.81.0
- ✅ Completed: Timeline Audio Visualization - Implemented visualization of audio tracks on the timeline using `availableAudioTracks` metadata, separating it from runtime state.

## STUDIO v0.80.2
- ✅ Completed: Test Coverage - Added unit tests for Toast notification system (ToastItem, ToastContext, ToastContainer) and verified with mocked environment.

## STUDIO v0.80.1
- ✅ Completed: Maintenance - Updated dependencies to align with Core v5 and Player v0.57.1, resolving workspace conflicts.

## STUDIO v0.80.0
- ✅ Completed: Toast Notifications - Implemented centralized toast notification system for success/error feedback.

## STUDIO v0.79.0
- ✅ Completed: Array Reordering - Implemented ability to reorder array items (up/down) in the Props Editor.

## STUDIO v0.78.0
- ✅ Completed: Persistent Preferences - Implemented persistence for Sidebar tab, Stage settings (Zoom/Pan/Transparency/Guides), Timeline Zoom, and Active Composition using `localStorage`.

## STUDIO v0.77.0
- ✅ Completed: Omnibar Command Palette - Replaced Composition Switcher with a unified Omnibar (Cmd+K) for searching commands, compositions, and assets.
