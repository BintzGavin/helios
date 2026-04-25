# Studio Context

## Section A: Architecture
Helios Studio is a React-based web application served locally by Vite. It provides a visual development environment for creating, previewing, and configuring video compositions. The frontend communicates with the backend via API endpoints (e.g., asset discovery, rendering tasks) and directly manipulates the embedded `<helios-player>` to control playback and state. The Studio integrates tightly with the Core schema system, enabling dynamic UI generation for properties.

## Section B: File Tree
```
packages/studio/
├── bin/
├── src/
│   ├── components/       # Reusable UI components (Timeline, PropsEditor, Stage, RendersPanel, AssetsPanel)
│   ├── context/          # React Context providers (StudioContext)
│   ├── hooks/            # Custom React hooks
│   ├── server/           # Backend API routes and Vite dev server
│   ├── types/            # TypeScript interface definitions
│   ├── App.tsx           # Main application root
│   ├── index.css         # Global styles
│   └── main.tsx          # Entry point
```

## Section C: CLI Interface
The Studio is invoked via `npx helios studio` (or `npm run dev` in development). The CLI starts the Vite development server and opens the Studio UI in the default browser. It accepts options to configure the server port or specify a custom project root path for composition discovery.

## Section D: UI Components
- **Stage**: Renders the `<helios-player>` and handles resolution, panning, zooming, and snapshot captures. Includes Safe Area Guides.
- **Timeline**: Visualizes the composition duration, current playhead, draggable In/Out point markers, audio waveforms, and snap-to guides. Supports dragging and dropping assets.
- **Props Editor**: Dynamically generated input fields based on the active composition's schema, allowing real-time modification of props. Includes specialized editors (JSON, Color, Enum, Asset Inputs).
- **Assets Panel**: Displays and manages project assets (images, videos, audio, fonts, 3D models). Supports rich preview, drag & drop uploading, and directory organization.
- **Renders Panel**: Manages remote and local rendering jobs, showing progress and providing export options. Generates distributed render job JSON specs (`exportJobSpec`).
- **Captions Panel**: Edits and synchronizes subtitle data with the video timeline.

**Key Shortcuts**:
- `Space` or `K`: Play/Pause
- `Home`: Restart/Rewind
- `Shift+L`: Toggle Loop
- `L`: Play Forward / Faster
- `J`: Play Reverse / Slower
- `Cmd+K`: Switch Composition
- `?`: Show Shortcuts Modal
- `I`/`O`: Set In/Out Point
- `Shift + ←/→`: Navigate 10 frames

## Section E: Integration
- **Core (`packages/core`)**: Consumes the `Helios` class and schema definitions to discover properties and handle data synchronization.
- **Player (`packages/player`)**: Directly integrates the `<helios-player>` web component to power the Stage playback and preview logic.
- **Renderer (`packages/renderer`)**: Orchestrates and manages background rendering tasks requested via the Studio's backend API.
