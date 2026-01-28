# STUDIO Context

## A. Architecture
The Studio is a Vite-based React application that provides a development environment for Helios compositions. It runs locally and connects to the user's `examples` or project directory.

Key components:
- **CLI**: `npx helios studio` starts the Vite dev server.
- **Server**: Discovery logic for compositions and assets.
- **UI**: React app with Timeline, Props Editor, Preview Stage.
- **Controller**: Manages `Helios` instance via `useStudio` context.
- **Verification**: `npm run verify` checks UI integrity using Playwright.

## B. File Tree
packages/studio/
  src/
    components/
      AssetsPanel/
      CaptionsPanel/
      Controls/
        PlaybackControls.tsx
      Layout/
      Sidebar/
      Stage/
      GlobalShortcuts.tsx
      KeyboardShortcutsModal.tsx
      PropsEditor.tsx
      SchemaInputs.tsx
      Timeline.tsx
    context/
      StudioContext.tsx
    hooks/
      useKeyboardShortcut.ts
    server/
    App.tsx
    main.tsx
  scripts/
    verify-ui.ts
  README.md

## C. CLI Interface
`npx helios studio [options]`

Options:
- `--port <number>`: Port to run on (default: 5173)
- `--root <path>`: Project root directory

## D. UI Components
- **Timeline**: Visual track of the video, supports markers, captions, zooming.
- **PropsEditor**: Auto-generated inputs based on composition schema (supports Asset selection, Drag & Drop).
- **Stage**: Renders the `<helios-player>` or canvas.
- **GlobalShortcuts**: Headless component managing keyboard interactions.
- **PlaybackControls**: Buttons for play, pause, seek, loop, volume.
- **KeyboardShortcutsModal**: Displays available shortcuts.
- **AssetsPanel**: Drag-and-drop asset management (upload & drag to props).
- **RendersPanel**: Render job management and client-side export.
- **DiagnosticsPanel**: Environment checks.

## E. Integration
- **Core**: Consumes `Helios` instance and state.
- **Player**: Renders `<helios-player>`.
- **Renderer**: Dispatches render jobs to server/renderer package.
