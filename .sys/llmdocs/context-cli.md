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
│   │   └── studio.ts       # helios studio command
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

### Planned Commands (V2)

- `helios add [component]` - Fetch and copy components from registry
- `helios init` - Scaffold a new Helios project
- `helios render` - Trigger local or distributed rendering
- `helios components` - Browse available registry components

## D. Configuration

No configuration files are currently used. Future plans may include:

- `.heliosrc` or `helios.config.js` for project configuration
- Registry configuration for custom component sources

## E. Integration

- **Studio**: The `studio` command launches `@helios-project/studio` via npm
- **Registry**: Will integrate with component registry for `add` and `components` commands
- **Renderer**: Will integrate with `@helios-project/renderer` for render commands

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
