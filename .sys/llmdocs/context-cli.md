# CLI Context

## A. Architecture

The CLI is built with `commander` and uses a plugin-style architecture where each command is registered in `src/index.ts` from the `src/commands/` directory.

Entry point: `bin/helios.js` -> `dist/index.js`.

## B. File Tree

packages/cli/
├── bin/
│   └── helios.js
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── add.ts
│   │   ├── build.ts
│   │   ├── components.ts
│   │   ├── init.ts
│   │   ├── list.ts
│   │   ├── merge.ts
│   │   ├── remove.ts
│   │   ├── render.ts
│   │   ├── studio.ts
│   │   └── update.ts
│   ├── utils/
│   └── types/
├── package.json
└── tsconfig.json

## C. Commands

### `helios studio`
Launches the Helios Studio development server.

### `helios init`
Initializes a new Helios project.

### `helios add <component>`
Adds a component from the registry to the project.

### `helios list`
Lists installed components.

### `helios components`
Lists available components in the registry.

### `helios render <input>`
Renders a composition to video.
Options:
- `-o, --output <path>`: Output file path
- `--width <number>`: Viewport width
- `--height <number>`: Viewport height
- `--fps <number>`: Frames per second
- `--duration <number>`: Duration in seconds
- `--quality <number>`: CRF quality
- `--mode <mode>`: Render mode (canvas or dom)
- `--start-frame <number>`: Start frame
- `--frame-count <number>`: Number of frames
- `--concurrency <number>`: Number of concurrent render workers (Distributed Rendering)
- `--no-headless`: Run in visible browser
- `--emit-job <path>`: Generate distributed render job spec

### `helios merge <output> <inputs...>`
Merges multiple video files.

### `helios remove <component>`
Removes a component.

### `helios update <component>`
Updates a component.

### `helios build`
Builds the project for production.

## D. Configuration
Reads `helios.config.json` in the project root.

## E. Integration
- **Registry**: Uses `RegistryClient` to fetch components.
- **Renderer**: Uses `@helios-project/renderer` (`RenderOrchestrator`, `Renderer`) for rendering.
- **Studio**: Launches `@helios-project/studio` dev server.
