# Helios CLI Context

## A. Architecture

The CLI follows the Subcommand pattern using Commander.js.
- **Entry point**: `bin/helios.js` calls `dist/index.js` which registers commands.
- **Commands directory**: `src/commands/`
- Each command is registered via a `registerXCommand(program: Command): void` function.
- Exit codes: 0 for success, 1 for errors. Chalk is used for output styling.

## B. File Tree

```
packages/cli
├── bin
│   └── helios.js
├── package.json
├── scripts
│   └── bundle-skills.js
├── src
│   ├── __tests__
│   │   └── index.test.ts
│   ├── commands
│   │   ├── __tests__
│   │   │   ├── add.test.ts
│   │   │   ├── build.test.ts
│   │   │   ├── components.test.ts
│   │   │   ├── deploy.test.ts
│   │   │   ├── diff.test.ts
│   │   │   ├── init.test.ts
│   │   │   ├── job.test.ts
│   │   │   ├── list.test.ts
│   │   │   ├── merge.test.ts
│   │   │   ├── preview.test.ts
│   │   │   ├── remove.test.ts
│   │   │   ├── render.test.ts
│   │   │   ├── skills.test.ts
│   │   │   ├── studio.test.ts
│   │   │   └── update.test.ts
│   │   ├── add.ts
│   │   ├── build.ts
│   │   ├── components.ts
│   │   ├── deploy.ts
│   │   ├── diff.ts
│   │   ├── init.ts
│   │   ├── job.ts
│   │   ├── list.ts
│   │   ├── merge.ts
│   │   ├── preview.ts
│   │   ├── remove.ts
│   │   ├── render.ts
│   │   ├── skills.ts
│   │   ├── studio.ts
│   │   └── update.ts
│   ├── index.ts
│   ├── registry
│   │   ├── __tests__
│   │   │   ├── client.test.ts
│   │   │   └── manifest.test.ts
│   │   ├── client.ts
│   │   ├── manifest.ts
│   │   └── types.ts
│   ├── templates
│   │   ├── __tests__
│   │   │   ├── cloud.test.ts
│   │   │   └── frameworks.test.ts
│   │   ├── aws.ts
│   │   ├── azure.ts
│   │   ├── cloudflare-sandbox.ts
│   │   ├── cloudflare.ts
│   │   ├── deno.ts
│   │   ├── docker-adapter.ts
│   │   ├── docker.ts
│   │   ├── fly.ts
│   │   ├── gcp.ts
│   │   ├── hetzner.ts
│   │   ├── kubernetes.ts
│   │   ├── modal.ts
│   │   ├── react.ts
│   │   ├── solid.ts
│   │   ├── svelte.ts
│   │   ├── vanilla.ts
│   │   ├── vercel.ts
│   │   └── vue.ts
│   ├── types
│   │   └── job.ts
│   └── utils
│       ├── __tests__
│       │   ├── config.test.ts
│       │   ├── examples.test.ts
│       │   ├── ffmpeg.test.ts
│       │   ├── install.test.ts
│       │   ├── package-manager.test.ts
│       │   └── uninstall.test.ts
│       ├── config.ts
│       ├── examples.ts
│       ├── ffmpeg.ts
│       ├── install.ts
│       ├── package-manager.ts
│       └── uninstall.ts
├── tsconfig.json
└── vitest.config.ts

14 directories, 75 files
```
## C. Commands

- `helios add <component>`: Install a new registry component.
- `helios build <composition>`: Compile a composition for production.
- `helios components`: List available components from the registry.
- `helios deploy <target>`: Scaffold deployment templates (e.g., cloudflare-sandbox, aws, vercel).
- `helios diff <component>`: Show differences between installed and registry component.
- `helios init <dir>`: Scaffold a new Helios project.
- `helios job <subcommand>`: Distributed rendering job utilities (generate, run).
- `helios list`: List currently installed components in the project.
- `helios merge <jobPath>`: Merge distributed chunks back into a single video file.
- `helios preview <composition>`: Launch local preview server for a composition.
- `helios remove <component>`: Remove an installed component.
- `helios render <composition>`: Trigger local rendering.
- `helios skills`: Developer tools for agent skills.
- `helios studio [dir]`: Start the Helios Studio UI.
- `helios update <component>`: Update an installed component to the latest registry version.

## D. Configuration

- **`helios.config.json`**: Project-level config.
  - Read/written by `utils/config.ts`.
  - Tracks installed `components` (names and paths).
  - Specifies paths like `componentDir` (e.g., `src/components`).
  - Defines execution configurations (e.g., rendering concurrency, target cloud platforms).

## E. Integration

- **Registry**: Uses `RegistryClient` (fetch) to download components, falling back to local definitions in `manifest.ts`.
- **Renderer**: The `render` command wraps `@helios-project/renderer` APIs.
- **Studio**: The `studio` command wraps `@helios-project/studio` start functions.
- **Infrastructure**: Distributed worker execution logic (adapters like Cloudflare Sandbox, AWS, GCP) is pulled from `@helios-project/infrastructure` during `job run` execution.
