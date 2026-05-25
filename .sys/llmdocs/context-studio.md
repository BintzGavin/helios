# Studio Architecture
Studio is a web-based UI application built using React and Vite, that provides an interactive composition editing and rendering environment for Helios. The core architecture uses React Context (`StudioContext.tsx`) to manage playback, assets, timeline markers, schema props, rendering logic, and application state.

# File Tree
packages/studio/src/
├── App.css
├── App.tsx
├── cli.ts
├── components
│   ├── AssetsPanel
│   ├── AssistantModal
│   ├── AudioMixerPanel
│   ├── CaptionsPanel
│   ├── ComponentsPanel
│   ├── CompositionSettingsModal.css
│   ├── CompositionSettingsModal.tsx
│   ├── CompositionsPanel
│   ├── ConfirmationModal
│   ├── Controls
│   ├── CreateCompositionModal.css
│   ├── CreateCompositionModal.tsx
│   ├── DiagnosticsModal.css
│   ├── DiagnosticsModal.test.tsx
│   ├── DiagnosticsModal.tsx
│   ├── DuplicateCompositionModal.css
│   ├── DuplicateCompositionModal.tsx
│   ├── GlobalShortcuts.test.tsx
│   ├── GlobalShortcuts.tsx
│   ├── KeyboardShortcutsModal.css
│   ├── KeyboardShortcutsModal.test.tsx
│   ├── KeyboardShortcutsModal.tsx
│   ├── Layout
│   ├── Omnibar.css
│   ├── Omnibar.test.tsx
│   ├── Omnibar.tsx
│   ├── PropsEditor.css
│   ├── PropsEditor.test.tsx
│   ├── PropsEditor.tsx
│   ├── RenderPreviewModal.css
│   ├── RenderPreviewModal.tsx
│   ├── RendersPanel
│   ├── SchemaInputs.test.tsx
│   ├── SchemaInputs.tsx
│   ├── Sidebar
│   ├── Stage
│   ├── Timeline.css
│   ├── Timeline.test.tsx
│   ├── Timeline.tsx
│   ├── TimelineAudioTrack.test.tsx
│   ├── TimelineAudioTrack.tsx
│   ├── Toast
├── context
│   ├── StudioContext.test.tsx
│   ├── StudioContext.tsx
│   ├── ToastContext.test.tsx
│   ├── ToastContext.tsx
├── hooks
│   ├── useAudioWaveform.test.ts
│   ├── useAudioWaveform.ts
│   ├── usePersistentState.ts
├── index.css
├── main.tsx
├── server
│   ├── discovery.test.ts
│   ├── discovery.ts
│   ├── documentation.test.ts
│   ├── documentation.ts
│   ├── mcp.test.ts
│   ├── mcp.ts
│   ├── plugin.ts
│   ├── render-manager.test.ts
│   ├── render-manager.ts
│   ├── srt-parser.ts
│   ├── state-sync.ts
├── studio.d.ts
├── types.ts
├── utils
│   ├── formatBytes.ts
│   ├── srt.test.ts
│   ├── srt.ts
│   ├── tree.test.ts
│   ├── tree.ts

# CLI Interface
The `npx helios studio` command starts a Vite development server to serve the React application and provide hot module reloading. It acts as the local development interface.

# UI Components
- **Timeline**: Fully functional scrubber supporting playhead dragging, scrubbing, track lanes, playhead markers, zoom (in/out), dragging of media assets, and snapping to frames.
- **Stage**: Canvas viewer combining `helios-player` and controls for pan, zoom, scale-to-fit, overlay display, and grid/transparency backgrounds.
- **RendersPanel**: Manages, creates, configures, queues, and tracks render jobs for the active composition.
- **AssetsPanel**: Manages project assets including file upload and drag-and-drop into the Timeline and other components.
- **PropsEditor**: Interactive schema properties editor that maps configuration items into interactive inputs.
- **CaptionsPanel**: Edits and handles display configuration for SRT/VTT format text tracks.

# Integration
- Integrates with `@helios-project/core` to parse schemas, frame logic, offsets, and timelines.
- Integrates with `@helios-project/player` (`<helios-player>`) to preview compositions and react to UI state changes.
- Integrates with `@helios-project/renderer` for job delegation via the RendersPanel.
