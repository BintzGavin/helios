# CLI Agent Journal

Critical learnings only. This is not a log—only add entries for insights that will help avoid mistakes or make better decisions.

## [0.1.0] - Initial State
**Learning:** The CLI package was created with minimal structure. It uses Commander.js and has a single `studio` command that spawns the Studio dev server. The pattern for adding new commands is to create a file in `src/commands/` with a `registerXCommand(program)` function.
**Action:** Follow the established pattern when adding new commands. Import and register in `src/index.ts`.

## [0.4.1] - Renderer Dependency
**Learning:** The CLI does not depend on `@helios-project/renderer` by default. To implement `helios render`, this dependency must be added. The `Renderer` class in `packages/renderer` exposes the necessary API (`render(url, output, options)`), making it suitable for direct consumption by the CLI.
**Action:** Ensure `packages/cli/package.json` includes `@helios-project/renderer` when implementing render commands.
