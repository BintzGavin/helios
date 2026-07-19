
# Context: STUDIO

## Section A: Architecture
Helios Studio is a React-based development environment that serves as the UI for video composition.
It runs a Vite dev server (via `packages/studio/src/server`) and communicates with the player (`@helios-project/player`).
Key features include:
- **CLI**: `npx helios studio` command to start the server.
- **Server**: Manages dynamic asset discovery, handles hot module replacement (HMR), and proxies render jobs.
- **UI**: Core components like Stage, Timeline, PropsEditor, CaptionsPanel, and RendersPanel.

## Section B: File Tree
```
.
├── README.md
├── bin
│   └── helios-studio.js
├── error.log
├── index.html
├── output.log
├── package.json
├── postcss.config.js
├── scripts
│   ├── verify-asset-move.ts
│   ├── verify-assets.ts
│   ├── verify-mcp.ts
│   └── verify-ui.ts
├── src
│   ├── App.tsx
│   ├── components
│   │   ├── AssetsPanel
│   │   │   ├── AssetItem.css
│   │   │   ├── AssetItem.test.tsx
│   │   │   ├── AssetItem.tsx
│   │   │   ├── AssetsPanel.css
│   │   │   ├── AssetsPanel.test.tsx
│   │   │   ├── AssetsPanel.tsx
│   │   │   ├── FolderItem.css
│   │   │   └── FolderItem.tsx
│   │   ├── AssistantModal
│   │   │   ├── AssistantModal.css
│   │   │   ├── AssistantModal.test.tsx
│   │   │   ├── AssistantModal.tsx
│   │   │   └── index.ts
│   │   ├── AudioMixerPanel
│   │   │   ├── AudioMeter.test.tsx
│   │   │   ├── AudioMeter.tsx
│   │   │   ├── AudioMixerPanel.css
│   │   │   ├── AudioMixerPanel.test.tsx
│   │   │   └── AudioMixerPanel.tsx
│   │   ├── CaptionsPanel
│   │   │   ├── CaptionsPanel.css
│   │   │   ├── CaptionsPanel.test.tsx
│   │   │   └── CaptionsPanel.tsx
│   │   ├── ComponentsPanel
│   │   │   ├── ComponentsPanel.css
│   │   │   ├── ComponentsPanel.test.tsx
│   │   │   └── ComponentsPanel.tsx
│   │   ├── CompositionSettingsModal.css
│   │   ├── CompositionSettingsModal.tsx
│   │   ├── CompositionsPanel
│   │   │   ├── CompositionItem.test.tsx
│   │   │   ├── CompositionItem.tsx
│   │   │   ├── CompositionTree.css
│   │   │   ├── CompositionTree.tsx
│   │   │   ├── CompositionsPanel.css
│   │   │   ├── CompositionsPanel.test.tsx
│   │   │   └── CompositionsPanel.tsx
│   │   ├── ConfirmationModal
│   │   │   ├── ConfirmationModal.css
│   │   │   └── ConfirmationModal.tsx
│   │   ├── Controls
│   │   │   ├── PlaybackControls.test.tsx
│   │   │   ├── PlaybackControls.tsx
│   │   │   ├── TimecodeDisplay.css
│   │   │   ├── TimecodeDisplay.test.tsx
│   │   │   ├── TimecodeDisplay.tsx
│   │   │   ├── TimecodeInput.css
│   │   │   ├── TimecodeInput.test.tsx
│   │   │   └── TimecodeInput.tsx
│   │   ├── CreateCompositionModal.css
│   │   ├── CreateCompositionModal.tsx
│   │   ├── DiagnosticsModal.css
│   │   ├── DiagnosticsModal.test.tsx
│   │   ├── DiagnosticsModal.tsx
│   │   ├── DuplicateCompositionModal.css
│   │   ├── DuplicateCompositionModal.tsx
│   │   ├── GlobalShortcuts.test.tsx
│   │   ├── GlobalShortcuts.tsx
│   │   ├── KeyboardShortcutsModal.css
│   │   ├── KeyboardShortcutsModal.test.tsx
│   │   ├── KeyboardShortcutsModal.tsx
│   │   ├── Layout
│   │   │   ├── Panel.tsx
│   │   │   ├── Resizer.css
│   │   │   ├── Resizer.tsx
│   │   │   ├── StudioLayout.css
│   │   │   └── StudioLayout.tsx
│   │   ├── Omnibar.css
│   │   ├── Omnibar.test.tsx
│   │   ├── Omnibar.tsx
│   │   ├── PropsEditor.css
│   │   ├── PropsEditor.test.tsx
│   │   ├── PropsEditor.tsx
│   │   ├── RenderPreviewModal.css
│   │   ├── RenderPreviewModal.tsx
│   │   ├── RendersPanel
│   │   │   ├── RenderConfig.test.tsx
│   │   │   ├── RenderConfig.tsx
│   │   │   ├── RendersPanel.css
│   │   │   ├── RendersPanel.test.tsx
│   │   │   └── RendersPanel.tsx
│   │   ├── SchemaInputs.test.tsx
│   │   ├── SchemaInputs.tsx
│   │   ├── Sidebar
│   │   │   ├── Sidebar.css
│   │   │   └── Sidebar.tsx
│   │   ├── Stage
│   │   │   ├── EmptyState.css
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Stage.css
│   │   │   ├── Stage.test.tsx
│   │   │   ├── Stage.tsx
│   │   │   └── StageToolbar.tsx
│   │   ├── Timeline.css
│   │   ├── Timeline.test.tsx
│   │   ├── Timeline.tsx
│   │   ├── TimelineAudioTrack.test.tsx
│   │   ├── TimelineAudioTrack.tsx
│   │   └── Toast
│   │       ├── Toast.css
│   │       ├── Toast.test.tsx
│   │       ├── Toast.tsx
│   │       ├── ToastContainer.test.tsx
│   │       └── ToastContainer.tsx
│   ├── context
│   │   ├── StudioContext.test.tsx
│   │   ├── StudioContext.tsx
│   │   ├── ToastContext.test.tsx
│   │   └── ToastContext.tsx
│   ├── data
│   │   └── ai-context.ts
│   ├── hooks
│   │   ├── useAudioWaveform.test.ts
│   │   ├── useAudioWaveform.ts
│   │   ├── useKeyboardShortcut.test.ts
│   │   ├── useKeyboardShortcut.ts
│   │   ├── usePersistentState.test.ts
│   │   └── usePersistentState.ts
│   ├── main.tsx
│   ├── server
│   │   ├── discovery.test.ts
│   │   ├── discovery.ts
│   │   ├── documentation.test.ts
│   │   ├── documentation.ts
│   │   ├── mcp.test.ts
│   │   ├── mcp.ts
│   │   ├── plugin.ts
│   │   ├── render-manager.test.ts
│   │   ├── render-manager.ts
│   │   ├── templates
│   │   │   ├── index.test.ts
│   │   │   ├── index.ts
│   │   │   ├── react.test.ts
│   │   │   ├── react.ts
│   │   │   ├── solid.test.ts
│   │   │   ├── solid.ts
│   │   │   ├── svelte.test.ts
│   │   │   ├── svelte.ts
│   │   │   ├── threejs.test.ts
│   │   │   ├── threejs.ts
│   │   │   ├── types.ts
│   │   │   ├── vanilla.test.ts
│   │   │   ├── vanilla.ts
│   │   │   ├── vue.test.ts
│   │   │   └── vue.ts
│   │   └── types.ts
│   ├── setupTests.ts
│   ├── types.ts
│   ├── utils
│   │   ├── srt.test.ts
│   │   ├── srt.ts
│   │   ├── tree.test.ts
│   │   └── tree.ts
│   └── vite-env.d.ts
├── studio_pid.txt
├── test_coverage_output.log
├── test_output.log
├── test_output.txt
├── tsconfig.cli.json
├── tsconfig.json
├── verification.png
├── vite.config.cli.ts
├── vite.config.ts
└── vitest.config.ts

24 directories, 158 files

```

## Section C: CLI Interface
`npx helios studio [options]`
Options typically configured via `HELIOS_PROJECT_ROOT` env var for external integration.

## Section D: UI Components
- **HotReloadToast**: Visual indicator for HMR updates.
- **Stage**: The main canvas preview (Pan, Zoom, Snapshot).
- **Timeline**: Track layers and keyframes.
- **PropsEditor**: JSON-based schema-aware editor for composition inputs.
- **AudioMixerPanel**: Controls for audio tracks, volume, mute, solo, and live audio metering.
- **CaptionsPanel**: Manage subtitles.
- **RendersPanel**: View and configure render jobs.

## Section E: Integration
- Consumes `Helios` core class.
- Controls `<helios-player>` Web Component.
- Sends jobs to `@helios-project/renderer` via `/api/render`.
