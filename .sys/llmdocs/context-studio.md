# STUDIO Context

## Section A: Architecture
Helios Studio is a browser-based development environment for video composition. It includes a dev server, a WebSocket layer for hot reloading, and a React-based UI that wraps the `<helios-player>`. The `StudioContext` acts as the central state manager, orchestrating the timeline, export operations (via `ClientSideExporter`), and render config persistence.

## Section B: File Tree
```
packages/studio/src
├── App.tsx
├── components
│   ├── AssetsPanel
│   │   ├── AssetItem.css
│   │   ├── AssetItem.test.tsx
│   │   ├── AssetItem.tsx
│   │   ├── AssetsPanel.css
│   │   ├── AssetsPanel.test.tsx
│   │   ├── AssetsPanel.tsx
│   │   ├── FolderItem.css
│   │   └── FolderItem.tsx
│   ├── AssistantModal
│   │   ├── AssistantModal.css
│   │   ├── AssistantModal.test.tsx
│   │   ├── AssistantModal.tsx
│   │   └── index.ts
│   ├── AudioMixerPanel
│   │   ├── AudioMeter.test.tsx
│   │   ├── AudioMeter.tsx
│   │   ├── AudioMixerPanel.css
│   │   ├── AudioMixerPanel.test.tsx
│   │   └── AudioMixerPanel.tsx
│   ├── CaptionsPanel
│   │   ├── CaptionsPanel.css
│   │   ├── CaptionsPanel.test.tsx
│   │   └── CaptionsPanel.tsx
│   ├── ComponentsPanel
│   │   ├── ComponentsPanel.css
│   │   ├── ComponentsPanel.test.tsx
│   │   └── ComponentsPanel.tsx
│   ├── CompositionSettingsModal.css
│   ├── CompositionSettingsModal.tsx
│   ├── CompositionsPanel
│   │   ├── CompositionItem.test.tsx
│   │   ├── CompositionItem.tsx
│   │   ├── CompositionTree.css
│   │   ├── CompositionTree.tsx
│   │   ├── CompositionsPanel.css
│   │   ├── CompositionsPanel.test.tsx
│   │   └── CompositionsPanel.tsx
│   ├── ConfirmationModal
│   │   ├── ConfirmationModal.css
│   │   └── ConfirmationModal.tsx
│   ├── Controls
│   │   ├── PlaybackControls.test.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── TimecodeDisplay.css
│   │   ├── TimecodeDisplay.test.tsx
│   │   ├── TimecodeDisplay.tsx
│   │   ├── TimecodeInput.css
│   │   ├── TimecodeInput.test.tsx
│   │   └── TimecodeInput.tsx
│   ├── CreateCompositionModal.css
│   ├── CreateCompositionModal.tsx
│   ├── DiagnosticsModal.css
│   ├── DiagnosticsModal.test.tsx
│   ├── DiagnosticsModal.tsx
│   ├── DuplicateCompositionModal.css
│   ├── DuplicateCompositionModal.tsx
│   ├── GlobalShortcuts.test.tsx
│   ├── GlobalShortcuts.tsx
│   ├── KeyboardShortcutsModal.css
│   ├── KeyboardShortcutsModal.test.tsx
│   ├── KeyboardShortcutsModal.tsx
│   ├── Layout
│   │   ├── Panel.tsx
│   │   ├── Resizer.css
│   │   ├── Resizer.tsx
│   │   ├── StudioLayout.css
│   │   └── StudioLayout.tsx
│   ├── Omnibar.css
│   ├── Omnibar.test.tsx
│   ├── Omnibar.tsx
│   ├── PropsEditor.css
│   ├── PropsEditor.test.tsx
│   ├── PropsEditor.tsx
│   ├── RenderPreviewModal.css
│   ├── RenderPreviewModal.tsx
│   ├── RendersPanel
│   │   ├── RenderConfig.test.tsx
│   │   ├── RenderConfig.tsx
│   │   ├── RendersPanel.css
│   │   ├── RendersPanel.test.tsx
│   │   └── RendersPanel.tsx
│   ├── SchemaInputs.test.tsx
│   ├── SchemaInputs.tsx
│   ├── Sidebar
│   │   ├── Sidebar.css
│   │   └── Sidebar.tsx
│   ├── Stage
│   │   ├── EmptyState.css
│   │   ├── EmptyState.tsx
│   │   ├── Stage.css
│   │   ├── Stage.test.tsx
│   │   ├── Stage.tsx
│   │   └── StageToolbar.tsx
│   ├── Timeline.css
│   ├── Timeline.test.tsx
│   ├── Timeline.tsx
│   ├── TimelineAudioTrack.test.tsx
│   ├── TimelineAudioTrack.tsx
│   └── Toast
│       ├── HotReloadToast.tsx
│       ├── Toast.css
│       ├── Toast.test.tsx
│       ├── Toast.tsx
│       ├── ToastContainer.test.tsx
│       └── ToastContainer.tsx
├── context
│   ├── StudioContext.test.tsx
│   ├── StudioContext.tsx
│   ├── ToastContext.test.tsx
│   └── ToastContext.tsx
├── data
│   └── ai-context.ts
├── hooks
│   ├── useAudioWaveform.test.ts
│   ├── useAudioWaveform.ts
│   ├── useKeyboardShortcut.test.ts
│   ├── useKeyboardShortcut.ts
│   ├── usePersistentState.test.ts
│   └── usePersistentState.ts
├── main.tsx
├── server
│   ├── discovery.test.ts
│   ├── discovery.ts
│   ├── documentation.test.ts
│   ├── documentation.ts
│   ├── mcp-http.test.ts
│   ├── mcp-http.ts
│   ├── mcp.test.ts
│   ├── mcp.ts
│   ├── plugin.ts
│   ├── remote-startup.test.ts
│   ├── remote-startup.ts
│   ├── render-access.test.ts
│   ├── render-access.ts
│   ├── render-lifecycle.test.ts
│   ├── render-manager.test.ts
│   ├── render-manager.ts
│   ├── templates
│   │   ├── index.test.ts
│   │   ├── index.ts
│   │   ├── react.test.ts
│   │   ├── react.ts
│   │   ├── solid.test.ts
│   │   ├── solid.ts
│   │   ├── svelte.test.ts
│   │   ├── svelte.ts
│   │   ├── threejs.test.ts
│   │   ├── threejs.ts
│   │   ├── title-explainer.test.ts
│   │   ├── title-explainer.ts
│   │   ├── types.ts
│   │   ├── vanilla.test.ts
│   │   ├── vanilla.ts
│   │   ├── vue.test.ts
│   │   └── vue.ts
│   └── types.ts
├── setupTests.ts
├── types.ts
├── utils
│   ├── tree.test.ts
│   └── tree.ts
└── vite-env.d.ts

21 directories, 145 files

```

## Section C: CLI Interface
Command: `npx helios studio`
Starts the dev server and opens the Studio UI in the default browser.

## Section D: UI Components
- **Timeline**: Manages in/out points and playback progression.
- **Props Editor**: Used to edit active composition props interactively.
- **Assets Panel**: Lists and allows management of media assets.
- **Audio Mixer**: Controls volume and audio levels.

## Section E: Integration
- **Core**: Consumes `Helios` for composition registration and processing.
- **Player**: Integrates `<helios-player>` for live previews and uses `ClientSideExporter` for client-side video exports.
- **Renderer**: Uses the `/api/render/job-spec` endpoint to offload server-side render tasks.
