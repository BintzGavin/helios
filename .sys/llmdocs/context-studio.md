# Studio Context

## A. Architecture

Helios Studio is a browser-based development environment for video composition. It allows users to:
1.  **Compose**: Edit composition properties (duration, FPS) and inputs (props) in real-time.
2.  **Preview**: See instant feedback using `<helios-player>` with Hot Module Reloading (HMR).
3.  **Render**: Queue and manage high-quality video renders via `@helios-project/renderer`.
4.  **Connect**: Expose studio capabilities to AI agents via Model Context Protocol (MCP).

**Core Components:**
-   **CLI**: 
    - `npx helios studio` - Via main CLI (starts Vite dev server)
    - `npx @helios-project/studio` or `helios-studio` - Standalone CLI (serves built dist via vite preview)
-   **Bin Script**: `bin/helios-studio.js` - Executable script that serves the built Studio UI
-   **Server**: A Vite plugin (`vite-plugin-studio-api.ts`) provides API endpoints for:
    -   Filesystem access (assets, compositions, thumbnails)
    -   Render management (`RenderManager`)
    -   Documentation discovery (`findDocumentation`) and raw markdown serving (`/docs/*.md`)
    -   MCP Server (`mcp.ts`)
-   **UI**: A React application (`packages/studio/src`) that consumes the API and controls the Player.
-   **Communication**: The UI communicates with the Player via the `HeliosController` bridge (postMessage) and with the Server via HTTP API.
-   **Publishing**: Studio is a publishable npm package (`publishConfig.access: "public"`) with `bin` field for CLI installation.

## B. File Tree

```
packages/studio/
├── bin/                 # CLI bin script (helios-studio.js)
│   └── helios-studio.js # Executable script serving dist via vite preview
├── src/
│   ├── components/      # UI Components
│   │   ├── AssetsPanel/
│   │   ├── AssistantModal/ # AI & Documentation Assistant
│   │   ├── CaptionsPanel/
│   │   ├── Controls/
│   │   ├── RendersPanel/
│   │   ├── Stage/
│   │   ├── CompositionSettingsModal.tsx
│   │   ├── CreateCompositionModal.tsx
│   │   ├── DuplicateCompositionModal.tsx
│   │   ├── GlobalShortcuts.tsx
│   │   ├── KeyboardShortcutsModal.tsx
│   │   ├── PropsEditor.tsx
│   │   ├── RenderPreviewModal.tsx
│   │   ├── SchemaInputs.tsx
│   │   └── Timeline.tsx
│   ├── context/         # React Context (StudioContext)
│   ├── data/            # Static Data (AI Context)
│   ├── hooks/           # Custom Hooks
│   ├── server/          # Backend Logic
│   │   ├── discovery.ts      # Composition & Asset Discovery
│   │   ├── documentation.ts  # Documentation Search & Resolution
│   │   ├── mcp.ts            # Model Context Protocol Server
│   │   ├── plugin.ts         # Vite Plugin Entry
│   │   └── render-manager.ts # Render Job Management
│   ├── utils/           # Shared Utilities
│   ├── App.tsx          # Main Layout
│   └── main.tsx         # Entry Point
├── vite-plugin-studio-api.ts # Vite Plugin for Backend API
└── vite.config.ts       # Vite Configuration
```

## C. CLI Interface

The Studio can be launched in two ways:

**Option 1: Via Main CLI** (Development Mode)
```bash
npx helios studio [options]
```

**Option 2: Direct Installation** (Production Mode)
```bash
# Install globally
npm install -g @helios-project/studio

# Run from any directory
helios-studio
```

Or use with npx:
```bash
npx @helios-project/studio
```

**Options:**
-   `--port <number>`: Port to run the server on (default: 3000 or 5173).
-   `--open`: Open browser on start (default: true for standalone CLI).

**Environment Variables:**
-   `HELIOS_PROJECT_ROOT`: Determines the project root for discovering compositions and assets (defaults to `process.cwd()` for standalone CLI).

**Bin Script:**
-   Location: `bin/helios-studio.js`
-   Serves the built `dist/` folder using `vite preview`
-   Automatically detects project root from current working directory

## D. UI Components

-   **Stage**: Wraps `<helios-player>` and provides canvas controls (Zoom, Pan, Safe Areas).
-   **Timeline**: Visualizes playback progress, markers, and captions. Supports seeking and scrubbing.
-   **Props Editor**: auto-generated form based on the composition's `HeliosSchema`.
    -   Supports primitives (string, number, boolean) with constraints (min/max/step, minLength/maxLength/pattern).
    -   Supports assets (image, video, audio) with type and extension filtering.
    -   Supports complex types (object, array, typed arrays) with size constraints (minItems/maxItems).
    -   Supports collapsible groups via `group` property.
-   **Assets Panel**: Discovers and allows drag-and-drop of assets from the project. Supports uploading, deleting, and renaming assets.
-   **Renders Panel**: Manages render jobs (Start, Cancel, Download).
-   **Captions Panel**: Edits SRT captions and syncs with Core.
-   **Helios Assistant**: A modal providing:
    -   **Ask AI**: Generates context-aware prompts (System Context + Schema + Relevant Docs) for LLMs.
    -   **Documentation**: Searchable documentation browser scanning local READMEs.
-   **Composition Management**:
    -   **Switcher**: Cmd+K to switch active composition. Displays composition name and thumbnail.
    -   **Create**: Create new compositions from templates.
    -   **Duplicate**: Clone existing compositions.
    -   **Settings**: Edit metadata (resolution, FPS, duration), Rename composition, and Update Thumbnail.

## E. Integration

**With Core:**
-   Studio consumes `HeliosSchema` to generate the Props Editor.
-   Studio injects `inputProps` into the Player via `controller.setInputProps()`.

**With Player:**
-   Studio embeds `<helios-player>` in the Stage.
-   Studio controls playback via `HeliosController` (Play, Pause, Seek).

**With Renderer:**
-   Studio triggers renders via POST `/api/render`.
-   The backend spawns a Renderer process (using `RenderManager`) to generate MP4/WebM files.
-   Render progress and history are managed via `/api/jobs` and persisted to disk.
-   **Robustness**: RenderManager verifies output file existence and size before marking jobs as complete.

**With AI Agents (MCP):**
-   Studio exposes an MCP server allowing agents to:
    -   List compositions (`compositions` resource)
    -   Create compositions (`create_composition` tool)
    -   Trigger renders (`render_composition` tool)

## F. Publishing

Studio is a **publishable npm package**:
-   Package name: `@helios-project/studio`
-   `publishConfig.access: "public"`
-   Includes `bin` field for CLI installation: `"helios-studio": "./bin/helios-studio.js"`
-   `prepublishOnly` script builds the package before publishing
-   `files` array includes `bin` and `dist` directories
-   Vite is in `dependencies` (needed for `vite preview` at runtime)
