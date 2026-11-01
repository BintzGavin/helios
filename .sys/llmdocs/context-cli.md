# CLI Context

## Section A: Architecture
The CLI uses Commander.js to handle commands. The entry point is `packages/cli/src/index.ts` which registers subcommands found in `packages/cli/src/commands/`.
It acts as the primary interface for triggering renders, interacting with the registry, starting the studio, and deploying jobs.

## Section B: File Tree
```
packages/cli/
├── bin/
│   └── helios.js           # Entry point (shebang, calls dist/index.js)
├── src/
│   ├── index.ts            # Main CLI setup, registers all commands
│   ├── commands/
│   │   ├── add.ts          # helios add [component]
│   │   ├── analyze.ts      # helios analyze
│   │   ├── build.ts        # helios build
│   │   ├── check.ts        # helios check
│   │   ├── components.ts   # helios components
│   │   ├── deploy.ts       # helios deploy
│   │   ├── diff.ts         # helios diff
│   │   ├── frames.ts       # helios frames
│   │   ├── init.ts         # helios init
│   │   ├── job.ts          # helios job
│   │   ├── list.ts         # helios list
│   │   ├── mcp.ts          # helios mcp
│   │   ├── merge.ts        # helios merge
│   │   ├── preview.ts      # helios preview
│   │   ├── remove.ts       # helios remove
│   │   ├── render.ts       # helios render
│   │   ├── skills.ts       # helios skills
│   │   ├── studio.ts       # helios studio
│   │   └── update.ts       # helios update
│   ├── mcp/
│   │   └── server.ts       # Model Context Protocol server
│   ├── registry/
│   │   ├── client.ts       # Registry interaction logic
│   │   ├── manifest.ts     # Registry manifest types/utils
│   │   └── types.ts        # Registry specific types
│   ├── templates/          # Code generation templates
│   ├── types/
│   │   └── job.ts          # Job definition types
│   └── utils/
│       ├── compare-frames.ts
│       ├── config.ts       # Config file management
│       ├── cues.ts
│       ├── examples.ts
│       ├── ffmpeg.ts
│       ├── install.ts      # Package/component installation
│       ├── package-manager.ts
│       ├── portable-render.ts
│       ├── uninstall.ts
│       └── video-info.ts
```

## Section C: Commands
- `helios add <component>`: Fetch and copy a component from the registry.
- `helios analyze`: Analyze composition performance.
- `helios build`: Build composition for production.
- `helios check`: Check composition types and structure.
- `helios components`: List available registry components.
- `helios deploy`: Scaffold deployment configurations (azure, cloudflare-sandbox, docker, fly, gcp, aws).
- `helios diff <component>`: Compare local component files with the registry version.
- `helios frames`: Operations related to frames and cues extraction/comparison.
- `helios init`: Scaffold project configuration.
- `helios job run`: Execute distributed rendering jobs.
- `helios list`: Display installed components.
- `helios mcp`: Start the Model Context Protocol server.
- `helios merge`: Stitch multiple video files into a single output without re-encoding.
- `helios preview`: Serve the production build locally.
- `helios remove <component>`: Unregister components and warn about associated files.
- `helios render`: Trigger rendering.
- `helios skills`: Distribute AI agent skills to user projects.
- `helios studio`: Launch Studio dev server.
- `helios update <component>`: Restore or update components from the registry.

## Section D: Configuration
- `helios.config.json`: Main project configuration file read/written by the CLI. Tracks installed components and their dependencies.

## Section E: Integration
- Integrates with the Registry via `RegistryClient` for component sharing.
- Embeds and invokes `@helios-project/renderer` directly for local renders.
- Wraps and invokes Vite/Next.js/React tooling based on user project structure.
- Communicates with cloud infrastructure via `@helios-project/infrastructure` adapters in `helios job run`.
