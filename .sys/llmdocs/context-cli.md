# CLI Context

## A. Architecture
The Helios CLI uses `commander` to define commands.
Entry point is `bin/helios.js` which runs the built `dist/index.js`.
`src/index.ts` registers commands imported from `src/commands/`.

## B. File Tree
packages/cli/
├── bin/
│   └── helios.js
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── add.ts
│   │   ├── components.ts
│   │   ├── init.ts
│   │   ├── merge.ts
│   │   ├── render.ts
│   │   └── studio.ts
│   ├── registry/
│   │   ├── client.ts
│   │   ├── manifest.ts
│   │   └── types.ts
│   ├── templates/
│   │   ├── react.ts
│   │   ├── solid.ts
│   │   ├── svelte.ts
│   │   ├── vanilla.ts
│   │   └── vue.ts
│   └── utils/
│       ├── config.ts
│       ├── install.ts
│       ├── logger.ts
│       └── package-manager.ts
├── package.json
└── tsconfig.json

## C. Commands

### `init`
Initialize a new Helios project.
- `-y, --yes`: Skip prompts
- `-f, --framework <framework>`: Specify framework (react, vue, svelte, solid, vanilla)

### `studio`
Launch the Studio development server.
- `-p, --port <number>`: Port to listen on (default: 5173)

### `add <component>`
Add a component to the project.
- `--no-install`: Skip dependency installation

### `components`
List available components in the registry.

### `render <input>`
Render a composition to video.
- `-o, --output <path>`: Output path (default: "output.mp4")
- `--width <number>`: Viewport width (default: "1920")
- `--height <number>`: Viewport height (default: "1080")
- `--fps <number>`: Frames per second (default: "30")
- `--duration <number>`: Duration in seconds (default: "1")
- `--quality <number>`: CRF quality (0-51)
- `--mode <mode>`: Render mode (canvas or dom) (default: "canvas")
- `--start-frame <number>`: Frame to start rendering from
- `--frame-count <number>`: Number of frames to render
- `--concurrency <number>`: Number of concurrent render jobs (default: "1")
- `--no-headless`: Run in visible browser window (default: headless)

### `merge`
Merge multiple video files.
- `-o, --output <path>`: Output path

## D. Configuration
`helios.config.json`
```typescript
interface HeliosConfig {
  version: string;
  directories: {
    components: string; // e.g., "src/components/helios"
    lib: string;        // e.g., "src/lib"
  };
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'vanilla';
  components: string[]; // List of installed components
}
```

## E. Integration
- **Registry**: Fetches components via `registry/client.ts`.
- **Renderer**: Delegates to `@helios-project/renderer` via `RenderOrchestrator` for `render` and `merge`.
- **Studio**: Delegates to `@helios-project/studio/cli` for `studio` command, running a custom Vite server.
