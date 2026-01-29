# Studio Context

## A. Architecture

Helios Studio is a browser-based development environment for programmatic video. It serves as a visual host for the Helios Player, allowing users to verify compositions, adjust properties, and manage assets.

- **Frontend**: A React application (`packages/studio/src`) that wraps the `<helios-player>` web component.
- **Backend**: A Vite plugin (`vite-plugin-studio-api.ts`) that adds middleware to the development server. This API handles file system operations (finding compositions, managing assets, orchestration of renders).
- **State Management**: `StudioContext` manages global state (playback, active composition, assets) and syncs with the Player via the `HeliosController`.

## B. File Tree

```
packages/studio/
├── scripts/
│   ├── verify-assets.ts
│   └── verify-ui.ts
├── src/
│   ├── components/
│   │   ├── AssetsPanel/
│   │   ├── CaptionsPanel/
│   │   ├── Controls/
│   │   ├── Layout/
│   │   ├── RendersPanel/
│   │   ├── Sidebar/
│   │   ├── Stage/
│   │   ├── CompositionSwitcher.tsx
│   │   ├── PropsEditor.tsx
│   │   ├── Timeline.tsx
│   │   └── ...
│   ├── context/
│   ├── server/
│   │   ├── discovery.ts
│   │   └── render-manager.ts
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── vite-plugin-studio-api.ts
├── vite.config.ts
└── package.json
```

## C. CLI Interface

The Studio is typically launched via the root CLI:

```bash
npx helios studio [options]
```

It can also be run locally for development:
```bash
npm run dev -w packages/studio
```

## D. UI Components

- **Stage**: The central canvas area hosting the `<helios-player>`. Supports pan/zoom and safe area guides.
- **Timeline**: Visual representation of the video duration, current time, and caption tracks. Supports scrubbing and range selection.
- **Props Editor**: A schema-aware editor that auto-generates inputs based on the composition's `defaultProps`.
- **Assets Panel**: A drag-and-drop interface for managing project assets (images, video, audio, fonts).
- **Renders Panel**: Displays render job status and history. Supports client-side export.
- **Captions Panel**: interface for editing and managing SRT captions.

## E. Integration

Studio integrates with the core packages:

- **@helios-project/core**: Provides types and the `Helios` engine.
- **@helios-project/player**: Provides the `<helios-player>` web component.
- **@helios-project/renderer**: Invoked by the `render-manager` to execute server-side renders via FFmpeg.

**API Endpoints (`vite-plugin-studio-api`):**

- `GET /api/compositions`: List available compositions.
- `POST /api/compositions`: Create a new composition.
- `DELETE /api/compositions`: Delete a composition.
- `GET /api/assets`: List assets in the project.
- `POST /api/assets/upload`: Upload a new asset.
- `DELETE /api/assets`: Delete an asset.
- `POST /api/render`: Start a render job.
- `GET /api/jobs`: List active and past jobs.
- `POST /api/jobs/:id/cancel`: Cancel a running job.
- `GET /api/diagnose`: Check system capabilities (FFmpeg, GPU).
