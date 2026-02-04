# CLI Domain Context

## A. Architecture

The Helios CLI (`@helios-project/cli`) is the primary command-line interface for the Helios video engine. It is built with Commander.js and serves as the entry point for:

- Launching Helios Studio
- Managing the component registry (V2)
- Triggering rendering workflows (V2)
- Project scaffolding (V2)

The CLI follows a subcommand pattern where each command is implemented in a separate file and registered with the main program.

## B. File Tree

```
packages/cli/
├── bin/
│   └── helios.js           # Shebang entry point
├── src/
│   ├── commands/
│   │   ├── add.ts          # helios add command
│   │   ├── components.ts   # helios components command
│   │   ├── init.ts         # helios init command
│   │   ├── merge.ts        # helios merge command
│   │   ├── render.ts       # helios render command
│   │   └── studio.ts       # helios studio command
│   ├── registry/
│   │   ├── manifest.ts     # Component registry definitions
│   │   └── types.ts        # Registry types
│   ├── templates/
│   │   └── basic.ts        # Project scaffolding templates
│   ├── utils/
│   │   └── config.ts       # Config loading and types
│   └── index.ts            # Main CLI setup
├── package.json
└── tsconfig.json
```

## C. Commands

### `helios studio`

Launches the Helios Studio development server.

```bash
helios studio
```

- Spawns `npm run dev` in the `packages/studio` directory
- Sets `HELIOS_PROJECT_ROOT` environment variable to the current working directory

### `helios init`

Initializes a new Helios project.

```bash
helios init
```

Options:
- `-y, --yes`: Skip prompts and use defaults

Behavior:
1. Checks for `package.json`. If missing, prompts to scaffold a new React+Vite+Helios project structure.
2. Checks for `helios.config.json`. If missing, prompts for configuration (component directory, etc.) or uses defaults if scaffolded.

### `helios add`

Adds a component to the project from the embedded registry.

```bash
helios add <component>
```

- Installs component source code and dependencies into the configured `components` directory.
- Requires `helios.config.json` to exist.

### `helios components`

Lists available components in the registry.

```bash
helios components
```

- Lists component names and types (e.g., `timer (react)`).

### `helios render`

Renders a composition to video using the underlying `@helios-project/renderer`.

```bash
helios render [options] <input>
```

Options:
- `-o, --output <path>`: Output file path (default: "output.mp4")
- `--width <number>`: Viewport width (default: 1920)
- `--height <number>`: Viewport height (default: 1080)
- `--fps <number>`: Frames per second (default: 30)
- `--duration <number>`: Duration in seconds (default: 1)
- `--quality <number>`: CRF quality (0-51)
- `--mode <mode>`: Render mode (canvas or dom) (default: "canvas")
- `--start-frame <number>`: Frame to start rendering from
- `--frame-count <number>`: Number of frames to render
- `--no-headless`: Run in visible browser window (default: headless)

### `helios merge`

Merges multiple video files into one without re-encoding.

```bash
helios merge <output> [inputs...]
```

- Uses `@helios-project/renderer`'s `concatenateVideos` function (FFmpeg concat demuxer).

## D. Configuration

The CLI uses `helios.config.json` for project configuration. Configuration logic is centralized in `src/utils/config.ts`.

- **directories.components**: Target directory for installed components
- **directories.lib**: Location of the library directory

## E. Integration

- **Studio**: The `studio` command launches `@helios-project/studio` via npm
- **Registry**: Integrates with embedded component registry for `add` and `components` commands
- **Renderer**: Integrates with `@helios-project/renderer` for `render` command

## F. Command Pattern

Each command is implemented as:

```typescript
// src/commands/[name].ts
import { Command } from 'commander';

export function register[Name]Command(program: Command) {
  program
    .command('[name]')
    .description('[description]')
    .action(async () => {
      // Implementation
    });
}
```

Commands are registered in `src/index.ts`:

```typescript
import { register[Name]Command } from './commands/[name].js';
register[Name]Command(program);
```
