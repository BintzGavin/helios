# Studio Context

## A. Architecture
Helios Studio is a browser-based development environment for video composition.
It consists of:
- **CLI**: `bin/helios-studio.js` launches a Vite server.
- **Server**: `packages/studio/src/server/` contains Vite plugins for API and rendering.
- **UI**: `packages/studio/src/` is a React application managing the editor state.

## B. File Tree
packages/studio/
├── bin/
│   └── helios-studio.js
├── src/
│   ├── components/
│   │   ├── AssetsPanel/
│   │   ├── AudioMixerPanel/
│   │   ├── AudioWaveform.tsx
│   │   ├── Controls/
│   │   ├── Timeline.tsx
│   │   └── ...
│   ├── context/
│   │   └── StudioContext.tsx
│   ├── types.ts
│   └── ...
├── vite.config.ts
└── package.json

## C. CLI Interface
`npx helios studio`
Starts the Studio development server on port 5173 (default).

## D. UI Components
- **Timeline**: Visualizes video and audio tracks, supports scrubbing and zoom. Includes audio waveforms via `AudioWaveform` component.
- **PropsEditor**: Edits input props for the composition.
- **AudioMixerPanel**: Controls volume and mute for audio tracks.
- **AssetsPanel**: Manages project assets.
- **Stage**: Renders the composition using `<helios-player>`.

## E. Integration
Studio integrates with:
- **Core**: Uses `Helios` schema and types.
- **Player**: Uses `<helios-player>` and `HeliosController` for playback and state.
- **Renderer**: Manages render jobs via `render-manager.ts`.
